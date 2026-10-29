ALTER TABLE "PastPaper" ADD COLUMN "sourceDocumentId" TEXT;
ALTER TABLE "PastPaper" ADD CONSTRAINT "PastPaper_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "KnowledgeDocument"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Quiz" ADD COLUMN "sourceDocumentId" TEXT;
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "KnowledgeDocument"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
