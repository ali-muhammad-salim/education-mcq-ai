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
  const year = Number(process.argv.find(arg => arg.startsWith('--year='))?.slice(7) || 2025);
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
    const sources = await db.pastPaperQuestion.findMany({ where: { pastPaperId: `MTH-IX-${year}-P1`, questionNumber: { in: year === 2022 ? ['6', '14', '32', '45'] : year === 2023 ? ['2', '18', '33', '43'] : ['3', '18', '33', '43'] } }, select: { questionNumber: true, topicId: true } });
    assert.equal(sources.length, 4);
    const codes = [`MTH-IX-${year}-P1`, `MTH-IX-${year}-P1-SET-3-18-43`, ...sources.map(q => `CURRICULUM:${q.topicId}:ALL`)];
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
        if (content.stemText.startsWith('The shaded region in the Venn')) assert.equal(correct.id, 'D');
        if (content.stemText.includes('361') && content.stemText.includes('-60')) assert.equal(correct.id, 'D');
        if (content.stemText.startsWith('Consider the given diagram.') && content.stemText.includes('$a=e$')) assert.equal(correct.id, 'A');
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
    mkdirSync(`output/mathematics-ix-${year}`, { recursive: true });
    writeFileSync(`output/mathematics-ix-${year}/quiz-verification.json`, JSON.stringify({ checks, temporaryStudentRemoved: true }, null, 2));
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
