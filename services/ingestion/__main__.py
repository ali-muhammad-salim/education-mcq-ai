"""
Document Intelligence Pipeline — CLI Entry Point.

Usage:
    python -m services.ingestion <file> [--doc-type BOOK|PAST_PAPER] [--force]

Output:
    Rich console table showing per-page OCR status, region counts,
    equation counts, diagram counts, table counts, low-confidence regions,
    and total processing time.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from services.ingestion.pipeline import IngestionPipeline
from services.ingestion.schemas import DocumentType

# ---------------------------------------------------------------------------
# ANSI colour helpers (no extra deps)
# ---------------------------------------------------------------------------

_RESET = "\033[0m"
_BOLD = "\033[1m"
_GREEN = "\033[92m"
_YELLOW = "\033[93m"
_RED = "\033[91m"
_CYAN = "\033[96m"
_DIM = "\033[2m"


def _col(text: str, code: str) -> str:
    return f"{code}{text}{_RESET}"


def _banner(text: str) -> None:
    width = 50
    print(_col("=" * width, _BOLD))
    print(_col(f"  {text}", _BOLD + _CYAN))
    print(_col("=" * width, _BOLD))


def _rule() -> None:
    print(_col("-" * 50, _DIM))


def _fmt_time(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}m {s}s"


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python -m services.ingestion",
        description="Document Intelligence Pipeline — ingests PDF/images into the database.",
    )
    parser.add_argument("file", help="Path to the input file (PDF, JPG, JPEG, PNG)")
    parser.add_argument(
        "--doc-type",
        dest="doc_type",
        choices=["BOOK", "PAST_PAPER"],
        default="BOOK",
        help="Document type (default: BOOK)",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Optional document title (default: filename stem)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process even if SHA-256 already exists in the database",
    )
    parser.add_argument(
        "--db-url",
        default=None,
        help="Override DATABASE_URL for this run",
    )
    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Auto-create DB tables (use Alembic migrations in production)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable DEBUG logging",
    )

    args = parser.parse_args()

    # Logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s  %(levelname)-7s  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    # ---- Run ----------------------------------------------------------------
    _banner("Document Intelligence Pipeline")

    file_path = Path(args.file)
    print(f"  {'File':<18}: {file_path}")
    print(f"  {'Type':<18}: {args.doc_type}")
    _rule()

    pipeline = IngestionPipeline(
        database_url=args.db_url,
        create_db_tables=args.create_tables,
    )

    try:
        result = pipeline.run(
            file_path=file_path,
            doc_type=args.doc_type,
            title=args.title,
            force=args.force,
        )
    except Exception as exc:
        print(_col(f"\n  ERROR: {exc}", _RED))
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    # ---- Per-page output ----------------------------------------------------
    _rule()
    print(
        f"  {'Page':<6} {'Status':<8} {'Regions':<9} "
        f"{'Eq':<5} {'Img':<5} {'Tbl':<5} {'Q':<5} {'OCR':<8}"
    )
    _rule()

    for page in result.pages:
        vision_flag = " [VIS]" if page.confidence_summary.vision_calls > 0 else ""
        eq_count = len(page.formulas) + len(page.chemical_equations)
        status_col = _col("OK", _GREEN)
        if page.confidence_summary.needs_review > 0:
            status_col = _col("REVIEW", _YELLOW)

        print(
            f"  {page.page_number:<6} {status_col:<8} "
            f"{len(page.regions):<9} "
            f"{eq_count:<5} "
            f"{len(page.diagrams):<5} "
            f"{len(page.tables):<5} "
            f"{len(page.questions):<5} "
            f"{page.confidence_summary.high}/{page.confidence_summary.total}"
            f"{vision_flag}"
        )

    # ---- Summary ------------------------------------------------------------
    _rule()
    print(_col("  Summary", _BOLD))
    _rule()

    print(f"  {'SHA-256':<22}: {result.sha256[:24]}…")
    print(f"  {'Document ID':<22}: {result.doc_id or 'N/A'}")
    print(f"  {'Pages processed':<22}: {result.pages_processed}/{result.total_pages}")
    print(f"  {'Total regions':<22}: {result.total_regions}")
    print(f"  {'Equations':<22}: {result.total_equations}")
    print(f"  {'Chemical equations':<22}: {result.total_chemical_equations}")
    print(f"  {'Diagrams':<22}: {result.total_diagrams}")
    print(f"  {'Tables':<22}: {result.total_tables}")
    print(f"  {'Questions detected':<22}: {result.total_questions}")

    low_count = len(result.low_confidence_regions)
    low_label = _col(str(low_count), _RED if low_count > 0 else _GREEN)
    print(f"  {'Low-confidence regions':<22}: {low_label}")

    if result.low_confidence_regions:
        for lc in result.low_confidence_regions[:10]:
            print(
                f"    → page {lc['page']}  {lc['region_id']}  "
                f"{lc['type']}  conf={lc['confidence']}  [{lc['confidence_level']}]"
            )
        if len(result.low_confidence_regions) > 10:
            print(f"    … and {len(result.low_confidence_regions) - 10} more")

    if result.vision_fallback_pages:
        pages_str = ", ".join(str(p) for p in result.vision_fallback_pages[:10])
        suffix = f" +{len(result.vision_fallback_pages) - 10} more" if len(result.vision_fallback_pages) > 10 else ""
        print(f"  {'Vision fallback pages':<22}: {pages_str}{suffix}")

    if result.errors:
        print(_col(f"\n  {len(result.errors)} page(s) failed to process:", _RED))
        for err in result.errors:
            print(f"    → page {err.get('page', err.get('resumed_from_page', '?'))}: {err.get('error', err.get('message', 'Processing incomplete'))}")

    print(
        f"\n  {'Processing time':<22}: {_col(_fmt_time(result.processing_time_seconds), _GREEN)}"
    )

    _banner("Done")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
