"""
Automated Intake Processor for Educational Materials.

Scans data/intake/ directory and processes materials in strict pedagogical order:
1. Syllabus (Curriculum ground truth)
2. Model Papers (Exam blueprint & pattern)
3. Pacing & Resource Guides (Teaching schedules & instructional depth)
4. Textbooks & Reference Books (Theory, derivations, formulas, page citations)
5. Past Papers (Historical exam occurrences mapped to active SLOs)

Usage:
    python scripts/process_intake.py
    python scripts/process_intake.py --class 9 --subject Physics
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ingestion.config import settings
from services.ingestion.pipeline import IngestionPipeline
from services.ingestion.schemas import DocumentType

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("IntakeProcessor")

INTAKE_ROOT = Path("data/intake")

# Processing hierarchy order
INTAKE_STAGES = [
    ("syllabus", DocumentType.CURRICULUM),
    ("model_paper", DocumentType.MODEL_PAPER),
    ("pacing_guide", DocumentType.CURRICULUM),
    ("resource_guide", DocumentType.CURRICULUM),
    ("textbooks", DocumentType.BOOK),
    ("past_papers", DocumentType.PAST_PAPER),
]


def scan_intake_directory(class_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Scan the intake folders and return a prioritized queue of files to ingest."""
    tasks = []
    if not INTAKE_ROOT.exists():
        logger.warning("Intake root %s does not exist.", INTAKE_ROOT)
        return tasks

    class_dirs = [d for d in INTAKE_ROOT.iterdir() if d.is_dir()]
    if class_filter:
        class_dirs = [d for d in class_dirs if class_filter in d.name]

    for class_dir in sorted(class_dirs):
        # e.g., physics_9, physics_10
        parts = class_dir.name.split("_")
        subject = parts[0].capitalize() if parts else "Physics"
        class_num = parts[1] if len(parts) > 1 else "9"

        # Check subdirectories in stage order
        for folder_name, doc_type in INTAKE_STAGES:
            stage_dir = class_dir / folder_name
            if not stage_dir.exists():
                continue

            for ext in ("*.pdf", "*.png", "*.jpg", "*.jpeg", "*.docx"):
                for file_path in sorted(stage_dir.glob(ext)):
                    tasks.append({
                        "file_path": file_path,
                        "folder_name": folder_name,
                        "doc_type": doc_type,
                        "subject": subject,
                        "class_level": class_num,
                        "stage_order": [s[0] for s in INTAKE_STAGES].index(folder_name),
                    })

    # Sort tasks strictly by stage_order (Syllabus -> Model Paper -> Pacing -> Textbooks -> Past Papers)
    tasks.sort(key=lambda t: (t["stage_order"], t["file_path"].name))
    return tasks


def process_all_intake(tasks: Optional[List[Dict[str, Any]]] = None) -> None:
    queue = tasks or scan_intake_directory()
    if not queue:
        logger.info("No documents found in data/intake/ waiting for processing.")
        logger.info(
            "Place your files into:\n"
            "  data/intake/physics_9/syllabus/\n"
            "  data/intake/physics_9/model_paper/\n"
            "  data/intake/physics_9/resource_guide/\n"
            "  data/intake/physics_9/pacing_guide/\n"
            "  data/intake/physics_9/textbooks/\n"
            "  data/intake/physics_9/past_papers/\n"
            "  (or equivalent for physics_10/)\n"
        )
        return

    pipeline = IngestionPipeline()
    logger.info("Starting intake processing queue (%d files to process)...", len(queue))

    for idx, item in enumerate(queue, 1):
        fpath = item["file_path"]
        dtype = item["doc_type"]
        subj = item["subject"]
        cls_lvl = item["class_level"]
        title = f"{subj} Class {cls_lvl} - {item['folder_name'].replace('_', ' ').title()} - {fpath.stem}"

        logger.info(
            "[%d/%d] Processing %s (%s, Class %s, Type: %s)...",
            idx, len(queue), fpath.name, subj, cls_lvl, dtype.value,
        )

        metadata = {
            "subject": subj,
            "class_level": cls_lvl,
            "category": item["folder_name"],
            "board": "AKU-EB / FBISE",
        }

        try:
            result = pipeline.run(
                file_path=fpath,
                doc_type=dtype.value,
                title=title,
                metadata=metadata,
            )
            logger.info(
                "Completed %s: %d pages, %d regions, %d equations, %d diagrams, %d questions.",
                fpath.name,
                result.pages_processed,
                result.total_regions,
                result.total_equations + result.total_chemical_equations,
                result.total_diagrams,
                result.total_questions,
            )
        except Exception as exc:
            logger.error("Failed to ingest %s: %s", fpath.name, exc, exc_info=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process educational intake files.")
    parser.add_argument("--class", dest="class_num", help="Filter by class number (e.g. 9 or 10)")
    args = parser.parse_args()

    filter_str = f"_{args.class_num}" if args.class_num else None
    process_all_intake(scan_intake_directory(filter_str))
