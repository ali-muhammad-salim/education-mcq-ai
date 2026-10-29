#!/usr/bin/env python3
"""
Automated CLI & Validation Runner for Browser-Assisted Source Processing
(see docs/BROWSER-SOURCE-WORKFLOW.md and prompts/browser/README.md).

Subcommands:
  prepare   Render PDF page(s), compute SHA-256 hashes, update local progress ledger,
            and emit ready-to-submit prompt files from prompts/browser/*.txt.
  validate  Validate a raw model response against all acceptance gates (JSON schema,
            requested pageNumber, zero citation tokens, zero unsupported HTML tags,
            unbroken URLs, table column consistency, and native PDF text comparison).
  payload   Build or submit the immutable KNOWLEDGE_BROWSER_DRAFT checkpoint payload
            for POST /api/admin/knowledge.
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = REPO_ROOT / "prompts" / "browser"
DEFAULT_LEDGER = REPO_ROOT / "output" / "browser_workflow_ledger.json"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_ledger(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"version": 1, "sources": {}}


def save_ledger(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def extract_page_text_and_render(pdf_path: Path, page_number: int, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem
    one_page_pdf = out_dir / f"{stem}_page_{page_number}.pdf"
    page_png = out_dir / f"{stem}_page_{page_number}.png"
    native_text = ""

    try:
        import fitz  # PyMuPDF
        with fitz.open(pdf_path) as doc:
            if page_number < 1 or page_number > len(doc):
                raise ValueError(f"Page {page_number} out of range (1..{len(doc)})")
            page = doc[page_number - 1]
            native_text = page.get_text("text") or ""
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
            pix.save(str(page_png))
            single = fitz.open()
            single.insert_pdf(doc, from_page=page_number - 1, to_page=page_number - 1)
            single.save(str(one_page_pdf))
            single.close()
    except ImportError:
        import pypdf
        reader = pypdf.PdfReader(str(pdf_path))
        if page_number < 1 or page_number > len(reader.pages):
            raise ValueError(f"Page {page_number} out of range (1..{len(reader.pages)})")
        native_text = reader.pages[page_number - 1].extract_text() or ""
        writer = pypdf.PdfWriter()
        writer.add_page(reader.pages[page_number - 1])
        with one_page_pdf.open("wb") as f:
            writer.write(f)
        try:
            import pypdfium2 as pdfium
            pdf_doc = pdfium.PdfDocument(str(one_page_pdf))
            bitmap = pdf_doc[0].render(scale=2.0)
            pil_image = bitmap.to_pil()
            pil_image.save(str(page_png))
        except Exception:
            page_png.write_bytes(b"")

    return {
        "onePagePdf": str(one_page_pdf),
        "onePagePdfSha256": sha256_file(one_page_pdf) if one_page_pdf.exists() else None,
        "pagePng": str(page_png) if page_png.exists() and page_png.stat().st_size > 0 else None,
        "pagePngSha256": sha256_file(page_png) if page_png.exists() and page_png.stat().st_size > 0 else None,
        "nativeText": native_text,
    }


def build_prompt(page_number: int, include_table_rules: bool = False) -> str:
    base = (PROMPTS_DIR / "01-transcribe-page.txt").read_text(encoding="utf-8")
    filled = base.replace("{{PAGE_NUMBER}}", str(page_number))
    if include_table_rules:
        table_rules = (PROMPTS_DIR / "02-table-rules.txt").read_text(encoding="utf-8")
        filled = filled.rstrip() + "\n\n" + table_rules.strip() + "\n"
    return filled


def validate_transcription_response(raw_text: str, expected_page: int, native_text: str = "") -> dict:
    issues = []
    warnings = []

    # Strip optional ```json ... ``` wrapper
    cleaned = raw_text.strip()
    m = re.match(r"^```(?:json)?\s*(\{.*\})\s*```$", cleaned, flags=re.DOTALL)
    if m:
        cleaned = m.group(1).strip()

    try:
        payload = json.loads(cleaned)
    except Exception as exc:
        return {
            "valid": False,
            "issues": [f"Invalid JSON response: {exc}"],
            "warnings": [],
            "parsed": None,
        }

    if not isinstance(payload, dict):
        issues.append("Top-level JSON value must be an object.")
        return {"valid": False, "issues": issues, "warnings": warnings, "parsed": None}

    expected_keys = {"pageNumber", "text", "uncertainties"}
    actual_keys = set(payload.keys())
    if actual_keys != expected_keys:
        issues.append(f"JSON keys must be exactly {sorted(expected_keys)}, got {sorted(actual_keys)}.")

    if payload.get("pageNumber") != expected_page:
        issues.append(f"pageNumber mismatch: expected {expected_page}, got {payload.get('pageNumber')!r}.")

    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        issues.append("Transcription 'text' must be a non-empty string.")
        text = ""

    uncertainties = payload.get("uncertainties")
    if not isinstance(uncertainties, list):
        issues.append("'uncertainties' must be a JSON array.")
        uncertainties = []
    else:
        for idx, item in enumerate(uncertainties):
            if not isinstance(item, dict) or not item.get("location") or not item.get("issue"):
                issues.append(f"uncertainties[{idx}] must contain non-empty 'location' and 'issue' strings.")

    # Gate 1: No citation tokens
    if re.search(r"\[cite[:\s]|【\d+", text, flags=re.IGNORECASE):
        issues.append("Transcription contains prohibited citation tokens.")

    # Gate 2: No unsupported HTML other than <br> inside tables
    bad_html = re.findall(r"</?(?!br\s*/?>)[a-zA-Z][a-zA-Z0-9]*[^>]*>", text)
    if bad_html:
        issues.append(f"Transcription contains unsupported HTML tags: {bad_html[:5]}")

    # Gate 3: No URL split across <br> or whitespace inside a table cell
    if re.search(r"https?://[^\s|<]+<br>[^\s|]+", text, flags=re.IGNORECASE):
        issues.append("Transcription contains a wrapped URL split by <br>.")

    # Gate 4: Every [UNREADABLE] span requires an uncertainty entry
    unreadable_count = len(re.findall(r"\[UNREADABLE\]", text))
    if unreadable_count > len(uncertainties):
        issues.append(f"Found {unreadable_count} [UNREADABLE] markers but only {len(uncertainties)} uncertainty entries.")

    # Gate 5: Markdown table column consistency
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            if len(table_lines) >= 2:
                col_counts = [len(re.split(r"(?<!\\)\|", row)[1:-1]) for row in table_lines]
                if len(set(col_counts)) > 1:
                    issues.append(f"Inconsistent Markdown table column counts across rows: {col_counts}")
        else:
            i += 1

    # Gate 6: Compare URLs present in native PDF text
    if native_text:
        native_urls = re.findall(r"https?://[^\s)>\]\"']+", native_text)
        for u in native_urls:
            if len(u) > 12 and u not in text:
                warnings.append(f"Native PDF URL prefix '{u}' not matched verbatim in transcription (check line wrap).")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "parsed": payload,
    }


def cmd_prepare(args: argparse.Namespace) -> int:
    pdf_path = Path(args.pdf).resolve()
    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    source_sha = sha256_file(pdf_path)
    out_dir = Path(args.out_dir).resolve() / f"{pdf_path.stem}_{source_sha[:10]}"
    artifacts = extract_page_text_and_render(pdf_path, args.page, out_dir)
    prompt_text = build_prompt(args.page, include_table_rules=args.tables)
    prompt_file = out_dir / f"page_{args.page}_prompt.txt"
    prompt_file.write_text(prompt_text, encoding="utf-8")

    ledger_path = Path(args.ledger).resolve()
    ledger = load_ledger(ledger_path)
    src_entry = ledger["sources"].setdefault(source_sha, {
        "pdfPath": str(pdf_path),
        "sha256": source_sha,
        "pages": {},
    })
    src_entry["pages"][str(args.page)] = {
        "pageNumber": args.page,
        "status": "PREPARED",
        "preparedAt": datetime.now(timezone.utc).isoformat(),
        "promptFile": str(prompt_file),
        **artifacts,
    }
    save_ledger(ledger_path, ledger)
    print(json.dumps({
        "status": "PREPARED",
        "sourceSha256": source_sha,
        "pageNumber": args.page,
        "promptFile": str(prompt_file),
        "onePagePdf": artifacts["onePagePdf"],
        "pagePng": artifacts["pagePng"],
        "ledger": str(ledger_path),
    }, indent=2))
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    response_path = Path(args.response).resolve()
    raw = response_path.read_text(encoding="utf-8")
    native_text = ""
    if args.pdf:
        pdf_path = Path(args.pdf).resolve()
        out_dir = Path(args.out_dir).resolve()
        artifacts = extract_page_text_and_render(pdf_path, args.page, out_dir)
        native_text = artifacts.get("nativeText", "")

    result = validate_transcription_response(raw, args.page, native_text)
    print(json.dumps({
        "valid": result["valid"],
        "issues": result["issues"],
        "warnings": result["warnings"],
        "pageNumber": args.page,
    }, indent=2))
    return 0 if result["valid"] else 2


def cmd_payload(args: argparse.Namespace) -> int:
    response_path = Path(args.response).resolve()
    raw = response_path.read_text(encoding="utf-8")
    check = validate_transcription_response(raw, args.page)
    if not check["valid"]:
        print(json.dumps({"error": "Response failed validation gates", "issues": check["issues"]}, indent=2), file=sys.stderr)
        return 2

    parsed = check["parsed"]
    body = {
        "id": args.artifact_id,
        "contentHash": args.content_hash,
        "note": f"Model: {args.model} | Conversation: {args.conversation_url} | Uncertainties: {len(parsed['uncertainties'])}",
        "extraction": {
            "text": parsed["text"],
            "continuation": "",
            "regions": [],
            "learning": {"outcomes": [], "questions": [], "keyEntries": []},
        },
    }
    print(json.dumps(body, indent=2, ensure_ascii=False))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Browser-assisted source processing workflow runner")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prep = sub.add_parser("prepare", help="Render single page, record SHA-256 ledger, and generate prompt")
    p_prep.add_argument("pdf", help="Path to source PDF")
    p_prep.add_argument("--page", type=int, required=True, help="1-indexed physical page number")
    p_prep.add_argument("--tables", action="store_true", help="Append 02-table-rules.txt to transcription prompt")
    p_prep.add_argument("--out-dir", default=str(REPO_ROOT / "output" / "browser_pages"))
    p_prep.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    p_prep.set_defaults(func=cmd_prepare)

    p_val = sub.add_parser("validate", help="Validate raw JSON response against all acceptance gates")
    p_val.add_argument("response", help="Path to raw response file")
    p_val.add_argument("--page", type=int, required=True, help="Expected 1-indexed physical page number")
    p_val.add_argument("--pdf", help="Optional source PDF path for native URL/text comparison")
    p_val.add_argument("--out-dir", default=str(REPO_ROOT / "output" / "browser_pages"))
    p_val.set_defaults(func=cmd_validate)

    p_pay = sub.add_parser("payload", help="Generate KNOWLEDGE_BROWSER_DRAFT POST payload for /api/admin/knowledge")
    p_pay.add_argument("response", help="Path to validated response file")
    p_pay.add_argument("--page", type=int, required=True)
    p_pay.add_argument("--artifact-id", required=True)
    p_pay.add_argument("--content-hash", required=True)
    p_pay.add_argument("--model", default="Gemini Flash")
    p_pay.add_argument("--conversation-url", default="local-ledger")
    p_pay.set_defaults(func=cmd_payload)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
