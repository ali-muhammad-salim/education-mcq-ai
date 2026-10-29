CREATE TABLE "QuestionBankItem" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "questionType" TEXT NOT NULL,
  "stemText" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL,
  "cognitiveLevel" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionBankItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionBankItem_creatorId_createdAt_idx" ON "QuestionBankItem"("creatorId", "createdAt");

ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
