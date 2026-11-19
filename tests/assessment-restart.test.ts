import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma, QuizAnswer, QuizAttempt, QuizSetting } from '@prisma/client';
import type { AuthUser } from '@/lib/auth';
import type { LoadedQuiz } from '@/services/assessment/service';

const db = vi.hoisted(() => ({ quiz: { findFirst: vi.fn() }, $transaction: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: db }));
import { startAttempt, submitAttempt } from '@/services/assessment/service';

// Offline DB-boundary double: real service/scoring/transaction wrapper, but no
// PostgreSQL. Rollback and lock-order assertions do not prove actual contention.
const now = new Date('2026-11-01T10:00:00Z');
const student: AuthUser = { id: 'student', name: 'Student', email: 'student@example.test', role: 'STUDENT' };
type StoredAttempt = QuizAttempt & { answers: QuizAnswer[] };
type Event = { attemptId: string; eventType: string; metadata?: unknown };
type Job = { ownerId: string; kind: string; availableAt?: Date; payload: unknown };
let fixtureNumber = 0;

function fixture(settings: Partial<QuizSetting> = {}, practice = false) {
  const quizId = (practice ? 'practice-' : 'quiz-') + ++fixtureNumber;
  const options = [{ id: 'a', text: 'Correct', isCorrect: true }, { id: 'b', text: 'Wrong', isCorrect: false }];
  const snapshot = ['correct', 'wrong', 'cleared', 'unanswered'].map((id, i) => ({
    id, orderIndex: i + 1, marks: 2,
    content: { questionType: 'MCQ_SINGLE', stemText: 'Choose an answer: ' + id, marks: 2, options },
  }));
  const quiz: LoadedQuiz = {
    id: quizId, code: null, title: 'Restart regression', teacherId: 'teacher', teacher: { name: 'Teacher' },
    sourceDocumentId: null, description: null, boardId: null, classId: null, subjectId: null,
    status: 'PUBLISHED', visibility: 'PUBLIC', durationMin: 45, totalMarks: 8,
    scheduleStart: null, scheduleEnd: null, createdAt: now, updatedAt: now,
    questions: snapshot.map(q => ({ id: q.id, quizId, bankQuestionId: null, orderIndex: q.orderIndex, marks: q.marks, isRequired: true, questionData: q.content })),
    settings: {
      id: 'settings', quizId, maxAttempts: 3, allowRetries: true, randomizeQuestions: false, randomizeOptions: false,
      immediateFeedback: true, showCorrectAnswers: true, resultVisibility: 'IMMEDIATE', resultReleaseDate: null,
      manualGradingRequired: false, aiGradingMode: 'OFF', customRubric: null,
      negativeMarking: true, negativeMarkValue: 0.5, tabMonitoringEnabled: false,
      tabWarningThreshold: 2, lateSubmissionAllowed: false, ...settings,
    },
  };
  const attemptId = 'old-' + fixtureNumber;
  function answer(questionId: string, answerPayload: Prisma.JsonValue, id = attemptId): QuizAnswer {
    return { id: id + '-' + questionId, attemptId: id, questionId, answerPayload, version: 1,
      score: null, isAutoGraded: false, teacherComment: null, createdAt: now, updatedAt: now };
  }
  const initial: StoredAttempt = {
    id: attemptId, quizId, studentId: student.id, attemptNumber: 1, status: 'IN_PROGRESS',
    startedAt: new Date(now.getTime() - 60000), deadline: new Date(now.getTime() + 60000),
    submittedAt: null, totalScore: null, autoScore: null, manualScore: null,
    tabSwitchCount: 0, ipAddress: null, userAgent: null, questionSnapshot: snapshot,
    answers: [answer('correct', { selectedOptionId: 'a' }), answer('wrong', { selectedOptionId: 'b' }), answer('cleared', {})],
  };
  let state = { attempts: [initial], events: [] as Event[], jobs: [] as Job[] };
  let inTransaction = false;
  const controls = { onAttemptLock: undefined as undefined | ((attempt: StoredAttempt) => void), failJob: false };
  const trace: string[] = [];
  db.quiz.findFirst.mockImplementation(async () => structuredClone(quiz));
  db.$transaction.mockImplementation(async (work: (tx: unknown) => Promise<unknown>) => {
    if (inTransaction) throw new Error('Restart must not open a nested grading transaction');
    inTransaction = true;
    const draft = structuredClone(state);
    const find = (id: string) => {
      const attempt = draft.attempts.find(a => a.id === id);
      if (!attempt) throw new Error('Unknown attempt ' + id);
      return attempt;
    };
    const tx = {
      $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
        const text = sql.join('?');
        trace.push(text);
        if (text.includes('"QuizAttempt"') && text.includes('FOR UPDATE')) controls.onAttemptLock?.(find(String(values[0])));
        return [];
      },
      quiz: { findUniqueOrThrow: async () => structuredClone(quiz) },
      quizAttempt: {
        findFirst: async ({ where }: { where: { quizId: string; studentId: string; status: string } }) =>
          structuredClone(draft.attempts.find(a => a.quizId === where.quizId && a.studentId === where.studentId && a.status === where.status) ?? null),
        findUnique: async ({ where }: { where: { id: string } }) => {
          trace.push('read-attempt');
          return structuredClone(find(where.id));
        },
        count: async () => draft.attempts.length,
        update: async ({ where, data }: { where: { id: string }; data: Partial<QuizAttempt> }) => {
          trace.push('update-attempt');
          Object.assign(find(where.id), data);
          return structuredClone(find(where.id));
        },
        create: async ({ data }: { data: Partial<QuizAttempt> }) => {
          const created = { ...initial, ...data, id: 'new-' + fixtureNumber, answers: [] };
          draft.attempts.push(created);
          return structuredClone(created);
        },
      },
      quizAnswer: {
        createMany: async ({ data }: { data: { attemptId: string; questionId: string; answerPayload: Prisma.JsonValue }[] }) => {
          for (const item of data) find(item.attemptId).answers.push(answer(item.questionId, item.answerPayload, item.attemptId));
        },
      },
      $executeRaw: async (sql: TemplateStringsArray, gradesJson: string, id: string) => {
        expect(sql.join('?')).toContain('UPDATE "QuizAnswer"');
        trace.push('grade-answers');
        const grades = JSON.parse(gradesJson) as { questionId: string; score: number | null; auto: boolean }[];
        for (const grade of grades) {
          const stored = find(id).answers.find(a => a.questionId === grade.questionId)!;
          stored.score = grade.score;
          stored.isAutoGraded = grade.auto;
        }
        return grades.length;
      },
      assessmentEvent: { create: async ({ data }: { data: Event }) => { draft.events.push(data); } },
      durableJob: { create: async ({ data }: { data: Job }) => {
        if (controls.failJob) throw new Error('Job write failed');
        draft.jobs.push(data);
      } },
    };
    try {
      const result = await work(tx);
      state = draft;
      return result;
    } finally { inTransaction = false; }
  });
  return { quiz, attemptId, controls, trace, get state() { return state; }, get old() { return state.attempts[0]; } };
}

beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });

for (const mode of ['restart', 'submit'] as const) {
  describe(mode + ' grading (offline DB boundary)', () => {
    async function finalize(f: ReturnType<typeof fixture>) {
      return mode === 'restart'
        ? startAttempt(f.quiz.id, student, { forceNewAttempt: true })
        : submitAttempt(f.quiz.id, student, f.attemptId);
    }

    it('scores frozen answers including negative, cleared and unanswered items', async () => {
      const f = fixture();
      // A later key must not replace the old attempt's frozen answer key.
      f.quiz.questions[0].questionData = { ...f.quiz.questions[0].questionData as Prisma.JsonObject,
        options: [{ id: 'a', text: 'Correct', isCorrect: false }, { id: 'b', text: 'Wrong', isCorrect: true }] };
      await finalize(f);
      expect(f.old).toMatchObject({ status: 'GRADED', autoScore: 1.5, totalScore: 1.5, submittedAt: now });
      expect(f.old.answers.map(a => [a.questionId, a.score, a.isAutoGraded])).toEqual([
        ['correct', 2, true], ['wrong', -0.5, true], ['cleared', 0, true], ['unanswered', 0, true],
      ]);
      expect(f.state.events.filter(e => e.attemptId === f.attemptId)).toEqual([
        { attemptId: f.attemptId, eventType: 'SUBMITTED', metadata: { expired: false, autoScore: 1.5 } },
      ]);
    });

    it('keeps answered manual items pending without penalizing empty items', async () => {
      const f = fixture({ manualGradingRequired: true });
      await finalize(f);
      expect(f.old).toMatchObject({ status: 'GRADING_PENDING', autoScore: 0, totalScore: 0 });
      expect(f.old.answers.map(a => [a.score, a.isAutoGraded])).toEqual([[null, false], [null, false], [0, true], [0, true]]);
    });

    it('retains automatic marks while a written answer awaits manual grading', async () => {
      const f = fixture();
      const snapshot = f.old.questionSnapshot as Prisma.JsonArray;
      snapshot.push({ id: 'written', orderIndex: 5, marks: 3, content: { questionType: 'LONG_ANSWER', stemText: 'Explain your reasoning', marks: 3 } });
      f.old.answers.push({ ...f.old.answers[0], id: 'written-answer', questionId: 'written', answerPayload: { textAnswer: 'My explanation' } });
      await finalize(f);
      expect(f.old).toMatchObject({ status: 'GRADING_PENDING', autoScore: 1.5, totalScore: 1.5 });
      expect(f.old.answers.find(a => a.questionId === 'written')).toMatchObject({ score: null, isAutoGraded: false });
    });
  });
}

describe('restart atomicity and compatibility (offline DB boundary)', () => {
  it('finalizes and starts the replacement in one transaction with its job and event', async () => {
    const f = fixture();
    const next = await startAttempt(f.quiz.id, student, { forceNewAttempt: true, practiceUntimed: true });
    expect(next).toMatchObject({ status: 'IN_PROGRESS', answers: {}, remainingSeconds: 45 * 60 });
    expect(next.id).not.toBe(f.attemptId);
    expect(f.state.attempts[1]).toMatchObject({ attemptNumber: 2, totalScore: null });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(f.state.jobs).toEqual([{ ownerId: student.id, kind: 'EXAM_FINALIZE', availableAt: next.deadline, payload: { quizId: f.quiz.id, attemptId: next.id } }]);
    expect(f.state.events.map(e => e.eventType)).toEqual(['SUBMITTED', 'ATTEMPT_STARTED']);
  });

  it('locks and rereads the old attempt before scoring the latest saved answer', async () => {
    const f = fixture();
    f.controls.onAttemptLock = attempt => { attempt.answers[1].answerPayload = { selectedOptionId: 'a' }; };
    await startAttempt(f.quiz.id, student, { forceNewAttempt: true });
    expect(f.old.totalScore).toBe(4);
    const lock = f.trace.findIndex(s => s.includes('"QuizAttempt"') && s.includes('FOR UPDATE'));
    expect(lock).toBeGreaterThan(-1);
    expect(f.trace.indexOf('read-attempt')).toBeGreaterThan(lock);
    expect(f.trace.indexOf('grade-answers')).toBeGreaterThan(f.trace.indexOf('read-attempt'));
  });

  it('does not overwrite an attempt finalized while waiting for the row lock', async () => {
    const f = fixture();
    const receipt = new Date(now.getTime() - 1000);
    f.controls.onAttemptLock = attempt => Object.assign(attempt, { status: 'GRADING_PENDING', totalScore: 7, autoScore: 7, submittedAt: receipt });
    await startAttempt(f.quiz.id, student, { forceNewAttempt: true });
    expect(f.old).toMatchObject({ status: 'GRADING_PENDING', totalScore: 7, submittedAt: receipt });
    expect(f.state.events.filter(e => e.attemptId === f.attemptId)).toEqual([]);
  });

  it.each([{ maxAttempts: 1 }, { allowRetries: false, maxAttempts: 5 }])('rolls back rejected retries: %j', async settings => {
    const f = fixture(settings);
    const before = structuredClone(f.state);
    await expect(startAttempt(f.quiz.id, student, { forceNewAttempt: true })).rejects.toMatchObject({ code: 'ATTEMPT_LIMIT' });
    expect(f.state).toEqual(before);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back grading, answer rows and events when replacement job creation fails', async () => {
    const f = fixture();
    const before = structuredClone(f.state);
    f.controls.failJob = true;
    await expect(startAttempt(f.quiz.id, student, { forceNewAttempt: true })).rejects.toThrow('Job write failed');
    expect(f.state).toEqual(before);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('resumes an active attempt without grading when a restart was not requested', async () => {
    const f = fixture();
    const before = structuredClone(f.state);
    const resumed = await startAttempt(f.quiz.id, student);
    expect(resumed).toMatchObject({ id: f.attemptId, status: 'IN_PROGRESS', answers: { wrong: { payload: { selectedOptionId: 'b' }, version: 1 } } });
    expect(f.state).toEqual(before);
  });

  it.each([
    { preferences: { practiceUntimed: true }, minutes: 1440 },
    { preferences: { practiceDurationMin: 20 }, minutes: 20 },
  ])('preserves practice restart timing: %j', async ({ preferences, minutes }) => {
    const f = fixture({ allowRetries: false }, true);
    const next = await startAttempt(f.quiz.id, student, { forceNewAttempt: true, ...preferences });
    expect(next.remainingSeconds).toBe(minutes * 60);
    expect(f.old).toMatchObject({ status: 'GRADED', totalScore: 1.5 });
    expect(f.state.attempts).toHaveLength(2);
  });

  it('still enforces the configured maximum for practice restarts', async () => {
    const f = fixture({ maxAttempts: 1 }, true);
    const before = structuredClone(f.state);
    await expect(startAttempt(f.quiz.id, student, { forceNewAttempt: true })).rejects.toMatchObject({ code: 'ATTEMPT_LIMIT' });
    expect(f.state).toEqual(before);
  });

  it('keeps ordinary submission idempotent after a restart', async () => {
    const f = fixture();
    await startAttempt(f.quiz.id, student, { forceNewAttempt: true });
    const before = structuredClone(f.state);
    await expect(submitAttempt(f.quiz.id, student, f.attemptId)).resolves.toMatchObject({ status: 'GRADED', alreadySubmitted: true, submittedAt: now });
    expect(f.state).toEqual(before);
    expect(f.old.totalScore).toBe(1.5);
  });

  it('preserves queued submission receipt and avoids a duplicate submission event', async () => {
    const f = fixture();
    const receipt = new Date(now.getTime() - 1000);
    Object.assign(f.old, { status: 'SUBMITTED', submittedAt: receipt });
    f.state.events.push({ attemptId: f.attemptId, eventType: 'SUBMITTED', metadata: { queued: true } });
    await expect(submitAttempt(f.quiz.id, student, f.attemptId)).resolves.toMatchObject({ status: 'GRADED', submittedAt: receipt });
    expect(f.old.totalScore).toBe(1.5);
    expect(f.state.events).toHaveLength(1);
  });
});
