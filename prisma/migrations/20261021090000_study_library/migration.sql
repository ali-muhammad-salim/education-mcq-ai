-- Extend the existing notes model; legacy rows remain private and unchanged.
CREATE UNIQUE INDEX "Topic_id_syllabusVersionId_key" ON "Topic"("id", "syllabusVersionId");
CREATE UNIQUE INDEX "KnowledgeDocument_id_syllabusVersionId_key" ON "KnowledgeDocument"("id", "syllabusVersionId");
ALTER TABLE "KnowledgeDocument" ADD COLUMN "autoStudyResources" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudyNote"
 ADD COLUMN "sourceDocumentId" TEXT,
 ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CHAPTER_NOTES',
 ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "ownerId" TEXT,
 ADD COLUMN "reviewerId" TEXT,
 ADD COLUMN "reviewedAt" TIMESTAMP(3),
 ADD COLUMN "reviewNote" TEXT,
 ADD COLUMN "contentHash" TEXT,
 ADD COLUMN "generation" JSONB,
 ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_sourceDocumentId_syllabusVersionId_fkey" FOREIGN KEY ("sourceDocumentId", "syllabusVersionId") REFERENCES "KnowledgeDocument"("id", "syllabusVersionId") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_topic_scope_fkey" FOREIGN KEY ("topicId", "syllabusVersionId") REFERENCES "Topic"("id", "syllabusVersionId") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_revision_check" CHECK ("revision" > 0);
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_trusted_state_check" CHECK ("sourceDocumentId" IS NULL OR (
 "syllabusVersionId" IS NOT NULL AND "ownerId" IS NOT NULL AND
 "kind" IN ('CHAPTER_NOTES','NUMERICAL_GUIDE','FORMULA_SHEET','CHEAT_SHEET','FLASHCARDS','PRACTICE_SET','CHAPTER_READER') AND
 "status" IN ('DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','FAILED') AND
 ("contentHash" IS NULL OR "contentHash" ~ '^[a-f0-9]{64}$') AND
 ("status" <> 'PUBLISHED' OR ("reviewerId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewNote" IS NOT NULL AND "contentHash" IS NOT NULL AND "blocks" IS NOT NULL))
));
CREATE UNIQUE INDEX "StudyNote_source_revision_key" ON "StudyNote"("sourceDocumentId", "topicId", "kind", "revision");
CREATE INDEX "StudyNote_status_syllabusVersionId_topicId_idx" ON "StudyNote"("status", "syllabusVersionId", "topicId");
CREATE TABLE "StudyNoteSource" (
 "noteId" TEXT NOT NULL,
 "artifactId" TEXT NOT NULL,
 "contentHash" TEXT NOT NULL CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "StudyNoteSource_pkey" PRIMARY KEY ("noteId", "artifactId"),
 CONSTRAINT "StudyNoteSource_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "StudyNote"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "StudyNoteSource_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "KnowledgeArtifact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "StudyNoteSource_artifactId_idx" ON "StudyNoteSource"("artifactId");
