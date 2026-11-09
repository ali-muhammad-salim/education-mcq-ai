/** Synchronize corrected canonical Maths content without replacing question IDs, syllabus links or attempts. */
import { loadEnvConfig } from '@next/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  const papers = getAllStandardPapers().filter(p => p.paperCode.startsWith('MTH-')).map(p => getFallbackPaper(p.paperCode)!);
  const rows = await db.pastPaperQuestion.findMany({ where: { pastPaper: { paperCode: { in: papers.map(p => p.paperCode) } } }, include: { pastPaper: { select: { paperCode: true } } } });
  const updates = [];
  for (const paper of papers) for (const q of paper.questions) {
    const matches = rows.filter(row => row.pastPaper.paperCode === paper.paperCode && row.questionNumber.replace(/^Q\.?\s*/i, '') === q.questionNumber.replace(/^Q\.?\s*/i, ''));
    if (matches.length !== 1) throw new Error(`Expected one database question: ${paper.paperCode}/${q.questionNumber}`);
    const row = matches[0], prior = row.sourceRegion as Record<string, unknown> || {};
    const meta: Record<string, unknown> = { ...prior, ...q.sourceRegion };
    // MCQ reasoning comes from the corrected explanation, not a stale imported model response.
    if (q.questionType === 'MULTIPLE_CHOICE') { delete meta.better_response; delete meta.model_answer; }
    const sourceRegion = JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue;
    const verified = q.sourceRegion.answer_status !== 'KEY_CONFLICT' && q.sourceRegion.answer_status !== 'OFFICIAL_ASTERISK';
    if (row.questionText === q.questionText && row.pageNumber === q.sourceRegion.pageNumber && row.verified === verified && isDeepStrictEqual(row.sourceRegion, sourceRegion)) continue;
    updates.push({ row, data: { questionText: q.questionText, normalizedQuestionText: q.questionText.toLowerCase().replace(/\s+/g, ' ').trim(), sourceRegion, verified, pageNumber: q.sourceRegion.pageNumber } });
  }
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY', papers: papers.length, questionsChecked: rows.length, updates: updates.length }));
  if (!process.argv.includes('--apply') || !updates.length) return;
  mkdirSync('output/mathematics-full-audit', { recursive: true });
  writeFileSync(`output/mathematics-full-audit/database-before-${Date.now()}.json`, JSON.stringify(updates.map(u => u.row), null, 2));
  await db.$transaction(async tx => {
    for (const { row, data } of updates) {
      const result = await tx.pastPaperQuestion.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data });
      if (result.count !== 1) throw new Error(`Concurrent question change; review before retrying ${row.id}`);
    }
  }, { timeout: 60000 });
  console.log('Saved source corrections; question IDs and syllabus relations retained.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
