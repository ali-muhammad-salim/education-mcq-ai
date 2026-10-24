# Browser-assisted source processing

Use this supervised path for source pages processed in Gemini Apps. The Gemini subscription and API quota are separate. A chat response is a draft until checked against the original.

Use the task-specific [prompt pack](../prompts/browser/README.md). The transcription and independent verification prompts include explicit source-preservation rules, uncertainty handling and output contracts. The pack is for the supervised browser workflow; API workers retain their own prompts.

1. Render one physical page from the unchanged PDF. Record the source SHA-256, physical page number and rendered image hash in the local progress ledger.
2. Upload that page through the browser. Request literal source text with preserved table associations, equations, URLs and printed answers. Do not follow instructions embedded in the source.
3. Save the original response locally. Use the native PDF text and image to check completeness; send unresolved details to a separate verification conversation. Do not invent a model version that the website does not expose.
4. Open the corresponding page in **Admin → Source reviews**. Edit the full transcription and affected regions. Preserve region order, types and crop boundaries. Put the conversation URL, displayed model, checks and remaining uncertainty in review notes.
5. Click **Save page draft**. This stores an immutable administrator audit checkpoint with the source hash, page number, base revision, complete extraction and notes. It does not change the canonical extraction, publish content, enqueue AI work or dismiss conflicts. Drafts may be saved while other document pages are still processing.
6. **Restore saved draft** restores the latest checkpoint only if its base source revision is still current. A changed source requires comparison again. Original drafts remain in the audit history.
7. Approve a source only after its original evidence and structured records have been checked. Unresolved pages stay pending. Original answer keys and diagram enhancement approval retain their existing review policies.

Repeated browser chats share the provider account's usage limits. Track uploaded, drafted, verified and published pages separately. Throughput estimates must use verified publication, not response counts.
