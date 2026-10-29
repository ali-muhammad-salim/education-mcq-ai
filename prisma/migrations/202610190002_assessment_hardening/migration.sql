BEGIN;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "questionSnapshot" JSONB;

-- CreateTable
CREATE TABLE "AIDoubtRecord" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIDoubtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DurableJob" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DurableJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("identifier")
);

-- CreateTable
CREATE TABLE "RequestLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LegacyArchive" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIDoubtRecord_ownerId_status_createdAt_idx" ON "AIDoubtRecord"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DurableJob_status_availableAt_idx" ON "DurableJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "DurableJob_ownerId_createdAt_idx" ON "DurableJob"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLimit_expiresAt_idx" ON "RequestLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "LegacyArchive_kind_createdAt_idx" ON "LegacyArchive"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_code_key" ON "Quiz"("code");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_studentId_status_idx" ON "QuizAttempt"("quizId", "studentId", "status");

-- CreateIndex
-- Older submission endpoints reused attemptNumber = 1. Preserve every attempt
-- and audit the prior numbering before enforcing uniqueness.
WITH duplicate_groups AS (
  SELECT "quizId", "studentId" FROM "QuizAttempt"
  GROUP BY "quizId", "studentId" HAVING COUNT(*) > COUNT(DISTINCT "attemptNumber")
), ranked AS (
  SELECT a."id", a."attemptNumber", ROW_NUMBER() OVER (PARTITION BY a."quizId",a."studentId" ORDER BY a."startedAt",a."id")::int AS replacement
  FROM "QuizAttempt" a JOIN duplicate_groups d USING ("quizId","studentId")
)
INSERT INTO "AuditLog" ("id","action","resource","resourceId","details","createdAt")
SELECT 'migration-attempt-number-' || "id", 'ATTEMPT_NUMBER_REPAIRED', 'QuizAttempt', "id", jsonb_build_object('previous',"attemptNumber",'replacement',replacement), timezone('UTC', NOW()) FROM ranked WHERE "attemptNumber" <> replacement;
WITH duplicate_groups AS (
  SELECT "quizId", "studentId" FROM "QuizAttempt"
  GROUP BY "quizId", "studentId" HAVING COUNT(*) > COUNT(DISTINCT "attemptNumber")
), ranked AS (
  SELECT a."id", ROW_NUMBER() OVER (PARTITION BY a."quizId",a."studentId" ORDER BY a."startedAt",a."id")::int AS replacement
  FROM "QuizAttempt" a JOIN duplicate_groups d USING ("quizId","studentId")
)
UPDATE "QuizAttempt" a SET "attemptNumber" = r.replacement FROM ranked r WHERE a."id" = r."id";
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentId_attemptNumber_key" ON "QuizAttempt"("quizId", "studentId", "attemptNumber");


-- Close sessions issued by legacy bypasses before accepting new credentials.
DELETE FROM "UserSession";
-- Seeded identities require an explicit administrator bootstrap; records remain intact.
UPDATE "User" SET "status" = 'SUSPENDED', "passwordHash" = NULL
WHERE "email" IN ('admin@riselearner.com','support@riselearner.com','teacher@akueb.edu.pk','student@akueb.edu.pk','admin@akueb.edu.pk');
-- Preserve the questions used by historical attempts before future quiz changes.
UPDATE "QuizAttempt" a SET "questionSnapshot" = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q."id",'orderIndex',q."orderIndex",'marks',q."marks",'content',q."questionData") ORDER BY q."orderIndex"),'[]'::jsonb)
  FROM "QuizQuestion" q WHERE q."quizId" = a."quizId"
) WHERE a."questionSnapshot" IS NULL;

COMMIT;
