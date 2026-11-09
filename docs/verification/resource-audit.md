# Resource audit — 6 November 2026

**Chemistry follow-up:** The 168 pending mappings below have since been reviewed: 165 mapped and three explicitly outside the supplied syllabus. See [the Chemistry mapping review](chemistry-syllabus-mapping-review.md). The original audit findings below are retained as history.

## Result

Technical checks pass for the registered resources after the repairs below. Academic mapping review is still required for 168 Chemistry questions; this is not a certification that every transcribed answer and semantic mapping has been independently re-solved. Six legacy Physics paper-code duplicates also remain in the database.

## Verified

- 80 registered digital papers, containing 1,932 questions; database question counts and texts match their bundles.
- 765 referenced local assets exist; Mathematics source PDF hashes match their manifests.
- All 170 bundled SSC PDFs open successfully.
- 211 local page and quiz-preview requests passed, including discovered answer-key and e-marking resource pages.
- All Mathematics years (2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025) passed automatic Class IX/X chapter-publication checks.
- 11 signed-in full-paper/selected-question quizzes passed saving, resuming, submission and grading. The temporary test student and attempts were removed. Stored full-paper quiz stems, options and answer keys match their bundles.
- Cover metadata for all 80 papers is tied to the source PDF hash. Eight representative older covers were also checked through the rendered page.
- Type checking and lint passed. 188 tests passed; 68 integration tests were skipped by their configuration. Skipped tests are not reported as verified.

## Repairs

- Restored Mathematics 2018 Q7 better/weaker response images by combining the existing source crops for its two parts; retained crop provenance.
- Enabled registered Chemistry MCQ quizzes and selected-question quiz codes for older Mathematics years. Uploaded PDFs without digital questions do not become practice quizzes.
- Replaced shared, hardcoded cover values with source-specific marks, duration, rubrics and scaling notes. This also fixes older Paper II question counts and choices.
- Restored 95 missing database SLO relations only where both the code and full description exactly matched an active syllabus outcome.
- Held 168 nonexistent Chemistry current-SLO claims as PENDING_REVIEW in the bundle adapter and database. Original codes, proposed mappings, question text and answers remain intact. They are excluded from reviewed chapter mappings. The general sync also preserves this pending status.

## Remaining work

The Chemistry entries below require semantic review against the actual current syllabus. A code lookup cannot establish a valid replacement. Questions remain accessible in original papers and eligible full-paper quizzes.

| Paper | Pending mappings |
|---|---:|
| CHM-IX-2017-P1 | 3 |
| CHM-IX-2017-P2 | 4 |
| CHM-IX-2018-P1 | 6 |
| CHM-IX-2018-P2 | 1 |
| CHM-IX-2019-P1 | 7 |
| CHM-IX-2019-P2 | 1 |
| CHM-IX-2021-P1 | 23 |
| CHM-IX-2022-P1 | 25 |
| CHM-IX-2023-P1 | 15 |
| CHM-IX-2023-P2 | 3 |
| CHM-IX-2024-P1 | 13 |
| CHM-IX-2024-P2 | 2 |
| CHM-IX-2025-P1 | 14 |
| CHM-IX-2025-P2 | 1 |
| CHM-IX-P1 | 4 |
| CHM-IX-P2 | 1 |
| CHM-X-2023-P1 | 10 |
| CHM-X-2023-P2 | 3 |
| CHM-X-2024-P1 | 11 |
| CHM-X-2024-P2 | 4 |
| CHM-X-2025-P1 | 11 |
| CHM-X-2025-P2 | 5 |
| CHM-X-P2 | 1 |

Six legacy Physics paper codes have two database records under older subject/class records. Display lists deduplicate these codes. The audit did not delete or merge source/question identities that existing references may use.

| Duplicate paper code |
|---|
| PHY-IX-P1 |
| PHY-IX-P2 |
| PHY-X-P1 |
| PHY-X-P2 |
| PHY-IX-2025-P1 |
| PHY-IX-2025-P2 |

## Reproduce checks

```powershell
npx tsx scripts/verify-resource-inventory.ts
npx tsx scripts/verify-resource-routes.ts
npx tsx scripts/verify-resource-quizzes.ts
npm run typecheck
npm run lint
npm test
```

Route checks use http://localhost:3001 by default; set CHAPTER_CHECK_URL to another local preview. Database repair scripts are read-only unless --apply is supplied. Repair backups and detailed run results are in output/resource-audit/. No deployment was performed.
