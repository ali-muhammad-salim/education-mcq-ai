# Dokploy release and scaling notes

Observed 20 October 2026: one application and one PostgreSQL service on the same 4-vCPU/8-GB host. Application deploys Dockerfile from GitHub main on push, one replica, with no application volumes or worker. PostgreSQL image is postgres:18, with its existing named data volume mounted at /var/lib/postgresql/18/docker. The live public schema contains User and UserSession only, with the legacy account column layout. Do not run baseline resolve against that incomplete schema.

## Release prerequisites

1. Rotate credentials exposed in chat through the provider/Dokploy interfaces. Keep credentials out of source, reports, screenshots and Git. Do not expose PostgreSQL publicly.
2. Take a private PostgreSQL custom-format backup in the existing persistent data volume; validate its archive listing and restore it into a disposable database before schema changes. Keep an additional off-server backup before relying on this as disaster recovery.
3. The current postgres:18 image does not include the required vector extension. Use a pgvector image for the **same PostgreSQL major version**, preserving the same named volume, mount and PGDATA. Never use Rebuild Database. The [pgvector project documents PostgreSQL 18 images](https://github.com/pgvector/pgvector/blob/master/README.md#docker). Review the selected image/digest and verify extension availability after the controlled restart.
4. Rehearse scripts/bootstrap-auth-schema.cjs on the restored production copy. Its default mode is read-only and accepts only the reviewed two-table layout. With a reviewed backup, explicit --apply and AUTH_ONLY_BOOTSTRAP=confirm-reviewed-backup, it creates the missing baseline objects without deleting account tables, records the baseline, and deploys the hardening migration. It refuses other database layouts. Legacy sessions are intentionally revoked. The normal full-schema rehearsal also remains available for databases that already have the complete legacy schema.
5. During the release window, stop old application writes, apply the verified account-only migration, and deploy the reviewed code. Validate counts, authentication, static resources, a disposable assessment and result authorization before reopening writes. Do not assume an application rollback reverses a database migration.
6. Mount a shared named volume at /app/data/assets and set ASSET_ROOT=/app/data/assets. Share it with processing workers. Persist /app/data/jobs for ingestion workers. These mounts do not replace the bundled academic data directory.
7. Run a separate assessment worker using the same web image with command npm run worker and WORKER_KINDS=EXAM_FINALIZE,EXAM_GRADE. Start with one worker. AI/OCR processing uses a separate worker/image and should not consume exam resources during a burst.
8. Set ASSESSMENT_SUBMISSION_MODE=queued only after the grading worker passes a real receipt-to-result smoke check. Keep synchronous otherwise. Set APP_URL=https://riselearner.com at runtime to govern server origin checks, recovery links and OAuth independently of the build. Set NEXT_PUBLIC_APP_URL=https://riselearner.com at build time and runtime as well; the Dockerfile accepts its public build argument. Configure email, verified sender, Google callback and an available Gemini model separately. Missing providers remain unavailable rather than returning fabricated success.

## Initial resource bounds

These are starting settings, not measured production capacity:

- Web: ASSESSMENT_MAX_IN_FLIGHT=8, ASSESSMENT_MAX_WAITING=128. Add connection_limit=10&pool_timeout=10 to its database URL (use & if other query parameters already exist). Bound the Node heap and container resources so the database/Dokploy retain headroom.
- Assessment worker: a separate database URL with connection_limit=3&pool_timeout=10; one sequential worker initially. Increase workers only after measuring database CPU, disk latency, queue age and pool waits.
- The per-process admission queue prioritizes submissions, answer saves, starts, then telemetry. Overflow/expiry returns 503 with Retry-After. The client uses bounded jittered retries and retains pending local answers. This does not turn an unaccepted HTTP request into a durable receipt.
- Queued submission commits the closed attempt, server receipt timestamp and grading job in one transaction. Answer changes stop once accepted. Worker replays and duplicate submissions cannot create a second finalization or change the original receipt timestamp.
- /api/admin/health is administrator-only and reports local admission counts, job counts and oldest due assessment-job age. Monitor these externally; an empty queue does not prove worker liveness. Status polling uses a small ownership-checked response with backoff, rather than downloading all question snapshots each time.
- Apply bounded request/body/connection limits at the reverse proxy/CDN as well. A process-local queue is not a distributed queue or a DDoS guarantee. Cache public immutable assets and suitable catalog pages; never cache personalized assessment responses publicly.

## Capacity target

20,000 submissions in ten seconds requires at least 2,000 accepted submissions per second, plus ongoing answer saves, starts, authentication, status checks and normal page requests. Three to four million registered users is a separate storage/retention concern from simultaneous active users. A queue can defer grading, but accepting receipts still requires database writes and disk durability.

Local bursts are evidence for the tested workstation only. They do not certify the 4-vCPU host or the 20,000 target. Before an exam-scale launch, load-test an isolated staging deployment with matching CPU/RAM/disk/network and realistic mixed traffic, fail/restart workers, verify replay integrity and capture p95/p99 receipt latency, queue drain time, CPU/RAM, I/O, locks, pool waits and error rate. Do not load-test production during student activity.

Scale toward a CDN/reverse proxy, multiple bounded web replicas, a separately provisioned PostgreSQL server, a carefully budgeted connection pool, and isolated grading/processing workers. Each replica and worker adds connections; pooling does not create database throughput. Add read replicas/partitioning/archival only in response to measured query or retention pressure. No 20,000-submission SLA is claimed by this release.
