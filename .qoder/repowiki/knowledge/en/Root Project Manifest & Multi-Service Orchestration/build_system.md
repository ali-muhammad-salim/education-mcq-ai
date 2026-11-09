# Build System

## Approach

The project is a multi-service monorepo built around three runtimes:

1. **Next.js web app** (`app/`), compiled via `next build --webpack`.
2. **Node worker processes** (`scripts/job-worker.ts`) that execute background jobs on a task queue.
3. **Python AI / assessment services** under `services/`, running FastAPI and standalone pipelines.

All services share a PostgreSQL + pgvector database orchestrated by `docker-compose.yml`. Production artifacts are containerized with four distinct Dockerfiles, and CI runs through GitHub Actions.

## Key Files

| File | Role |
|---|---|
| `Dockerfile` | Multi-stage production image for the Next.js server |
| `Dockerfile.worker` | Worker image bundling Node + Python (for shared ingestion tools) |
| `Dockerfile.ai-worker` | Isolated AI/document worker with its own PyMuPDF venv (`/opt/pdf-runtime`) |
| `Dockerfile.assessment-worker` | Lightweight assessment-only worker (no OCR/model runtime) |
| `docker-compose.yml` | Local dev stack — only the `pgvector/pg16` service |
| `.github/workflows/ci.yml` | Validation pipeline on push/PR to `main` or `master` |
| `package.json` | Node scripts (`dev`, `build`, `worker`, `db:migrate`, `lint`, `test`, `typecheck`) |
| `requirements.txt` | Python dependency manifest (targets Python 3.11; CI installs 3.12) |
| `requirements-ai-tests.txt` | Additional Python deps for offline AI regression tests |
| `scripts/release-start.cjs` | Migration gate + Next.js process supervisor |
| `pytest.ini` | pytest configuration |
| `vitest.config.ts` | Vitest configuration for TS/JS tests |
| `eslint.config.mjs` | ESLint rules applied by `npm run lint` |
| `tsconfig.json` | Root TypeScript config |

## Architecture of the Build Pipeline

### Node side

- Dependency install: `npm ci --ignore-scripts` in Docker layers; `postinstall` hook runs `prisma generate --generator client`.
- Build step: `node scripts/copy-pdf-runtime.cjs && next build --webpack`. The PDF runtime copy script prepares native binaries before the Next build.
- Runtime entrypoint: `scripts/release-start.cjs`, which:
  - Optionally runs Prisma migrations (`RUN_DATABASE_MIGRATIONS=1`).
  - Validates the DB state: allows migration only when `_prisma_migrations` exists or the DB is empty; otherwise it blocks an unbaselined upgrade unless `AUTH_ONLY_BOOTSTRAP=confirm-reviewed-backup`.
  - Optionally syncs bundled materials (`SYNC_BUNDLED_MATERIALS=1`).
  - Spawns `next start -H 0.0.0.0 -p <PORT>` and forwards `SIGTERM`/`SIGINT`.
  - Validates `PORT` is numeric and within 1–65535.
- Workers: `npm run worker` executes `tsx scripts/job-worker.ts`; separate images constrain workload via `WORKER_KINDS` (e.g. `AI_GENERATION,INGESTION,AI_EMBEDDING,STUDY_GENERATION` vs `EXAM_FINALIZE,EXAM_GRADE`).
- Health check: the production container's `HEALTHCHECK` polls `/api/health` every 30s with a 60s start grace period.

### Python side

- Dependencies pinned in `requirements.txt` (FastAPI, SQLAlchemy+Alembic, psycopg[binary], pgvector, PaddleOCR/PaddlePaddle, sympy, fastembed, redis, pytest). GPU Paddle is commented out in favor of CPU fallback.
- AI workers get their own isolated virtualenv at `/opt/pdf-runtime/bin/python` containing only PyMuPDF 1.28.2; this is injected into the worker process via `ENV PYTHON_EXECUTABLE=/opt/pdf-runtime/bin/python` so document rendering stays isolated from the host Python.
- Offline regression tests run against `requirements-ai-tests.txt` with all external API keys blanked (`GEMINI_API_KEY=''`, etc.).

### Database layer

- Schema is managed exclusively by Prisma migrations under `prisma/migrations/`.
- `docker-compose.yml` spins up `pgvector/pg16:pg16` as `mcqs_db` with volume-backed data at `pgdata`.
- Migrations are NOT run automatically on every request — they are gated behind `RUN_DATABASE_MIGRATIONS=1` in `release-start.cjs`, which refuses to DDL on an already-baselined non-empty DB.
- Tests use a separate `TEST_DATABASE_URL` pointing at the same PG instance created by the CI job's `postgres` service.

### CI (GitHub Actions)

Workflow `.github/workflows/ci.yml` (`Validation`) runs on pushes and PRs targeting `main` or `master`:

1. Checkout → setup Node 22 → `npm ci`.
2. `npx prisma validate` → `npx prisma generate --generator client` → `npm run db:migrate`.
3. `npm run lint` → `npm run typecheck` → `npm test` (Vitest).
4. `node scripts/rehearse-auth-bootstrap.cjs`.
5. `npm run build`.
6. `node scripts/test_routes.js` (live HTTP smoke test).
7. `npm audit --omit=dev --audit-level=high`.
8. Setup Python 3.12 → compile key Python sources with `python -m compileall`.
9. Install `requirements-ai-tests.txt` and run offline Python tests covering knowledge, generation, validation, inference, ingestion, and RAG classification.
10. Build `Dockerfile.ai-worker` and verify the embedded PyMuPDF runtime plus critical TS module imports inside the container.

## Conventions and Constraints

- **Multi-stage Docker builds**: Every production image separates dependency install, build, and runner stages to minimize final image size. The base image is `node:22-slim` (or `node:22-bookworm-slim` for the combined worker); Python 3.11-slim is layered on top only where needed.
- **Non-root containers**: Each image creates a dedicated system user (`nextjs` uid 1001, `worker` uid 1001) and drops privileges before `CMD`.
- **Prisma client generation happens twice**: once during `postinstall` on the host and again inside each Docker image via `npx prisma generate --generator client` after copying `prisma/`.
- **Migrations are release-gated**: Application startup will not alter schema on a pre-existing non-empty DB without explicit env flags; `release-start.cjs` enforces this with an exception rather than silently proceeding.
- **Worker isolation by kind**: `WORKER_KINDS` environment variable selects which job handlers a worker process loads; `Dockerfile.ai-worker` and `Dockerfile.assessment-worker` pin disjoint sets.
- **Separate Node and Python dependency manifests**: `package.json`/`package-lock.json` for the Node side, `requirements.txt` (and `requirements-ai-tests.txt` for CI-only extras) for Python.
- **No Makefile or shell-based build orchestration**: All orchestration lives in `package.json` scripts, `docker-compose.yml`, and `.github/workflows/ci.yml`.
- **Health endpoint contract**: The production image's `HEALTHCHECK` expects `GET /api/health` to return a successful response within 4s; this is the deployment readiness signal.
- **Data directories pre-created**: Images create `/app/data/uploads`, `/app/data/assets`, `/app/data/jobs`, `/public/uploads`, `/media`, `/app/data/downloads` and chown them to the runtime user so writes don't fail at runtime.
- **CI targets both `main` and `master` branches**, reflecting the repo's dual-branch history.