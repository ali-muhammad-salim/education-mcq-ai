/** Explicit live-provider rehearsal; always uses a dedicated test database. */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function main() {
  const url = process.env.TEST_DATABASE_URL, source = process.argv[2];
  if (!url || !new URL(url).pathname.includes('_test') || !source) throw Error('Supply TEST_DATABASE_URL and a synthetic fixture PDF path.');
  process.env.DATABASE_URL = url;
  process.env.ASSET_ROOT = path.resolve('data/assets');
  process.env.PYTHON_EXECUTABLE ||= 'python';
  process.env.GEMINI_VERIFIER_MODEL ||= 'gemini-3.5-flash';
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { email: 'ui-review-admin@example.test' } });
    const board = await db.board.upsert({ where: { shortCode: 'AI-TRUST-TEST' }, create: { name: 'Synthetic AI evaluation', shortCode: 'AI-TRUST-TEST', country: 'Test' }, update: {} });
    const programme = await db.programme.upsert({ where: { id: 'ai-trust-test-programme' }, create: { id: 'ai-trust-test-programme', boardId: board.id, name: 'SSC' }, update: {} });
    const cls = await db.academicClass.upsert({ where: { id: 'ai-trust-test-class' }, create: { id: 'ai-trust-test-class', programmeId: programme.id, name: 'Class IX', level: 9 }, update: {} });
    const subject = await db.subject.upsert({ where: { id: 'ai-trust-test-subject' }, create: { id: 'ai-trust-test-subject', classId: cls.id, name: 'Chemistry' }, update: {} });
    const syllabus = await db.syllabusVersion.upsert({ where: { id: 'ai-trust-test-syllabus' }, create: { id: 'ai-trust-test-syllabus', subjectId: subject.id, versionName: 'Synthetic evaluation only', validFrom: new Date(), isLatest: true }, update: {} });
    const topic = await db.topic.upsert({ where: { id: 'ai-trust-test-topic' }, create: { id: 'ai-trust-test-topic', syllabusVersionId: syllabus.id, name: 'Chemical reactions and bonding' }, update: {} });
    const subtopic = await db.subtopic.upsert({ where: { id: 'ai-trust-test-subtopic' }, create: { id: 'ai-trust-test-subtopic', topicId: topic.id, name: 'Reactions and water' }, update: {} });
    for (const [i, description] of ['Balance simple chemical reactions by conserving atom counts.', 'Describe covalent bonds, lone pairs and the bent structure of water.', 'Interpret directed process flowcharts from reactants to products.'].entries()) await db.sLO.upsert({ where: { id: 'ai-trust-test-slo-' + i }, create: { id: 'ai-trust-test-slo-' + i, subtopicId: subtopic.id, code: 'TEST.' + (i + 1), description }, update: {} });
    const { uploadEducationalAsset } = await import('../lib/storage');
    const { ingestTrustedDocument } = await import('../services/ingestion/trusted');
    const { AIBackpressure } = await import('../services/ai/provider');
    const bytes = await fs.readFile(source), sha = createHash('sha256').update(bytes).digest('hex');
    const id = 'ai-trust-rehearsal-' + sha.slice(0, 20), existing = await db.durableJob.findUnique({ where: { id } });
    const asset = existing ? null : await uploadEducationalAsset(bytes, 'synthetic-chemistry.pdf', 'application/pdf');
    const storageKey = asset?.storageKey || String((existing!.payload as Record<string, unknown>).storageKey);
    const job = await db.durableJob.upsert({ where: { id }, create: { id, ownerId: owner.id, kind: 'INGESTION', status: 'RUNNING', payload: { resourceType: 'textbook', storageKey, meta: { board: 'AI-TRUST-TEST', classLevel: 'Class IX', subject: 'Chemistry' } } }, update: { status: 'RUNNING' } });
    let result;
    try { result = await ingestTrustedDocument(job, new AbortController().signal); await db.durableJob.update({ where: { id }, data: { status: 'COMPLETED', result } }); }
    catch (error) { if (error instanceof AIBackpressure) { await db.durableJob.update({ where: { id }, data: { status: 'QUEUED', availableAt: error.retryAt, error: error.message } }); result = { deferred: true, retryAt: error.retryAt.toISOString() }; } else throw error; }
    const document = await db.knowledgeDocument.findFirst({ where: { sha256: sha, subjectId: subject.id }, orderBy: { createdAt: 'desc' }, include: { artifacts: true } });
    const report = { testOnly: true, result, documentId: document?.id, sourceSha256: sha, artifacts: document?.artifacts.map(a => ({ id: a.id, status: a.status, pageNumber: a.pageNumber, contentHash: a.contentHash, data: a.data })) };
    await fs.mkdir('docs/verification', { recursive: true }); await fs.writeFile('docs/verification/AI-TRUST-REHEARSAL-2026-10-21.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, artifacts: report.artifacts?.map(a => ({ id: a.id, status: a.status, pageNumber: a.pageNumber })) }));
  } finally { await db.$disconnect(); (await import('../lib/prisma')).default.$disconnect(); }
}
main().catch(error => { console.error('AI rehearsal failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
