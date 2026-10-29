Release update: the approved production rollout is complete. See [live release verification](verification/PRODUCTION-RELEASE-2026-10-20.md) for current migration, worker and queue status, and [people dashboards](PEOPLE-DASHBOARDS.md) for the subsequent administrator/teacher enhancement. Pre-release statements below describe the earlier local audit.

# Website remediation status

20 October 2026. Read alongside the historical [37-item audit](WEBSITE-AUDIT-2026-10-20.md).

## Implemented

- Selected chapter/cognitive practice prepares a server-owned subset, preserves the selected questions, and bounds practice preparation requests. Matching rejects contradictory/unknown entries.
- Teacher submission responses match the existing table and review links. Written responses, matching responses, pending grades and teacher feedback have appropriate result views. Authorized teachers can mark responses from the results screen.
- Release policies are explicit: immediate, held, or scheduled. Teachers can release/schedule results independently of frozen exam editing and keep answer keys hidden while releasing feedback.
- Dashboard authentication/authorization and request failures have distinct states. Totals use aggregate counts, lists have pagination, and student history retains submitted results awaiting release.
- Classroom creation/joining validates inputs and status. Teachers can assign/unassign published quizzes, set deadlines, inspect rosters, remove/restore memberships and archive/reactivate classrooms. Private-assignment deadlines bound new attempts. Students see their enrolled classrooms and assigned quizzes.
- Class and subject metadata is persisted through real academic catalog IDs and read back for editing/filtering. Public catalog status/visibility filters are honored. Quizzes and question-bank lists support pagination.
- Builder preserves diagram/unit/source/review fields, imports type-specific data with validation, starts as unsaved, reports edit-loading failures, supports duplication of frozen quizzes, warns on unsaved exit and offers per-account browser-tab draft recovery.
- AI review no longer invents confidence or claims guaranteed accuracy. Educators can revise question data/rubrics, approve revisions, synchronize approved copies in the builder and restore completed generation jobs from job history.
- Account page supports teacher-access requests, email verification, single-use password-reset links and revoking sessions. Admin account management exposes existing authorization/audit controls. Teacher registration remains subject to administrator approval.
- Exam storage is namespaced by account and paper, logout cleanup is centralized, cross-tab logout clears active exam state, expired-submission retries are bounded, answer changes initiate synchronization, and extended-practice/retry/telemetry wording reflects actual behavior.
- Unsupported late-answer acceptance and AI written grading are rejected rather than silently accepted. Required-question flags are advisory: unanswered items receive zero, including deadline submission. Written grading is performed by teachers.
- Resource class exports use exact class matching; numeric CSV question numbers are normalized. Model exports include the supported static catalog when database-only records are absent. Unsupported years/unknown paper IDs no longer silently return a different paper.
- Generated positional SLO codes were removed. Missing academic mappings and unsupported class/subject resources are no longer represented as verified material. Real supplied mappings still need editorial validation.
- Class X books and pacing downloads now point to the existing SSC-II guides, rather than SSC-I content or a missing filename.
- Duplicate Home breadcrumbs, several false counters, contradictory digital-paper instructions, misleading download completion text and the missing Class X pacing-guide destination were corrected.
- Upload metadata preserves paper/solution choices, undetectable paper identity fails instead of guessing a year/class, status follows the returned job ID, progress reads per-job output and unreported totals remain unreported. Pacing-guide processing is explicitly unavailable.
- Shared dialogs support labelled roles, keyboard focus containment, Escape and focus restoration. Responsive grid/table handling and reduced-motion behavior were improved without replacing the existing design. Main navigation includes the account page; major sections have distinct page titles.

- Follow-up: independent attempt transactions use row locks without cross-student serializable contention; rate limits are atomic. A bounded priority admission queue and optional durable submission receipts defer grading to EXAM_GRADE workers. Receipt timestamps, answer closure, replay safety, pending-result UI and lightweight status polling are tested. Cleared answers no longer receive negative marks or unnecessary manual grading. AI review comparison now covers all normalized question fields.
- Live inspection found an account-only PostgreSQL 18 schema, no application volumes, and no worker. A guarded account-only bootstrap was rehearsed locally, preserving accounts and revoking legacy sessions. Production schema changes remain pending the documented release prerequisites.

## Verification

- Automated regression suite: 39 tests passing at the latest recorded run, including private-classroom assignment/enrollment, authorization, written grading/release with hidden keys, server-owned practice subsets, contradictory matching rejection, content provenance, field preservation and single-use password-reset/session revocation.
- Production compilation, standalone type checking and lint passed. HTTP integration checks passed for login bypass rejection, roles, hidden keys, answer validation, scoring, ownership and frozen exams.
- Browser verification covered student access guards, held-result history, selected practice questions, teacher marking/feedback and result release, classroom roster controls, keyboard Escape/focus restoration, and desktop plus 375px teacher/exam layouts. A clipped mobile Finish Quiz control was fixed and rechecked. Screenshots are saved in verification/.
- Separate deadline and grading worker smoke checks passed. A fresh full-schema migration rehearsal preserved all 10 historical local attempts. The account-only bootstrap rehearsal preserved account data and applied both migrations.
- Tests and previews use the dedicated local test database. This pass does not apply migrations to the main database or deploy externally.

## Remaining validation and content work

These are not certified complete merely because controls or code now exist:

1. Deliver real recovery/verification emails, exercise live Google OAuth, cloud storage and full OCR/AI ingestion using configured services. No external delivery or live-model accuracy is claimed by the local tests.
2. Obtain and review missing original papers, Class X practical resources and detailed book-edition metadata and authoritative paper specifications. Unsupported resources are shown honestly rather than fabricated. Uploaded annual records now retain their real year when a distinct source PDF exists; annual-to-model substitutions are rejected, and uploaded-only PDFs do not invent extracted questions. Model-question chapter grouping remains labelled provisional; full SLO/chapter editorial mapping is not completed.
3. Verify all narrow-screen, touch, zoom and screen-reader combinations; desktop browser checks and responsive CSS changes do not certify all devices.
4. Benchmark exam-end bursts, autosave traffic, worker recovery and database saturation against the intended hosting resources. Local synchronous bursts of 100 and three repeated 200-student rounds passed after fixing unnecessary transaction conflicts. Queued mode subsequently passed 100- and 200-student rounds with the bounded admission queue and a real grading worker; at 200 students receipt p95 was 713 ms and the single-worker grading drain took 4.95 seconds. This does not establish hosting capacity or the 20,000-submission target. See DOKPLOY-RELEASE.md and verification/load-*.json.
5. Rehearse the final release against a fresh main-database backup, provision the intended administrator, configure workers/providers and apply the existing migrations through the documented rollout. The main database remains unchanged.

The audit's optional new learning products—adaptive mastery, spaced revision, a mistake notebook, lab notebooks and paper blueprints—are a separate feature backlog, not included in the bug-remediation completion claim.
