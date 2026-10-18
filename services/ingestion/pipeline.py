"""
Document Intelligence Pipeline — Main Orchestrator.

Wires all stages together into a single `IngestionPipeline` class.

Usage (programmatic):
    from services.ingestion.pipeline import IngestionPipeline
    result = IngestionPipeline().run("physics.pdf", doc_type="BOOK")

Usage (CLI):
    python -m services.ingestion physics.pdf --doc-type BOOK
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional

from services.ingestion.config import settings
from services.ingestion.schemas import (
    BoundingBox,
    ChemicalEquation,
    ConfidenceLevel,
    ConfidenceSummary,
    DiagramRegion,
    DocumentType,
    FormulaRegion,
    IngestionResult,
    PageRegion,
    QuestionRegion,
    RegionType,
    StructuredPage,
    TableRegionSchema,
)
from services.ingestion.stages.validation import validate_and_hash
from services.ingestion.stages.pdf_extraction import extract_pages
from services.ingestion.stages.orientation import detect_and_correct_orientation
from services.ingestion.stages.ocr import run_ocr, run_plain_ocr, RawBlock
from services.ingestion.stages.region_classifier import classify_blocks
from services.ingestion.stages.vision_fallback import (
    needs_vision_fallback,
    call_vision_model,
)
from services.ingestion.stages.equation_extractor import (
    extract_formula,
    extract_chemical_equation,
)
from services.ingestion.stages.diagram_extractor import extract_diagram
from services.ingestion.stages.table_extractor import extract_table
from services.ingestion.stages.reading_order import reconstruct_reading_order
from services.ingestion.stages.past_paper_detector import detect_questions
from services.ingestion.stages.gemini_extractor import (
    GeminiPageExtractor,
    ChapterManifest,
    RollingPageContext,
    PageAIExtractionResult,
)
from services.inference.gemini_client import GeminiClient
from services.ingestion.schemas import MCQOption, TableData
from services.ingestion.db.repository import IngestionRepository, create_tables

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Orchestrates the full document intelligence pipeline.

    Parameters
    ----------
    database_url:
        Override the default database URL from settings.
    create_db_tables:
        If True, create Alembic-managed tables automatically (useful for
        testing). In production use Alembic migrations instead.
    """

    def __init__(
        self,
        database_url: Optional[str] = None,
        create_db_tables: bool = False,
    ):
        self._db_url = database_url
        if create_db_tables:
            create_tables(database_url)
        self._repo = IngestionRepository(database_url)
        self._gemini_client = GeminiClient()
        self._gemini_extractor = GeminiPageExtractor(self._gemini_client)

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def run(
        self,
        file_path: str | Path,
        doc_type: str = "BOOK",
        title: Optional[str] = None,
        force: bool = False,
        metadata: Optional[dict] = None,
    ) -> IngestionResult:
        """
        Run the full ingestion pipeline on a file.

        Parameters
        ----------
        file_path:
            Path to the input document.
        doc_type:
            "BOOK" or "PAST_PAPER".
        title:
            Optional document title. Defaults to the filename stem.
        force:
            If True, re-process even if the SHA-256 already exists in the DB.

        Returns
        -------
        IngestionResult with all extracted data and summary statistics.
        """
        pipeline_start = time.perf_counter()
        doc_type_enum = DocumentType(doc_type.upper())

        # ---- Stage 1: Validate + Hash ----------------------------------------
        resolved_path, sha256 = validate_and_hash(file_path)
        doc_title = title or resolved_path.stem

        logger.info("Processing: %s  [%s]", resolved_path.name, doc_type)
        logger.info("SHA-256: %s", sha256)

        # ---- Duplicate check -------------------------------------------------
        existing_id = self._repo.find_document_by_hash(sha256)
        if existing_id and not force:
            logger.info("Document already ingested (id=%s). Use --force to re-process.", existing_id)
            return IngestionResult(
                file_path=str(resolved_path),
                doc_type=doc_type_enum,
                sha256=sha256,
                total_pages=0,
                pages_processed=0,
                doc_id=existing_id,
                processing_time_seconds=0.0,
            )

        # ---- Stage 2: Render pages -------------------------------------------
        pages_dir = settings.media_root / "pages" / sha256[:16]
        page_images = extract_pages(
            resolved_path,
            dpi=settings.ocr_page_render_dpi,
            save_dir=pages_dir,
        )
        total_pages = len(page_images)
        logger.info("Extracted %d pages", total_pages)

        # Create DB document record
        doc_id = existing_id or self._repo.create_document(
            file_path=str(resolved_path),
            sha256=sha256,
            title=doc_title,
            doc_type=doc_type_enum,
            total_pages=total_pages,
            metadata=metadata,
        )

        # ---- Process pages ---------------------------------------------------
        result = IngestionResult(
            file_path=str(resolved_path),
            doc_type=doc_type_enum,
            sha256=sha256,
            total_pages=total_pages,
            pages_processed=0,
            doc_id=doc_id,
        )

        current_section = ""  # carried across pages for past-paper detection
        pending_question = None
        rolling_context: Optional[RollingPageContext] = None
        chapter_manifest: Optional[ChapterManifest] = None

        use_gemini = (settings.primary_engine == "gemini" and self._gemini_client.is_configured)
        if use_gemini:
            logger.info("Using AI-First Gemini Vision Engine (gemini-3.5-flash) with 5-Key Rotation Pool.")
        else:
            logger.info("Using Local Hybrid Engine (PaddleOCR + Vision Fallback).")

        for page_img in page_images[:settings.max_pages]:
            page_start = time.perf_counter()
            page_num = page_img.page_number

            try:
                if use_gemini:
                    gemini_structured, outgoing_context = self._process_page_gemini(
                        page_img=page_img,
                        sha256=sha256,
                        doc_type=doc_type_enum,
                        subject=metadata.get("subject", "Physics") if metadata else "Physics",
                        chapter_manifest=chapter_manifest,
                        rolling_context=rolling_context,
                    )
                    if gemini_structured is None:
                        # Check if all keys in the pool are exhausted
                        if self._gemini_client.pool.is_all_exhausted():
                            ckpt = self._gemini_client.save_quota_checkpoint(doc_id, page_num - 1)
                            logger.warning(
                                "Daily free tier quota reached on all 5 Gemini keys. Safe checkpoint created: %s. "
                                "Halting pipeline cleanly; progress is persisted in PostgreSQL.", ckpt
                            )
                            result.errors.append({
                                "quota_exhausted": True,
                                "checkpoint": ckpt,
                                "resumed_from_page": page_num,
                                "message": "All Gemini API keys exhausted their daily quota. Resume tomorrow without quality loss."
                            })
                            break
                        else:
                            # Fallback to local OCR for this single page
                            logger.warning("Gemini extraction failed on page %d, falling back to local OCR.", page_num)
                            structured, current_section, pending_question = self._process_page(
                                page_img=page_img,
                                sha256=sha256,
                                doc_type=doc_type_enum,
                                current_section=current_section,
                                pending_question=pending_question,
                            )
                    else:
                        structured = gemini_structured
                        rolling_context = outgoing_context
                else:
                    structured, current_section, pending_question = self._process_page(
                        page_img=page_img,
                        sha256=sha256,
                        doc_type=doc_type_enum,
                        current_section=current_section,
                        pending_question=pending_question,
                    )
                
                # Skip saving entirely if the page has no useful regions
                if not structured.regions:
                    logger.info("Page %3d/%d  [SKIPPED]  No useful regions detected", page_num, total_pages)
                    continue

                # Update pending question in the database if it carried over from a previous page
                if pending_question:
                    self._repo.update_question(pending_question)

                structured.processing_time_ms = (
                    time.perf_counter() - page_start
                ) * 1000

                # Persist to database
                self._repo.save_page(doc_id, structured)

                # Update aggregates
                result.pages.append(structured)
                result.pages_processed += 1
                result.total_regions += len(structured.regions)
                result.total_equations += len(structured.formulas)
                result.total_chemical_equations += len(structured.chemical_equations)
                result.total_diagrams += len(structured.diagrams)
                result.total_tables += len(structured.tables)
                result.total_questions += len(structured.questions)

                if structured.confidence_summary.vision_calls > 0:
                    result.vision_fallback_pages.append(page_num)

                # Collect low-confidence regions
                for r in structured.regions:
                    if r.confidence_level.value in ("LOW", "NEEDS_REVIEW"):
                        result.low_confidence_regions.append(
                            {
                                "page": page_num,
                                "region_id": r.region_id,
                                "type": r.type.value,
                                "confidence": round(r.confidence, 3),
                                "confidence_level": r.confidence_level.value,
                            }
                        )

                logger.info(
                    "Page %3d/%d  [OK]  regions=%d  eq=%d  img=%d  tables=%d%s",
                    page_num,
                    total_pages,
                    len(structured.regions),
                    len(structured.formulas) + len(structured.chemical_equations),
                    len(structured.diagrams),
                    len(structured.tables),
                    "  [VIS]" if structured.confidence_summary.vision_calls > 0 else "",
                )

            except Exception as exc:
                logger.error("Page %d failed: %s", page_num, exc, exc_info=True)
                result.errors.append({"page": page_num, "error": str(exc)})

        # ---- Finalise --------------------------------------------------------
        self._repo.mark_document_completed(doc_id)
        
        if doc_type_enum == DocumentType.CURRICULUM:
            from services.ingestion.stages.curriculum_extractor import extract_curriculum
            extract_curriculum(result, self._repo)
            
        result.processing_time_seconds = time.perf_counter() - pipeline_start
        return result

    # -----------------------------------------------------------------------
    # Per-page processing
    # -----------------------------------------------------------------------

    def _process_page_gemini(
        self,
        page_img,
        sha256: str,
        doc_type: DocumentType,
        subject: str = "Physics",
        chapter_manifest: Optional[ChapterManifest] = None,
        rolling_context: Optional[RollingPageContext] = None,
    ) -> tuple[Optional[StructuredPage], Optional[RollingPageContext]]:
        """
        AI-First Gemini Vision page processing with Hierarchical Rolling Context.
        Directly extracts text, formulas, calculus, bonding, flowcharts, tables, and MCQs.
        """
        page_num = page_img.page_number

        # Stage 3: Orientation correction
        corrected_img, angle = detect_and_correct_orientation(
            page_img.image,
            use_gpu=settings.ocr_use_gpu,
        )

        ai_result: PageAIExtractionResult = self._gemini_extractor.extract_page_sync(
            page_image=corrected_img,
            page_number=page_num,
            doc_type=doc_type.value,
            subject=subject,
            chapter_manifest=chapter_manifest,
            rolling_context=rolling_context,
        )

        if ai_result.confidence_score == 0.0 or ai_result.extraction_provider == "failed":
            return None, None

        default_bbox = BoundingBox(
            x0=0.0,
            y0=0.0,
            x1=float(corrected_img.width),
            y1=float(corrected_img.height),
        )

        all_regions: list[PageRegion] = []
        formulas: list[FormulaRegion] = []
        chemical_equations: list[ChemicalEquation] = []
        diagrams: list[DiagramRegion] = []
        tables: list[TableRegionSchema] = []
        questions: list[QuestionRegion] = []

        # 1. Headings
        for i, h in enumerate(ai_result.headings):
            reg = PageRegion(
                region_id=f"p{page_num}_h{i + 1}",
                type=RegionType.HEADING,
                bbox=default_bbox,
                text=h,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            all_regions.append(reg)

        # 2. Paragraphs & text
        for i, p in enumerate(ai_result.paragraphs):
            reg = PageRegion(
                region_id=f"p{page_num}_p{i + 1}",
                type=RegionType.PARAGRAPH,
                bbox=default_bbox,
                text=p,
                confidence=0.98,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            all_regions.append(reg)

        # 3. Chemical bondings
        for i, cb in enumerate(ai_result.chemical_bondings):
            bond_text = (
                f"Bonding: {cb.compound_formula} | Type: {cb.bond_type} | "
                f"Geometry: {cb.molecular_geometry} | Hybridization: {cb.hybridization} | "
                f"Angles: {cb.bond_angles} | Description: {cb.lewis_structure_description}"
            )
            reg = PageRegion(
                region_id=f"p{page_num}_bond{i + 1}",
                type=RegionType.PARAGRAPH,
                bbox=default_bbox,
                text=bond_text,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            all_regions.append(reg)

        # 4. Equations (Math, Chemistry, Calculus)
        for i, eq in enumerate(ai_result.equations):
            if eq.equation_type == "CHEMISTRY":
                cheq = ChemicalEquation(
                    region_id=f"p{page_num}_cheq{i + 1}",
                    type=RegionType.CHEMICAL_EQUATION,
                    bbox=default_bbox,
                    text=eq.description or eq.latex,
                    display=eq.latex,
                    normalized=eq.latex,
                    confidence=0.99,
                    confidence_level=ConfidenceLevel.HIGH,
                    vision_used=True,
                )
                chemical_equations.append(cheq)
                all_regions.append(cheq)
            else:
                feq = FormulaRegion(
                    region_id=f"p{page_num}_eq{i + 1}",
                    type=RegionType.FORMULA,
                    bbox=default_bbox,
                    text=eq.description or eq.latex,
                    latex=eq.latex,
                    display_form=eq.latex,
                    normalized_form=eq.latex,
                    confidence=0.99,
                    confidence_level=ConfidenceLevel.HIGH,
                    vision_used=True,
                )
                formulas.append(feq)
                all_regions.append(feq)

        # 5. Calculus math
        for i, cm in enumerate(ai_result.calculus_math):
            calc_desc = f"{cm.math_category} ({cm.operation_type}) on var={cm.variable}"
            calc_feq = FormulaRegion(
                region_id=f"p{page_num}_calc{i + 1}",
                type=RegionType.FORMULA,
                bbox=default_bbox,
                text=calc_desc,
                latex=cm.latex,
                display_form=cm.latex,
                normalized_form=cm.final_result_latex or cm.latex,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            formulas.append(calc_feq)
            all_regions.append(calc_feq)

        # 6. Diagrams & Flowcharts
        for i, dg in enumerate(ai_result.diagrams):
            desc = dg.description
            if dg.mermaid_code:
                desc = f"[MERMAID_DIAGRAM]\n{dg.mermaid_code}\n\n{dg.description}"
            diag = DiagramRegion(
                region_id=f"p{page_num}_dg{i + 1}",
                type=RegionType.FIGURE,
                bbox=default_bbox,
                text=dg.title,
                caption=dg.caption,
                detected_labels=dg.labels,
                description=desc,
                associated_concept=dg.title,
                confidence=0.98,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            diagrams.append(diag)
            all_regions.append(diag)

        # 7. Tables
        for i, tb in enumerate(ai_result.tables):
            tbl = TableRegionSchema(
                region_id=f"p{page_num}_tbl{i + 1}",
                type=RegionType.TABLE,
                bbox=default_bbox,
                text=tb.title,
                table_data=TableData(markdown=tb.markdown_table),
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            tables.append(tbl)
            all_regions.append(tbl)

        # 8. MCQs
        for i, mq in enumerate(ai_result.mcqs):
            opts = [MCQOption(label=chr(65 + k), text=opt) for k, opt in enumerate(mq.options)]
            qreg = QuestionRegion(
                region_id=f"p{page_num}_q{i + 1}",
                type=RegionType.QUESTION,
                question_type="MCQ",
                question_number=mq.question_number,
                sub_question_number=mq.sub_question,
                marks=mq.marks or 1.0,
                question_text=mq.stem_text,
                options=opts,
                has_diagram=mq.diagram_present,
                has_formula=mq.formula_present,
                bbox=default_bbox,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            questions.append(qreg)
            all_regions.append(qreg)

        # 8b. Numericals & Worked Examples
        for i, nm in enumerate(ai_result.numericals):
            sol_steps = "\n".join(nm.step_by_step_solution)
            qtext = f"{nm.statement}\n\n**Given:** {nm.given_data}\n**To Find:** {nm.to_find}\n**Solution:**\n{sol_steps}\n**Answer:** {nm.final_answer} {nm.unit}"
            qreg = QuestionRegion(
                region_id=f"p{page_num}_num{i + 1}",
                type=RegionType.QUESTION,
                question_type="NUMERICAL",
                question_number=nm.problem_number,
                marks=nm.marks,
                question_text=qtext,
                has_formula=bool(nm.formula_used),
                bbox=default_bbox,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            questions.append(qreg)
            all_regions.append(qreg)

        # 8c. Subjective Questions (CRQs / ERQs)
        for i, sq in enumerate(ai_result.subjective_questions):
            rubric_str = "\n".join(f"- {r}" for r in sq.marking_scheme_rubric)
            qtext = sq.stem_text
            if sq.model_answer:
                qtext += f"\n\n**Model Answer:**\n{sq.model_answer}"
            if rubric_str:
                qtext += f"\n\n**Marking Scheme / Rubric:**\n{rubric_str}"
            qreg = QuestionRegion(
                region_id=f"p{page_num}_sq{i + 1}",
                type=RegionType.QUESTION,
                question_type=sq.question_type or "CRQ",
                question_number=sq.question_number,
                sub_question_number=sq.sub_question,
                marks=sq.marks,
                question_text=qtext,
                has_diagram=sq.diagram_required,
                bbox=default_bbox,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            questions.append(qreg)
            all_regions.append(qreg)

        # 8d. Note Definitions & Key Laws
        for i, nd in enumerate(ai_result.notes_definitions):
            defn_text = f"**{nd.term}:** {nd.definition}"
            if nd.law_or_principle_statement:
                defn_text += f"\n*Principle:* {nd.law_or_principle_statement}"
            if nd.mathematical_form:
                defn_text += f"\n*Formula:* {nd.mathematical_form}"
            if nd.si_unit:
                defn_text += f"\n*SI Unit:* {nd.si_unit}"
            if nd.key_points:
                defn_text += "\n*Key Points:*\n" + "\n".join(f"- {kp}" for kp in nd.key_points)
            notereg = PageRegion(
                region_id=f"p{page_num}_def{i + 1}",
                type=RegionType.PARAGRAPH,
                bbox=default_bbox,
                text=defn_text,
                confidence=0.99,
                confidence_level=ConfidenceLevel.HIGH,
                vision_used=True,
            )
            all_regions.append(notereg)

        summary = ConfidenceSummary(
            high=len(all_regions),
            medium=0,
            low=0,
            needs_review=0,
            total=len(all_regions),
            vision_calls=1,
        )

        return StructuredPage(
            page_number=page_num,
            image_path=page_img.image_path,
            width=corrected_img.width,
            height=corrected_img.height,
            orientation_angle=angle,
            regions=all_regions,
            formulas=formulas,
            chemical_equations=chemical_equations,
            diagrams=diagrams,
            tables=tables,
            questions=questions,
            confidence_summary=summary,
        ), ai_result.outgoing_rolling_context

    def _process_page(
        self,
        page_img,
        sha256: str,
        doc_type: DocumentType,
        current_section: str,
        pending_question: Optional[QuestionRegion],
    ) -> tuple[StructuredPage, str, Optional[QuestionRegion]]:
        page_num = page_img.page_number

        # Stage 3: Orientation correction
        corrected_img, angle = detect_and_correct_orientation(
            page_img.image,
            use_gpu=settings.ocr_use_gpu,
        )

        # Stage 4: OCR + Layout
        raw_blocks: list[RawBlock] = run_ocr(
            corrected_img,
            use_gpu=settings.ocr_use_gpu,
            lang=settings.ocr_language,
        )
        if not raw_blocks:
            # Fallback to plain OCR
            raw_blocks = run_plain_ocr(
                corrected_img,
                use_gpu=settings.ocr_use_gpu,
                lang=settings.ocr_language,
            )

        # Stage 5 + 6: Classify regions
        raw_regions: list[PageRegion] = classify_blocks(
            raw_blocks,
            page_height=corrected_img.height,
            page_width=corrected_img.width,
            page_index=page_img.page_index,
        )

        # Stage 5 (conditional): Vision fallback per region
        block_by_region: dict[str, RawBlock] = {
            f"p{page_num}_r{i + 1}": b for i, b in enumerate(raw_blocks)
        }

        enriched_regions: list[PageRegion] = []
        vision_calls = 0

        for region in raw_regions:
            raw_block = block_by_region.get(region.region_id)
            vision_data: dict = {}

            if needs_vision_fallback(region.type.value, region.confidence):
                vision_data = call_vision_model(
                    page_image=corrected_img,
                    bbox=region.bbox.to_list(),
                    region_type=region.type.value,
                    context_text=region.text,
                )
                if vision_data:
                    region.vision_used = True
                    vision_calls += 1
                    # Override text from vision if it provided better text
                    if "text" in vision_data and vision_data["text"]:
                        region.text = vision_data["text"]

            enriched_regions.append(region)

        # Stages 7, 8, 9: Extract typed content
        formulas: list[FormulaRegion] = []
        chemical_equations: list[ChemicalEquation] = []
        diagrams: list[DiagramRegion] = []
        tables: list[TableRegionSchema] = []

        final_regions: list[PageRegion] = []

        for region in enriched_regions:
            raw_block = block_by_region.get(region.region_id)
            vision_data = {}

            if region.type == RegionType.FORMULA:
                formula = extract_formula(region, vision_data)
                formulas.append(formula)
                final_regions.append(formula)

            elif region.type == RegionType.CHEMICAL_EQUATION:
                cheq = extract_chemical_equation(region, vision_data)
                chemical_equations.append(cheq)
                final_regions.append(cheq)

            elif region.type == RegionType.FIGURE:
                diagram = extract_diagram(
                    region=region,
                    page_image=corrected_img,
                    doc_hash=sha256,
                    page_number=page_num,
                    vision_data=vision_data,
                )
                diagrams.append(diagram)
                final_regions.append(diagram)

            elif region.type == RegionType.TABLE:
                table = extract_table(region, raw_block=raw_block, vision_data=vision_data)
                tables.append(table)
                final_regions.append(table)

            else:
                final_regions.append(region)

        # Stage 10: Reading order
        ordered_regions = reconstruct_reading_order(
            final_regions,
            page_width=corrected_img.width,
            page_height=corrected_img.height,
        )

        # Stage 11: Past-paper detection
        detected_questions: list[QuestionRegion] = []
        if doc_type == DocumentType.PAST_PAPER:
            ordered_regions, current_section, pending_question = detect_questions(
                ordered_regions,
                page_number=page_num,
                doc_type=doc_type.value,
                current_section=current_section,
                pending_question=pending_question,
            )
            detected_questions = [
                r for r in ordered_regions if isinstance(r, QuestionRegion)
            ]

        # Build confidence summary
        summary = ConfidenceSummary(
            high=sum(1 for r in ordered_regions if r.confidence_level.value == "HIGH"),
            medium=sum(1 for r in ordered_regions if r.confidence_level.value == "MEDIUM"),
            low=sum(1 for r in ordered_regions if r.confidence_level.value == "LOW"),
            needs_review=sum(1 for r in ordered_regions if r.confidence_level.value == "NEEDS_REVIEW"),
            total=len(ordered_regions),
            vision_calls=vision_calls,
        )

        return StructuredPage(
            page_number=page_num,
            image_path=page_img.image_path,
            width=corrected_img.width,
            height=corrected_img.height,
            orientation_angle=angle,
            regions=ordered_regions,
            formulas=formulas,
            chemical_equations=chemical_equations,
            diagrams=diagrams,
            tables=tables,
            questions=detected_questions,
            confidence_summary=summary,
        ), current_section, pending_question
