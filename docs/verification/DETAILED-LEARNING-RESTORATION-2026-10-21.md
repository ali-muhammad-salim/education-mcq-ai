# Detailed learning page restoration

The owner requested keeping compact home/board/class/subject lists while restoring the previous detailed learning interfaces. Syllabus tables, search and R/U/A filters, MCQ category cards, full-book and cognitive practice, timed quiz controls, and detailed paper/booklet/answer-review controls are restored from the pre-compact interface. The newer source publication, trust, storage, hierarchy and database logic remain in place.

## Correctness fixes retained or added

- Original PDFs use the working PDF.js renderer inside the restored interface; annual originals are bundled and old URLs redirect correctly.
- Historical source references remain separate from reviewed current-syllabus mappings. Missing mappings do not mean outside syllabus. Provisional practice groups are labelled as awaiting curriculum review.
- The reported 2025 quiz failure reproduced on production: HTTP 400, optional diagramUrl rejected null. Source normalization now omits absent optional diagram fields without weakening validation for teacher input. All 40 annual MCQs and both 40-question model sets validate with their answer keys.
- Starting a quiz shows a loading state while the server prepares questions, and actual server errors on failure, rather than prematurely showing Questions Unavailable. Existing scoring, saved answers, teacher visibility, timer and ownership logic are preserved.
- Cognitive controls normalize full-word source values to R/U/A. Search filters individual outcomes; numeric code order places 8.2.10 after 8.2.9. The complete unfiltered view retains every outcome and exact stored description.
- Printed scientific exponents flattened in the JSON (3 × 10^8 and mv^2) are formatted for display without rewriting source descriptions.
- Checked-question practice scores and reset remain available in the restored paper interface. Unknown answer keys cannot be checked as if they were known.

## Source check

All 151 Class IX stored outcome descriptions matched the dedicated PDF under whitespace/punctuation normalization. Class X retained all 175 stored outcomes; three formula-containing descriptions need mathematical-glyph-aware comparison rather than a plain text substring check. No academic remapping was inferred from identical code numbers.

All 144 tests across 26 files passed. The production bundle and TypeScript checks passed. Browser verification is recorded during release. No new schema migration is required beyond the already applied catalogue migration.
