## Approach

The repository has **no shared logging library** and no centralized logger initialization. Logging is split across two runtime stacks with different conventions:

- **Python services** (`services/`, `scripts/`) use the built-in `logging` module.
- **Node.js / TypeScript code** (Next.js app, Prisma seed, worker scripts) uses bare `console.log` / `console.error` / `console.warn`.

There is no Winston, Pino, Bunyan, Morgan, or equivalent third-party logger in any `package.json` dependency; Python dependencies likewise contain no structured-log library beyond stdlib.

## Python logging conventions

Each module follows the same pattern:

```python
import logging
logger = logging.getLogger(__name__)
```

This is observed consistently across ~40 modules under `services/` (e.g. `services/inference/server.py`, `services/generation/pipeline.py`, `services/ingestion/stages/*.py`, `services/past_paper/*.py`, `services/validation/multi_pass.py`).

**Log levels used descriptively:**
- `logger.info` — operational milestones (model pulled, key added to pool, candidates generated).
- `logger.warning` — recoverable problems (missing GPU driver, HTTP 404/503 from Gemini, quota exhaustion, parse failures).
- `logger.error` — unrecoverable failures (generation/chat/embedding failures, all keys exhausted).
- `logger.debug` — low-signal diagnostics (nvidia-smi stderr, unload errors).

**Root configuration** is done at process entry points via `logging.basicConfig`, not per-module:

| Entry point | Level | Format |
|---|---:|---|
| `services/ingestion/__main__.py` | `INFO` by default, `DEBUG` with `--verbose/-v` | `%(asctime)s  %(levelname)-7s  %(name)s — %(message)s` (time `%H:%M:%S`) |
| `services/inference/server.py` | `INFO` | default basicConfig format |
| `services/inference/__main__.py` | `INFO` | default |
| `scripts/build_knowledge_graph.py` | `INFO` | `%(asctime)s [%(levelname)s] %(message)s` |
| `scripts/ingest_akueb.py` | `INFO` | same as above |

No custom `Formatter`, `Handler`, JSON formatter, file sink, or log rotation is configured anywhere. All output goes to stdout/stderr through the default `StreamHandler` installed by `basicConfig`.

**Structured fields are absent.** Log messages are plain `%s`-formatted strings (e.g. `"Generation failed (%s): %s", model, exc`). No correlation IDs, request IDs, trace IDs, or structured JSON payloads appear in Python logs.

## Node.js logging conventions

Node-side code calls `console.log`, `console.error`, and `console.warn` directly from wherever they are needed — there is no logger singleton, no middleware, and no Next.js-specific log wrapper. Examples include:

- API routes (`app/api/auth/google/route.ts`, `app/api/questions/bank/route.ts`, `app/api/model-papers/route.ts`).
- Client components (`components/TakeQuizModal.tsx`, `components/SubjectMaterials.tsx`).
- Worker script `scripts/job-worker.ts` which logs job lifecycle events (`"Job completed"`, `"Job deferred"`, `"Worker stopped"`).
- Seed scripts (`prisma/seed.ts`, `seed_syllabi.ts`).

Error handling typically catches exceptions and forwards them to `console.error` (e.g. `.catch(console.error)` in several frontend pages). There is no global error handler that funnels these into a structured format.

## Entrypoints that matter for observability

- `services/ingestion/__main__.py` — document ingestion pipeline CLI; sets level and format once at startup.
- `services/inference/server.py` — FastAPI server; configures `logging.basicConfig(level=logging.INFO)` at line 262.
- `scripts/job-worker.ts` — durable Node worker; emits heartbeats and job results via `console.log`/`console.error`.
- `scripts/release-start.cjs` — supervisor that starts child processes and logs startup failure via `console.error`.

## Constraints

- No cross-runtime correlation: Python logs and Node logs are independent streams with no shared tracing ID.
- No sinks other than stdout/stderr — no files, no syslog, no external collector (Datadog, CloudWatch, etc.) is wired in.
- No environment variable toggles for log level beyond the ingestion CLI's `--verbose` flag.
- No test harnesses that assert on log output; tests do not capture or validate logger behavior.

## Key files

- `services/ingestion/__main__.py` — canonical `basicConfig` call with verbose toggle.
- `services/inference/server.py` — FastAPI entrypoint that reconfigures root logging.
- `services/inference/router.py` — representative consumer of the logger (error/warning/info/debug usage).
- `services/inference/gemini_client.py` — most extensive warning/error usage (quota, network, model routing).
- `services/inference/gpu.py` — debug-level hardware probe logging.
- `scripts/job-worker.ts` — representative Node-side console-based worker logging.