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

Supporting guides, listening material, practical papers and companion syllabuses
have their own compact subject links with original and digital source access.
Source publication and current curriculum checks control availability. Existing
official answer keys remain authoritative unless the administrator explicitly
approves a correction in answer review.
