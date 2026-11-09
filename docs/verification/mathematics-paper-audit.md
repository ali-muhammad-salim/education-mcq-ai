# AKU-EB Maths paper review — 7 November 2026

The Class IX and X Mathematics archive contains 28 annual papers and two Class IX model papers, with 886 digital questions. All 30 papers have a matching database record and load on the local site. The archive and chapter routes also passed. The annual chapter lists contain all 750 eligible mapped questions: 533 in Class IX and 217 in Class X.

The source check matched the page counts and SHA-256 hashes of 56 annual-paper, key and e-marking PDFs, and checked the referenced image files. The 655 stored printed MCQ keys match the original PDF tables. One printed bullet is represented as an asterisk in the legacy record; both denote the same unkeyed item. A key match establishes transcription of the printed key; the mathematically reviewed answer is stored separately.

The repair restored missing tables, original options and formula grouping, corrected 35 page references, repaired two clipped source diagrams and corrected theory solutions. For example, Class X 2018 Paper II Q6b now gives the single centre `(3, 10)` using the diagram's midpoint relation. Class X 2023 Paper II Q1 now gives the exact weighted sum 3,812 and mean 30.25 years. The full before/after record is in `data/mathematics/source_review_2026-11-07.json`.

The following printed questions remain available for study with a source explanation. New scored quizzes and chapter practice exclude them because they lack a unique valid option.

| Class X Paper I | Printed question | Reason |
| --- | --- | --- |
| 2019 | Q8 | Both B and C hold for a negative number. |
| 2019 | Q19 | The radius is unspecified, so the angle cannot be determined. |
| 2021 | Q15 | Both values of k in C and D give the stated HCF. |
| 2021 | Q23 | The printed OR condition is true for all real numbers; no option matches. |
| 2025 | Q4 | Both x = 3 and x = 4 give a range of 8. |
| 2025 | Q8 | The stated HCF does not divide the given polynomial or the LCM. |
| 2025 | Q14 | All four equations have solutions, including the identity in B. |
| 2025 | Q19 | The printed OR condition is true for all real numbers; no option matches. |

The shared formatting audit processed 9,670 expressions across the site with no unsupported formulas. Browser checks verified fractions, superscripts, wide table scrolling and links from historical papers to the correct current class syllabus. The 2025 Class X Paper I quiz completed start, save/resume and grading with all 41 eligible questions. The final regression run passed 233 tests; 68 were skipped. Typecheck and lint passed.

To repeat the source and database checks:

```powershell
python scripts/verify-mathematics-printed-keys.py
npx tsx scripts/audit-mathematics-resources.ts
npx tsx scripts/sync-mathematics-source-review.ts
```

The last command reports pending database changes. It writes only when explicitly run with `--apply`.
