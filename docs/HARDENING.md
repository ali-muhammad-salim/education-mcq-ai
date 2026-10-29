# Assessment hardening and rollout

## Implementation

The existing quiz presentation is retained in `components/TakeQuizModal.tsx`. Its transport, deadline handling, IndexedDB persistence and retry queue now live in `lib/use-secure-exam.ts`. Question keys enter the browser only after authorized result release. Written, numerical, matching and multiple-choice answers use the same attempt API.

`services/assessment` owns authorization, question snapshots, grading, recovery and result release. `repositories/transaction.ts` retries PostgreSQL serialization conflicts, including SQLSTATEs surfaced by Prisma raw queries. Answer updates and final submission lock the same attempt row; a version conflict cannot silently overwrite another tab. New attempts share-lock the quiz and serialize only the same quiz/student pair, enforcing attempt limits without a single exclusive quiz lock. Editors take the exclusive quiz lock and check attempts after acquiring it. Attempt save/submit operations use read-committed transactions with their attempt row locked; unrelated students do not contend on serializable predicate locks. Published quizzes with attempts cannot be edited in place. Archiving preserves historical records.

Passwords use asynchronous salted scrypt. Legacy PBKDF2 passwords upgrade after successful verification. Sessions store token hashes and reject inactive accounts. Predictable demo accounts, demo login, universal OTP, and email-only Google impersonation were removed. Email OTP uses bounded attempts, expiry, a persistent challenge and actual email delivery; no OTP is returned to the client. Google sign-in requires verified email and the browser's OAuth state cookie. Public registration grants student access; administrators grant educator roles through `/api/admin/users/[id]`.

Quizzes, attempts, answers, review decisions and jobs are authoritative PostgreSQL records. The former process-local queue and writable JSON stores are retired. `scripts/archive-legacy.ts` preserves old JSON records in `LegacyArchive` without trusting their client-generated marks. These archived records need administrator ownership/content reconciliation before becoming active assessments. Original source files are retained.

AI generation is a durable job with bounded model retries, timeouts, schema validation, syllabus/SLO filtering and linked textbook evidence. Missing answer keys are rejected. Independent solving does not receive the generated key. Missing verification is explicitly recorded, with no invented confidence. Generated questions enter the educator review queue. Publication checks approved review records for AI items. Missing provider configuration or evidence returns a failure instead of fabricated fallback content.

R2 uploads execute `PutObject` before returning success. Private assets require administrator access. Local assets are outside `public`; production requires R2 or a persistent `ASSET_ROOT`. MIME signatures, size and storage keys are checked; active SVG uploads are rejected.

The Python API uses its generated Prisma client, requires an internal service token and no longer exposes the entire `data` folder. Former mock question/review/training-export routes use database records. Unconfigured fine-tuning returns 501. Ingestion is queued, uses private files and isolated progress files, and propagates pipeline failures.

## Validation performed

- Production webpack build, TypeScript and ESLint checks.
- 39 automated tests covering server grading, forged correctness flags, answer-key filtering, ownership, suspended sessions, concurrent starts/submissions, answer versions, frozen marks, job claiming and stale-lease recovery, AI review behavior and storage adapter failures.
- HTTP checks against the production application using a dedicated test database.
- Browser checks of the restored setup, answer selection, reload recovery and original results presentation.
- Python API/database connection, authenticated search/question/syllabus requests and disabled fine-tuning behavior.
- Migration rehearsal against a restored copy of the local database: all 10 existing attempts preserved. Duplicate legacy attempt numbering is repaired with an audit record before adding the unique index.
- Dependency audit reported zero known vulnerabilities after the compatible patch.

No live Gemini generation, email delivery, R2 credentials, full OCR processing, Docker image build or sustained hosting benchmark was exercised. Local burst benchmarks and separate deadline/grading worker checks are recorded in REMEDIATION-STATUS.md. Their configuration and operational checks remain necessary. Automated tests use mocked AI/storage providers; they do not establish educational accuracy.

## Database rollout

**The source/deployment database has not been migrated.** A local backup was created under `checkpoints/hardening-before-*.dump`, and migration execution was rehearsed on a restored copy. Keep backups out of Git and restrict access to them.

For a new database:

```sh
npm ci
npx prisma generate --generator client
npm run db:migrate
```

For an existing database matching the former Prisma schema, stop writes during the release, take a fresh PostgreSQL backup and review drift first. If it has no migration history, baseline it only after confirming it matches the baseline schema:

```sh
npm run db:preflight
# Optional local-only rehearsal; reads the source and migrates a restored copy.
npm run db:rehearse
npx prisma migrate resolve --applied 202610190001_baseline
npm run db:migrate
npm run db:archive-legacy
```

Do not baseline a different schema to suppress migration errors. The hardening migration is transactional, preserves historical question snapshots, audits duplicate attempt renumbering, revokes legacy sessions, and suspends the known seeded identities. Provision your own administrator immediately after migration using temporary `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 16 characters:

```sh
npm run db:bootstrap-admin
```

Remove the bootstrap password from the process/deployment environment afterwards. This script resets only the explicitly supplied administrator and revokes that account's sessions. Normal web requests cannot create administrators or perform schema DDL. The release database identity can hold migration privileges; the web identity should have ordinary application access.

## Web and worker deployment

Set `NEXT_PUBLIC_APP_URL` to the canonical origin. Set database connection/pool limits for the web and workers together. `npm start` only starts the application; it does not push a schema or ignore migration failures.

Run at least one separate deadline worker so OCR/AI jobs do not hold up exam finalization:

```sh
# Deadline worker
WORKER_KINDS=EXAM_FINALIZE,EXAM_GRADE npm run worker
# AI/document worker
WORKER_KINDS=AI_GENERATION,INGESTION npm run worker
```

On Windows set these environment variables in PowerShell or your process manager. Workers claim database leases, heartbeat, retry bounded failures and recover stale leases. UTC comparisons are explicit because the local PostgreSQL server uses Asia/Karachi. Ingestion jobs are serialized to protect the legacy canonical-file exporter. Use multiple AI workers as provider quotas and database capacity allow. Monitor queue age, failed jobs and database utilization before increasing concurrency.

`Dockerfile` builds the web application; `Dockerfile.worker` includes Node and Python processing dependencies. Configure a shared persistent `ASSET_ROOT` or R2 for web/worker access. Persist worker `data/jobs` while retaining job logs/results as needed. Apply ingestion-region Alembic migrations separately before textbook OCR:

```sh
python -m alembic -c services/ingestion/db/alembic.ini upgrade head
```

The Python API is an internal service. Install `requirements.txt`, activate its environment, then generate its client with `python -m prisma generate --generator py`. Configure a random `INTERNAL_API_TOKEN` of at least 32 characters and an active `INTERNAL_SERVICE_USER_ID` administrator for internal uploads. Limit `CORS_ORIGINS` to actual callers. Do not send the internal token to browser clients.

## Operational behavior

- Configure `GEMINI_MODEL` or `GEMINI_MODELS` using models available to your account. The application assumes no fixed fallback model list. Map textbook passages to SLOs before generating grounded questions.
- Configure `RESEND_API_KEY` and a verified `EMAIL_FROM` to enable email OTP. Password/OAuth login remain separate paths.
- Offline answers retry while the application is open and when it is reopened. Browser-closed background synchronization is not promised. Answers received after the server deadline are not accepted; pending offline edits cannot be independently timestamped by a browser.
- A deadline job finalizes persisted answers even if the browser is closed. Delayed workers can delay finalization, but cannot extend answer acceptance.
- Focus/visibility events are advisory telemetry, not proof of cheating. Browser screenshot prevention is not claimed. There are no automatic disciplinary penalties based solely on tab changes.
- Use the author/admin-only `/api/quizzes/[id]/release` endpoint to release or schedule results without changing frozen exam content.
- Legacy JSON grades remain archival evidence until reconciled; they are not silently promoted to verified results.
- CI provisions a pgvector test database, applies migrations, typechecks tests, runs integration checks and builds. It no longer suppresses test failures or automatically deploys before a migration plan is reviewed.

Adaptive mastery, spaced repetition, school tenancy, live classrooms, advanced observability and performance targets remain separate product work. This hardening does not claim those roadmap items are implemented.
