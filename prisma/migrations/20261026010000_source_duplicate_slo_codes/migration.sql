-- Official syllabus source text may contain two distinct outcomes with one printed code.
-- Both rows retain their original code and are distinguished by ID and description.
DROP INDEX IF EXISTS "SLO_subtopicId_code_key";
CREATE INDEX IF NOT EXISTS "SLO_subtopicId_code_idx" ON "SLO"("subtopicId", "code");
ALTER TABLE "SLO" ADD COLUMN IF NOT EXISTS "sourceOrdinal" INTEGER;
