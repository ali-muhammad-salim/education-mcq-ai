# Source-backed curriculum publication

Uploads keep their original PDF, rendered pages, literal transcription and bounded original figure crops. AI explanations and enhanced assets never replace the transcription.

## Syllabus editions

The renderer inventories the whole PDF and supplies rear index/allocation tables to the model before extracting outcomes. An independent model verifies the class allocations. Reused chapter numbers require title evidence; a chapter code allocated to only one class in this same source can accommodate small index/body title differences. No class is inferred from equal page halves or chapter ranges.

All source pages must pass review before the compiler creates immutable, source-linked class editions and their chapters, subtopics and SLOs. The effective date determines which edition becomes current. Unknown dates, conflicting class allocations or inconsistent source records remain review items. Admins can inspect original index pages and correct the uncompiled edition in Source reviews. Revising a compiled edition requires reprocessing its source; old exam and attempt relations remain intact.

## Paper publication

An approved paper is compiled against exactly one current syllabus for its board, class and subject. A solver produces an answer, feedback for every option and semantic current-SLO assignments. A distinct model verifies these against the original page. Historical printed codes remain separate from current mappings. An absent old code is not an outside-syllabus decision.

A separately uploaded key or e-marking document must be linked to its paper. A key supplied with the paper must finish source review before question publication. Printed keys constrain both automated and human decisions; conflicting official keys require source review. Source and key revisions are checked again before publication commits.

Approved questions populate chapter practice and an immutable quiz. Student-facing question payloads omit keys and feedback until release rules permit them. Wrong-answer feedback uses precomputed option explanations; student submissions do not call AI. Withdrawn sources, superseded compiled papers or changed current curricula block new attempts against the old projection. Existing attempts retain their frozen scoring data.

Theory papers and e-marking notes retain the complete digital text and original PDF. This compiler does not invent MCQs from theory text or claim automatic written-answer grading.

## Diagram approval

`GEMINI_IMAGE_MODEL` is optional and unset by default. Generated candidates remain private even when the AI comparison passes. Admin → Source review → Diagram approvals shows both versions. Approval records the source hash, candidate hash, reviewer and notes. Rejection or revocation restores the original; the original remains accessible after approval.

Native image generation requires provider image-model access. Google's current pricing lists no free API tier for the image models: https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite-image. Listing a model does not prove request or quota availability. Do not enable paid billing automatically.

## Queue and deployment

Compilation and optional enhancement use the existing isolated INGESTION worker. Assessment finalization has higher priority; image enhancement has lower priority than academic ingestion/compilation. Project/model budgets and quota deferrals remain enforced. Index batches and verified question candidates checkpoint between requests.

Apply the nullable source-link migrations before deploying the new worker and web versions. Back up and rehearse against the production PostgreSQL version first. No destructive schema migration or bulk rewriting of historical mappings is required.

## Validation recorded on 2026-10-22

- PostgreSQL integration coverage: combined class editions, source withdrawal, scoped RAG, compiled chapter quizzes, correct/incorrect scoring, answer secrecy, and manual-only enhancement approval/revocation.
- Bounded live provider check: original Physics SSC syllabus pages 52–53 yielded 20 class/chapter allocations with an independent passing audit.
- Bounded live provider check: the original 2025 Physics IX Paper I question 1 was solved and semantically mapped against all 151 current outcomes, with independent verification and a distinct explanation for every option.
- Local mobile review at 390 px: stacked comparisons, readable dark theme controls, no horizontal overflow. The layout fixture intentionally used identical images; it was not a generated enhancement.

These checks do not certify every future document. Unreadable pages, incomplete cross-page questions, conflicting official evidence, unknown edition dates, missing model access and quota limitations remain explicit review/processing conditions.
