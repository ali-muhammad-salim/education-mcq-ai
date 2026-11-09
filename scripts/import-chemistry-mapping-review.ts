/** Apply individually reviewed Chemistry mappings. Read-only unless --apply. */
import { loadEnvConfig } from '@next/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import review from '../data/chemistry/reviewed_syllabus_mappings_2025.json';
import { getFallbackPaper } from '../lib/paperDataService';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
async function main() {
 if (hash(readFileSync(path.join('public', review.syllabus.url))) !== review.syllabus.sha256) throw new Error('Authoritative syllabus hash mismatch.');
 const versions = await db.syllabusVersion.findMany({ where: { isLatest: true, subject: { name: 'Chemistry', academicClass: { level: { in: [9,10] }, programme: { board: { shortCode: { equals: 'AKU-EB', mode: 'insensitive' } } } } } }, include: { subject: { include: { academicClass: true } }, topics: { include: { subtopics: { include: { slos: true } } } } } });
 const targets = new Map<string, { sloId: string; topicId: string; subtopicId: string; syllabusVersionId: string; description: string }>();
 for (const grade of [9,10]) {
  const matches = versions.filter(v => v.subject.academicClass.level === grade && v.fileUrl?.endsWith('chemistry-ssc-full-syllabus-2025.pdf'));
  if (matches.length !== 1) throw new Error(`Ambiguous Chemistry syllabus for grade ${grade}`);
  const v = matches[0];
  for (const t of v.topics) for (const s of t.subtopics) for (const o of s.slos) if (o.code) targets.set(`${grade}:${o.code}`, { sloId: o.id, topicId: t.id, subtopicId: s.id, syllabusVersionId: v.id, description: o.description });
 }
 const savedPapers = await db.pastPaper.findMany({ where: { paperCode: { in: [...new Set(review.questions.map(q => q.paperCode))] } }, include: { questions: true } });
 const plans = [];
 const publications = [];
 for (const code of new Set(review.questions.map(q => q.paperCode))) {
  const matches = savedPapers.filter(p => p.paperCode === code);
  if (matches.length !== 1 || matches[0].sourceDocumentId) throw new Error('Ambiguous or pipeline-owned source: ' + code);
  const paper = matches[0], bundle = getFallbackPaper(code)!;
  if (!bundle.fileUrl || !existsSync(path.join('public', bundle.fileUrl))) throw new Error('Missing original PDF: ' + code);
  const sourceHash = hash(readFileSync(path.join('public', bundle.fileUrl)));
  if (paper.sourceHash && paper.sourceHash !== sourceHash) throw new Error('Paper source changed: ' + code);
  publications.push({ paper, sourceHash });
  for (const decision of review.questions.filter(q => q.paperCode === code)) {
   const matches = paper.questions.filter(q => q.questionNumber === decision.questionNumber);
   if (matches.length !== 1 || hash(matches[0].questionText) !== decision.questionSha256) throw new Error(`Question changed: ${code}/${decision.questionNumber}`);
   const row = matches[0], meta = bundle.questions.find(q => q.questionNumber === decision.questionNumber)!.sourceRegion;
   const mapped = decision.outcomes.map(o => {
    const target = targets.get(`${decision.grade}:${o.code}`);
    if (!target || normal(target.description) !== normal(o.description)) throw new Error(`Outcome mismatch: ${decision.grade}/${o.code}`);
    return target;
   });
   const previous = row.sourceRegion as Record<string, Prisma.JsonValue>;
   const keys = ['proposed_current_slo','current_slo','current_mapping','mapping_scope','mapping_status','mapping_reason','current_syllabus_reviewed','syllabus_reviewed','in_syllabus','out_of_syllabus','slo_text','mapping_review_source_sha256','mapping_review_source_url'] as const;
   const mapping = Object.fromEntries(keys.map(k => [k, meta[k]]));
   plans.push({ code, row, mapped, sourceRegion: JSON.parse(JSON.stringify({ ...previous, ...mapping })) as Prisma.InputJsonValue });
  }
 }
 console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY', reviewedQuestions: plans.length, mapped: plans.filter(p => p.mapped.length).length, noDirectOutcome: plans.filter(p => !p.mapped.length).length, papers: publications.length }, null, 2));
 if (!process.argv.includes('--apply')) return;
 mkdirSync('output/chemistry-syllabus-review', { recursive: true });
 const stamp = new Date().toISOString().replace(/[:.]/g, '-');
 writeFileSync(`output/chemistry-syllabus-review/database-backup-${stamp}.json`, JSON.stringify({ publications, plans }, null, 2));
 await db.$transaction(async tx => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('chemistry-syllabus-review'))`;
  for (const { paper, sourceHash } of publications) await tx.pastPaper.update({ where: { id: paper.id }, data: { sourceHash, verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES' } });
  for (const p of plans) {
   const first = p.mapped[0];
   await tx.pastPaperQuestion.update({ where: { id: p.row.id }, data: { sourceRegion: p.sourceRegion, sloId: first?.sloId || null, topicId: first?.topicId || null, subtopicId: first?.subtopicId || null, syllabusVersionId: first?.syllabusVersionId || null } });
   await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: p.row.id } });
   await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: p.row.id } });
   await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: p.row.id } });
   if (p.mapped.length) {
    await tx.pastPaperQuestionTopic.createMany({ data: [...new Set(p.mapped.map(t => t.topicId))].map(topicId => ({ pastPaperQuestionId: p.row.id, topicId })) });
    await tx.pastPaperQuestionSubtopic.createMany({ data: [...new Set(p.mapped.map(t => t.subtopicId))].map(subtopicId => ({ pastPaperQuestionId: p.row.id, subtopicId })) });
    await tx.pastPaperQuestionSLO.createMany({ data: [...new Set(p.mapped.map(t => t.sloId))].map(sloId => ({ pastPaperQuestionId: p.row.id, sloId })) });
   }
  }
 }, { timeout: 60000 });
 writeFileSync('output/chemistry-syllabus-review/database-import.json', JSON.stringify({ importedAt: new Date().toISOString(), questions: plans.length, papers: publications.length }, null, 2));
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Import failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
