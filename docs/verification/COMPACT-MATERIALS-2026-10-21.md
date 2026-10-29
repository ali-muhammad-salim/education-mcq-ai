# Compact materials release checkpoint — 21 October 2026

Branch: `codex/compact-materials-and-paper-views`. **Not deployed.**

## Implemented

- Compact board → class → subject → material navigation; study resource types appear in the subject list. The old standalone study directory redirects into the hierarchy.
- Shared digital/original document controls, with a lazy PDF.js page renderer, page selection, zoom and direct PDF fallback. Original PDFs stream with byte-range support.
- Paper practice answers, explanations and checked-question scores remain accessible.
- Missing mappings no longer imply “outside syllabus.” Following the owner's decision, historical source references are displayed separately from reviewed current-syllabus mappings. Matching code numbers alone never establish historical/current equivalence. Unverified historical references and current mappings stay pending.
- Administrator uploads can opt into publication after every page passes review. Existing documents remain private by default. Subject availability derives from reviewed content, without another code release per upload.
- First admin uploads can register the declared supported board/class/subject. Registration is serialized per board and does not create syllabus versions or outcomes. New curriculum outcomes still need an actual reviewed syllabus.
- Breadcrumbs now use theme tokens rather than a hard-coded dark box. The final light/dark mobile bundle has been visually checked.

## Validation and release preparation

- Full regression suite: **136 tests passed across 23 files**.
- Lint and production build (including TypeScript) passed. Final label-spacing and dark breadcrumb fixes were rebuilt successfully. `git diff --check` passed.
- Checked the final bundle at 390 px in light and dark themes, and at 1280 px on desktop. No document-width overflow. Historical and current labels are separate. The breadcrumb is transparent and uses theme tokens.
- A synthetic reviewed upload served readable digital text and rendered its exact original PDF. Its temporary local publication flag was restored afterward. No synthetic content was published to production.
- Original annual PDF page controls and zoom worked in the phone preview. Practice checking and scoring were verified in the preceding preview.
- Proof files include `compact-final-paper-mobile-dark.png`, `compact-final-paper-mobile-light.png`, `compact-final-subject-desktop-light.png` and `compact-reviewed-upload-original.png`.
- Fresh production backup: `/var/lib/postgresql/18/docker/release-backups/pre-compact-materials-20261021-1905.dump`.
- Backup SHA-256: `da816edb29018e2df138cd1e96889c36bb7f8d28674c2cb3fac1ce9e1fc69707`; archive list: 510 lines.
- Restored successfully to isolated `mcqs_compact_release_test_20261021`; additive migration rehearsed successfully. Rehearsal retained 5 quiz attempts, has 10 finished migrations and 0 publicly enabled source documents.
- Exact new migration SQL SHA-256 (LF): `14b6d1ca620ebdde05ae947604509ae94f1a09a20d9198c5b60a754f19f9d519`.

## Release ordering

Create and validate the GitHub PR, then apply the rehearsed additive migration before merging. Dokploy serializes builds and starts workers before web; applying the schema first prevents workers querying absent fields. Existing sources default to unpublished. Verify the web, both workers, preserved attempts and live UI after all deployments finish.

The earlier approval-review usage interruption has cleared. GitHub authentication was verified with network access. At this checkpoint production is still on PR #9, commit `6b8bbda4affe1e4b7668c056bb6e7bc89b9a1be1`; deployment verification will be recorded separately after release. The owner's local 3101 process was not changed.

## Academic limits

The original syllabus edition for the 2025 paper has not been verified. Questions 20–22 carry gravitation codes inconsistent with the current file's chapter 5, Deformation of Solids. No replacement SLOs were assigned. The remaining supplied historical codes are not certified current-syllabus mappings merely because the numbers exist today.

An uploaded syllabus becoming readable does not automatically activate a new structured curriculum. Generated notes still require a reviewed curriculum scope and their own publication review. No claim of complete academic accuracy or measured peak production capacity is made by this release.
