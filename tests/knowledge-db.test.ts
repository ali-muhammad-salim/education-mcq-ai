import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes('_test')) throw Error('Dedicated test database required');
describe.skipIf(!url)('Knowledge source trust in PostgreSQL', () => {
  let db: PrismaClient, adminId: string, teacherId: string, boardId: string, programmeId: string, reviewId: string, sourceId: string, topicId: string, subtopicId: string, sloId: string;
  const suffix = randomUUID(), boardCode = 'TRUST-' + suffix, token = randomUUID(), teacherToken = randomUUID(), sha = (text: string) => createHash('sha256').update(text).digest('hex');
  const classes: string[] = [], subjects: string[] = [], versions: string[] = [], documents: string[] = [];
  const generationIds: string[] = [];
  const extraction = { text: 'Force is measured in newtons.', continuation: '', regions: [] };
  beforeAll(async () => {
    process.env.DATABASE_URL = url; vi.stubEnv('APP_URL', 'http://localhost'); vi.stubEnv('GEMINI_EMBEDDING_MODEL', '');
    db = new PrismaClient({ datasources: { db: { url } } });
    const admin = await db.user.create({ data: { name: 'Source reviewer', email: 'source-review-' + suffix + '@example.test', role: 'ADMIN' } }); adminId = admin.id;
    const teacher = await db.user.create({ data: { name: 'Teacher', email: 'source-teacher-' + suffix + '@example.test', role: 'TEACHER' } }); teacherId = teacher.id;
    for (const [userId, value] of [[adminId, token], [teacherId, teacherToken]]) await db.userSession.create({ data: { userId, token: sha(value), expiresAt: new Date(Date.now() + 600000) } });
    boardId = (await db.board.create({ data: { name: 'Trust fixture', shortCode: boardCode, country: 'Test' } })).id;
    programmeId = (await db.programme.create({ data: { boardId, name: 'Test' } })).id;
    for (const [index, level, name, latest, approved] of [[0, 9, 'Physics', true, true], [1, 10, 'Physics', true, true], [2, 9, 'Chemistry', true, true], [3, 9, 'Physics', false, true], [4, 9, 'Physics', true, false]] as const) {
      const cls = await db.academicClass.create({ data: { programmeId, name: 'Class ' + level, level } }); classes.push(cls.id);
      const subject = await db.subject.create({ data: { classId: cls.id, name } }); subjects.push(subject.id);
      const version = await db.syllabusVersion.create({ data: { subjectId: subject.id, versionName: 'Trust fixture', validFrom: new Date(), isLatest: latest } }); versions.push(version.id);
      const document = await db.knowledgeDocument.create({ data: { ownerId: adminId, subjectId: subject.id, syllabusVersionId: version.id, sha256: sha(suffix + index), storageKey: 'private/resources/' + randomUUID() + '-source.pdf', resourceType: 'textbook', totalPages: 1, pipelineVersion: 'test', status: 'NEEDS_REVIEW' } }); documents.push(document.id);
      const artifact = await db.knowledgeArtifact.create({ data: { documentId: document.id, pageNumber: 1, content: extraction.text, contentHash: sha('artifact-' + index), sourceImageKey: 'private/resources/' + randomUUID() + '-page.png', data: { extraction, checksComplete: true, conflicts: [], pageSha256: sha('page') }, ...(approved ? { status: 'APPROVED', reviewerId: adminId, reviewedAt: new Date() } : {}) } });
      if (!approved) reviewId = artifact.id;
      if (index === 0) {
        sourceId = artifact.id;
        topicId = (await db.topic.create({ data: { syllabusVersionId: version.id, name: 'Forces' } })).id;
        subtopicId = (await db.subtopic.create({ data: { topicId, name: 'Force units' } })).id;
        sloId = (await db.sLO.create({ data: { subtopicId, code: 'TEST.FORCE', description: 'Force is measured in newtons.' } })).id;
      }
    }
  });
  afterAll(async () => {
    if (!db) return;
    await db.aIDoubtRecord.deleteMany({ where: { ownerId: { in: [adminId, teacherId] } } });
    await db.aIGeneration.deleteMany({ where: { id: { in: generationIds } } });
    if (sloId) await db.sLO.delete({ where: { id: sloId } });
    if (subtopicId) await db.subtopic.delete({ where: { id: subtopicId } });
    if (topicId) await db.topic.delete({ where: { id: topicId } });
    await db.knowledgeDocument.deleteMany({ where: { id: { in: documents } } }); await db.syllabusVersion.deleteMany({ where: { id: { in: versions } } }); await db.subject.deleteMany({ where: { id: { in: subjects } } }); await db.academicClass.deleteMany({ where: { id: { in: classes } } });
    if (programmeId) await db.programme.delete({ where: { id: programmeId } }); if (boardId) await db.board.delete({ where: { id: boardId } });
    await db.auditLog.deleteMany({ where: { userId: { in: [adminId, teacherId] } } }); await db.durableJob.deleteMany({ where: { ownerId: { in: [adminId, teacherId] } } }); await db.userSession.deleteMany({ where: { userId: { in: [adminId, teacherId] } } }); await db.user.deleteMany({ where: { id: { in: [adminId, teacherId] } } }); await db.$disconnect(); (await import('@/lib/prisma')).default.$disconnect(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });
  it('excludes pending sources, other grades, subjects, boards and expired syllabus versions', async () => {
    const { searchApprovedKnowledge } = await import('@/services/knowledge/search');
    const results = await searchApprovedKnowledge({ query: 'force newtons', board: boardCode, classLevel: 9, subject: 'Physics' });
    expect(results).toHaveLength(1); expect(results[0].documentId).toBe(documents[0]); expect(results[0].sourceSha256).toHaveLength(64);
    expect(await searchApprovedKnowledge({ query: 'force newtons', board: 'another-board', classLevel: 9, subject: 'Physics' })).toEqual([]);
    expect(await searchApprovedKnowledge({ query: 'force newtons', board: boardCode, classLevel: 9, subject: '%' })).toEqual([]);
  });
  it('does not retrieve a combined-class guide as class-specific evidence', async () => {
    const { searchApprovedKnowledge } = await import('@/services/knowledge/search');
    await db.knowledgeDocument.update({where:{id:documents[0]},data:{catalogMetadata:{scopeSubjectIds:[subjects[0],subjects[1]]}}});
    try {expect(await searchApprovedKnowledge({query:'force newtons',board:boardCode,classLevel:9,subject:'Physics'})).toEqual([]);}
    finally {await db.knowledgeDocument.update({where:{id:documents[0]},data:{catalogMetadata:{}}});}
  });
  it('uses actual pgvector search without mixing model namespaces or curriculum scopes', async () => {
    const model = 'embedding-fixture-' + suffix, vector = Array.from({ length: 768 }, (_, i) => i === 0 ? 1 : 0);
    vi.stubEnv('GEMINI_API_KEYS', 'synthetic-vector-key-' + suffix); vi.stubEnv('GEMINI_PROJECT_IDS', ''); vi.stubEnv('GEMINI_DISTINCT_PROJECTS', ''); vi.stubEnv('GEMINI_EMBEDDING_MODEL', model); vi.stubEnv('GEMINI_RPM', '5'); vi.stubEnv('GEMINI_TPM', '32000'); vi.stubEnv('GEMINI_RPD', '100');
    const fetch = vi.fn().mockImplementation(async () => Response.json({ embedding: { values: vector } })); vi.stubGlobal('fetch', fetch);
    try {
      for (const documentId of documents) await db.$executeRaw`UPDATE "KnowledgeArtifact" SET embedding = ${JSON.stringify(vector)}::vector, "embeddingModel" = ${model}, "embeddingContentHash" = "contentHash" WHERE "documentId" = ${documentId}`;
      const { searchApprovedKnowledge } = await import('@/services/knowledge/search');
      const found = await searchApprovedKnowledge({ query: 'interaction', board: boardCode, classLevel: 9, subject: 'Physics' });
      expect(found.map(p => p.id)).toEqual([sourceId]); expect(fetch).toHaveBeenCalledTimes(1);
      await expect(db.$executeRaw`UPDATE "KnowledgeArtifact" SET "embeddingContentHash" = ${'0'.repeat(64)} WHERE id = ${sourceId}`).rejects.toThrow();
      vi.stubEnv('GEMINI_EMBEDDING_MODEL', 'different-namespace'); expect(await searchApprovedKnowledge({ query: 'interaction', board: boardCode, classLevel: 9, subject: 'Physics' })).toEqual([]); expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals(); vi.stubEnv('GEMINI_EMBEDDING_MODEL', '');
      for (const documentId of documents) await db.$executeRaw`UPDATE "KnowledgeArtifact" SET embedding = NULL, "embeddingModel" = NULL, "embeddingContentHash" = NULL WHERE "documentId" = ${documentId}`;
      await db.aIProviderBudget.deleteMany({ where: { id: { startsWith: sha('unmapped-shared-project:' + model) } } });
    }
  });
  it('rejects approval without reviewer evidence at the database level', async () => {
    await expect(db.knowledgeArtifact.update({ where: { id: reviewId }, data: { status: 'APPROVED' } })).rejects.toThrow();
  });
  it('lets educators inspect approved source evidence while hiding pending sources and private storage keys', async () => {
    const { GET } = await import('@/app/api/knowledge/sources/[id]/route');
    const req = (credential?: string) => new NextRequest('http://localhost/api/knowledge/sources/' + sourceId, { headers: credential ? { authorization: 'Bearer ' + credential } : {} });
    expect((await GET(req(), { params: Promise.resolve({ id: sourceId }) })).status).toBe(401);
    expect((await GET(req(teacherToken), { params: Promise.resolve({ id: reviewId }) })).status).toBe(404);
    const response = await GET(req(teacherToken), { params: Promise.resolve({ id: sourceId }) }); expect(response.status).toBe(200); const body = await response.json(); expect(body.contentHash).toHaveLength(64); expect(body.sourceImageKey).toBeUndefined();
  });
  it('checkpoints browser work without publishing or replacing source evidence',async()=>{
    const {POST,GET}=await import('@/app/api/admin/knowledge/route');
    const before=await db.knowledgeArtifact.findUniqueOrThrow({where:{id:reviewId}});
    const draft={...extraction,text:'Browser transcription awaiting comparison with the original.'};
    const request=(credential=token,contentHash=before.contentHash,value:unknown=draft)=>new NextRequest('http://localhost/api/admin/knowledge',{method:'POST',headers:{authorization:'Bearer '+credential,origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({id:reviewId,contentHash,note:'Gemini browser draft; source checks are unresolved.',extraction:value})});
    expect((await POST(request(teacherToken))).status).toBe(403);
    expect((await POST(request(token,'0'.repeat(64)))).status).toBe(409);
    expect((await POST(request(token,before.contentHash,{...draft,regions:[{kind:'TEXT',text:'extra',box:null,labels:[],relationships:[],sloIds:[],questionNumber:'',uncertainty:''}]}))).status).toBe(422);
    const saved=await POST(request());expect(saved.status).toBe(200);
    const after=await db.knowledgeArtifact.findUniqueOrThrow({where:{id:reviewId}});
    expect(after.content).toBe(before.content);expect(after.contentHash).toBe(before.contentHash);expect(after.status).toBe('PENDING_REVIEW');expect(after.reviewerId).toBeNull();
    expect(await db.durableJob.count({where:{ownerId:adminId}})).toBe(0);
    const read=await GET(new NextRequest('http://localhost/api/admin/knowledge?artifactId='+reviewId,{headers:{authorization:'Bearer '+token}}));
    const body=await read.json();expect(body.draft.details.extraction.text).toBe(draft.text);expect(body.draft.details.baseContentHash).toBe(before.contentHash);expect(body.draft.details.sourceSha256).toHaveLength(64);
    expect(await db.auditLog.count({where:{resourceId:reviewId,action:'KNOWLEDGE_BROWSER_DRAFT'}})).toBe(1);
  });
  it('rejects stale content and non-admin reviews, then records an auditable approval', async () => {
    const { PATCH } = await import('@/app/api/admin/knowledge/route');
    const artifact = await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: reviewId } });
    const req = (credential: string, contentHash: string) => new NextRequest('http://localhost/api/admin/knowledge', { method: 'PATCH', headers: { authorization: 'Bearer ' + credential, origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reviewId, contentHash, status: 'APPROVED', note: 'Checked against the original source page.' }) });
    expect((await PATCH(req(teacherToken, artifact.contentHash))).status).toBe(403);
    expect((await PATCH(req(token, '0'.repeat(64)))).status).toBe(409);
    expect((await PATCH(req(token, artifact.contentHash))).status).toBe(200);
    const updated = await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: reviewId } }); expect(updated.status).toBe('APPROVED'); expect(updated.reviewerId).toBe(adminId);
    expect(await db.auditLog.count({ where: { resourceId: reviewId, action: 'KNOWLEDGE_APPROVED' } })).toBe(1);
    expect((await PATCH(req(token, artifact.contentHash))).status).toBe(409);
  });
  it('withdraws source evidence immediately when a review is reopened', async () => {
    const { assertApprovedEvidence, doubtDataSchema } = await import('@/lib/aiDoubtStore');
    const artifact = await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: reviewId }, include: { document: true } });
    const data = doubtDataSchema.parse({ question: { stemText: 'Force unit?', options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }] }, subject: 'Physics', board: boardCode, classLevel: '9', stage1Answer: 'a', doubtReason: 'Review fixture', provenance: 'AI_GENERATED', evidence: [{ id: artifact.id, documentId: artifact.documentId, pageNumber: 1, sourceSha256: artifact.document.sha256, contentHash: artifact.contentHash }] });
    await expect(assertApprovedEvidence(db, data)).resolves.toBeUndefined();
    const { PATCH } = await import('@/app/api/admin/knowledge/route');
    expect((await PATCH(new NextRequest('http://localhost/api/admin/knowledge', { method: 'PATCH', headers: { authorization: 'Bearer ' + token, origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reviewId, contentHash: artifact.contentHash, status: 'PENDING_REVIEW', note: 'Rechecking source evidence before reuse.' }) }))).status).toBe(200);
    await expect(assertApprovedEvidence(db, data)).rejects.toMatchObject({ code: 'SOURCE_REVIEW_CHANGED' });
  });
  it('reserves a shared provider budget accurately under concurrent worker requests', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'synthetic-quota-key-' + suffix); vi.stubEnv('GEMINI_PROJECT_IDS', ''); vi.stubEnv('GEMINI_DISTINCT_PROJECTS', ''); vi.stubEnv('GEMINI_RPM', '2'); vi.stubEnv('GEMINI_TPM', '100'); vi.stubEnv('GEMINI_RPD', '5');
    const model = 'quota-fixture-' + suffix, prefix = sha('unmapped-shared-project:' + model), fetch = vi.fn().mockImplementation(async () => Response.json({ ok: true })); vi.stubGlobal('fetch', fetch);
    try {
      const { aiRequest } = await import('@/services/ai/provider');
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => aiRequest(model, 'generateContent', {}, 1)));
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2); expect(fetch).toHaveBeenCalledTimes(2);
      const windows = await db.aIProviderBudget.findMany({ where: { id: { startsWith: prefix } } }); expect(windows).toHaveLength(2); expect(windows.every(w => w.requests === 2 && w.tokens === 2)).toBe(true);
    } finally { vi.unstubAllGlobals(); await db.aIProviderBudget.deleteMany({ where: { id: { startsWith: prefix } } }); }
  });
  it('rolls back every draft if the generation audit cannot be committed', async () => {
    const model = 'rollback-generator-' + suffix, verifier = 'rollback-verifier-' + suffix;
    vi.stubEnv('GEMINI_API_KEYS', 'synthetic-rollback-key-' + suffix); vi.stubEnv('GEMINI_PROJECT_IDS', ''); vi.stubEnv('GEMINI_DISTINCT_PROJECTS', ''); vi.stubEnv('GEMINI_MODEL', model); vi.stubEnv('GEMINI_MODELS', ''); vi.stubEnv('GEMINI_VERIFIER_MODEL', verifier); vi.stubEnv('GEMINI_RPM', '5'); vi.stubEnv('GEMINI_TPM', '32000'); vi.stubEnv('GEMINI_RPD', '100');
    const job = await db.durableJob.create({ data: { ownerId: teacherId, kind: 'AI_GENERATION', status: 'RUNNING', payload: {} } }); generationIds.push(job.id);
    const candidate = { questionType: 'MCQ_SINGLE', stemText: 'Which is the SI unit of force?', sloId, cognitiveLevel: 'Knowledge', sourceIds: [sourceId], options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }, { id: 'c', text: 'Second', isCorrect: false }, { id: 'd', text: 'Metre', isCorrect: false }] };
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) await db.aIGeneration.create({ data: { id: job.id, model: 'fixture', modelVersion: 'fixture', promptVersion: 'fixture', inputHash: sha('fixture'), inputData: {}, rawOutput: 'fixture', normalizedOutput: [] } });
      const value = calls === 1 ? [candidate] : [{ index: 0, answer: 'a', answerIds: [], grounded: true, aligned: true, reasoning: 'Newton is the SI force unit.' }];
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] });
    }));
    try {
      const { generateQuestions } = await import('@/services/ai/generate');
      await expect(generateQuestions(teacherId, { board: boardCode, classLevel: 9, subject: 'Physics', syllabusVersionId: versions[0], count: 1 }, job.id)).rejects.toMatchObject({ code: 'P2002' });
      expect(calls).toBe(2);
      expect(await db.aIDoubtRecord.count({ where: { id: job.id + ':0' } })).toBe(0);
    } finally { vi.unstubAllGlobals(); for (const name of [model, verifier]) await db.aIProviderBudget.deleteMany({ where: { id: { startsWith: sha('unmapped-shared-project:' + name) } } }); }
  });

  it('supersedes only the matching approved source revision when a replacement is approved', async () => {
    const original = await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: sourceId }, include: { document: true } });
    const d = original.document;
    const document = await db.knowledgeDocument.create({ data: { ownerId: adminId, subjectId: d.subjectId, syllabusVersionId: d.syllabusVersionId, sha256: d.sha256, storageKey: d.storageKey, resourceType: d.resourceType, totalPages: 1, pipelineVersion: 'replacement', status: 'NEEDS_REVIEW' } }); documents.push(document.id);
    const replacement = await db.knowledgeArtifact.create({ data: { documentId: document.id, pageNumber: 1, content: original.content, contentHash: sha('replacement'), sourceImageKey: original.sourceImageKey, data: original.data! } });
    const { PATCH } = await import('@/app/api/admin/knowledge/route');
    const response = await PATCH(new NextRequest('http://localhost/api/admin/knowledge', { method: 'PATCH', headers: { authorization: 'Bearer ' + token, origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: replacement.id, contentHash: replacement.contentHash, status: 'APPROVED', note: 'Replacement transcription checked against the same original page.' }) }));
    expect(response.status).toBe(200); expect((await db.knowledgeArtifact.findUniqueOrThrow({ where: { id: sourceId } })).status).toBe('REJECTED');
    expect(await db.auditLog.count({ where: { resourceId: sourceId, action: 'KNOWLEDGE_SUPERSEDED' } })).toBe(1);
    const { searchApprovedKnowledge } = await import('@/services/knowledge/search');
    vi.stubEnv('GEMINI_EMBEDDING_MODEL', '');
    const found = await searchApprovedKnowledge({ query: 'force newtons', board: boardCode, classLevel: 9, subject: 'Physics' }); expect(found.map(p => p.id)).toEqual([replacement.id]);
  });

});
