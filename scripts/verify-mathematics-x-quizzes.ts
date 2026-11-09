/** Exercise the live quiz API with a temporary student for Class X (SSC-II) 2025 Mathematics.
 * Verifies start attempt, answer submission, save/resume, and instant grading.
 */
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

async function main() {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient();
  const base = process.env.CHAPTER_CHECK_URL || 'http://localhost:3000';
  const token = randomBytes(32).toString('hex');
  let studentId = '';

  async function request(path: string, body?: object) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data.error)}`);
    return data;
  }

  try {
    const user = await db.user.create({
      data: {
        email: `quiz-check-x-${randomUUID()}@example.test`,
        name: 'Temporary quiz verification Class X',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    studentId = user.id;
    await db.userSession.create({
      data: {
        userId: studentId,
        token: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 600000),
      },
    });

    const paperCode = 'MTH-X-2025-P1';
    const preview = await request('/api/quizzes/' + encodeURIComponent(paperCode));
    assert.ok(preview.quiz.questions.length > 0, 'Expected questions in quiz preview');
    console.log(`Quiz ${paperCode} preview loaded: ${preview.quiz.questions.length} questions.`);

    const started = await request('/api/quizzes/' + encodeURIComponent(paperCode) + '/attempt', { practiceDurationMin: 10 });
    const attempt = started.attempt;
    const questions = await db.quizQuestion.findMany({ where: { quizId: attempt.quizId } });
    assert.equal(attempt.questions.length, questions.length);

    // Answer every question with its designated correct option
    for (const q of questions) {
      const content = q.questionData as { options: { id: string; isCorrect: boolean }[]; stemText: string };
      const correct = content.options.find(o => o.isCorrect);
      assert.ok(correct, `Correct option missing for question ${q.id}`);
      await request(`/api/quizzes/${attempt.quizId}/attempt/answer`, {
        attemptId: attempt.id,
        questionId: q.id,
        version: 0,
        answerPayload: { selectedOptionId: correct.id },
      });
    }

    // Verify save & resume state recovery
    const recovered = await request('/api/quizzes/' + encodeURIComponent(paperCode) + '/attempt');
    assert.equal(recovered.attempt.id, attempt.id, 'Attempt ID must match on resume');
    assert.equal(Object.keys(recovered.attempt.answers).length, questions.length, 'All answers must be preserved on resume');

    // Submit attempt and verify grading
    const receipt = await request(`/api/quizzes/${attempt.quizId}/attempt/submit`, { attemptId: attempt.id });
    assert.equal(receipt.status, 'GRADED', 'Expected immediate MCQ grading');

    const results = await request(`/api/quizzes/${attempt.quizId}/results?attemptId=${attempt.id}`);
    assert.equal(results.result.percentage, 100, 'Expected 100% score when answering with correct options');
    assert.equal(results.result.questions.length, questions.length);

    const record = {
      code: paperCode,
      questions: questions.length,
      status: results.result.status,
      percentage: results.result.percentage,
    };
    console.log('Quiz Verification Record:', JSON.stringify(record, null, 2));

    mkdirSync('output/mathematics-x-2025', { recursive: true });
    writeFileSync(
      'output/mathematics-x-2025/quiz-verification.json',
      JSON.stringify({ check: record, temporaryStudentRemoved: true }, null, 2)
    );
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

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

