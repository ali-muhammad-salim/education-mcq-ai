ALTER TABLE "KnowledgeDocument" ADD COLUMN "publishAfterReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KnowledgeDocument" ADD COLUMN "catalogMetadata" JSONB;
CREATE INDEX "KnowledgeDocument_catalog_idx" ON "KnowledgeDocument" ("subjectId", "resourceType", "publishAfterReview", "status");
