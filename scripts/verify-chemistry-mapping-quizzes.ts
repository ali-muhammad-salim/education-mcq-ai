/** Exercise the live quiz API with a temporary student, removed in finally. */
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

async function main() {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient();
  const base = process.env.CHAPTER_CHECK_URL || 'http://localhost:3001';
  const token = randomBytes(32).toString('hex');
  let studentId = '';
  async function request(path: string, body?: object) {
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
    const data = await response.json();
    assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data.error)}`);
    return data;
  }
  try {
    const user = await db.user.create({ data: { email: `quiz-check-${randomUUID()}@example.test`, name: 'Temporary quiz verification', role: 'STUDENT', status: 'ACTIVE' } });
    studentId = user.id;
    await db.userSession.create({ data: { userId: studentId, token: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } });
    const selected = await db.pastPaperQuestion.findMany({
      where: { OR: [
        { pastPaper: { paperCode: 'CHM-IX-2025-P1' }, questionNumber: '4' },
        { pastPaper: { paperCode: 'CHM-IX-2022-P1' }, questionNumber: '30' },
        { pastPaper: { paperCode: 'CHM-X-2024-P1' }, questionNumber: '11' },
        { pastPaper: { paperCode: 'CHM-X-2025-P1' }, questionNumber: '14' },
      ] }, select: { topicId: true },
    });
    assert.equal(selected.length,4);
    const codes = [...new Set(selected.map(q=>`CURRICULUM:${q.topicId}:ALL`)),
      'CHM-IX-UNIT-0-ALL-ALL','CHM-X-UNIT-0-ALL-ALL',
      'CHM-IX-2023-P1','CHM-X-2023-P1'];
    const checks = [];
    for (const code of codes) {
      const preview = await request('/api/quizzes/' + encodeURIComponent(code));
      assert.ok(preview.quiz.questions.length > 0);
      const started = await request('/api/quizzes/' + encodeURIComponent(code) + '/attempt', { practiceDurationMin: 5 });
      const attempt = started.attempt;
      const questions = await db.quizQuestion.findMany({ where: { quizId: attempt.quizId } });
      assert.equal(attempt.questions.length, questions.length);
      for (const q of questions) {
        const content = q.questionData as { options: { id: string; isCorrect: boolean }[]; stemText: string };
        const correct = content.options.find(o => o.isCorrect);
        assert.ok(correct, q.id);
        await request(`/api/quizzes/${attempt.quizId}/attempt/answer`, { attemptId: attempt.id, questionId: q.id, version: 0, answerPayload: { selectedOptionId: correct.id } });
      }
      const recovered = await request('/api/quizzes/' + encodeURIComponent(code) + '/attempt');
      assert.equal(recovered.attempt.id, attempt.id);
      assert.equal(Object.keys(recovered.attempt.answers).length, questions.length);
      const receipt = await request(`/api/quizzes/${attempt.quizId}/attempt/submit`, { attemptId: attempt.id });
      assert.equal(receipt.status, 'GRADED', 'Expected immediate MCQ grading in this local preview');
      const results = await request(`/api/quizzes/${attempt.quizId}/results?attemptId=${attempt.id}`);
      assert.equal(results.result.percentage, 100);
      assert.equal(results.result.questions.length, questions.length);
      const record = { code, questions: questions.length, status: results.result.status, percentage: results.result.percentage };
      checks.push(record);
      console.log(JSON.stringify(record));
    }
    mkdirSync('output/chemistry-syllabus-review', { recursive: true });
    writeFileSync('output/chemistry-syllabus-review/quiz-verification.json', JSON.stringify({ checks, temporaryStudentRemoved: true }, null, 2));
  } finally {
    if (studentId) {
      await db.durableJob.deleteMany({ where: { ownerId: studentId } });
      await db.quizAttempt.deleteMany({ where: { studentId } });
      await db.requestLimit.deleteMany({ where: { key: createHash('sha256').update('attempt-start:' + studentId).digest('hex') } });
      await db.user.delete({ where: { id: studentId } });
    }
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
