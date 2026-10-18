"""
Database repository for the Document Intelligence Pipeline.

Provides upsert helpers for persisting StructuredPage objects to the
SQLAlchemy models.  Uses session-level transactions so a failed page
does not corrupt an already-saved document.
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from services.ingestion.config import settings
from services.ingestion.db.models import (
    Base,
    Document,
    DocumentPage,
    PageDiagram,
    PageEquation,
    PageQuestion,
    PageRegion as DBPageRegion,
    PageTable,
)
from services.ingestion.schemas import (
    ChemicalEquation,
    DiagramRegion,
    DocumentType,
    FormulaRegion,
    IngestionResult,
    QuestionRegion,
    RegionType,
    StructuredPage,
    TableRegionSchema,
)

logger = logging.getLogger(__name__)


def get_engine(database_url: Optional[str] = None):
    url = database_url or settings.database_url
    return create_engine(url, pool_pre_ping=True)


def get_session_factory(database_url: Optional[str] = None):
    engine = get_engine(database_url)
    return sessionmaker(bind=engine, expire_on_commit=False)


def create_tables(database_url: Optional[str] = None) -> None:
    """Create all Alembic-managed tables (for dev/test)."""
    engine = get_engine(database_url)
    Base.metadata.create_all(engine)


class IngestionRepository:
    """
    High-level repository for saving ingestion results to the database.
    """

    def __init__(self, database_url: Optional[str] = None):
        self._SessionFactory = get_session_factory(database_url)

    # -----------------------------------------------------------------------
    # Document
    # -----------------------------------------------------------------------

    def find_document_by_hash(self, sha256: str) -> Optional[str]:
        """Return the document id if the hash already exists, else None."""
        with self._SessionFactory() as session:
            doc = session.execute(
                select(Document).where(Document.file_hash_sha256 == sha256)
            ).scalar_one_or_none()
            return doc.id if doc else None

    def create_document(
        self,
        file_path: str,
        sha256: str,
        title: str,
        doc_type: DocumentType,
        total_pages: int,
        metadata: Optional[dict] = None,
    ) -> str:
        """Insert a new Document record and return its id."""
        with self._SessionFactory() as session:
            doc = Document(
                document_type=doc_type.value,
                title=title,
                file_path=file_path,
                file_hash_sha256=sha256,
                total_pages=total_pages,
                processing_status="PROCESSING",
                metadata_json=metadata or {},
            )
            session.add(doc)
            session.commit()
            return doc.id

    def mark_document_completed(self, doc_id: str) -> None:
        with self._SessionFactory() as session:
            doc = session.get(Document, doc_id)
            if doc:
                doc.processing_status = "COMPLETED"
                session.commit()

    def mark_document_failed(self, doc_id: str) -> None:
        with self._SessionFactory() as session:
            doc = session.get(Document, doc_id)
            if doc:
                doc.processing_status = "FAILED"
                session.commit()

    # -----------------------------------------------------------------------
    # Page
    # -----------------------------------------------------------------------

    def save_page(
        self,
        doc_id: str,
        structured_page: StructuredPage,
    ) -> str:
        """
        Persist a StructuredPage and all its child regions to the database.

        Returns the DocumentPage id.
        """
        with self._SessionFactory() as session:
            # Create / upsert DocumentPage
            existing = session.execute(
                select(DocumentPage).where(
                    DocumentPage.document_id == doc_id,
                    DocumentPage.page_number == structured_page.page_number,
                )
            ).scalar_one_or_none()

            if existing:
                db_page = existing
            else:
                db_page = DocumentPage(
                    document_id=doc_id,
                    page_number=structured_page.page_number,
                )
                session.add(db_page)
                session.flush()

            db_page.image_path = structured_page.image_path
            db_page.width = structured_page.width
            db_page.height = structured_page.height
            db_page.orientation_angle = structured_page.orientation_angle
            db_page.processing_time_ms = structured_page.processing_time_ms
            db_page.ocr_status = "COMPLETED"

            # Persist all regions in reading order
            for order_idx, region in enumerate(structured_page.regions):
                _save_region(session, db_page.id, region, order_idx)

            # Persist typed specialised records
            for eq in structured_page.formulas:
                _save_equation(session, db_page.id, eq, is_chemical=False)
            for cheq in structured_page.chemical_equations:
                _save_equation(session, db_page.id, cheq, is_chemical=True)
            for diagram in structured_page.diagrams:
                _save_diagram(session, db_page.id, diagram)
            for table in structured_page.tables:
                _save_table(session, db_page.id, table)
            for question in structured_page.questions:
                _save_question(session, db_page.id, question)

            session.commit()
            return db_page.id

    def update_question(self, question: QuestionRegion) -> None:
        """Update an existing question in the database (e.g. cross-page modifications)."""
        with self._SessionFactory() as session:
            db_question = session.execute(
                select(PageQuestion).where(PageQuestion.region_id == question.region_id)
            ).scalar_one_or_none()
            
            if db_question:
                opts = [{"label": o.label, "text": o.text} for o in question.options]
                db_question.options = opts
                db_question.has_diagram = question.has_diagram
                db_question.has_formula = question.has_formula
                db_question.has_table = question.has_table
                db_question.question_type = question.question_type
                db_question.syllabus_version_id = question.syllabus_version_id
                db_question.answer_space_y0 = question.answer_space_y0
                db_question.answer_space_y1 = question.answer_space_y1
                session.commit()


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _save_region(
    session: Session,
    page_id: str,
    region,
    reading_order: int,
) -> None:
    r = DBPageRegion(
        page_id=page_id,
        region_id=region.region_id,
        region_type=region.type.value,
        bbox_x0=region.bbox.x0,
        bbox_y0=region.bbox.y0,
        bbox_x1=region.bbox.x1,
        bbox_y1=region.bbox.y1,
        text=region.text,
        confidence=region.confidence,
        confidence_level=region.confidence_level.value,
        vision_used=region.vision_used,
        reading_order=reading_order,
        raw_ocr=region.raw_ocr,
    )
    session.add(r)


def _save_equation(session: Session, page_id: str, eq, is_chemical: bool) -> None:
    if is_chemical:
        cheq: ChemicalEquation = eq
        record = PageEquation(
            page_id=page_id,
            region_id=cheq.region_id,
            is_chemical=True,
            display_form=cheq.display,
            latex="",
            normalized_form=cheq.normalized,
            chem_display=cheq.display,
            chem_normalized=cheq.normalized,
            chem_arrow=cheq.arrow,
            chem_state_symbols=cheq.state_symbols,
            chem_coefficients=cheq.coefficients,
            bbox_x0=cheq.bbox.x0,
            bbox_y0=cheq.bbox.y0,
            bbox_x1=cheq.bbox.x1,
            bbox_y1=cheq.bbox.y1,
            confidence=cheq.confidence,
            confidence_level=cheq.confidence_level.value,
            vision_used=cheq.vision_used,
        )
    else:
        feq: FormulaRegion = eq
        record = PageEquation(
            page_id=page_id,
            region_id=feq.region_id,
            is_chemical=False,
            display_form=feq.display_form,
            latex=feq.latex,
            normalized_form=feq.normalized_form,
            bbox_x0=feq.bbox.x0,
            bbox_y0=feq.bbox.y0,
            bbox_x1=feq.bbox.x1,
            bbox_y1=feq.bbox.y1,
            confidence=feq.confidence,
            confidence_level=feq.confidence_level.value,
            vision_used=feq.vision_used,
        )
    session.add(record)


def _save_diagram(session: Session, page_id: str, diagram: DiagramRegion) -> None:
    record = PageDiagram(
        page_id=page_id,
        region_id=diagram.region_id,
        media_path=diagram.media_path,
        caption=diagram.caption,
        detected_labels=diagram.detected_labels,
        description=diagram.description,
        associated_concept=diagram.associated_concept,
        bbox_x0=diagram.bbox.x0,
        bbox_y0=diagram.bbox.y0,
        bbox_x1=diagram.bbox.x1,
        bbox_y1=diagram.bbox.y1,
        confidence=diagram.confidence,
        confidence_level=diagram.confidence_level.value,
        vision_used=diagram.vision_used,
    )
    session.add(record)


def _save_table(session: Session, page_id: str, table: TableRegionSchema) -> None:
    td = table.table_data
    record = PageTable(
        page_id=page_id,
        region_id=table.region_id,
        headers=td.headers if td else [],
        rows=td.rows if td else [],
        markdown=td.markdown if td else "",
        html=td.html if td else "",
        bbox_x0=table.bbox.x0,
        bbox_y0=table.bbox.y0,
        bbox_x1=table.bbox.x1,
        bbox_y1=table.bbox.y1,
        confidence=table.confidence,
        confidence_level=table.confidence_level.value,
        vision_used=table.vision_used,
    )
    session.add(record)


def _save_question(session: Session, page_id: str, question: QuestionRegion) -> None:
    opts = [{"label": o.label, "text": o.text} for o in question.options]
    record = PageQuestion(
        page_id=page_id,
        region_id=question.region_id,
        question_number=question.question_number,
        sub_question_number=question.sub_question_number,
        section=question.section,
        question_type=question.question_type,
        syllabus_version_id=question.syllabus_version_id,
        marks=question.marks,
        question_text=question.question_text,
        options=opts,
        answer_space_y0=question.answer_space_y0,
        answer_space_y1=question.answer_space_y1,
        has_diagram=question.has_diagram,
        has_formula=question.has_formula,
        has_table=question.has_table,
        bbox_x0=question.bbox.x0,
        bbox_y0=question.bbox.y0,
        bbox_x1=question.bbox.x1,
        bbox_y1=question.bbox.y1,
        confidence=question.confidence,
        confidence_level=question.confidence_level.value,
    )
    session.add(record)
