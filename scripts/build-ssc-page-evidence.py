"""Inventory physical PDF pages as source evidence, without claiming AI verification.

The output is a resumable local review aid. It never edits source PDFs or writes
to the production database. Run with the inventory generated for an SSC batch.
"""

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import pymupdf


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def page_record(source: dict, page: pymupdf.Page, aliases: list[str]) -> dict:
    text = page.get_text(sort=True)
    links = sorted({str(link.get("uri")) for link in page.get_links() if link.get("uri")})
    images = len({image[0] for image in page.get_images(full=True)})
    flags = []
    if not text.strip():
        flags.append("NO_NATIVE_TEXT")
    elif len(text.strip()) < 80:
        flags.append("LITTLE_NATIVE_TEXT")
    if images:
        flags.append("HAS_EMBEDDED_IMAGES_VISUAL_CHECK")
    if any(" " in link or "\n" in link for link in links):
        flags.append("LINK_CONTAINS_WHITESPACE")
    return {
        "sourceSha256": source["sha256"],
        "relativePath": source["relativePath"],
        "duplicatePaths": aliases,
        "pageNumber": page.number + 1,
        "nativeText": text,
        "nativeTextSha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "nativeTextCharacters": len(text.strip()),
        "embeddedImageCount": images,
        "pdfLinks": links,
        "flags": flags,
        "reviewStatus": "SOURCE_EVIDENCE_ONLY",
    }


def build(inventory_path: Path, output_path: Path) -> dict:
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    by_hash = defaultdict(list)
    for source in inventory["files"]:
        by_hash[source["sha256"]].append(source)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    counts = Counter()
    errors = []
    with temporary.open("w", encoding="utf-8", newline="\n") as destination:
        for expected_hash, copies in by_hash.items():
            source = copies[0]
            path = Path(source["path"])
            try:
                if file_sha256(path) != expected_hash:
                    raise ValueError("Source hash differs from the reviewed inventory")
                with pymupdf.open(path) as document:
                    if len(document) != source["pages"]:
                        raise ValueError("Physical page count differs from the reviewed inventory")
                    aliases = [copy["relativePath"] for copy in copies[1:]]
                    for page in document:
                        record = page_record(source, page, aliases)
                        destination.write(json.dumps(record, ensure_ascii=False) + "\n")
                        counts["pages"] += 1
                        counts["links"] += len(record["pdfLinks"])
                        for flag in record["flags"]:
                            counts[flag] += 1
                    counts["sources"] += 1
            except (OSError, ValueError, RuntimeError) as error:
                errors.append({"relativePath": source["relativePath"], "reason": str(error)})
    temporary.replace(output_path)
    result = {
        "inputFiles": len(inventory["files"]),
        "uniqueSources": len(by_hash),
        "processedSources": counts["sources"],
        "physicalPages": counts["pages"],
        "pagesWithNoNativeText": counts["NO_NATIVE_TEXT"],
        "pagesWithLittleNativeText": counts["LITTLE_NATIVE_TEXT"],
        "pagesWithEmbeddedImages": counts["HAS_EMBEDDED_IMAGES_VISUAL_CHECK"],
        "pagesWithWhitespaceLinks": counts["LINK_CONTAINS_WHITESPACE"],
        "uniquePageLinks": counts["links"],
        "errors": errors,
        "reviewStatus": "SOURCE_EVIDENCE_ONLY; NOT_AI_VERIFIED_OR_PUBLISHED",
    }
    output_path.with_suffix(".summary.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inventory", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    print(json.dumps(build(arguments.inventory, arguments.output), ensure_ascii=False, indent=2))
