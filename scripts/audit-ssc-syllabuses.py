"""Read-only integrity audit of unique syllabus PDFs in the SSC inventory."""

import hashlib
import json
from pathlib import Path

import pymupdf


PROJECT = Path(__file__).resolve().parent.parent
MANIFEST = PROJECT / "output/ssc-import-2026-10-23/import-manifest.json"
INVENTORY = PROJECT / "output/ssc-import-2026-10-23/inventory.json"
REPORT = PROJECT / "output/ssc-import-2026-10-23/syllabus-source-integrity.json"


def main() -> None:
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))["entries"]
    primary = {entry["sha256"] for entry in entries if entry["resourceType"] == "syllabus"}
    source_inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    source_root = Path(source_inventory["root"])
    inventory = source_inventory["files"]
    syllabus = []
    seen = set()
    for entry in inventory:
        if "syllabus" not in entry["relativePath"].lower() or entry["sha256"] in seen:
            continue
        seen.add(entry["sha256"])
        syllabus.append(entry)
    files = []
    for entry in syllabus:
        source = source_root / entry["relativePath"]
        with source.open("rb") as binary:
            digest = hashlib.file_digest(binary, "sha256").hexdigest()
        with pymupdf.open(source) as pdf:
            lengths = [len(page.get_text()) for page in pdf]
        files.append(
            {
                "relativePath": entry["relativePath"],
                "pages": len(lengths),
                "primaryImport": entry["sha256"] in primary,
                "sha256MatchesInventory": digest == entry["sha256"],
                "pagesWithoutSelectableText": [i + 1 for i, count in enumerate(lengths) if count < 20],
                "selectableCharacters": sum(lengths),
            }
        )
    report = {
        "scope": "Source integrity and selectable-text audit only; not a verified transcription or publication approval.",
        "syllabusFiles": len(files),
        "pages": sum(item["pages"] for item in files),
        "hashMismatches": [item["relativePath"] for item in files if not item["sha256MatchesInventory"]],
        "files": files,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("syllabusFiles", "pages", "hashMismatches")}))


if __name__ == "__main__":
    main()
