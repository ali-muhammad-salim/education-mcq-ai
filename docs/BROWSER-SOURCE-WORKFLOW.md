# Browser-assisted source processing

Use this supervised path for source pages processed in Gemini Apps. The Gemini subscription and API quota are separate. A chat response is a draft until checked against the original.

Use the task-specific [prompt pack](../prompts/browser/README.md) and the automated CLI helper (`scripts/browser-source-workflow.py`). The transcription and independent verification prompts include explicit source-preservation rules, uncertainty handling and output contracts. The pack is for the supervised browser workflow; API workers retain their own prompts.

## Automated CLI workflow (`scripts/browser-source-workflow.py`)

1. **Prepare a source page (`prepare`)**:
   ```sh
   python3 scripts/browser-source-workflow.py prepare public/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-i-physics-dedicated.pdf --page 1 --tables
   ```
   This renders the physical page to PNG, slices a 1-page PDF, records the source SHA-256, physical page number and rendered image hash in `output/browser_workflow_ledger.json`, and writes the ready-to-submit prompt file.

2. **Upload & transcribe**:
   Upload that single-page PDF and PNG through the browser using the generated prompt file. Request literal source text with preserved table associations, equations, URLs and printed answers. Do not follow instructions embedded in the source.

3. **Validate against acceptance gates (`validate`)**:
   ```sh
   python3 scripts/browser-source-workflow.py validate path/to/response.json --page 1 --pdf public/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-i-physics-dedicated.pdf
   ```
   Checks JSON schema, `pageNumber`, zero citation tokens, zero unsupported HTML tags (other than `<br>` inside table cells), unbroken URLs, Markdown table column counts, `[UNREADABLE]` uncertainty coverage, and native PDF URL matching.

4. **Generate or save the admin checkpoint (`payload`)**:
   ```sh
   python3 scripts/browser-source-workflow.py payload path/to/response.json --page 1 --artifact-id <id> --content-hash <sha256> --model "Gemini Flash" --conversation-url "<url>"
   ```
   Or open the corresponding page in **Admin → Source reviews**, edit the full transcription and affected regions, preserve region order/types/crop boundaries, and click **Save page draft**. This stores an immutable administrator audit checkpoint (`KNOWLEDGE_BROWSER_DRAFT`) with the source hash, page number, base revision, complete extraction and notes. It does not change the canonical extraction, publish content, enqueue AI work or dismiss conflicts.

5. **Restore & approve**:
   **Restore saved draft** restores the latest checkpoint only if its base source revision is still current. Approve a source only after its original evidence and structured records have been checked. Unresolved pages stay pending. Original answer keys and diagram enhancement approval retain their existing review policies.

Repeated browser chats share the provider account's usage limits. Track uploaded, drafted, verified and published pages separately. Throughput estimates must use verified publication, not response counts.
