/** Sync source-checked model-paper text to existing DB questions; preserves SLO links and all unrelated metadata. */
import { loadEnvConfig } from '@next/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import mcqs from '../data/mathematics/ssc1_model_mcqs.json';
import theory from '../data/mathematics/ssc1_model_crqs.json';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  const updates = [
    ...mcqs.filter(q => [7, 9, 14, 17, 18, 23, 26, 27, 28, 30, 42, 45].includes(q.questionNumber)).map(q => ({
      code: 'MTH-IX-P1', number: String(q.questionNumber), text: q.stem,
      meta: { choices: q.options, correct_answer: q.correctOption, explanation: q.explanation, option_feedback: q.option_feedback },
    })),
    ...theory.filter(q => ['Q.1', 'Q.4a', 'Q.6', 'Q.9a'].includes(q.questionNumber)).map(q => ({
      code: 'MTH-IX-P2', number: q.questionNumber, text: q.questionText,
      meta: { model_answer: q.modelAnswer, better_response: q.betterResponse, rubric: q.rubric, diagramUrl: q.diagramUrl },
    })),
  ];
  const rows = await db.pastPaperQuestion.findMany({ where: { pastPaper: { paperCode: { in: ['MTH-IX-P1', 'MTH-IX-P2'] } } }, include: { pastPaper: { select: { paperCode: true } } } });
  const targets = updates.map(update => {
    const matches = rows.filter(row => row.pastPaper.paperCode === update.code && row.questionNumber.replace(/^Q\.?\s*/i, '') === update.number.replace(/^Q\.?\s*/i, ''));
    if (matches.length !== 1) throw new Error(`Expected one ${update.code}/${update.number}, found ${matches.length}`);
    return { update, row: matches[0] };
  });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY', questions: targets.length }));
  if (!process.argv.includes('--apply')) return;
  mkdirSync('output/model-maths-review', { recursive: true });
  writeFileSync(`output/model-maths-review/database-before-${Date.now()}.json`, JSON.stringify(targets.map(t => t.row), null, 2));
  await db.$transaction(async tx => {
    for (const { update, row } of targets) {
      const meta = (row.sourceRegion && typeof row.sourceRegion === 'object' && !Array.isArray(row.sourceRegion)) ? row.sourceRegion : {};
      await tx.pastPaperQuestion.update({ where: { id: row.id }, data: {
        questionText: update.text,
        normalizedQuestionText: update.text.toLowerCase().replace(/\s+/g, ' ').trim(),
        sourceRegion: JSON.parse(JSON.stringify({ ...meta, ...update.meta })) as Prisma.InputJsonValue,
      } });
    }
  });
  console.log(`Synced ${targets.length} model questions for paper, chapter and quiz views.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
