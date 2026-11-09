# Configuration System

This repository uses a **flat environment-variable-driven configuration** strategy across all runtimes (Next.js/Node, Prisma, Python ingestion/inference workers). There is no centralized config loader; each service reads `process.env` / `os.environ` directly or via Pydantic `BaseSettings`, with sensible defaults so the system works locally without any `.env` file.

## 1. What is used

- **`.env` files** loaded by individual services — Node/Next.js reads them implicitly through Next.js runtime env loading; Python services use `pydantic_settings.BaseSettings` with an explicit `env_file=".env"` in `model_config`.
- **`.env.example`** at the repo root documents every variable required by the platform, grouped into eight sections: database, AI/RAG, authentication (Google OAuth + NextAuth), email (Resend), monitoring (Sentry), analytics (PostHog/GA4), object storage (Cloudflare R2 / AWS S3), full-text search (Typesense), plus hardening flags (`RUN_DATABASE_MIGRATIONS`, `AUTH_ONLY_BOOTSTRAP`, `INTERNAL_API_TOKEN`, etc.).
- **Pydantic `BaseSettings`** classes encapsulate typed settings for each Python subsystem, with `env_prefix` namespacing to avoid collisions between services.
- **Static YAML data** under `config/models.yaml` is consumed as model metadata (not runtime configuration).
- **Docker Compose** (`docker-compose.yml`) and Dockerfiles pass environment variables into containers; the `APP_URL` / `RUN_DATABASE_MIGRATIONS` pattern is explicitly documented in `.env.example` as deployment-time overrides.

## 2. Key files

| File | Role |
|---|---|
| `.env.example` | Single source of truth for every supported environment variable across the platform |
| `services/ingestion/config.py` | `IngestionSettings(BaseSettings)` with `env_prefix="INGEST_"`, loads `.env`, exposes a module-level `settings` singleton |
| `services/inference/config.py` | `InferenceSettings(BaseSettings)` with `env_prefix="INFER_"`, wraps settings in `@lru_cache(maxsize=1)` via `get_settings()` |
| `config/models.yaml` | Static model catalog read by inference code |
| `docs/ENVIRONMENT.md` | Environment & hardware audit documenting what must be configured locally |
| `next.config.ts` | Next.js build/runtime config (e.g. `NEXT_PUBLIC_*` vars are exposed to the browser) |
| `lib/typesense.ts` | Reads Typesense connection from `process.env` and falls back to Prisma if absent |
| `lib/storage.ts` | Reads R2/S3 credentials from `process.env` |
| `lib/auth.ts` | Uses `process.env.VITEST` to bypass session cache in tests |

## 3. Architecture and conventions

### Per-service typed settings
Each Python service defines its own `BaseSettings` subclass:

- `IngestionSettings` (prefix `INGEST_`) controls extraction engine selection (`gemini` vs `local_hybrid`), OCR DPI/confidence thresholds, Ollama URL/model, media paths, past-paper regex heuristics, and page limits.
- `InferenceSettings` (prefix `INFER_`) controls Ollama URL, VRAM budget, model name overrides per role (vision/generation/embeddings), feature flags (`vision_enabled`, `generation_enabled`, `embeddings_enabled`), API host/port, and the path to `config/models.yaml`.

Both declare `env_file=".env"` and `extra="ignore"` so unknown variables are silently dropped rather than raising.

### Namespacing via prefixes
The two Python services use distinct prefixes (`INGEST_`, `INFER_`) so their `.env` entries do not collide. The example file itself does not prefix these variables — it lists flat keys like `OLLAMA_BASE_URL`; consumers then map them via the `env_prefix` + field name convention. For instance, `INGEST_OCR_USE_GPU` maps to `ocr_use_gpu` on `IngestionSettings`.

### Defaults-first policy
Every setting has a default value that keeps local development functional:
- Database URLs default to localhost PostgreSQL.
- OCR confidence thresholds default to concrete floats (0.90 / 0.75 / 0.60).
- Vision fallbacks default to Qwen models on `http://localhost:11434`.
- Typesense usage is optional: when `TYPESENSE_HOST` is omitted, `lib/typesense.ts` falls back to Prisma full-text search.
- Storage is optional: when R2 credentials are missing, local `data/assets` is used.

### Feature flags
Feature toggles are plain booleans in the config objects (e.g. `vision_enabled`, `generation_enabled`, `embeddings_enabled` in `InferenceSettings`; `GEMINI_MULTI_PASS_VERIFICATION` style flags in `.env.example`). They gate functionality at runtime rather than through separate profiles.

### Test-mode overrides
The `VITEST` env var is checked in `lib/auth.ts` to disable the in-memory session cache during tests. `TEST_DATABASE_URL` is declared in `.env.example` for test databases.

### Deployment overrides
Hardening variables in `.env.example` are intended to be overridden at container deploy time:
- `RUN_DATABASE_MIGRATIONS` — one-shot migration flag; normal web requests never execute DDL.
- `AUTH_ONLY_BOOTSTRAP` — one-time account-only upgrade.
- `SESSION_SECRET`, `INTERNAL_API_TOKEN`, `CORS_ORIGINS`.
- `WORKER_KINDS`, `ASSESSMENT_SUBMISSION_MODE`, `ASSESSMENT_MAX_IN_FLIGHT`, `ASSESSMENT_MAX_WAITING` control worker behavior.
- `APP_URL` is described as "server-only canonical origin, read at runtime by the Docker container."

## 4. Conventions and constraints

- **No shared config library**: each service owns its own `BaseSettings` class; there is no common settings module shared between ingestion and inference.
- **Typed over raw env access**: Python services go through Pydantic fields with types and defaults rather than calling `os.environ.get` directly (except for the few cross-cutting values like `OLLAMA_BASE_URL` which have an explicit fallback).
- **`.env.example` is authoritative**: it documents every supported variable with comments explaining purpose, service, and whether it is required locally or only in production.
- **Unknown env vars are ignored**: `extra="ignore"` on both `BaseSettings` subclasses means typos in `.env` are silently swallowed — this is a safety net but also means mis-spelled variables produce no error.
- **Per-process caching**: `InferenceSettings` is wrapped in `@lru_cache(maxsize=1)` via `get_settings()`, ensuring a single immutable settings instance per process.
- **Browser-exposed variables are explicitly prefixed `NEXT_PUBLIC_*`**: e.g. `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_APP_URL`; non-public server secrets live in unprefixed env vars and are not bundled into client bundles.
- **Defaults make local dev self-contained**: the system runs out-of-the-box against a local Postgres, local Ollama, and local disk — external services (Gemini, Resend, Sentry, Typesense, R2) are optional.
- **YAML under `config/` is data, not runtime config**: `config/models.yaml` is a static model catalog consumed by inference code; it is not loaded by a config framework.
