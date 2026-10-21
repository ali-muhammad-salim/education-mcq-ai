CREATE TYPE "KnowledgeReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TABLE "KnowledgeDocument" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "User"("id"),
  "subjectId" TEXT NOT NULL REFERENCES "Subject"("id"),
  "syllabusVersionId" TEXT REFERENCES "SyllabusVersion"("id"),
  "sha256" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "resourceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING', "totalPages" INTEGER NOT NULL,
  "pipelineVersion" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeDocument_pages_check" CHECK ("totalPages" > 0 AND "totalPages" <= 1000),
  CONSTRAINT "KnowledgeDocument_status_check" CHECK ("status" IN ('PROCESSING', 'NEEDS_REVIEW', 'FAILED'))
);
CREATE UNIQUE INDEX "KnowledgeDocument_source_scope_key" ON "KnowledgeDocument"("sha256", "subjectId", "resourceType", "pipelineVersion");
CREATE INDEX "KnowledgeDocument_scope_idx" ON "KnowledgeDocument"("subjectId", "syllabusVersionId", "status");
CREATE TABLE "KnowledgeArtifact" (
  "id" TEXT PRIMARY KEY, "documentId" TEXT NOT NULL REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
  "pageNumber" INTEGER NOT NULL CHECK ("pageNumber" > 0), "content" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
  "data" JSONB NOT NULL, "sourceImageKey" TEXT NOT NULL, "status" "KnowledgeReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewerId" TEXT REFERENCES "User"("id"), "reviewedAt" TIMESTAMP(3), "reviewNote" TEXT,
  "embedding" vector(768), "embeddingModel" TEXT, "embeddingContentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeArtifact_review_check" CHECK ("status" <> 'APPROVED' OR ("reviewerId" IS NOT NULL AND "reviewedAt" IS NOT NULL)),
  CONSTRAINT "KnowledgeArtifact_embedding_check" CHECK ("embedding" IS NULL OR ("embeddingModel" IS NOT NULL AND "embeddingContentHash" = "contentHash"))
);
CREATE UNIQUE INDEX "KnowledgeArtifact_documentId_pageNumber_key" ON "KnowledgeArtifact"("documentId", "pageNumber");
CREATE INDEX "KnowledgeArtifact_status_createdAt_idx" ON "KnowledgeArtifact"("status", "createdAt");
CREATE INDEX "KnowledgeArtifact_text_idx" ON "KnowledgeArtifact" USING gin(to_tsvector('english', "content"));
CREATE TABLE "AIProviderBudget" (
  "id" TEXT PRIMARY KEY, "requests" INTEGER NOT NULL DEFAULT 0, "tokens" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AIProviderBudget_expiresAt_idx" ON "AIProviderBudget"("expiresAt");
CREATE TABLE "AIProviderState" (
  "id" TEXT PRIMARY KEY, "disabled" BOOLEAN NOT NULL DEFAULT false, "cooldownUntil" TIMESTAMP(3)
);
