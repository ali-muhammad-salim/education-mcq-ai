## Overview

This repository is a polyglot monorepo with three distinct dependency surfaces:

1. **Root Next.js application** (`package.json` / `package-lock.json`) — the main web server and API.
2. **Python backend & workers** (`requirements.txt`, `requirements-ai-tests.txt`) — FastAPI/SQLAlchemy ingestion, AI inference, validation, and evaluation services under `services/` plus scripts in `scripts/`.
3. **Two sibling Next.js projects** (`frontend/` and `student-web/`) — separate Vite and Next apps with their own `package.json` files.

There is no top-level package manager workspace (no `pnpm-workspace.yaml`, no `lerna`, no Turborepo). Each project installs its dependencies independently.

## Node.js side

### Root app (`package.json`)

- Runtime deps: `next` 16.x, `react` 19.x, `pdfjs-dist`, `katex`, `@aws-sdk/client-s3`, `motion`, `zod`, `tsx`.
- Dev deps: `prisma`, `@prisma/client`, `typescript`, `vitest`, `eslint`, `ts-node`, `@types/*`.
- A `postinstall` script runs `prisma generate --generator client`, so Prisma client generation is part of the install flow.
- Build uses `next build --webpack`; the dev/build entrypoint prepends `node scripts/copy-pdf-runtime.cjs` to copy PDF runtime assets at build time.
- `Dockerfile` copies `package.json` and `package-lock.json*` then runs `npm ci --ignore-scripts` during the `deps` stage — enforcing deterministic installs from the lockfile in CI.
- No private npm registry or `.npmrc` is present; packages are pulled from the public registry.

Lockfile policy:
- `package-lock.json` exists at the root and is copied into the Docker image.
- The `.gitignore` does **not** list `package-lock.json`, so it is tracked in version control for this project.
- There is no vendored `node_modules` directory.

### `frontend/` (Vite + React SPA)

- Separate `package.json` with `react`, `react-dom`, `react-router-dom`, `lucide-react`.
- Has its own `package-lock.json` (present in the tree).
- Uses `oxlint` instead of ESLint for linting.

### `student-web/` (separate Next.js app)

- Separate `package.json` pinning `next` 16.3.8 and `react` 19.2.8 (note: different minor versions from the root app's `next` 16.4.1 and `react` ^19.3.0).
- Has its own `package-lock.json`.
- Uses Tailwind v4 via `@tailwindcss/postcss` and `tailwindcss`.

Version strategy across the three Node projects is loose caret ranges (`^`) rather than pinned versions, except where explicitly pinned (e.g., `next` 16.3.8 in `student-web`). This means two sibling Next apps can drift apart on shared dependencies like `react` and `next`.

## Python side

### `requirements.txt`

- Declares broad ranges using `>=` (e.g., `fastapi>=0.115.0`, `pydantic>=2.9.0`, `numpy>=1.26.4`).
- A few critical transitive tools are pinned exactly: `paddleocr==2.8.1`, `paddlepaddle==2.6.2`, `prisma==0.15.0`.
- Includes GPU vs CPU comments around `paddlepaddle-gpu` vs `paddlepaddle` — the CPU fallback is kept commented out but available.
- `pytest`, `pytest-asyncio` are listed as runtime requirements even though they are test-only.
- No `pip-tools`, `Poetry`, `PDM`, or `uv.lock` file is present — there is no generated lockfile for Python.

### `requirements-ai-tests.txt`

- A parallel, fully-pinned (`==`) set of versions used specifically for AI-related tests.
- Overrides several runtime pins (e.g., `pytest==9.1.1`, `pydantic==2.13.5`, `numpy==2.3.5`, `PyMuPDF==1.28.2`, `Pillow==12.3.0`) — demonstrating that test environments intentionally diverge from the main `requirements.txt`.

No private PyPI mirror or `PYPI_URL` configuration is present in the repo.

## Docker & CI implications

- The root `Dockerfile` uses a multi-stage build: `npm ci --ignore-scripts` in the `deps` stage, then copies prebuilt `node_modules` forward. This guarantees reproducible Node builds from `package-lock.json`.
- Prisma client generation (`npx prisma generate`) runs after copying source but before `npm run build`, ensuring the generated client matches the schema.
- `docker-compose.yml` orchestrates the containerized app alongside PostgreSQL (+ pgvector) and other services, but does not manage third-party package versions itself.
- `.github/workflows/ci.yml` (referenced in the tree) is the CI surface; the Dockerfile enforces deterministic installs regardless of what CI does.

## Key conventions observed

- Dependencies are declared per-project; there is no shared dependency graph across the three Node apps or between Node and Python.
- Node dependencies use caret ranges (`^`) allowing patch/minor upgrades unless explicitly pinned; Python dependencies mostly use minimum-version ranges (`>=`) with selective exact pins for fragile toolchains (PaddleOCR/PaddlePaddle, Prisma).
- Lockfiles: only `package-lock.json` files are versioned (root, `frontend/`, `student-web/`). No Python lockfile is committed.
- No vendoring of third-party code (`node_modules` is ignored by default Git rules; no `vendor/` directory exists).
- No private registries, `.npmrc`, or custom PyPI index configuration is present.
- Shared UI libraries are duplicated rather than hoisted: `lucide-react` appears in both the root app and `frontend/` at different versions (`^1.51.0` vs `^1.47.0`).