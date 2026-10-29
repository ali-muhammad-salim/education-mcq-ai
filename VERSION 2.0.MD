# Educational Resource Hub & Secure Assessment Platform

## Master Implementation Specification for Antigravity

**Project type:** Extend an existing production-oriented educational
resource hub.\
**Supported grades:** Classes IX, X, XI, and XII, with architecture that
supports additional grades and boards later.\
**Primary objective:** Build a reliable, scalable educational resource
and assessment platform while preserving the existing RAG system, AI
pipeline, MCQ extractor, embeddings, database, and educational
materials.

------------------------------------------------------------------------

# How Antigravity Must Use This Specification

Treat this file as the persistent project specification. Read it before
making architectural or implementation changes.

This is an existing project, not a greenfield project.

**Non-negotiable rules** - Inspect the repository, architecture,
database schema, migrations, routes, authentication, APIs, RAG pipeline,
MCQ extraction, embeddings, and deployment configuration before changing
anything. - Reuse working functionality. Do not replace or duplicate
existing systems without a documented technical reason. - Do not delete
existing resources, records, tables, migrations, or features. - Preserve
the existing technology stack unless a genuine limitation requires a
change. - Do not use mock data or placeholder interfaces as substitutes
for functioning features. - Keep secrets server-side and never expose
API keys, database credentials, OAuth secrets, or private storage
credentials in frontend code. - Enforce permissions, assessment
deadlines, grading rules, and data access on the server. - Implement
features incrementally, test each phase, and fix regressions before
proceeding. - Do not claim that a feature is complete or tested unless
it actually is. - When a requirement conflicts with the existing
architecture, explain the conflict and propose the least disruptive safe
solution. - Never overwrite or migrate production data destructively
without a backup and an explicit migration plan.

## Required Working Method

For each phase: 1. Inspect relevant existing files and services. 2.
Briefly explain the intended changes. 3. Implement the feature in the
current architecture. 4. Add database migrations when needed. 5. Connect
frontend, backend, and database. 6. Add validation, authorization,
loading states, and error handling. 7. Run relevant tests, linting, type
checks, and builds. 8. Fix regressions before continuing. 9. Report
changed files, migrations, tests performed, environment variables
required, limitations, and the next phase.

Do not stop after an audit or plan. Complete the implementation phase by
phase. If a blocker exists, describe it precisely and continue with
independent work that can safely proceed.

------------------------------------------------------------------------

# Phase 0 --- Repository Audit and Architecture Plan

Before implementation, inspect: - Frontend framework, routing, component
library, design tokens, and current pages. - Backend framework, APIs,
background jobs, and service layer. - Database technology, schema, ORM,
indexes, migrations, and existing data relationships. - Authentication,
sessions, roles, and permissions. - RAG retrieval, document ingestion,
embeddings, MCQ extraction, and Gemini integration. - Existing board,
class, subject, chapter, topic, SLO, resource, and question
structures. - File storage, search, analytics, email, monitoring,
hosting, and deployment. - Tests, linting, build commands, and current
security controls.

Produce a concise audit with: - Current architecture and working
features. - Components to reuse. - Missing functionality and
dependencies. - Proposed schema changes and relationships. - Security
and migration risks. - A phased implementation plan with acceptance
criteria.

Then start implementation; do not finish after producing the report.

------------------------------------------------------------------------

# Phase 1 --- Educational Resource Hub

## 1. Navigation hierarchy

Implement a database-driven hierarchy:

**Board → Programme (where applicable) → Class/Grade → Subject →
Resource Category → Chapter → Topic/SLO → Resource**

The homepage should show available educational boards as headings or
sections. Under each board, display configured classes such as IX, X,
XI, and XII. Only display enabled records that actually exist.

Clicking a class opens a subject listing.

## 2. Subject cards

Show subjects in a responsive card layout: - One column on narrow mobile
screens. - Two or more columns on wider screens, depending on available
space. - Subject name and optional icon/cover. - Useful counts such as
chapters or available resources. - Clear action to open the subject.

Use the existing design system and avoid unnecessary visual clutter.

## 3. Subject resource archive

Use the supplied "Model Examination Papers" screenshot as a reference
for a simple, readable archive: clear title, vertically stacked resource
links, generous spacing, and distinct link styling. Modernize it into a
responsive interface without losing its simplicity.

Show breadcrumb navigation for board, class, and subject. Group
available resources under clear headings: 1. Official syllabus. 2. Model
examination papers. 3. Model-paper answer keys. 4. E-marking or
marking-scheme notes. 5. Past papers. 6. Chapter-wise past-paper
questions. 7. MCQs. 8. Chapter-wise quizzes. 9. Past-paper-based
quizzes. 10. Study notes and explanations. 11. Textbooks and reference
materials. 12. Practical and laboratory examination resources, where
applicable.

Each resource should show an appropriate title, description when
available, document type, year/version when relevant, and a suitable
open, preview, download, or start-quiz action. Do not show empty
categories as though they contain content.

Support chapter, topic, subtopic, and SLO navigation where those
relationships exist. Preserve source provenance and links to board,
class, subject, chapter, topic, SLO, and source paper.

## 4. Search and performance

Provide search, filters, pagination or efficient cursor-based loading,
useful empty states, and accessible loading/error states. Avoid
full-table queries, N+1 queries, and expensive AI/embedding calls during
normal page loads.

------------------------------------------------------------------------

# Phase 2 --- Authentication, Roles, and Academic Structure

## 5. Authentication and authorization

Implement or extend the existing authentication system: - Email/password
where appropriate. - Email verification and password reset. - Secure
sessions and logout/revocation. - Google sign-in using OAuth 2.0 /
OpenID Connect. - Account status, protected routes, and API
authorization. - Login/signup rate limits and secure account recovery.

Use Google OAuth Client ID and Client Secret through server-side
environment variables or a suitable secret manager. Never expose the
client secret in frontend bundles, public configuration, repository
commits, or client-side responses. Validate OAuth state, nonce, identity
tokens, and redirect URIs as appropriate.

Authentication and authorization are separate. Logging in must not
automatically grant teacher or administrator privileges.

## 6. Roles and permissions

Support students, teachers, and administrators, with granular
permissions as needed. Examples include resource management, quiz
management, grading, classroom management, user administration, and
platform administration.

Enforce authorization on the server. Never trust a role, user ID,
teacher ID, student ID, or class ID supplied by the frontend without
verifying it.

Students may access only their own private records and authorized
assessments. Teachers may access only the classes, quizzes, and student
records they are allowed to manage. Prevent privilege escalation and log
sensitive administrative changes.

Administrators must not be able to view passwords or recoverable
authentication secrets. Restrict access to sensitive student records and
audit access appropriately.

## 7. Academic configuration

Distinguish between: - **Academic class/grade:** e.g. Class IX. -
**Teacher-managed classroom/group:** a teacher's enrolled students.

Global academic configuration should include relevant fields: - Board. -
Programme/education system. - Class/grade. - Academic year/session where
needed. - Display name. - Supported subjects. - Curriculum/syllabus
version. - Active/inactive status. - Other metadata required by the
current architecture.

Use database-driven options rather than hardcoding boards, classes,
subjects, and syllabus versions in frontend components. Validate that
board, programme, class, subject, and curriculum relationships are
compatible. Only authorized administrators can change global academic
definitions.

## 8. Teacher-managed classroom creation

Allow authorized teachers to create classrooms/groups with: - Classroom
name and description. - Board and grade. - Academic session. -
Subjects. - Student enrollment/invitation method. - Classroom status. -
Optional classroom code or invitation link.

When a board changes, update valid grade options. When a grade changes,
update valid subjects. Use searchable dropdowns for large lists and
clear/revalidate dependent selections when parent choices change.

Support secure student invitations with appropriate expiry, access
rules, revocation, and removal. Prevent unauthorized enrollment and
duplicate membership. Enforce all rules server-side and audit important
membership/configuration changes.

Create reusable selectors for board, programme, class, subject, chapter,
topic, SLO, and academic year. Reuse them across classroom creation,
quiz creation, AI generation, question-bank filters, resource
navigation, reports, and admin tools.

------------------------------------------------------------------------

# Phase 3 --- Student, Teacher, and Admin Dashboards

## 9. Student dashboard

Include: - Assigned quizzes and upcoming assessments. - Available public
quizzes. - Private quizzes accessed through authorized
invitations/links. - Unlisted quizzes accessed through direct links
subject to access rules. - Deadlines and availability windows. -
In-progress and completed attempts. - Previous scores and performance
history. - Progress by subject, chapter, topic, or SLO. - Strengths and
weaknesses based on actual response data. - Incorrect answers and review
material when permitted. - Completion and time-spent statistics where
reliably measured. - Notifications and account settings.

Never allow a student to access another student's attempts, answers,
grades, or reports by changing a URL or API request.

## 10. Teacher dashboard

Include: - Create, edit, preview, publish, unpublish, duplicate, and
archive quizzes. - Manage classes/groups and authorized students. - View
assignments, active windows, submissions, and pending grading. - Share
quiz links/invitations. - View question-level and class-level
statistics. - Review student progress and learning gaps. - Review
suspicious assessment events. - Export authorized results. - Manage
question banks and reusable questions.

Enforce teacher permissions on the server.

## 11. Admin dashboard

Allow authorized administrators to: - Manage boards, programmes,
classes, subjects, chapters, topics, and SLO mappings. - Upload and
manage educational material. - Manage metadata, provenance, and content
visibility. - Manage users, teachers, students, roles, and
permissions. - Manage invitations and classroom membership. - Review
platform usage, system health, AI processing status, ingestion failures,
and extraction errors. - Manage search indexing, storage, and allowed
platform configuration. - Inspect assessment events and audit logs. -
Review reports and support requests.

Use granular permissions and audit sensitive actions. Protect private
student information.

------------------------------------------------------------------------

# Phase 4 --- Unified Quiz Builder

## 12. One familiar builder interface

Build a quiz builder inspired by the ease of Google Forms and Google
Classroom. Keep the learning curve low.

The teacher should be able to manage the quiz title, description,
question list, marks, grading settings, timing, access, schedule,
feedback, and other settings in one coherent builder. Use tabs,
collapsible sections, a side panel, or a responsive settings panel
rather than forcing users through many unrelated pages.

Include: - Editable question cards. - Add-question action. -
Drag-and-drop reordering where practical. - Duplicate/delete actions. -
Per-question marks and required settings. - Preview. - Clear save status
and autosave. - Save draft and publish. - Confirmation for destructive
actions. - Responsive layout and accessible controls.

## 13. Add questions from multiple sources

The Add Question menu must support: 1. Create manually. 2. Add from
Question Bank. 3. Generate with AI. 4. Import supported validated
files/resources. 5. Duplicate an existing question.

Teachers must be able to mix sources in one quiz. Example: select five
bank MCQs, generate three new MCQs with AI, add two numerical questions
manually, and create a written-answer question without leaving the
builder.

After insertion, teachers can edit, reorder, duplicate, remove, and
preview questions. Show provenance labels such as Teacher Created,
Question Bank, AI Generated, or Imported. Preserve official past-paper
provenance where applicable.

AI generation must work both when creating a new quiz and when editing
an existing one. It must never overwrite existing questions or reset
unrelated settings.

## 14. Question types

Support: - Single-choice MCQs. - Multiple-select questions. -
True/false. - Short-answer. - One-word answers. - Fill-in-the-blanks. -
Numerical answers with configurable tolerance. - Matching. -
Ordering/sequencing. - Long-answer/paragraph questions. - Image-based
questions. - Questions with mathematical notation, chemistry notation,
diagrams, tables, and other supported educational media.

Support relevant instructions, options, correct answers, accepted
alternatives, partial-credit rules, question-level marks, optional
negative marking, explanations, tags, and curriculum relationships. Use
the existing question bank and MCQ extractor when suitable.

## 15. Question bank selector

Allow filtering by: - Board. - Programme/class. - Subject. - Chapter. -
Topic/SLO. - Difficulty. - Question type. - Marks. - Source
examination/past-paper year where known.

Teachers can select individual questions or a batch. Show matching
count, selected count, total marks, and provenance before insertion.
Prevent unauthorized access to answer keys.

If too few questions match, explain the shortage and allow filter
changes or AI generation. Do not silently replace requested questions
with unrelated content.

## 16. Difficulty controls for both bank and AI

Both the question-bank selector and AI generation panel must support: -
Easy. - Medium. - Hard. - Custom.

For Custom, let the teacher define a label, description, or suitable
numeric scale. Store custom difficulty metadata consistently; do not
silently map it to a standard level.

For AI generation, allow a distribution, e.g. five Easy, three Medium,
and two Hard questions. Validate that the distribution matches the
requested total. Support question count, question types, marks per
question or custom marks, language where supported, and additional
instructions.

For bank selection, allow filtering by difficulty and selecting
individual or batches of eligible questions.

## 17. Gemini AI question generation

Reuse the existing Gemini integration and AI/RAG pipeline. Let teachers
specify: - Board, class, subject, chapter. - Topic/SLO where
available. - Difficulty and distribution. - Question types and count. -
Marks. - Language where supported. - Whether to include equations,
diagrams, tables, or visual content. - Additional instructions.

Generate a preview. Teachers can accept all, select individual
questions, edit, or discard them before insertion.

Validate structured output, answer-key consistency, marks, and question
type. Detect duplicates/near-duplicates where practical. Keep provenance
and validation status. Never label unverified AI content as an official
past-paper question. Do not auto-publish AI-generated questions without
teacher approval. Handle timeouts, rate limits, malformed responses, and
API failures. Keep API keys server-side and avoid duplicate AI calls.

------------------------------------------------------------------------

# Phase 5 --- Mathematical, Chemistry, and Visual Content Editor

## 18. Reusable rich-content editor

Implement a reusable editor for question statements, MCQ options,
explanations, model answers, written-answer rubrics, and AI-generated
questions after editing.

Provide a visible **Insert Equation / Symbol / Diagram** action.
Clicking it opens a modal/popup with a workspace. The teacher can
construct content and insert it at the current cursor position or
selected location.

The popup should include: 1. Canvas/preview. 2. Searchable symbol
library. 3. Structured equation editor. 4. Diagram tools. 5. Freehand
drawing canvas. 6. Insert/update, undo/redo, clear, cancel, and preview
actions as appropriate.

Opening or closing the popup must not erase the existing question or
option text. Teachers must be able to edit inserted content later.

## 19. Mathematical notation

Support: - Fractions. - Exponents/superscripts and subscripts. - Square
and nth roots. - Summations and products. - Integrals, derivatives, and
limits. - Matrices and determinants. - Parentheses, brackets, and
absolute values. - Inequalities, approximation, and common operators. -
Greek letters. - Vectors. - Algebra, trigonometry, logarithms, geometry,
calculus, statistics, and probability notation.

Provide a visual equation editor and, where practical, LaTeX input with
live preview. Consider KaTeX or MathJax based on compatibility with the
existing stack. Render equations consistently on teacher preview and
student quiz pages.

Do not rely only on screenshots where structured notation is possible.

## 20. Chemistry notation

Support: - Chemical formulas. - Subscripts and superscripts. - Ionic
charges. - Reaction and reversible reaction arrows. - Equilibrium
notation. - States of matter: solid, liquid, gas, aqueous. - Reaction
conditions, temperature, catalysts, and pressure labels. - Chemical
symbols and operators. - Oxidation states. - Isotopes. - Stoichiometric
coefficients. - Simple structural/bond diagrams where supported.

Example: `2H₂ + O₂ → 2H₂O`.

Preserve subscripts, charges, arrows, and reaction structure instead of
treating them as ordinary spaced text. Consider a compatible chemistry
rendering extension or a structured formula editor. Support diagram
construction where practical.

## 21. Symbol library

Provide a searchable library grouped into: - Basic mathematics. -
Algebra. - Geometry. - Trigonometry. - Calculus. - Statistics and
probability. - Greek letters. - Set theory and logic. - Physics. -
Chemistry. - Units and scientific notation. - Arrows and relations. -
General scientific notation.

Clicking a symbol inserts it at the current cursor or equation-editor
position. Include favorites/recent symbols and keyboard input where
practical.

## 22. Drawing canvas and diagrams

Support mouse, stylus, and touchscreen drawing. Provide: - Pen and
eraser. - Line and arrow. - Rectangle, circle, and other basic shapes. -
Text labels. - Connectors. - Undo/redo. - Clear canvas. - Basic color
and stroke width. - Zoom/fit-to-content where appropriate.

Provide a diagram mode for flowcharts and scientific diagrams,
including: - Start/end nodes. - Process blocks. - Decision blocks. -
Directed arrows/connectors. - Labels. - Move/resize. -
Alignment/grouping. - Editing existing nodes. - Preview.

Allow suitable diagrams such as physics circuits/force diagrams, biology
processes, chemistry reaction schemes, math graphs/geometry, and
computer-science flowcharts. Keep the editor extensible.

Store editable structured data or safe SVG where feasible, and generate
a safe rendered representation for students. Sanitize SVG and prevent
scripts, unsafe external references, and malicious embedded content.

## 23. Insert visual content into questions and options

The editor must work inside: - Question statements. - Every MCQ
option. - Correct-answer explanations. - Model answers. -
Written-response rubrics. - AI-generated questions. - Imported
questions, subject to permissions.

Example workflow: 1. Teacher creates an MCQ. 2. Teacher clicks the
equation/diagram action inside option B. 3. Popup opens. 4. Teacher
creates an equation or selects symbols. 5. Teacher clicks Insert. 6.
Content appears inside option B. 7. The teacher saves the question. 8.
The student sees the same content correctly rendered.

Preserve cursor position, surrounding text, and content on modal
open/close. Support editing previously inserted content.

## 24. Rich-content storage and security

Use a reusable structured rich-content model with typed nodes for text,
equations, chemistry formulas, images, and diagrams where practical.
Keep editable source representations separate from rendered
previews/assets where necessary.

Preserve compatibility with existing plain-text questions. Validate
editor output server-side, sanitize HTML/SVG, validate image references,
prevent stored XSS, and prevent unauthorized edits to shared
question-bank records. Preserve rich formatting through saving, editing,
preview, and student rendering. Make notation searchable where
practical.

------------------------------------------------------------------------

# Phase 6 --- Quiz Settings, Scheduling, and Sharing

## 25. Unified settings

Organize settings into understandable sections: 1. General. 2. Questions
and marks. 3. Difficulty and question sources. 4. AI generation. 5.
Grading and rubrics. 6. Timer and attempts. 7. Feedback and result
release. 8. Scheduling and deadlines. 9. Visibility and sharing. 10.
Student eligibility. 11. Assessment integrity. 12. Notifications.

Provide inline explanations and safe defaults. Reflect dependencies
immediately. Examples: - Manual grading updates result-release
options. - Timed quizzes expose duration settings. - AI generation
exposes generation parameters. - Question-bank selection exposes
curriculum/difficulty filters. - Disabling retries hides/disables
retry-specific settings. - Enabling tab monitoring exposes its warning
threshold.

Persist settings reliably and validate on the server. Explain
incompatible settings rather than silently discarding them.

## 26. Visibility, schedule, and sharing

Support: - **Public:** discoverable according to platform rules. -
**Unlisted:** not discoverable in listings/search but accessible via a
direct link subject to configured access rules. - **Private:** only
authorized/invited participants.

Unlisted must not mean unrestricted access to answer keys or student
data.

Each quiz supports start date/time, end date/time, time zone, duration,
attempt limits, retries, eligibility/assignment, late submissions,
result visibility, result release date, and instructions.

Display opening time, deadline, duration, and restrictions to students.
Enforce rules server-side.

Use clear statuses such as Draft, Scheduled, Available, In Progress,
Submitted, Awaiting Grading, Results Released, Expired, and Archived.

## 27. Quiz options

Support configurable: - Attempt duration. - Maximum attempts and retry
rules. - Random question/answer order where valid. - Immediate or
delayed feedback. - Correct-answer visibility. - Result release
settings. - Manual grading. - AI grading mode. - Negative marking. -
Question navigation. - Submission behavior. - Start/end times. -
Eligible participants. - Late-submission rules. - Anti-cheating
monitoring.

------------------------------------------------------------------------

# Phase 7 --- Assessment Engine, Saving, and Integrity

## 28. Timed quiz interface

Provide: - Quiz title and instructions. - Countdown timer. - Current
question/total. - Previous/Next. - Question navigation panel. -
Answered/unanswered indicators. - Mark for review if enabled. - Save
status and unsaved-answer warnings. - Remaining time. - Submission
confirmation. - Accessible keyboard navigation where appropriate.

The browser timer is only a display. The server is authoritative for
deadlines. Changing the browser clock or JavaScript must not extend an
attempt.

## 29. Autosave and recovery

Persist each meaningful answer change with an attempt ID, question ID,
answer payload, revision/version, and server timestamp. Use idempotency
protection where appropriate.

Implement: - Autosave and useful debouncing. - Immediate save attempts
on explicit navigation/submission. - Retry/backoff for transient network
failures. - Clear Saved/Saving/Unsaved status. - Recovery after reload
and reconnection. - Conflict protection for concurrent updates. -
Attempt ownership/status validation. - Append-only records for important
assessment events.

If a connection fails, show a reconnection indicator. Queue permitted
pending writes carefully and reconcile on reconnection. Do not promise
recovery of unsaved offline answers. Record detectable connection events
and reasons only when reliably known.

A reload must restore the existing attempt when permitted, not silently
create another.

## 30. Submission and timeout

At the server-controlled deadline: - Reject new answers. - Finalize the
attempt according to policy. - Preserve valid saved answers. - Calculate
automatically gradable marks. - Mark written answers pending grading. -
Show the correct completion state.

Make submission safe against duplicate requests. Apply documented
deadline behavior if connectivity fails near the deadline.

## 31. Anti-cheating controls

Offer configurable monitoring for: - Browser tab/window visibility
changes. - Focus loss where supported. - Repeated navigation away. -
Unexpected reloads. - Fullscreen exits if enabled. - Suspicious
submission patterns. - Concurrent/conflicting attempts. - Unauthorized
answer-key/API access.

Default tab-warning threshold: warn when more than two detected
tab-visibility changes occur, with a configurable threshold. Record each
detected event and display a warning. Keep a reviewable event history
for teachers.

Do not automatically declare cheating solely from tab changes.
Notifications, operating-system dialogs, accessibility tools, and
legitimate actions may trigger focus changes. Browser-based controls
cannot guarantee prevention of using another device, taking photographs,
or every form of cheating.

Never rely on frontend JavaScript alone. Do not collect unrelated
browsing history or inspect other websites. Enforce deadlines,
eligibility, attempt limits, answer-key protection, and submission state
server-side. Apply suitable CSRF protection, secure cookies, rate
limits, input validation, and audit logging.

## 32. Assessment event log

Record relevant events such as: - Attempt started. - Answer saved. -
Navigation where required. - Visibility changes. - Connection
lost/restored when detectable. - Fullscreen exit if enabled. - Request
failure. - Submission. - Timeout.

Store timestamps, event type, and relevant minimal metadata. Distinguish
client-reported events from server-verified events. Avoid claiming a
precise disconnection cause if it cannot be determined.

------------------------------------------------------------------------

# Phase 8 --- Grading and Feedback

## 33. Automatic grading

Support exact and normalized matching, accepted alternatives, numerical
tolerances, choice-based grading, and type-specific rules. Keep grading
deterministic and tested.

## 34. Wrong-answer explanations

When permitted by quiz settings, explain: - Student's answer. - Why it
is incorrect. - Correct answer when allowed. - Underlying
concept/misconception. - Concise explanation or relevant study material.

Ground explanations in verified educational content and existing RAG
retrieval where appropriate. Never reveal answers during an active
assessment if feedback is disabled or delayed.

## 35. AI-assisted written-answer grading

Support: - **Lenient:** accept conceptually correct answers despite
minor omissions or wording differences. - **Medium:** balance conceptual
correctness, completeness, and required points; default mode. -
**Strict:** closely follow the published rubric and required concepts. -
**Custom:** teacher-defined rubric, criteria, and expectations.

Provide reference answer/key points, rubric, maximum marks, awarded
marks, feedback/justification, grading status, and model/configuration
metadata where appropriate.

Validate structured output and constrain marks to the permitted range
server-side. Treat student responses as untrusted data; embedded
instructions must not override grading rules. Send borderline,
low-confidence, or malformed results for review as appropriate. Teachers
can inspect and override AI grades. Do not represent AI grading as
perfectly accurate.

## 36. Manual grading and result release

Teachers can inspect written answers, award marks, comment, and finalize
grading. If manual grading is required, the final result remains pending
until required grading is complete.

Disable immediate final-result release when manual grading is required,
unless provisional results are explicitly supported and the teacher
enables them.

------------------------------------------------------------------------

# Phase 9 --- Analytics and Performance

## 37. Student and class analytics

Show: - Scores and percentages. - Average and score distribution. -
Completion/submission rates. - Question-level correct/incorrect rates. -
Performance by chapter, topic, and SLO. - Strengths, weaknesses, and
common misconceptions. - Time spent where reliably measured. - Progress
across assessments. - Questions pending manual grading. - Suspicious
events for teacher review.

Distinguish measured data from AI-generated interpretations. Derive
weaknesses from actual responses, not unrelated personal data. Enforce
access controls for student-level and class-level views.

------------------------------------------------------------------------

# Phase 10 --- External Integrations

## 38. Typesense search

Integrate Typesense for fast search across subjects, chapters, topics,
resource metadata, permitted question text, and SLOs.

Support suggestions, typo tolerance, filters for
board/class/subject/chapter/resource type/difficulty, relevant ranking,
and pagination.

The database remains the source of truth. Implement reliable indexing,
updates, deletion, and reindexing. Keep private quizzes, answer keys,
unpublished content, and unauthorized student data out of public search.
Use scoped search keys or a trusted server-side search layer. Never
expose the Typesense administrative key to the browser.

## 39. Cloudflare R2 storage

Use R2 for appropriate documents, images, uploads, and generated
attachments.

-   Keep credentials server-side.
-   Validate file types, size, and permitted formats.
-   Use safe filenames/object keys.
-   Protect uploads and downloads with authorization.
-   Default to private buckets for protected material.
-   Use short-lived presigned URLs where appropriate.
-   Store file metadata/ownership in the database.
-   Handle replacement, deletion, and orphaned files safely.
-   Show upload progress and useful errors.
-   Use malware scanning or suitable validation where supported.
-   Prevent private exam files and answer keys from being exposed
    through public URLs.

## 40. Sentry monitoring/APM

Configure frontend/backend error and performance monitoring where
appropriate. Set environment and release versions, actionable traces,
request correlation, sensible sampling, and alerts. Scrub passwords,
tokens, OAuth secrets, answer keys, and unnecessary student personal
information.

## 41. PostHog product analytics

Track useful events such as signup, onboarding, resource open, search,
quiz start/submit/complete, teacher quiz creation, quiz publication, and
revisited study material.

Use pseudonymous identifiers and minimize personal data. Do not send
student answers, answer keys, passwords, private documents, or sensitive
assessment details to analytics. Respect applicable privacy requirements
and consent preferences.

## 42. Google Analytics

Integrate the appropriate Google Analytics property/measurement ID.
Measure page visits, navigation, traffic sources, and permitted resource
engagement. Avoid duplicate counting between Google Analytics and
PostHog. Never transmit sensitive student answers or confidential
records.

## 43. Resend email

Support appropriate transactional emails: - Signup verification. -
Password reset. - Account notifications. - Teacher invitations. - Quiz
assignment. - Upcoming deadlines. - Results released. - Platform
announcements.

Support newsletter signup with validation, duplicate handling,
unsubscribe, and consent. Use verified sender domains and server-side
API keys. Prefer a queue/retry mechanism where appropriate and make jobs
idempotent. Keep marketing consent separate from transactional email.

## 44. GitHub Actions CI/CD

Adapt workflows to the actual stack and hosting provider. Include
dependency installation, linting/format checks, type checks,
unit/integration tests, production build, migration validation, and
practical security/dependency checks.

Use GitHub Actions secrets. Never commit credentials or production
environment files. Require suitable checks before deployment, avoid
destructive production migrations, and document secrets, deployment,
rollback, and environment configuration.

------------------------------------------------------------------------

# Phase 11 --- Database, Security, and Scalability

## 45. Database integrity

Extend the existing database with migrations; do not replace it. Reuse
existing entities where suitable. Evaluate entities or equivalent
structures for: - Boards, programmes, classes, subjects, chapters,
topics, SLOs. - Resources and provenance. - Users, roles, permissions. -
Teacher assignments and classroom membership. - Quizzes and settings. -
Questions, options, rich content, and question-bank relationships. -
Assignments/invitations. - Attempts and saved answers. - Grading
rubrics/results. - Manual and AI grading records. - Assessment events
and audit logs. - Notifications. - File metadata. - Search-indexing
jobs.

Use appropriate foreign keys, indexes, unique constraints, transactions,
deletion policies, and versioning. Make answer saving, submission,
grading, and result release safe against duplicate requests and
concurrent updates. Handle timestamps/time zones consistently. Do not
store secrets in ordinary database fields without an appropriate design.

## 46. Performance and reliability

Use efficient pagination, proper indexes, background jobs for expensive
ingestion/indexing, safe caching, request-size limits, and rate
limiting. Avoid N+1 queries, unnecessary full-table queries, repeated
embedding/extraction work, and duplicate AI calls. Monitor slow queries
and expensive endpoints. Ensure answer saving works under concurrent
traffic.

------------------------------------------------------------------------

# Phase 12 --- UX, Accessibility, and Testing

## 47. UI/UX standards

Build a consistent, modern, responsive interface for desktop, tablet,
and mobile: - Clear typography and readable line lengths. - Consistent
spacing and accessible contrast. - Breadcrumbs and predictable
navigation. - Simple subject cards and resource lists. - Useful
dashboards and meaningful summaries. - Familiar quiz-builder
interactions. - Clear save/loading/error states. - Accessible forms,
dialogs, and controls. - Helpful empty and permission-denied states. -
Keyboard navigation and screen-reader support. - Minimal unnecessary
animation and visual clutter. - Reuse the existing design system.

The assessment interface should prioritize readability, stability, and
minimal distractions.

## 48. Required tests

### Resource hub

-   Board/class/subject navigation.
-   Correct resource links.
-   Search and authorization.
-   Empty categories.
-   Existing RAG and MCQ extraction regression tests.

### Authentication/permissions

-   Google sign-in.
-   Protected APIs.
-   Student isolation.
-   Teacher class authorization.
-   Prevention of privilege escalation.

### Quiz builder

-   All supported question types.
-   Marks/settings persistence.
-   Bank selection and AI generation.
-   Mixed-source questions.
-   Difficulty filters and custom difficulty.
-   Editing/reordering without content loss.
-   Duplicate handling and preview.

### Equations/diagrams

-   Insert/edit mathematical equation.
-   Chemistry formula/reaction arrow.
-   Searchable symbol insertion.
-   Draw/insert diagram.
-   Create/edit flowchart.
-   Insert equation in an MCQ option.
-   Save/reload and student-side rendering.
-   Preserve rich content during editing.
-   Reject unsafe SVG/HTML.

### Academic configuration

-   Valid classroom creation.
-   Reject incompatible board/class/subject choices.
-   Parent-selector changes invalidate dependent choices.
-   Unauthorized curriculum changes rejected.
-   Unauthorized enrollment rejected.
-   Duplicate membership rejected.

### Assessment engine

-   Server-side timer/deadline.
-   Autosave and reload recovery.
-   Reconnection and duplicate-attempt prevention.
-   Concurrent update protection.
-   Idempotent submission.
-   Answer-key protection.
-   Tab-change logging/warnings.
-   Timeout handling.
-   Manual grading and result-release rules.

### AI grading

-   Schema validation.
-   Marks constrained to valid range.
-   Malformed outputs handled safely.
-   Teacher review/override.
-   Pending results while required manual grading is incomplete.

### Integrations

-   Typesense indexing and permissions.
-   R2 access control.
-   Sentry test errors without secrets.
-   Analytics privacy.
-   Resend notifications.
-   GitHub Actions checks.

Run available tests, linting, type checks, and production builds. Fix
regressions introduced by changes. Never report untested functionality
as verified.

------------------------------------------------------------------------

# Implementation Phases

Implement in this order, adapting only when repository dependencies
require it:

1.  **Audit and foundation:** architecture audit, schema plan, design
    system, safe migrations, authentication/authorization.
2.  **Resource hub:** board/class/subject navigation, resource archive,
    chapter navigation, search metadata integration.
3.  **Question bank and unified quiz builder:** question types,
    mixed-source insertion, filters, difficulty, settings, Gemini
    generation.
4.  **Rich-content editor:** equations, chemistry notation, symbol
    picker, drawing canvas, flowcharts, safe rendering.
5.  **Classrooms and enrollment:** classroom creation, academic
    selectors, invitations, permissions.
6.  **Assessment engine:** timers, autosave/recovery, submissions,
    feedback, grading, integrity events.
7.  **Dashboards and analytics:** student, teacher, and admin views.
8.  **Integrations:** Typesense, R2, Sentry, PostHog, Google Analytics,
    Resend.
9.  **Production hardening:** GitHub Actions, security, performance,
    accessibility, testing, documentation, deployment readiness.

Do not sacrifice existing functionality to accelerate a phase.

------------------------------------------------------------------------

# Definition of Done

A feature is complete only when: - The interface works. - Backend logic
is implemented. - Database interactions persist correctly. -
Authentication and permissions are enforced. - Validation and error
handling exist. - It works with existing educational data. - Relevant
automated tests pass. - Existing features have not regressed. - Required
configuration is documented.

At the end of every phase, report: 1. What was implemented. 2.
Files/modules changed. 3. Database migrations applied or required. 4.
Integrations configured. 5. Tests/build results. 6. Environment
variables to configure (names only; never real secrets). 7. Remaining
limitations/blockers. 8. Next phase.

## Final instruction

Start by reading this specification and auditing the repository. Then
implement the system phase by phase. Do not stop after creating a plan
or mockup. Preserve existing RAG, curriculum, MCQ extraction,
embeddings, resources, and data. Prioritize correctness, security,
maintainability, and working integration over superficial completeness.
