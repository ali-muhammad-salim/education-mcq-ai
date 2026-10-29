ALTER TABLE "StudyNote" ADD COLUMN "partIndex" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "partTotal" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_part_check" CHECK ("partIndex" >= 1 AND "partTotal" >= "partIndex");
DROP INDEX "StudyNote_source_revision_key";
CREATE UNIQUE INDEX "StudyNote_source_revision_key" ON "StudyNote"("sourceDocumentId", "topicId", "kind", "revision", "partIndex");
