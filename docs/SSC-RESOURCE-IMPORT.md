# Reviewed resource folder imports

Use the admin upload centre's **Import resource folder** link to load a reviewed
manifest and its source directory. The browser hashes each PDF before uploading
one file at a time; the server checks the hash again. An unchanged source and
scope reuse the same durable job on resume. A batch is limited to 200 requests
and 512 MiB per hour per administrator, with the existing 50 MiB file limit.

`scripts/inventory-study-folder.py` inventories PDFs without editing sources.
`scripts/plan-ssc-import.py` is the reviewed classifier for the supplied SSC
collection, not a general filename classifier. Its content checks and explicit
overrides must be reviewed for a different collection. Inventory and manifest
outputs belong in `output/`, not in version control: inventories include local
paths and extracted document text.

For the October 23 collection, 124 PDFs contain 15 exact hash duplicates, leaving
109 distinct sources and 2,172 pages. The second Chemistry syllabus has matching
extracted text but different page renders and is retained as a companion source.
Printed paper years are preserved. The administrator selected the newest verified
syllabuses as study defaults from October 23; that activation date does not change
the printed exam years or historical syllabus references.

Queue the first short guide to check the live worker before resuming the whole
batch. Upload progress, queued processing and publication are different states.
Free-provider quota deferrals and curriculum dependency waits retain checkpoints
without consuming the ordinary failure retry budget. Papers and books from this
manifest wait for the specified source syllabus to become the current, fully
approved edition before mapping.

Publication requires complete source-page coverage and approval. An automatic
approval binds the exact content hash and requires a conflict-free independent
model audit. Its audit record and optional embedding job commit atomically.
Uncertain transcriptions, answers, diagrams or class assignments remain in admin
review; an uploaded or completed job is not proof that the resource is published.
Original diagrams remain the default. Shared guides appear in both declared
class sections but are excluded from class-specific RAG until page-level class
allocation is supported and verified.

Auto-approved books request study packs after successful source approval. The
anthology manifest requests chapter notes, revision sheets, flashcards, practice
sets and chapter readers rather than irrelevant numerical/formula guides. Study
generation still requires reviewed chapter evidence and the current curriculum;
missing mappings are recorded for review instead of inventing chapter material.

Flagged pending pages receive at most one fresh transcription from the original
image, using the previous audit as observations. A separate verifier must still
approve the new candidate. Correction checkpoints survive quota deferrals; the
pipeline never changes a printed answer or equation to resolve a source error.
Remaining ambiguity stays in educator review. Administrators can recheck an
older completed import with an unused correction pass, or retry a failed import,
without uploading the PDF again. Both actions are owner-scoped and audited.

## Model pools and quota configuration

`GEMINI_EXTRACTOR_MODELS` is the ordered pool for extraction/generation,
falling back to the older `GEMINI_MODELS` / `GEMINI_MODEL` settings when absent.
`GEMINI_VERIFIER_MODELS` is the ordered pool for independent verification,
falling back to the older `GEMINI_VERIFIER_MODEL` setting when absent. Use only
models whose image input and structured-output capabilities have been checked
for this workload. The generator is excluded from its verifier pool and the
resolved model identity is recorded with each result.

Exhausted project/model quotas advance to another configured model. If all
eligible models are full, the job resumes at the earliest available quota window.
Missing models may fall back; invalid schemas, incomplete outputs and educational
disagreements do not trigger a search for a model that approves the candidate.
Embedding namespaces and optional image generation remain separate.

Set `GEMINI_MODEL_LIMITS` to a JSON object keyed by model ID, with positive integer
`rpm`, `tpm` and `rpd` values taken from AI Studio. Unconfigured models retain the
existing global budgets. For example, an observed free-tier Flash limit of 20 RPD
must not be replaced with a third-party article's generic 1,500-RPD figure.
Provider cooldowns remain scoped to the actual project/model; model-specific
permission failures do not globally disable an otherwise usable credential.

Supporting guides, listening material, practical papers and companion syllabuses
have their own compact subject links with original and digital source access.
Source publication and current curriculum checks control availability. Existing
official answer keys remain authoritative unless the administrator explicitly
approves a correction in answer review.
