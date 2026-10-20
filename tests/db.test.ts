import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
const url = process.env.TEST_DATABASE_URL;
// Integration tests must never connect to the developer's normal DATABASE_URL.
if (url && !new URL(url).pathname.includes('_test')) throw new Error('TEST_DATABASE_URL must identify a dedicated _test database');
describe.skipIf(!url)('Database-backed assessment integrity', () => {
  let db: PrismaClient;
  let service: typeof import('@/services/assessment/service');
  let teacher: { id: string; email: string; name: string; role: 'TEACHER' };
  let student: { id: string; email: string; name: string; role: 'STUDENT' };
  let outsider: { id: string; email: string; name: string; role: 'TEACHER' };
  let quizId: string, questionId: string;
  const suffix = randomUUID();
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = new PrismaClient({ datasources: { db: { url } } });
    service = await import('@/services/assessment/service');
    const t = await db.user.create({ data: { email: 'teacher-' + suffix + '@example.test', name: 'Teacher', role: 'TEACHER' } });
    const s = await db.user.create({ data: { email: 'student-' + suffix + '@example.test', name: 'Student' } });
    const o = await db.user.create({ data: { email: 'other-' + suffix + '@example.test', name: 'Other', role: 'TEACHER' } });
    teacher = { ...t, role: 'TEACHER' }; student = { ...s, role: 'STUDENT' }; outsider = { ...o, role: 'TEACHER' };
    const quiz = await db.quiz.create({ data: { teacherId: t.id, title: 'Integrity test', status: 'PUBLISHED', visibility: 'PUBLIC', durationMin: 15,
      settings: { create: { maxAttempts: 1, showCorrectAnswers: true } }, questions: { create: { orderIndex: 1, marks: 2, questionData: { questionType: 'MCQ_SINGLE', stemText: 'Force unit?', options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }] } } } }, include: { questions: true } });
    quizId = quiz.id; questionId = quiz.questions[0].id;
  });
  afterAll(async () => {
    if (!db) return;
    if (quizId) { const attempts = await db.quizAttempt.findMany({ where: { quizId }, select: { id: true } }); await db.quizAnswer.deleteMany({ where: { attemptId: { in: attempts.map(a => a.id) } } }); await db.quizAttempt.deleteMany({ where: { quizId } }); await db.quiz.delete({ where: { id: quizId } }); }
    if (teacher) { await db.durableJob.deleteMany({ where: { ownerId: { in: [teacher.id, student.id, outsider.id] } } }); await db.user.deleteMany({ where: { id: { in: [teacher.id, student.id, outsider.id] } } }); }
    await db.$disconnect(); const { default: shared } = await import('@/lib/prisma'); await shared.$disconnect();
  });
  it('does not authenticate a fallback teacher or suspended session', async () => {
    const { getSessionUser, sessionTokenHash } = await import('@/lib/auth');
    expect(await getSessionUser(new NextRequest('http://localhost/api'), 'TEACHER')).toBeNull();
    await db.userSession.create({ data: { userId: outsider.id, token: sessionTokenHash(suffix), expiresAt: new Date(Date.now() + 60000) } });
    expect((await getSessionUser(new NextRequest('http://localhost/api', { headers: { authorization: 'Bearer ' + suffix } })))?.id).toBe(outsider.id);
    await db.user.update({ where: { id: outsider.id }, data: { status: 'SUSPENDED' } });
    expect(await getSessionUser(new NextRequest('http://localhost/api', { headers: { authorization: 'Bearer ' + suffix } }))).toBeNull();
  });
  it('claims durable jobs once and recovers stale worker leases', async () => {
    const { claimJob } = await import('@/services/jobs/queue');
    const kind = 'TEST_' + suffix;
    const job = await db.durableJob.create({ data: { ownerId: student.id, kind, payload: {} } });
    const claims = await Promise.all([claimJob([kind]), claimJob([kind])]);
    expect(claims.filter(Boolean)).toHaveLength(1); expect(claims.find(Boolean)?.id).toBe(job.id);
    await db.durableJob.update({ where: { id: job.id }, data: { lockedAt: new Date(Date.now() - 180000) } });
    const recovered = await claimJob([kind]); expect(recovered?.id).toBe(job.id); expect(recovered?.attempts).toBe(2);
    expect(recovered?.leaseToken).not.toBe(claims.find(Boolean)?.leaseToken);
    await db.durableJob.delete({ where: { id: job.id } });
  });
  it('creates only one active attempt under simultaneous starts', async () => {
    const [a, b] = await Promise.all([service.startAttempt(quizId, student, { practiceDurationMin: 1, practiceUntimed: true }), service.startAttempt(quizId, student)]);
    expect(a.id).toBe(b.id); expect(await db.quizAttempt.count({ where: { quizId } })).toBe(1);
    expect(new Date(a.deadline).getTime() - Date.now()).toBeGreaterThan(14 * 60000);
    expect(new Date(a.deadline).getTime() - Date.now()).toBeLessThan(16 * 60000);
    expect(JSON.stringify(a.questions)).not.toContain('isCorrect');
  });
  it('checks question membership, owner and answer versions', async () => {
    const attempt = await service.startAttempt(quizId, student);
    await expect(service.saveAnswer(quizId, outsider, { attemptId: attempt.id, questionId, version: 0, answerPayload: { selectedOptionId: 'a' } })).rejects.toThrow();
    await expect(service.saveAnswer(quizId, student, { attemptId: attempt.id, questionId: 'foreign', version: 0, answerPayload: {} })).rejects.toThrow();
    await service.saveAnswer(quizId, student, { attemptId: attempt.id, questionId, version: 0, answerPayload: { selectedOptionId: 'b' } });
    await expect(service.saveAnswer(quizId, student, { attemptId: attempt.id, questionId, version: 0, answerPayload: { selectedOptionId: 'a' } })).rejects.toThrow();
    const saved = await service.saveAnswer(quizId, student, { attemptId: attempt.id, questionId, version: 1, answerPayload: { selectedOptionId: 'a' } }); expect(saved.version).toBe(2);
  });
  it('hides active results and prevents another teacher reading the attempt', async () => {
    const attempt = await service.startAttempt(quizId, student);
    await expect(service.getResults(quizId, student, attempt.id)).rejects.toThrow();
    await expect(service.getResults(quizId, outsider, attempt.id)).rejects.toThrow();
  });
  it('grades frozen keys and commits concurrent submissions once', async () => {
    const attempt = await service.startAttempt(quizId, student);
    await db.quizQuestion.update({ where: { id: questionId }, data: { marks: 99 } });
    await Promise.all([service.submitAttempt(quizId, student, attempt.id), service.submitAttempt(quizId, student, attempt.id)]);
    const result = await service.getResults(quizId, student, attempt.id); expect(result.score).toBe(2); expect(result.maxMarks).toBe(2);
    expect(await db.assessmentEvent.count({ where: { attemptId: attempt.id, eventType: 'SUBMITTED' } })).toBe(1);
    await expect(service.saveAnswer(quizId, student, { attemptId: attempt.id, questionId, version: 2, answerPayload: { selectedOptionId: 'b' } })).rejects.toThrow();
  });
});
