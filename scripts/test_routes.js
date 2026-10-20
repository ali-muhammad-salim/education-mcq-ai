/* HTTP integration checks run only against an isolated test database. */
const { PrismaClient } = require('@prisma/client');
const { randomBytes, createHash, scryptSync } = require('node:crypto');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes('_test')) throw new Error('A dedicated TEST_DATABASE_URL is required.');
const db = new PrismaClient({ datasources: { db: { url } } });
const port = Number(process.env.TEST_PORT || 3102), base = 'http://localhost:' + port;
let child;
const password = 'Local-smoke-test-Password!42';
async function main() {
  const salt = randomBytes(16).toString('hex'), passwordHash = 'scrypt:' + salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const student = await db.user.upsert({ where: { email: 'browser-smoke@example.test' }, create: { email: 'browser-smoke@example.test', name: 'Browser Test Student', passwordHash }, update: { passwordHash, status: 'ACTIVE' } });
  const teacher = await db.user.upsert({ where: { email: 'smoke-teacher@example.test' }, create: { email: 'smoke-teacher@example.test', name: 'Test Teacher', role: 'TEACHER' }, update: {} });
  const other = await db.user.upsert({ where: { email: 'smoke-other@example.test' }, create: { email: 'smoke-other@example.test', name: 'Other Teacher', role: 'TEACHER' }, update: {} });
  async function token(user) { const value = randomBytes(32).toString('hex'); await db.userSession.create({ data: { userId: user.id, token: createHash('sha256').update(value).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } }); return value; }
  const teacherToken = await token(teacher), otherToken = await token(other);
  if (process.env.TEST_EXTERNAL_SERVER !== '1') child = spawn(process.execPath, [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], { env: { ...process.env, DATABASE_URL: url, NEXT_PUBLIC_APP_URL: base }, windowsHide: true, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/api/auth/me')).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  async function call(route, method = 'GET', body, bearer) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Origin: base, ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json(), response };
  }
  assert.equal((await call('/api/auth/login', 'POST', { demoRole: 'admin' })).status, 400);
  assert.equal((await call('/api/auth/otp', 'POST', { action: 'google', identifier: student.email })).status, 400);
  assert.equal((await call('/api/auth/otp', 'POST', { action: 'verify', identifier: student.email, otp: '123456' })).status, 401);
  const login = await call('/api/auth/login', 'POST', { email: student.email, password });
  assert.equal(login.status, 200);
  const studentToken = login.response.headers.get('set-cookie').match(/mcqs_session=([^;]+)/)[1];
  assert.equal((await call('/api/quizzes', 'POST', { title: 'Unauthorized' }, studentToken)).status, 403);
  assert.equal((await call('/api/ingest/run', 'POST', { resourceType: 'all_defaults' })).status, 401);
  const created = await call('/api/quizzes', 'POST', { title: 'Secure HTTP Exam', status: 'PUBLISHED', visibility: 'PUBLIC', durationMin: 15,
    settings: { showCorrectAnswers: true, resultVisibility: 'IMMEDIATE' }, questions: [{ stemText: 'Which unit measures force?', questionType: 'MCQ_SINGLE', marks: 2, options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }] }] }, teacherToken);
  assert.equal(created.status, 200, JSON.stringify(created.data)); const id = created.data.quizId;
  const lookup = await call('/api/quizzes/by-code?code=' + created.data.code);
  assert.equal(lookup.status, 200); assert.ok(!JSON.stringify(lookup.data).includes('isCorrect'));
  assert.equal((await call('/api/quizzes/' + id + '?mode=edit', 'GET', undefined, studentToken)).status, 403);
  const started = await call('/api/quizzes/' + id + '/attempt', 'POST', {}, studentToken);
  assert.equal(started.status, 200); const attempt = started.data.attempt;
  assert.ok(!JSON.stringify(attempt).includes('isCorrect'));
  const answer = { attemptId: attempt.id, questionId: attempt.questions[0].id, version: 0, answerPayload: { selectedOptionId: 'a' } };
  assert.equal((await call('/api/quizzes/' + id + '/attempt/answer', 'POST', { ...answer, answerPayload: { ...answer.answerPayload, isCorrect: true } }, studentToken)).status, 400);
  assert.equal((await call('/api/quizzes/' + id + '/attempt/answer', 'POST', answer, studentToken)).status, 200);
  assert.equal((await call('/api/quizzes/' + id + '/results?attemptId=' + attempt.id, 'GET', undefined, studentToken)).status, 403);
  assert.equal((await call('/api/quizzes/' + id + '/attempt/submit', 'POST', { attemptId: attempt.id }, studentToken)).status, 200);
  const result = await call('/api/quizzes/' + id + '/results?attemptId=' + attempt.id, 'GET', undefined, studentToken);
  assert.equal(result.status, 200); assert.equal(result.data.result.score, 2);
  const storedAnswer = await db.quizAnswer.findFirst({ where: { attemptId: attempt.id } });
  assert.equal((await call('/api/quizzes/' + id + '/grade', 'POST', { quizAnswerId: storedAnswer.id, awardedMarks: 0 }, otherToken)).status, 403);
  assert.equal((await call('/api/quizzes/' + id + '/results?attemptId=' + attempt.id, 'GET', undefined, otherToken)).status, 403);
  assert.equal((await call('/api/quizzes', 'POST', { id, title: 'Changed', status: 'PUBLISHED', questions: [{ stemText: 'Changed', options: [{ text: 'One', isCorrect: true }, { text: 'Two', isCorrect: false }] }] }, teacherToken)).status, 409);
  console.log('HTTP integration checks passed: login bypasses, roles, hidden keys, answer validation, scoring, ownership and frozen exams.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (child) child.kill(); await db.$disconnect(); });
