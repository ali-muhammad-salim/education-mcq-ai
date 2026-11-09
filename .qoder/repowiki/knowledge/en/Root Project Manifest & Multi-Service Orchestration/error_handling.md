## Overview

This repository has two separate error-handling conventions depending on the runtime:

- **Next.js (TypeScript)** — a centralized `ApiError` type plus an `apiError` response helper in `lib/api.ts`, used by every API route.
- **Python services (FastAPI + workers)** — mostly bare `HTTPException` raised from FastAPI routers, with broad `except Exception` catches in long-running pipelines that record errors into result objects rather than rethrowing.

There is no shared error taxonomy across the TypeScript and Python sides; each side uses its own idioms.

---

## Next.js / TypeScript Layer

### Centralized error type and response formatter

`lib/api.ts` defines:

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
```

and a single `apiError(error: unknown)` helper that normalizes all responses to this shape:

| Input | Response body | Status |
|---|---|---|
| `ZodError` | `{ success: false, error: { code: 'INVALID_INPUT', message, details } }` | 400 |
| `SyntaxError` | `{ success: false, error: { code: 'INVALID_JSON', message } }` | 400 |
| `ApiError` | `{ success: false, error: { code, message } }` | `error.status` |
| anything else | `{ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Unable to complete the request. Please retry.' } }` | 503 |

Every catch block in `app/api/**/route.ts` files follows the same pattern:

```ts
try { /* handler */ } catch (error) { return apiError(error); }
```

Examples are consistent across `app/api/admin/users/[id]/security/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/knowledge/route.ts`, and many others.

### Business error codes

Business-level `ApiError` usages define application-specific codes instead of generic messages. Observed codes include:

- `CONFIGURATION_REQUIRED` (503)
- `FORBIDDEN` (403)
- `ACCOUNT_INACTIVE` (409)
- `SELF_CHANGE` (400)
- `REVIEW_CHANGED` (409)
- `PROCESSING_INCOMPLETE` (409)
- `EXPLAIN_CONFLICT_RESOLUTION` (400)
- `STRUCTURED_SOURCE_MISMATCH` (422)
- `SOURCE_GEOMETRY_CHANGED` (422)
- `INVALID_SOURCE_MAPPING` (422)

The knowledge-review route (`app/api/admin/knowledge/route.ts`) also demonstrates selective re-throwing: it catches AI-worker failures and only swallows a known whitelist of codes (`CHAPTER_EVIDENCE_REQUIRED`, `BOOK_REVIEW_REQUIRED`, `BOOK_CURRENT_CURRICULUM_REQUIRED`, `STUDY_PACK_TOO_LARGE`, `STUDY_BOOK_SCOPE_TOO_LARGE`); any other error is re-thrown so `apiError` can classify it.

### Frontend client behavior

Frontend components call the Next.js routes via `fetch` and surface `response.error.message` / `response.error.code` directly (e.g. `components/TakeQuizModal.tsx`, `components/AuthModal.tsx`). There is no global error boundary or toast layer visible at this scope.

---

## Python FastAPI Layer

### Internal service authentication middleware

`services/api/main.py` registers a FastAPI HTTP middleware that gates every non-`/health` request behind an `INTERNAL_API_TOKEN` Bearer token compared with `hmac.compare_digest`. Unauthenticated requests receive a 401 JSON response:

```json
{"error": "Internal service authentication required"}
```

This is the only global error-preprocessing hook for the FastAPI service.

### Routers raise `HTTPException`

Routers under `services/api/routers/` raise `fastapi.HTTPException` directly:

- `board.py`: 404 "Board not found", 400 "short_code is required", 400 "Invalid board code", and a blanket `except Exception as e: raise HTTPException(400, str(e))`.
- `upload.py`: 400 "Only PDF files are supported", 503 "Configure a shared persistent ASSET_ROOT…", 400 "Invalid PDF or file exceeds 50 MB", 503 missing admin user, 400 "Invalid academic hierarchy".
- `syllabus.py`: 404 "Syllabus version not found", 404 "SLO not found".
- `review.py`: 404 "Review item not found".

There is no custom exception base class, no structured error envelope, and no central exception handler replacing FastAPI's default `HTTPException` serialization.

---

## Worker and Pipeline Layer

Long-running Python workers do not propagate exceptions through the call stack. Instead they wrap per-page / per-stage work in `try/except Exception` blocks and append diagnostic entries to a result object.

In `services/ingestion/pipeline.py`, page processing is wrapped in `try:` / `except Exception as exc:`; failures log via `logger.error` and append `{"page": page_num, "error": str(exc)}` to `result.errors`. The pipeline then calls `self._repo.mark_document_failed(doc_id)` when `result.errors` is non-empty and `mark_document_completed` otherwise — making the document state machine the authoritative error signal rather than an exception.

Gemini quota exhaustion is handled specially: the worker logs a warning, saves a checkpoint via `self._gemini_client.save_quota_checkpoint`, appends `{"quota_exhausted": True, "checkpoint": ckpt, "resumed_from_page": page_num, ...}`, and `break`s out of the page loop so the document can be resumed later.

The validation orchestrators (`ValidationGatekeeper`, `MCQValidator` in `services/validation/orchestrator.py`) take a different approach: individual critics return typed reports with `ValidationStatus.PASS | NEEDS_REVIEW | FAIL`, and the orchestrator computes an overall status via `_compute_quality_gate` without raising. Errors in individual stages are surfaced through report fields rather than exceptions.

---

## Conventions and Constraints

Observed conventions (descriptive):

1. **Next.js API routes** throw `new ApiError(status, code, message)` inside `try/catch` blocks and return `apiError(error)` from the outer catch. This produces a uniform `{ success: false, error: { code, message, [details] } }` response with a generated `requestId`.
2. **Zod input-validation failures** are normalized to code `INVALID_INPUT`; malformed JSON bodies become `INVALID_JSON`; unhandled server-side exceptions become `SERVICE_UNAVAILABLE` at 503.
3. **Business logic errors** use uppercase snake-case codes (e.g. `REVIEW_CHANGED`, `SOURCE_GEOMETRY_CHANGED`) attached to 4xx/4xx-class statuses, keeping the HTTP status semantic while carrying a machine-readable code.
4. **FastAPI routers** raise `HTTPException` inline near the failing check rather than delegating to a domain exception class.
5. **FastAPI internal auth** is enforced centrally by an HTTP middleware before any router runs.
6. **Pipeline workers** swallow broad `Exception`s, persist partial progress (checkpoints), mark documents failed/completed based on accumulated `result.errors`, and let the caller inspect the result object.
7. **Validation orchestration** prefers typed status enums over exceptions — stages return `ValidationStatus`, and the orchestrator composes them.
8. **Selective error swallowing** appears in `app/api/admin/knowledge/route.ts`, where specific AI-worker error codes are caught and re-raised as user-facing `ApiError` values rather than bubbling as raw failures.

No evidence was found of:
- A shared error-code registry or enum between TypeScript and Python.
- Global error boundaries in the React/Next.js frontend.
- Structured logging of `requestId` beyond the `apiError` helper.
- Custom FastAPI exception handlers overriding `HTTPException` serialization.