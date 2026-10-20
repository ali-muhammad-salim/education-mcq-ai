CREATE TABLE "KnowledgeReference" (
  "documentId" TEXT NOT NULL REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
  "referenceId" TEXT NOT NULL REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL,
  PRIMARY KEY ("documentId", "referenceId"),
  CHECK ("documentId" <> "referenceId")
);
