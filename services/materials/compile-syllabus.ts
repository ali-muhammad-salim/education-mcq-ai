import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { pageExtraction } from '@/services/ingestion/trust';
import { classForChapter, curriculumPlan } from '@/services/ingestion/curriculum-plan';
import { resolveAcademicMetadata } from '@/services/assessment/catalog';
import { ApiError } from '@/lib/api';
import { syllabusCoverageConflicts } from '@/services/ingestion/learning-validation';
const id = (s: string) => 'source-' + createHash('sha256').update(s).digest('hex').slice(0, 40);

/** Called only after the source's complete transcription has been approved.
 * Immutable edition IDs preserve old exam-year relations when a new edition arrives.
 */
export async function compileReviewedSyllabus(tx: Prisma.TransactionClient, documentId: string) {
  const doc = await tx.knowledgeDocument.findUniqueOrThrow({ where: { id: documentId }, include: { artifacts: { orderBy: { pageNumber: 'asc' } }, subject: { include: { academicClass: { include: { programme: { include: { board: true } } } } } } } });
  if (doc.resourceType !== 'syllabus' || !doc.publishAfterReview || doc.status !== 'NEEDS_REVIEW' || doc.artifacts.length !== doc.totalPages || doc.artifacts.some(a => a.status !== 'APPROVED')) return { compiled: false };
  const metadata = (doc.catalogMetadata || {}) as Record<string, Prisma.JsonValue>;
  const plan = curriculumPlan.safeParse(metadata.classPlan);
  if (!plan.success || !plan.data.assignments.length || plan.data.conflicts.length) return { compiled: false, reason: 'CLASS_INDEX_REVIEW_REQUIRED' };
  const rows = doc.artifacts.flatMap(a => pageExtraction.parse((a.data as Record<string, unknown>).extraction).learning.outcomes.map((row, ordinal) => ({ ...row, page: a.pageNumber, ordinal })));
  if (!rows.length) return { compiled: false, reason: 'STRUCTURED_OUTCOMES_REQUIRED' };
  const missing = syllabusCoverageConflicts(doc.artifacts.map(a=>({pageNumber:a.pageNumber,extraction:pageExtraction.parse((a.data as Record<string,unknown>).extraction)})), plan.data.assignments);
  if (missing.length) throw new ApiError(422,'SYLLABUS_COVERAGE_INCOMPLETE',missing.join(' '));
  if (rows.some(r => classForChapter(plan.data, r.chapterCode, r.chapterTitle) !== r.grade)) throw new ApiError(422, 'CLASS_INDEX_MISMATCH', 'Outcome classes must match the reviewed document index.');
  const duplicates = new Map<string, string>();
  for (const row of rows) {
    // A board may print the same code twice for different outcomes. Preserve
    // each verbatim row; chapter and subtopic headings still must be consistent.
    for (const [key, text] of [[row.grade + ':chapter:' + row.chapterCode, row.chapterTitle], [row.grade + ':chapter:' + row.chapterCode + ':subtopic:' + row.subtopicCode, row.subtopicTitle]]) {
      const old = duplicates.get(key); if (old !== undefined && old !== text) throw new ApiError(422, 'OUTCOME_CONFLICT', 'The same chapter, subtopic or outcome code has conflicting source text.'); duplicates.set(key, text);
    }
  }
  const date = typeof metadata.syllabusEffectiveFrom === 'string' ? metadata.syllabusEffectiveFrom : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return { compiled: false, reason: 'EDITION_DATE_REQUIRED' };
  const versions: string[] = [];
  const revision = createHash('sha256').update(doc.artifacts.map(a => a.contentHash).join(':')).digest('hex');
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`curriculum-publication:${doc.subject.academicClass.programme.board.shortCode}:${doc.subject.name}`}))`;
  for (const grade of [...new Set(rows.map(r => r.grade))]) {
    const scope = await resolveAcademicMetadata(tx, doc.subject.academicClass.programme.board.shortCode, grade, doc.subject.name);
    const versionId = id(doc.id + ':' + scope.subjectId + ':' + revision), fileUrl = '/api/materials/' + doc.id + '/original';
    const existing = await tx.syllabusVersion.findMany({ where: { subjectId: scope.subjectId, isLatest: true } });
    const makeCurrent = existing.every(v => v.validFrom <= new Date(date));
    if (makeCurrent) await tx.syllabusVersion.updateMany({ where: { subjectId: scope.subjectId, isLatest: true }, data: { isLatest: false } });
    await tx.syllabusVersion.upsert({ where: { id: versionId }, create: { id: versionId, subjectId: scope.subjectId, versionName: String(metadata.title || 'Syllabus') + ' · Class ' + grade, validFrom: new Date(date), isLatest: makeCurrent, fileUrl, sourceDocumentId: doc.id }, update: { isLatest: makeCurrent } });
    const selected = rows.filter(r => r.grade === grade);
    const chapters = [...new Map(selected.map(r => [r.chapterCode, r])).values()];
    for (const chapter of chapters) {
      const topicId = id(versionId + ':' + chapter.chapterCode);
      await tx.topic.upsert({ where: { id: topicId }, create: { id: topicId, syllabusVersionId: versionId, name: chapter.chapterTitle, topicNumber: chapter.chapterCode }, update: {} });
      const subtopics = [...new Map(selected.filter(r => r.chapterCode === chapter.chapterCode).map(r => [r.subtopicCode, r])).values()];
      for (const subtopic of subtopics) {
        const subtopicId = id(topicId + ':' + subtopic.subtopicCode);
        await tx.subtopic.upsert({ where: { id: subtopicId }, create: { id: subtopicId, topicId, name: subtopic.subtopicTitle, subtopicNum: subtopic.subtopicCode }, update: {} });
        const outcomes = [...new Map(selected.filter(r => r.chapterCode === chapter.chapterCode && r.subtopicCode === subtopic.subtopicCode).map(r => [JSON.stringify([r.code, r.description, r.cognitiveLevel]), r])).values()];
        const counts = new Map<string, number>();
        for (const row of outcomes) counts.set(row.code, (counts.get(row.code) || 0) + 1);
        await tx.sLO.createMany({ skipDuplicates: true, data: outcomes.map(r => ({ id: id(versionId + ':' + r.code + (counts.get(r.code)! > 1 ? ':' + r.description + ':' + r.cognitiveLevel : '')), subtopicId, code: r.code, description: r.description, cognitiveLevel: r.cognitiveLevel, sourcePage: r.page, sourceOrdinal: r.ordinal, isFormative: /^FA\b/i.test(r.cognitiveLevel), fingerprint: createHash('sha256').update(r.description).digest('hex') })) });
      }
    }
    versions.push(versionId);
  }
  await tx.knowledgeDocument.update({ where: { id: doc.id }, data: { catalogMetadata: { ...metadata, compiledVersionIds: versions } } });
  return { compiled: true, versions };
}
