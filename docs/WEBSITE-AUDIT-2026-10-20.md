# Website functionality and UI audit

Date: 20 October 2026

## Scope and evidence

This is an audit and feature backlog, not a claim that the findings below have been fixed. The existing visual design was preserved.

- Inventoried all 37 `app/**/page.tsx` files and reviewed the main navigation, authentication, assessment, dashboard, curriculum, resource and ingestion implementations and their supporting APIs.
- Made HTTP checks against 37 concrete page URLs on the isolated production preview at `localhost:3101`. They returned successful pages or followed redirects successfully. A successful HTTP response does not establish functional correctness.
- Checked 106 unique links extracted from 17 server-rendered pages; that particular set returned no HTTP errors. Separately found a 404 in the alternate Class X model-paper content. Controls that appear only after interaction need separate testing.
- Browser-reproduced teacher access-screen failure, a broken chapter timed-quiz launch, misleading past-paper inventory, ineffective subject filtering, Class X books showing Class IX material, duplicate breadcrumbs, and contradictory written-paper metadata.
- Directly reproduced Class X resource export including Class IX units and ambiguous matching answers receiving full marks. The scoring reproduction loaded the real scoring and validation modules in memory; it did not change student records.
- The preview uses a migrated test database. The main database has not been migrated as part of this audit. Empty model-paper database exports in that environment are evidence of inconsistency with the static library, not proof that production has no papers.

Not verified exhaustively: every dynamic ID, every role in a live browser, phone/tablet layouts, screen-reader operation, external email/OAuth/cloud delivery, all original PDF contents, full OCR ingestion, and high-volume exam traffic. Source-confirmed findings below are distinguished from browser/API reproductions. The audit does not certify academic answers or official board endorsement.

Priority: P1 = incorrect assessment behavior or a blocked core workflow; P2 = misleading output, incomplete functionality or significant usability issue; P3 = polish or an enhancement.

## Findings requiring fixes

### Assessments, practice and results

1. **P1 — Chapter timed quizzes fail to launch.** Browser: open `/akueb/IX/physics/mcqs`, select a unit, choose “Take A Timed Quiz”, then Start. Setup advertises the selected items, but the active view returns “Assessment not found.” `McqsClient.tsx` sends `PHY-IX-MCQS`; the server practice resolver does not support that code. Neither selected unit nor cognitive filter is sent as a server-validated practice specification. Fix: create a canonical practice-session endpoint that resolves the actual selected question IDs and freezes that subset. Verify chapter, cognitive and full-book launches independently.

2. **P1 — Matching can award marks for contradictory answers.** Direct scoring reproduction: for two left/right pairs, submitting all four possible combinations earns 2/2. `gradeAnswer` checks whether each correct pair appears anywhere and does not reject repeated left entries. Fix: validate one selection per left item, reject unknown sides and enforce the intended reuse policy. An ambiguous payload must fail validation rather than earn marks. Sources: `services/assessment/scoring.ts`, `lib/validations/assessment.ts`, `saveAnswer`.

3. **P1 — Teacher submission rows use a different response shape from the API.** Source-confirmed: teacher API returns attempts with `id`, nested `student`, nested `quiz` and `totalScore`. The table reads `attemptId`, `studentName`, `studentEmail`, `quizTitle`, `score`, `maxMarks` and `percentage`. Names and scores can be blank; review links contain `attemptId=undefined`. Fix: one typed submission response, including maximum marks computed from the frozen snapshot. Source: teacher dashboard page and API.

4. **P1 — Manual grading has an API but no usable grading screen.** The grade endpoint exists, but teacher submission links lead to the student-style results page. There are no marks/feedback controls calling `/grade`, and result questions do not expose the `quizAnswerId` that the endpoint needs. Fix: an authorized marking workspace showing the original response, rubric, marks, feedback, pending count and save status. Sources: results page, results service, grade route.

5. **P1 — Score-release controls do not govern actual release.** The builder exposes `immediateFeedback`, while `resultsReleased` reads `resultVisibility` and `resultReleaseDate`. Turning off immediate feedback alone leaves results immediately visible. `/release` exists but has no teacher UI. Scheduled release has no complete date-entry workflow. Fix: one explicit release policy control and a post-submission release/schedule action. Never reveal keys before the chosen policy permits it.

6. **P2 — Unmarked written responses look like wrong answers.** Source-confirmed: the results page treats `scoreAwarded: null` as neither correct nor partial and gives the question the red incorrect presentation. Written and matching response bodies are not rendered in the question review. Fix: distinguish awaiting marking, unanswered, incorrect, partial and correct; render every supported response type. Sources: results page and `getResults`.

7. **P2 — Teacher feedback is coupled to showing answer keys.** The results service includes `gradeRecords` only when `showKey` is true and omits `teacherComment`. The page does not render a teacher-feedback section. Fix: authorize feedback separately from model answers; allow comments to be released while keeping keys hidden.

8. **P2 — Several assessment settings are stored without matching behavior.** `allowRetries` is not consulted when starting an attempt; only `maxAttempts` is used. `isRequired` is stored but does not block early submission. `aiGradingMode` has no written-answer grading worker. The configured warning threshold does not control the dashboard's hardcoded `> 2` flag rule. `lateSubmissionAllowed` has no late-answer acceptance policy. Fix: implement each supported policy or stop presenting it as active functionality. Decide explicitly whether required questions are mandatory or merely recommended, including automatic deadline submission.

9. **P2 — Exam recovery and status need clearer limits.** Source-confirmed: expiry submits already-saved answers without flushing dirty local answers; saves after the deadline are rejected. Automatic failed submission can retry every timer tick. “Untimed” practice actually has a 24-hour server deadline. Fix: visible last-server-save time and pending count, bounded submission retry/backoff, clear expired-unsynced explanation, and accurate untimed wording. Keep deadline validation authoritative; do not trust client timestamps to accept late edits.

10. **P2 — Fresh shuffle and telemetry wording exceed behavior.** The result button promises a fresh shuffle although randomization depends on settings. Away duration can display 0 seconds despite the current engine recording only visibility events. Written-grading and loading copy mentions AI/RAG processing that is not actually scheduled there. Fix: display only measured telemetry and implemented work. Sources: `TakeQuizModal.tsx`, results page, exam hook.

### Dashboards, classroom access and authentication

11. **P1 — Dashboard access failures render as empty successful dashboards.** Browser-confirmed: a signed-in test student sees the teacher portal's empty metrics and creation actions. The teacher API correctly denies access; the page checks obsolete `requireAuth` and `role` fields rather than HTTP status/error code. The student page similarly has no proper unauthenticated/error state. Fix: explicit loading, sign-in required, forbidden, unavailable and empty-data screens with retry. Sources: both dashboard pages and `lib/api.ts`.

12. **P1 — Private classroom assignment is unfinished.** Classroom creation and joining exist, and quiz access checks assignments, but no assignment mutation or UI creates `QuizAssignment` records. “Classrooms & Rosters” displays counts and join codes without roster/member management. Students have no joined-classrooms view. Fix: assign an assessment to selected classrooms, list/manage enrolled students, show assigned work and due dates, and enforce assignment deadlines. Source: classroom routes, dashboards and schema.

13. **P2 — Classroom joins ignore classroom and membership state.** Source-confirmed: join lookup does not reject an inactive classroom; any existing membership is reported as already enrolled, even when `REMOVED` or `INVITED`. Duplicate parallel joins can hit the unique constraint instead of returning an idempotent result. Creation/join lack the shared origin-validation/rate-limit/strict-schema pattern, and the academic year defaults to 2025–2026. Fix: explicit status transitions, validated metadata, controlled invitations, join throttling and concurrency-safe membership creation.

14. **P2 — Dashboard totals are capped samples presented as totals.** Teacher submissions count only the newest 25; quizzes/classrooms cap at 100; flags cap at 10. Student attempt history and averages cap at 100. Fix: separate aggregate queries from paginated lists and clearly label time ranges. Do not derive lifetime totals from a display page.

15. **P2 — Submitted results awaiting release disappear from student history.** Student API includes only released completed attempts plus in-progress attempts. Unreleased submitted work is absent from both. Fix: show an immutable submission receipt and states such as “Submitted — awaiting marking” and “Results release pending”, without exposing scores.

16. **P2 — Teacher registration has no approval journey.** The modal offers a teacher role, but registration correctly creates a student account. There is no request/approval status or explanation to the applicant. User-management APIs exist without an administration screen. Fix: teacher-access application, admin approval/rejection with audit, and a visible pending status; never grant the role simply from the registration selection.

17. **P2 — Account recovery and verification are incomplete product flows.** No forgotten-password/reset UI or routes were found. Email/password registration leaves `emailVerified` false without an explicit verification journey in the modal. Fix: expiring single-use recovery/verification tokens, resend limits, verification state, profile settings and session management. Do not reuse a login OTP as an unrestricted password-reset token.

18. **P2 — Logout behavior differs by entry point.** Navbar logout clears exam cache, but dashboard logout handlers call only the logout API. Exam cache is keyed by paper rather than user plus attempt, and offline fallback can restore a cached exam without a successful current-user check. Fix: centralize logout cleanup, namespace local records, and prevent a new/shared-device session from opening another student's cached work. This is source-confirmed; cross-account offline leakage was not browser-reproduced.

### Builder, question bank and AI review

19. **P1 — Class and subject selections do not persist into quiz metadata.** Builder sends `classLevel` and `subject`, but create/update do not map them into `Quiz.classId`/`subjectId`; edit loading does not restore them. The catalog filter compares class IDs to numbers and subject IDs to display names; null metadata automatically passes. Browser: selecting Chemistry still shows the Physics practice paper. Fix: canonical class/subject IDs, persisted relations, consistent API fields, and filters that actually exclude unrelated records.

20. **P2 — Catalog visibility/status filters are ignored by the API.** The catalog asks for public published quizzes, but GET reads only `teacherId`. An educator can therefore receive their own draft/private/archived records in the public catalog. Start correctly refuses unpublished quizzes, creating a dead-end card. Fix: apply validated requested filters in addition to access scope and paginate results.

21. **P2 — Builder round trips lose supported content.** Builder uses `drawingSvg`, `unit`, `acceptedAnswers`, `pastPaperRef` and custom difficulty text; the server schema strips these fields. The server uses `diagramUrl`, while edit/results components expect `drawingSvg`. Edit loading also drops `reviewId` and `sloId`. JSON import preserves only a subset of type-specific fields, so numerical/matching imports lose required data. Fix: one shared question contract, complete type-aware import/export and save–reload preservation checks. Sanitize any supported inline SVG before rendering.

22. **P2 — Builder save/load UX can misrepresent state.** New builder starts with sample questions and “saved” despite no persisted quiz. Failed edit responses do not set an error unless fetch throws, leaving a saving state and sample content. Metadata edits can be lost on navigation because there is no draft recovery/unsaved-exit guard. Editing an attempted quiz remains offered although the API freezes it. Fix: clear new/draft/saving/saved/error states, explicit load errors, recoverable drafts and “Duplicate as new version” for frozen quizzes.

23. **P2 — Question-bank filters differ between database and fallback paths.** Source-confirmed: DB lookup applies text and difficulty but not board/class/subject; fallback always loads Physics. Roman `IX` also satisfies the fallback's Class X substring check. Persisted question enums such as `MULTIPLE_CHOICE` need normalization before insertion into the builder's `MCQ_SINGLE` contract. Fix: identical scoped filtering and normalization for every source, an explicit no-results state and cursor pagination.

24. **P1 — AI review displays invented confidence and accuracy claims.** Source-confirmed: `confidenceScore || 0.8` renders null and even zero as 80%. Empty pending queue says all questions are “100% Accurate”. Neither statement follows from review data. Fix: show unknown confidence as unavailable, preserve numeric zero, display reviewed/pending counts and remove guaranteed-accuracy claims. Source: teacher dashboard AI review section.

25. **P2 — AI review is disconnected from builder revisions.** Approving/correcting a queued item does not update its inserted builder copy. Publication checks exact approved stem/options and can reject the stale copy; edited AI content has no resubmission action. The correction UI assumes one correct choice and cannot fully review numerical/multiple-answer/rubric items. Fix: fetch approved revision, show revision differences, support type-specific review, and allow resubmission. Retain generation job IDs so queued work can be reopened after navigation.

### Curriculum, archives, books and downloads

26. **P1 — Past-paper provenance and counts are misleading.** Browser: Unit 1 past-paper tile advertises 28 verified 2018–2024 items but opens the same five model questions. Unit scope is inferred from question-number ranges, not actual chapter/SLO mapping. Several named full-book tracks reuse one question array. `getFallbackPaper` also reuses model CRQs for a 2024 past-paper code. Fix: actual paper/year/source identifiers, verified item counts and a distinct unavailable state rather than relabeling model material.

27. **P1 — Some SLO mappings are fabricated from row position.** Source-confirmed: theory-paper fallback creates codes such as `2.${idx + 1}` and labels them in-syllabus. The viewer links those codes to syllabus pages. This can send learners to unrelated outcomes and invalidate future mastery analytics. Fix: only publish reviewed mappings to real SLO records with a syllabus version; show unmapped when evidence is absent.

28. **P2 — Written-paper metadata contradicts itself.** Browser: Class IX P2 header says 25 marks / 1h40, while its digital instructions say 35 marks / 1h45; the paper contains 12 items and mixes the presentation of required/optional questions. Fix: derive header, instructions, section structure, question order and totals from one verified paper specification. Confirm against the actual PDF before deciding which values are correct. Sources: model-paper detail page and `PaperViewerClient`.

29. **P2 — Class X books and practicals reuse Class IX content.** Browser-confirmed books page lists Physics 9 / Grade IX references and links the SSC-I concordance PDF. Practicals source always imports SSC-I experiments/PDF. Generic subject syllabus/MCQ routes import Physics data without enforcing supported subject/board/class combinations. Fix: route-specific content availability and honest unavailable pages; never show another curriculum under a new heading.

30. **P2 — Class X resource export includes Class IX units.** API reproduction: `/api/resources?export=all&class=10` returns both classes because `Class IX` contains the character `X`. Fix: exact canonical class comparison shared between listing and export. Also normalize numeric/string question numbers in CSV export and preserve correct options/mark schemes consistently across download formats.

31. **P2 — Static and database libraries disagree.** In the isolated preview the model-paper UI contains static papers while `/api/model-papers` exports zero database papers. The global `/mcqs` page queries `MCQ_SINGLE` while fallback paper data uses other question enums. Fix: one catalog repository shared by pages, exports, bank and practice; consistent question-type normalization and provenance. Treat zero database results separately from source failure.

32. **P2 — A download is missing and download completion is assumed.** Confirmed 404: `/materials/ssc/physics/ssc-2/pacing-guide-2025-for-ssc-ii-physics.pdf`, referenced by the alternate Class X model-paper view. Download countdown marks its state as triggered before verifying file availability; it cannot know the browser saved it. Fix: valid asset catalog, file existence/type checks, retry/open-PDF fallback and accurate “download requested” wording.

### Uploads, shared UI and navigation

33. **P2 — Upload controls exceed the accepted ingestion contract.** UI offers `pacing_guide`, rejected by the upload schema. UI sends `paperComponent` and `solutionStatus`, but the ingestion payload discards them even though the Python past-paper pipeline reads them. “auto” metadata remains unresolved strings. Fix: shared resource-type schema, explicit metadata resolution/review and preservation of all supported fields.

34. **P2 — Upload progress and totals can be misleading.** Page polls the latest job instead of its returned job ID; status API returns 0 until completion, empty logs and no intermediate stage. Completion cards substitute 299 SLOs and 99 questions when real counts are zero or absent. Fix: per-job progress/history, processed-page/error counts, true zero values, reviewed publication step and bounded retry/cancel controls.

35. **P2 — Error handling and resource previews can show the wrong state/content.** Catalog/resource/dashboard fetch failures frequently fall through to empty-list screens. Resource detail does not clear previous detail on a new request or guard out-of-order responses, so a failed/slow selection can show the previously selected unit under the new title. Structured error objects are still passed directly to alerts in teacher actions. Fix: shared request/error handling, stale-request cancellation, cleared detail and visible retry.

36. **P2 — Modal accessibility and responsive layout need completion.** Auth/download/resource modals lack a complete dialog role, labelled title, focus containment, Escape behavior and focus restoration. Several close controls have no accessible name. Hardcoded white/light surfaces remain in dark mode. Fixed minimum grid/table widths need phone testing rather than assuming desktop wrapping is sufficient. Fix keyboard behavior against the W3C dialog pattern and test at 320/375/768-pixel widths plus 200% zoom. These are source/desktop observations; mobile and assistive-technology behavior have not been fully tested.

37. **P3 — Navigation and content credibility need consistency.** Browser shows `Home > Home` because Breadcrumbs supplies Home and callers supply it again. Homepage says eight Class IX chapters while practice lists nine units and other copy claims ten. Footer links offer Chemistry/Math while primary navigation marks them unavailable. Most pages inherit the same title. “Official”, “partner”, “approved” and “verified” claims should be tied to documented source/approval evidence. Fix centralized availability/count metadata, canonical routes, unique page titles and accurate attribution.

## Features that would add the most value

| Feature | Useful user outcome | Prerequisites and completion criterion |
|---|---|---|
| Teacher marking and release workspace | Teachers finish the whole assessment lifecycle | Fix items 3–8. Mark written work, save comments, resolve pending state and release scores without revealing hidden keys. |
| Classroom assignments and gradebook | Private classes become usable teaching spaces | Fix items 12–14. Assign quiz, set due date, show roster/progress, export class results and handle removal/re-enrollment. |
| Mistake notebook and “retry my mistakes” | Results lead directly to focused practice | Store question/revision/SLO references and learner notes; retry as a new practice session without changing the original exam score. |
| Bookmarks and cross-device practice history | Learners can resume useful material | Authenticated persistence, clear device/offline state and user-scoped cache; distinguish study activity from official attempts. |
| SLO progress map | Learners and teachers see what needs work | Fix fabricated mappings first. Show attempts, accuracy, recency and insufficient-evidence states rather than declaring mastery after one answer. |
| Spaced revision and daily study plan | Learners revisit material over time | Build on validated SLO mappings and mistake history; provide a due-review queue, exam date, time budget and user-controlled reminders. |
| Paper blueprint generator | Teachers create balanced, curriculum-aligned papers | Select marks, chapters/SLOs, question types, difficulty and cognitive distribution; report insufficient bank coverage rather than silently substituting questions. |
| Question quality and misconception analytics | Teachers identify confusing items and common errors | Collect enough attempts, show sample size, option distribution, item difficulty and discrimination; flag suspect keys for review. |
| Cited concept help | Learners understand why an answer works | Link explanations to actual textbook pages/SLO evidence, distinguish generated help from reviewed solutions and restrict exam-time assistance. |
| Content issue reporting and version history | Learners can flag a wrong key or missing diagram | Track report status, reviewer decision, affected revisions and transparent corrections; retain historical exam snapshots. |
| Practical lab notebook | Practicals become interactive learning activities | Correct class-specific experiments first; add observation tables, uncertainty, graphing, calculations and teacher feedback. |
| Printable student papers and separate marking schemes | Teachers can use the platform in class/offline | Accurate section/choice rules, diagrams, page breaks and totals; student PDF excludes keys, teacher PDF includes approved rubrics. |
| Search across papers, SLOs and resources | Learners find content without guessing routes | Canonical catalog with board/class/subject/year filters, pagination, stable links and meaningful no-results states. |
| Account and educator administration | Access changes are understandable and manageable | Teacher approval, account verification/recovery, session controls and audited role management. |
| Saved resource packs for weak connectivity | Learners access chosen materials reliably | Explicit download quota/version, offline availability indicators and user-scoped storage; keep exam deadlines authoritative. |
| Submission receipts and notification inbox | Learners know what was submitted and when results arrive | Immutable receipt with attempt ID/server timestamp, pending-release view and user-controlled notifications. |

Suggested later extensions: Urdu/English explanations with consistent math rendering; assignment discussions and teacher office hours; optional parent progress summaries with explicit learner/guardian access rules; school tenancy after the single-school workflows are complete. These should follow core correctness work, rather than being the next implementation batch.

## Recommended implementation order

1. **Restore trustworthy output:** chapter quiz launch, matching validation, teacher submission contract, release-policy control, pending-grade states, real confidence/provenance and curriculum scoping.
2. **Complete teaching workflows:** marking workspace, result release UI, classroom assignment/rosters, teacher approval and recovery.
3. **Make the experience consistent:** canonical content catalog, preserved builder fields, truthful exports/downloads/job progress, proper error states, keyboard/mobile usability.
4. **Add learning value:** mistake notebook, bookmarks, SLO progress, spaced revision and blueprint generation.
5. **Prove operational readiness:** load-test simultaneous autosaves and exam-end submissions, monitor database/worker queues, rehearse backup recovery and verify external services.

## Acceptance checks for the next implementation pass

- All advertised practice tracks start the intended subset; switching a subject/class changes the actual returned content.
- Every supported question type survives create → save → reload → attempt → mark → review/export without lost fields.
- Contradictory matching payloads fail validation; hidden keys and unreleased scores stay hidden.
- A teacher creates a classroom, enrolls a test learner, assigns private work, grades it and releases results entirely through the UI.
- Student history retains submitted-but-unreleased work, and teacher totals remain correct beyond pagination boundaries.
- Failed requests never display fabricated totals, a false empty-success screen, or another resource's content.
- Null and zero confidence remain distinct; model questions are never presented as a different year's authenticated paper.
- Main flows work with keyboard alone and at phone widths/zoom; close buttons and status messages are accessible.
- Downloads return the correct file type and curriculum, and processing status follows the specific upload job.

## Reference guidance

- [W3C modal-dialog interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus management, keyboard behavior and dialog labelling.
- [IES: Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): supports spacing learning over time and using quizzes for retrieval practice. This supports the revision/mistake-practice direction, not a guarantee that a particular adaptive algorithm improves outcomes.
