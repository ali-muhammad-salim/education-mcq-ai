CREATE INDEX "KnowledgeArtifact_embedding_hnsw_idx"
ON "KnowledgeArtifact" USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
