# Production release verification — 20 October 2026

The approved release is deployed at https://riselearner.com. This record supersedes the pre-release observations in REMEDIATION-STATUS.md and DOKPLOY-RELEASE.md.

Release: f6d88732e402492aa41c49e45cb1000454afb252, merged through https://github.com/ali-muhammad-salim/education-mcq-ai/pull/1. GitHub validation passed on the release branch and main; the regression suite contains 39 passing tests.

## Verified in production

- PostgreSQL remains on major version 18, using pgvector/pgvector:0.8.7-pg18-trixie and the original named data volume/PGDATA. Extension version 0.8.7 is installed.
- A private custom-format pre-release backup was made and its archive listing checked. The earlier backup was restored on the same host and the exact migration rehearsed against the restored copy.
- Both migrations completed on the live database. All 12 original accounts were present immediately after migration. Predictable legacy demo accounts are suspended and old sessions revoked.
- The explicitly selected existing personal account received ADMIN access. Its password was preserved, its sessions revoked, and an OWNER_ADMIN_GRANTED audit entry created. The owner confirmed successful sign-in and account management access.
- The public database health endpoint returns 200/ok; homepage, quiz pages, Class IX/X Physics hubs and Account return 200. Administrator health rejects unauthenticated requests with 401. Google configuration check reports enabled; this does not certify a complete Google login.
- Shared named volumes persist assets and job workspaces. The web asset directory is writable as UID 1001. The web runtime uses APP_URL=https://riselearner.com, database pool 10, assessment concurrency 8 and waiting bound 128.
- The separate assessment worker is running from Dockerfile.assessment-worker, limited to EXAM_FINALIZE and EXAM_GRADE, with database pool 3 and a 512 MB Node heap. It completed real private verification jobs.
- Queued submission mode is enabled and verified in the actual restarted web container. RUN_DATABASE_MIGRATIONS remains explicitly enabled; the one-time AUTH_ONLY_BOOTSTRAP flag has been removed.
- Web and assessment worker track GitHub main with automatic deployment enabled. Clean Cache is off for subsequent builds.
- The existing green site appearance was inspected on the deployed homepage and screenshot saved.

## Live smoke checks

Two private classroom/quiz fixtures were used, first in synchronous mode and then queued mode. Each used passwordless synthetic accounts with random example.invalid addresses; no real student's answers or grades were changed. Fixtures were archived, synthetic accounts suspended and their temporary sessions expired afterward. Records are retained for audit rather than purged.

Both checks passed: server-owned questions hide keys before submission; answers save; scoring returns 2/2; only one SUBMITTED event is recorded; unauthenticated result access is rejected; a separate worker finalizes the second attempt after its deadline. The queued check received HTTP 202 and then retrieved the correctly graded result from the deployed worker. This is a functional smoke test, not a load test.

Evidence: live-homepage-release.png, production-migration-applied.png, production-sync-smoke.png, production-queued-runtime.png and production-queued-smoke.png in this folder.

## Work still required

- Rotate/revoke credentials and the SSH key exposed in chat through their providers. The pasted SSH private key was not used or saved.
- Configure a verified email sender/provider and validate delivery. Complete real Google login with the owner's browser.
- Configure a supported Gemini model and a separate AI/OCR worker with the required runtime, source curriculum and textbook evidence. The assessment worker intentionally does not process AI/ingestion jobs. No live AI accuracy or complete OCR workflow is certified.
- Add off-server backups and scheduled restore drills. Same-server backups do not protect against loss of that server.
- Supply/review missing original academic content and authoritative SLO/chapter mappings; unavailable resources are not fabricated.
- Perform a controlled staging load and recovery test with realistic mixed traffic before committing to exam-scale capacity. Local 100/200-student tests do not establish a production SLA. The current 4-vCPU/8-GB host is not certified for 20,000 submissions in 5–10 seconds.
- Monitor worker failures/oldest due job age, database I/O and pool waits. Future schema changes require coordinated web/worker rollout; automatic deployment is not a substitute for migration review.

This deployment completes the tested remediation/release scope. It does not certify every device, all external providers, academic content accuracy or the optional new learning-product backlog.
