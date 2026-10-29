import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes('_test')) throw Error('Dedicated test database required');
describe.skipIf(!url)('Compiled curriculum and human diagram publication', () => {
  let db: PrismaClient, owner: string, board: string, programme: string, subject: string, doc: string, page: string, root: string, original: string, enhanced: string;
  const unique = randomUUID(), token = randomUUID(), sha = (s: string) => createHash('sha256').update(s).digest('hex');
  const plan = { assignments: [{ classLevel: 9, chapterCode: '1', chapterTitle: 'Measurement', indexPage: 1, evidence: 'IX: Measurement' }, { classLevel: 10, chapterCode: '1', chapterTitle: 'Waves', indexPage: 1, evidence: 'X: Waves' }], conflicts: [] };
  const learning = { outcomes: [{ grade: 9, chapterCode: '1', chapterTitle: 'Measurement', subtopicCode: '1.1', subtopicTitle: 'Units', code: '1.1.1', description: 'Distinguish base and derived quantities.', cognitiveLevel: 'U' }, { grade: 10, chapterCode: '1', chapterTitle: 'Waves', subtopicCode: '1.1', subtopicTitle: 'Wave motion', code: '1.1.1', description: 'Describe transverse wave motion.', cognitiveLevel: 'U' }], questions: [], keyEntries: [] };
  beforeAll(async () => {
    process.env.DATABASE_URL = url; vi.stubEnv('APP_URL', 'http://localhost');
    db = new PrismaClient({ datasources: { db: { url } } }); root = await fs.mkdtemp(path.join(os.tmpdir(), 'source-publication-test-')); vi.stubEnv('ASSET_ROOT', root);
    owner = (await db.user.create({ data: { email: unique + '@example.test', name: 'Source reviewer', role: 'ADMIN' } })).id;
    await db.userSession.create({ data: { userId: owner, token: sha(token), expiresAt: new Date(Date.now() + 600000) } });
    board = (await db.board.create({ data: { shortCode: 'SOURCE-' + unique, name: 'Source tests', country: 'Pakistan' } })).id;
    programme = (await db.programme.create({ data: { boardId: board, name: 'SSC' } })).id;
    const classId = (await db.academicClass.create({ data: { programmeId: programme, level: 9, name: 'Class IX' } })).id;
    subject = (await db.subject.create({ data: { classId, name: 'Physics' } })).id;
    const { uploadEducationalAsset } = await import('@/lib/storage');
    original = (await uploadEducationalAsset(Buffer.from('%PDF-1.4\noriginal source\n%%EOF'), 'original.pdf', 'application/pdf')).storageKey;
    enhanced = (await uploadEducationalAsset(Buffer.from('%PDF-1.4\nenhanced candidate\n%%EOF'), 'candidate.pdf', 'application/pdf')).storageKey;
    doc = (await db.knowledgeDocument.create({ data: { ownerId: owner, subjectId: subject, resourceType: 'syllabus', sha256: sha(unique), storageKey: original, totalPages: 1, status: 'NEEDS_REVIEW', pipelineVersion: unique, publishAfterReview: true, catalogMetadata: { classPlan: plan, syllabusEffectiveFrom: '2025-01-01' } } })).id;
    page = (await db.knowledgeArtifact.create({ data: { documentId: doc, pageNumber: 1, sourceImageKey: original, content: 'Source', contentHash: sha('source'), data: { extraction: { text: 'Source', continuation: '', regions: [], learning } }, status: 'PENDING_REVIEW' } })).id;
  });
  afterAll(async () => {
    if (db) {
const subjects = await db.subject.findMany({ where: { academicClass: { programmeId: programme } }, select: { id: true } }), ids = subjects.map(s => s.id);
      await db.auditLog.deleteMany({ where: { userId: owner } }); await db.durableJob.deleteMany({ where: { ownerId: owner } });
      await db.quiz.deleteMany({ where: { OR: [{ teacherId: owner }, { subjectId: { in: ids } }] } });
      const papers = { pastPaper: { subjectId: { in: ids } } }; await db.pastPaperQuestionTopic.deleteMany({ where: { question: papers } }); await db.pastPaperQuestionSLO.deleteMany({ where: { question: papers } }); await db.pastPaperQuestion.deleteMany({ where: papers }); await db.pastPaper.deleteMany({ where: { subjectId: { in: ids } } });
      await db.sLO.deleteMany({ where: { subtopic: { topic: { syllabusVersion: { subjectId: { in: ids } } } } } });
      await db.subtopic.deleteMany({ where: { topic: { syllabusVersion: { subjectId: { in: ids } } } } }); await db.topic.deleteMany({ where: { syllabusVersion: { subjectId: { in: ids } } } });
      await db.syllabusVersion.deleteMany({ where: { subjectId: { in: ids } } }); await db.knowledgeDocument.deleteMany({ where: { ownerId: owner } });
      await db.subject.deleteMany({ where: { id: { in: ids } } }); await db.academicClass.deleteMany({ where: { programmeId: programme } }); await db.programme.deleteMany({ where: { id: programme } }); await db.board.deleteMany({ where: { id: board } }); await db.userSession.deleteMany({ where: { userId: owner } }); await db.user.deleteMany({ where: { id: owner } }); await db.$disconnect(); await (await import('@/lib/prisma')).default.$disconnect();
    }
    if (root && path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('source-publication-test-')) await fs.rm(root, { recursive: true, force: true }); vi.unstubAllEnvs();
  });
  it('requires complete source approval, then splits identical chapter numbers by index titles', async () => {
    const { compileReviewedSyllabus } = await import('@/services/materials/compile-syllabus');
    expect(await db.$transaction(tx => compileReviewedSyllabus(tx, doc))).toMatchObject({ compiled: false });
    await db.knowledgeArtifact.update({ where: { id: page }, data: { status: 'APPROVED', reviewerId: owner, reviewedAt: new Date(), reviewNote: 'Compared against the exact original source.' } });
    const result = await db.$transaction(tx => compileReviewedSyllabus(tx, doc)); expect(result.compiled).toBe(true);
    const versions = await db.syllabusVersion.findMany({ where: { sourceDocumentId: doc }, include: { subject: { include: { academicClass: true } }, topics: { include: { subtopics: { include: { slos: true } } } } } });
    expect(versions).toHaveLength(2);
    expect(versions.find(v => v.subject.academicClass.level === 9)?.topics[0].subtopics[0].slos[0].description).toBe(learning.outcomes[0].description);
    expect(versions.find(v => v.subject.academicClass.level === 10)?.topics[0].subtopics[0].slos[0].description).toBe(learning.outcomes[1].description);
    const { searchApprovedKnowledge } = await import('@/services/knowledge/search');
    const evidence = await searchApprovedKnowledge({ query: 'Source', board: 'SOURCE-' + unique, classLevel: 10, subject: 'Physics' });
    expect(evidence).toHaveLength(1); expect(evidence[0].syllabusVersionId).toBe(versions.find(v => v.subject.academicClass.level === 10)?.id);
  });
  it('withdraws both derived class editions when the shared source is reopened', async () => {
    const { publishedCurriculum } = await import('@/services/materials/curriculum');
    expect(await publishedCurriculum('SOURCE-' + unique, 10, 'Physics')).not.toBeNull();
    await db.knowledgeArtifact.update({ where: { id: page }, data: { status: 'PENDING_REVIEW' } });
    expect(await publishedCurriculum('SOURCE-' + unique, 9, 'Physics')).toBeNull(); expect(await publishedCurriculum('SOURCE-' + unique, 10, 'Physics')).toBeNull();
    const { searchApprovedKnowledge } = await import('@/services/knowledge/search'); expect(await searchApprovedKnowledge({ query: 'Source', board: 'SOURCE-' + unique, classLevel: 10, subject: 'Physics' })).toEqual([]);
    await db.knowledgeArtifact.update({ where: { id: page }, data: { status: 'APPROVED', reviewerId: owner, reviewedAt: new Date(), reviewNote: 'Compared against the exact original source.' } });
  });
  it('holds invalid edition dates instead of publishing', async () => {
    const { compileReviewedSyllabus } = await import('@/services/materials/compile-syllabus');
    await db.knowledgeDocument.update({ where: { id: doc }, data: { catalogMetadata: { classPlan: plan, syllabusEffectiveFrom: '2025-02-31' } } });
    expect(await db.$transaction(tx => compileReviewedSyllabus(tx, doc))).toMatchObject({ compiled: false, reason: 'EDITION_DATE_REQUIRED' });
    await db.knowledgeDocument.update({ where: { id: doc }, data: { catalogMetadata: { classPlan: plan, syllabusEffectiveFrom: '2025-01-01' } } });
  });
  it('publishes verified questions into chapter practice with precomputed distractor feedback and withdraws revised sources', async () => {
    const version = await db.syllabusVersion.findFirstOrThrow({ where: { subjectId: subject, isLatest: true }, include: { topics: { include: { subtopics: { include: { slos: true } } } } } }), topic = version.topics[0], slo = topic.subtopics[0].slos[0];
    const paperDoc = await db.knowledgeDocument.create({ data: { ownerId: owner, subjectId: subject, resourceType: 'past_paper', sha256: sha(unique + 'paper'), storageKey: original, totalPages: 1, status: 'NEEDS_REVIEW', pipelineVersion: unique, publishAfterReview: true, catalogMetadata: { examYear: 'auto', title: '2025 Paper I' } } });
    const question = { number: '1', stem: 'Which is a base quantity?', marks: 1, options: [{ key: 'A', text: 'Time' }, { key: 'B', text: 'Force' }], printedAnswer: 'A', originalSloCode: 'historical-code', continuation: false };
    const artifact = await db.knowledgeArtifact.create({ data: { documentId: paperDoc.id, pageNumber: 1, content: '2025 Which is a base quantity? Time Force', contentHash: sha('paper'), sourceImageKey: original, status: 'APPROVED', reviewerId: owner, reviewedAt: new Date(), reviewNote: 'Compared with the printed question.', data: { extraction: { text: '2025 Which is a base quantity? Time Force', continuation: '', regions: [], learning: { printedExamYear: '2025', outcomes: [], questions: [question], keyEntries: [] } } } } });
    const revision = sha(artifact.contentHash + ':' + version.id + ':[]'), value = { correctOption: 'A', explanation: 'Time is an SI base quantity.', optionFeedback: [{ key: 'A', reason: 'Time has an independent SI base unit.' }, { key: 'B', reason: 'Force is derived from mass and acceleration.' }], sloIds: [slo.id], mappingStatus: 'IN_SCOPE', mappingReason: 'Distinguishes SI base and derived quantities.', uncertainty: '' };
    const job = await db.durableJob.create({ data: { ownerId: owner, kind: 'INGESTION', status: 'RUNNING', leaseToken: randomUUID(), payload: { task: 'COMPILE_LEARNING', documentId: paperDoc.id }, result: { revision, items: { [artifact.id + ':0']: { value, conflicts: [], model: 'independent-solver', verifier: 'independent-verifier' } } } } });
    const { compileReviewedPaper } = await import('@/services/materials/compile-paper'); expect(await compileReviewedPaper(job, new AbortController().signal)).toMatchObject({ status: 'COMPILED', questions: 1 });
    const { mappedChapterQuestions } = await import('@/services/materials/practice'); const mapped = await mappedChapterQuestions(topic.id); expect(mapped.questions).toHaveLength(1);
    const { resolveQuiz, assertQuizAccess } = await import('@/services/assessment/service'); const quiz = await resolveQuiz('CURRICULUM:' + topic.id + ':ALL');
    const { normalizeQuestion, answerFeedback, studentQuestion, gradeAnswer } = await import('@/services/assessment/scoring');
    const frozen = { id: quiz.questions[0].id, orderIndex: 1, marks: 1, content: normalizeQuestion(quiz.questions[0].questionData) };
    expect(gradeAnswer(frozen, { selectedOptionId: 'A' })).toBe(1); expect(gradeAnswer(frozen, { selectedOptionId: 'B' })).toBe(0); expect(answerFeedback(frozen, { selectedOptionId: 'B' }, 0)).toContain('Force is derived from mass and acceleration.');
    expect(JSON.stringify(studentQuestion(frozen))).not.toMatch(/isCorrect|feedback|Force is derived/);
    await assertQuizAccess(quiz, null, true);
    await db.knowledgeArtifact.update({ where: { id: artifact.id }, data: { status: 'PENDING_REVIEW' } });
    expect((await mappedChapterQuestions(topic.id)).questions).toHaveLength(0); await expect(assertQuizAccess(quiz, null, true)).rejects.toMatchObject({ code: 'CHAPTER_SOURCE_CHANGED' });
  });
  it('keeps an AI-passed candidate private until human approval, then supports revocation', async () => {
    const candidate = { region: 0, storageKey: enhanced, sourceHash: sha('source'), candidateHash: sha('candidate'), model: 'generator', verifier: 'verifier', audit: { faithful: true, complete: true, mappingsCorrect: true, conflicts: [] }, status: 'PENDING_REVIEW' };
    await db.knowledgeArtifact.update({ where: { id: page }, data: { data: { crops: [{ region: 0, storageKey: original }], enhancementCandidates: [candidate] } } });
    const { GET } = await import('@/app/api/materials/[id]/regions/[pageId]/[region]/route'); const context = { params: Promise.resolve({ id: doc, pageId: page, region: '0' }) };
    expect(await (await GET(new NextRequest('http://localhost'), context)).text()).toContain('original source');
    expect((await GET(new NextRequest('http://localhost?variant=enhanced'), context)).status).toBe(404);
    const { PATCH } = await import('@/app/api/admin/knowledge/enhancements/route');
    const request = (status: string, hash = sha('source'), authorized = true) => new NextRequest('http://localhost/api/admin/knowledge/enhancements', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(authorized ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ id: page, region: 0, contentHash: hash, candidateHash: candidate.candidateHash, status, note: 'Compared every original label, arrow and geometric relationship.' }) });
    expect((await PATCH(request('APPROVED', sha('source'), false))).status).toBe(401);
    expect((await PATCH(request('APPROVED', sha('stale')))).status).toBe(409);
    expect((await PATCH(request('APPROVED'))).status).toBe(200);
    expect(await (await GET(new NextRequest('http://localhost'), context)).text()).toContain('enhanced candidate');
    expect(await (await GET(new NextRequest('http://localhost?variant=original'), context)).text()).toContain('original source');
    expect((await PATCH(request('REJECTED'))).status).toBe(200);
    expect(await (await GET(new NextRequest('http://localhost'), context)).text()).toContain('original source');
    const saved = await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: page } }); expect((saved.data as Prisma.JsonObject).enhancements).toEqual([]);
  });
});
