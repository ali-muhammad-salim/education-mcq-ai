# Source processing prompts

These prompts guide supervised Gemini website work. They are not automatically loaded by the API workers. Use one task per message; do not ask one response to transcribe, solve, map and publish.

1. Fill the named placeholders. Upload only the specified source pages. A PDF and PNG of the same page are two representations of one page.
2. Use `01-transcribe-page.txt` for a literal draft. For a difficult table, append `02-table-rules.txt` before submission.
3. Save the exact submitted prompt, raw response, displayed model, conversation URL, source SHA-256 and physical page number. Never silently strip citations, repair answers or overwrite the raw response.
4. Check JSON, page identity, source completeness, exact URLs, equations and table associations. Use `03-verify-page.txt` in a separate conversation with the original attachments and candidate. Independent model agreement is supporting evidence, not proof.
5. Use the remaining prompts only for their named tasks. They produce review candidates; they do not grant publication approval. Distinguish original source content from generated material.
6. Save checked work in the administrator page draft. Keep unresolved pages pending. Preserve official answers until the owner records a correction decision. Keep original diagrams until an enhancement is approved.

An operator may upload, collect responses and save checkpoints. It must escalate ambiguous scientific meaning, conflicting evidence and unsupported class assignments. Do not repeatedly regenerate until a model returns the desired verdict. One targeted clarification is appropriate when it identifies a specific unresolved source region; otherwise retain the uncertainty.

Compact output reduces response overhead, but never omit source content to meet a length target. Benchmark verified pages across representative tables, equations and diagrams before changing model routing.

See the [initial trial and limitations](EVALUATION.md). Prompt compliance and source accuracy are separate acceptance gates.

## Acceptance gates

- Transcription: valid JSON; requested physical page; no generated citations or placeholders; all visible text accounted for or explicitly unresolved; printed table associations preserved.
- Verification: every conflict names a location and source evidence; no blanket claim of certainty; unresolved characters remain unresolved.
- Class assignment: inspected rear-index evidence, edition and physical index page for every assignment.
- Mapping: supplied current-edition SLO identifiers only; original references preserved separately; no guessed out-of-syllabus decisions.
- Answers: official answer retained, proposed correction pending owner decision.
- Diagrams: complete original crop and scientific structure retained; no automatic enhanced-image publication.

Browser drafts do not create missing ingestion artifacts, numerical embeddings or a student assistant backend. These prompts do not remove the need for those pipeline stages.
