-- Refuse ambiguous current curriculum rather than choosing one silently.
CREATE UNIQUE INDEX "SyllabusVersion_subject_current_key" ON "SyllabusVersion"("subjectId") WHERE "isLatest" = true;
CREATE UNIQUE INDEX "SyllabusVersion_id_subjectId_key" ON "SyllabusVersion"("id", "subjectId");
ALTER TABLE "KnowledgeDocument" DROP CONSTRAINT "KnowledgeDocument_syllabusVersionId_fkey";
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_syllabusVersionId_subjectId_fkey"
  FOREIGN KEY ("syllabusVersionId", "subjectId") REFERENCES "SyllabusVersion"("id", "subjectId");
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_hash_check" CHECK (sha256 ~ '^[a-f0-9]{64}$');
ALTER TABLE "KnowledgeArtifact" ADD CONSTRAINT "KnowledgeArtifact_hash_check" CHECK ("contentHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof(data) = 'object');
