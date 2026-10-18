"""
Copy and Categorize User Study Materials for SSC Physics into data/intake.
"""

import shutil
from pathlib import Path
import pymupdf

SOURCE_DIR = Path(r"C:\Users\Mak Tech\OneDrive\Desktop\Study Material Manually\SSC\Physics")
INTAKE_DIR = Path("data/intake")


def organize_and_inventory():
    if not SOURCE_DIR.exists():
        print(f"ERROR: Source directory {SOURCE_DIR} does not exist.")
        return

    print("=" * 70)
    print("ANALYZING AND ORGANIZING USER STUDY MATERIALS")
    print(f"Source: {SOURCE_DIR}")
    print("=" * 70)

    # Mapping files to intake destinations
    # (source_filename, list_of_destinations)
    file_routing = {
        "physics-ssc-i-syllabus-2025.pdf": [
            INTAKE_DIR / "physics_9" / "syllabus" / "physics-ssc-i-syllabus-2025.pdf",
        ],
        "physics-ssc-syllabus-final.pdf": [
            INTAKE_DIR / "physics_9" / "syllabus" / "physics-ssc-syllabus-final.pdf",
            INTAKE_DIR / "physics_10" / "syllabus" / "physics-ssc-syllabus-final.pdf",
        ],
        "physics-model-paper-ix-paper-i.pdf": [
            INTAKE_DIR / "physics_9" / "model_paper" / "physics-model-paper-ix-paper-i.pdf",
        ],
        "physics-model-paper-ix-paper-ii.pdf": [
            INTAKE_DIR / "physics_9" / "model_paper" / "physics-model-paper-ix-paper-ii.pdf",
        ],
        "physics-model-paper-x-paper-i.pdf": [
            INTAKE_DIR / "physics_10" / "model_paper" / "physics-model-paper-x-paper-i.pdf",
        ],
        "physics-model-paper-x-paper-ii.pdf": [
            INTAKE_DIR / "physics_10" / "model_paper" / "physics-model-paper-x-paper-ii.pdf",
        ],
        "pacing-guide-2025-for-ssc-i-physics.pdf": [
            INTAKE_DIR / "physics_9" / "pacing_guide" / "pacing-guide-2025-for-ssc-i-physics.pdf",
        ],
        "pacing-guide-for-ssc-ii-physics.pdf": [
            INTAKE_DIR / "physics_10" / "pacing_guide" / "pacing-guide-for-ssc-ii-physics.pdf",
        ],
        "resources-guide-2025-ssc-physics-final.pdf": [
            INTAKE_DIR / "physics_9" / "resource_guide" / "resources-guide-2025-ssc-physics-final.pdf",
            INTAKE_DIR / "physics_10" / "resource_guide" / "resources-guide-2025-ssc-physics-final.pdf",
        ],
        "resources-guide-2025-ssc-physics.pdf": [
            INTAKE_DIR / "physics_9" / "resource_guide" / "resources-guide-2025-ssc-physics.pdf",
            INTAKE_DIR / "physics_10" / "resource_guide" / "resources-guide-2025-ssc-physics.pdf",
        ],
        "ssc-i-physics-sample-practical.pdf": [
            INTAKE_DIR / "physics_9" / "resource_guide" / "ssc-i-physics-sample-practical.pdf",
        ],
    }

    all_files = list(SOURCE_DIR.glob("*.pdf"))
    print(f"\nFound {len(all_files)} PDF files in source folder.\n")

    print(f"{'Filename':<45} | {'Pages':<6} | {'Size (KB)':<10} | {'Destination Category'}")
    print("-" * 100)

    for pdf_file in all_files:
        try:
            doc = pymupdf.open(pdf_file)
            page_count = len(doc)
            size_kb = round(pdf_file.stat().st_size / 1024, 1)
            doc.close()
        except Exception as e:
            page_count = 0
            size_kb = 0

        destinations = file_routing.get(pdf_file.name, [])
        dest_summary = ", ".join([f"{d.parent.parent.name}/{d.parent.name}" for d in destinations]) or "Unmapped"

        print(f"{pdf_file.name:<45} | {page_count:<6} | {size_kb:<10} | {dest_summary}")

        for dest in destinations:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pdf_file, dest)

    print("\n" + "=" * 70)
    print("ALL FILES SUCCESSFULLY ROUTED INTO data/intake/")
    print("=" * 70)


if __name__ == "__main__":
    organize_and_inventory()
