ALTER TABLE "PastPaperQuestion"
  ADD COLUMN "embedding" vector(768),
  ADD COLUMN "embeddingModel" TEXT;

CREATE INDEX "PastPaperQuestion_embedding_hnsw_idx"
  ON "PastPaperQuestion" USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
