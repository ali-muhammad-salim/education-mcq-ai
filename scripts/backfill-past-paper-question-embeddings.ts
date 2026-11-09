import { setTimeout as sleep } from 'node:timers/promises';
import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api';
import { paperChoices, paperMetadata } from '@/lib/paperPresentation';
import prisma from '@/lib/prisma';
import { AIBackpressure, canonicalModel, providerConfig } from '@/services/ai/provider';
import { embedKnowledge } from '@/services/knowledge/search';

type QuestionRow = {
  id: string;
  questionText: string;
  normalizedQuestionText: string;
  sourceRegion: Prisma.JsonValue;
  updatedAt: Date;
};

async function coverage() {
  const [counts] = await prisma.$queryRaw<{ total: number; missing: number }[]>`
    SELECT count(*)::int AS total, (count(*) FILTER (WHERE embedding IS NULL))::int AS missing
    FROM "PastPaperQuestion"
  `;
  return counts;
}

async function main() {
  if (process.argv.includes('--check')) {
    const counts = await coverage();
    console.log(counts);
    if (counts.missing) process.exitCode = 1;
    return;
  }

  if (!canonicalModel(process.env.GEMINI_EMBEDDING_MODEL) || !providerConfig().length) {
    throw new Error('Set GEMINI_EMBEDDING_MODEL and GEMINI_API_KEY or GEMINI_API_KEYS before running the backfill.');
  }

  let indexed = 0;
  let skipped = 0;
  let after: string | undefined;
  while (true) {
    const questions: QuestionRow[] = await prisma.$queryRaw(Prisma.sql`
      SELECT id, "questionText", "normalizedQuestionText", "sourceRegion", "updatedAt"
      FROM "PastPaperQuestion"
      WHERE embedding IS NULL ${after === undefined ? Prisma.empty : Prisma.sql`AND id > ${after}`}
      ORDER BY id LIMIT 100
    `);
    if (!questions.length) break;

    for (const question of questions) {
      const meta = paperMetadata(question.sourceRegion);
      const choices = paperChoices(meta.choices ?? meta.options);
      const stem = question.questionText.trim() || question.normalizedQuestionText.trim();
      const text = [stem, ...Object.values(choices)].join('\n').trim();
      if (!text || text.length > 12000) {
        skipped++;
        console.warn(`Question ${question.id} requires ${text ? 'shorter' : 'searchable'} source text.`);
        continue;
      }

      // Short quota pauses can clear within this run. Longer pauses can resume from saved rows.
      while (true) {
        try {
          const embedding = await embedKnowledge(text, 'RETRIEVAL_DOCUMENT');
          indexed += await prisma.$executeRaw`
            UPDATE "PastPaperQuestion"
            SET embedding = ${JSON.stringify(embedding.vector)}::vector, "embeddingModel" = ${embedding.model}
            WHERE id = ${question.id} AND embedding IS NULL AND "updatedAt" = ${question.updatedAt}
          `;
          break;
        } catch (error) {
          if (!(error instanceof AIBackpressure)) throw error;
          const delay = error.retryAt.getTime() - Date.now();
          if (delay > 120_000) throw error;
          await sleep(Math.max(1_000, delay));
        }
      }
    }

    after = questions.at(-1)?.id;
    console.log({ indexed, skipped });
  }

  const counts = await coverage();
  console.log({ ...counts, indexed, skipped });
  if (counts.missing) process.exitCode = 1;
}

main().catch(error => {
  if (error instanceof AIBackpressure) {
    console.error(`Gemini quota paused the backfill. Rerun after ${error.retryAt.toISOString()}. Completed rows are saved.`);
  } else if (error instanceof ApiError) {
    console.error(error.message);
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('PostgreSQL is unavailable. Check the configured DATABASE_URL and database service.');
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Database query failed (${error.code}). Check that the embedding migration is applied.`);
  } else {
    console.error(error instanceof Error ? error.message : 'Question embedding backfill failed.');
  }
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
