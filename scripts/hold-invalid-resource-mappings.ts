/** Holds invalid bundled mappings without changing answers or original references. Read-only unless --apply. */
import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { mkdirSync, writeFileSync } from 'node:fs';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  const plans = [];
  for (const summary of getAllStandardPapers().filter(p => p.paperCode.startsWith('CHM-'))) {
    const paper = getFallbackPaper(summary.paperCode)!;
    const pending = paper.questions.filter(q => q.sourceRegion.mapping_status === 'PENDING_REVIEW');
    if (!pending.length) continue;
    const saved = await db.pastPaper.findMany({ where: { paperCode: paper.paperCode, sourceDocumentId: null }, include: { questions: true } });
    for (const record of saved) for (const q of pending) {
      const row = record.questions.find(r => r.questionNumber === q.questionNumber);
      if (!row || row.questionText.trim() !== q.questionText.trim()) throw new Error(`Source mismatch ${paper.paperCode}/${q.questionNumber}`);
      const meta = row.sourceRegion as Record<string, Prisma.JsonValue>;
      if (meta.current_syllabus_reviewed === false && meta.proposed_current_slo === q.sourceRegion.proposed_current_slo && !row.sloId) continue;
      plans.push({ code: paper.paperCode, number: q.questionNumber, row, next: { ...meta,
        proposed_current_slo: q.sourceRegion.proposed_current_slo,
        proposed_current_mapping: q.sourceRegion.proposed_current_mapping,
        current_slo: null, current_mapping: [], current_syllabus_reviewed: false, syllabus_reviewed: false,
        mapping_status: 'PENDING_REVIEW', mapping_reason: q.sourceRegion.mapping_reason,
      } });
    }
  }
  mkdirSync('output/resource-audit', { recursive: true });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY', pendingMappings: plans.length }));
  if (!process.argv.includes('--apply')) return;
  writeFileSync('output/resource-audit/mapping-repair-backup.json', JSON.stringify(plans, null, 2));
  await db.$transaction(async tx => {
    for (const plan of plans) {
      await tx.pastPaperQuestion.update({ where: { id: plan.row.id }, data: { sourceRegion: JSON.parse(JSON.stringify(plan.next)), syllabusVersionId: null, topicId: null, subtopicId: null, sloId: null } });
      await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: plan.row.id } });
      await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: plan.row.id } });
      await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: plan.row.id } });
    }
  }, { timeout: 60000 });
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Mapping review failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
