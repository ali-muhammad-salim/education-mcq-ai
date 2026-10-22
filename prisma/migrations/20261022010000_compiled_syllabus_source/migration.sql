ALTER TABLE "SyllabusVersion" ADD COLUMN "sourceDocumentId" TEXT;
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "KnowledgeDocument"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "SyllabusVersion_sourceDocumentId_idx" ON "SyllabusVersion"("sourceDocumentId");
