CREATE TABLE "WorkerHeartbeat" (
  "id" TEXT PRIMARY KEY, "kinds" TEXT[] NOT NULL, "seenAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "WorkerHeartbeat_seenAt_idx" ON "WorkerHeartbeat"("seenAt");
