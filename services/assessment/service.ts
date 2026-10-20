import { Prisma, QuizSetting } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { AuthUser } from '@/lib/auth';
import { getFallbackPaper } from '@/lib/paperDataService';
import { lockedTransaction } from '@/repositories/transaction';
import { answerPayloadSchema, saveAnswerSchema } from '@/lib/validations/assessment';
import { FrozenQuestion, answerFeedback, gradeAnswer, hasAnswer, normalizeQuestion, snapshotSchema, studentQuestion } from './scoring';
import { z } from 'zod';
import { randomInt } from 'node:crypto';

export const quizInclude = { settings: true, questions: { orderBy: { orderIndex: 'asc' as const } }, teacher: { select: { name: true } } } satisfies Prisma.QuizInclude;
export type LoadedQuiz = Prisma.QuizGetPayload<{ include: typeof quizInclude }>;
const practiceCodes: Record<string, string> = {
  'SAMPLE-QUIZ-PHY-9': 'PHY-IX-P1', 'SAMPLE-QUIZ-PHY-10': 'PHY-X-P1',
  'SAMPLE-QUIZ-KINEMATICS': 'PHY-IX-P1', 'SAMPLE-QUIZ-WAVES': 'PHY-X-P1',
  'SAMPLE-QUIZ-PHY-CHAP-1-2': 'PHY-IX-CHAP1-2',
};
const allowedPractice = new Set(['PHY-IX-P1', 'PHY-IX-P2', 'PHY-X-P1', 'PHY-X-P2', 'PHY-IX-CHAP1-2', 'PHY-IX-2025-P1', 'PHY-IX-2025-P2', 'PHY-IX-2024-P1', 'PHY-IX-2024-P2']);

export async function resolveQuiz(identifier: string): Promise<LoadedQuiz> {
  const quiz = await prisma.quiz.findFirst({ where: { OR: [{ id: identifier }, { code: identifier.toUpperCase() }] }, include: quizInclude });
  if (quiz) return quiz;
  const key = identifier.toUpperCase();
  const subset = /^(PHY-(?:IX|X)(?:-2025)?-P1)-SET-([0-9-]+)$/.exec(key);
  const paperCode = subset?.[1] || practiceCodes[key] || key;
  if (!allowedPractice.has(paperCode)) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Assessment not found.');
  const paper = getFallbackPaper(paperCode);
  if (!paper) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Practice paper not found.');
  let source = paper.questions;
  if (subset) {
    const numbers = new Set(subset[2].split('-').map(Number));
    if (numbers.size > 40 || [...numbers].some(n => !Number.isInteger(n) || n < 1 || n > 40)) throw new ApiError(400, 'INVALID_PRACTICE', 'Invalid practice selection.');
    source = source.filter(q => numbers.has(Number(q.questionNumber)));
    if (source.length !== numbers.size) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Some selected practice questions are unavailable.');
  }
  if (key.includes('KINEMATICS') || key.includes('WAVES')) source = source.slice(0, 15);
  const questions = source.map((q, i) => {
    const meta = q.sourceRegion;
    const content = normalizeQuestion({
      questionType: q.questionType === 'MULTIPLE_CHOICE' ? 'MCQ_SINGLE' : 'LONG_ANSWER',
      stemText: q.questionText, marks: q.marks || 1, difficulty: q.difficulty,
      cognitiveLevel: meta.cognitive_level, explanation: meta.explanation, diagramUrl: meta.diagramUrl,
      options: Object.entries(meta.choices || {}).map(([id, text]) => ({ id, text, isCorrect: id === meta.correct_answer })),
      rubric: meta.rubric ? JSON.stringify(meta.rubric) : undefined,
    });
    return { orderIndex: i + 1, marks: content.marks, questionData: content };
  });
  // A suspended, passwordless content owner can never authenticate.
  const owner = await prisma.user.upsert({ where: { email: 'practice-content@system.invalid' }, update: {}, create: { email: 'practice-content@system.invalid', name: 'Practice Library', role: 'TEACHER', status: 'SUSPENDED' } });
  return prisma.quiz.upsert({ where: { id: `practice-${key}` }, update: {}, include: quizInclude,
    create: { id: `practice-${key}`, code: `PRACTICE-${key}`, teacherId: owner.id, title: subset ? paper.title + ' — Selected practice (' + questions.length + ' questions)' : paper.title, status: 'PUBLISHED', visibility: 'PUBLIC', durationMin: questions.length <= 15 ? 20 : 55,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0), questions: { create: questions }, settings: { create: { maxAttempts: 100, allowRetries: true, showCorrectAnswers: true, immediateFeedback: true, tabMonitoringEnabled: false } } } });
}

export async function assertQuizAccess(quiz: LoadedQuiz, user: AuthUser | null, taking = false, db: Prisma.TransactionClient = prisma) {
  const owner = user && (user.role === 'ADMIN' || quiz.teacherId === user.id);
  if (owner && !taking) return;
  if (quiz.status !== 'PUBLISHED') throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Assessment is not published.');
  if (quiz.visibility === 'PRIVATE' && !owner) {
    if (!user || !await db.quizAssignment.findFirst({ where: { quizId: quiz.id, classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } })) throw new ApiError(403, 'FORBIDDEN', 'This assessment is restricted to its assigned classroom.');
  }
  const now = new Date();
  if (taking && ((quiz.scheduleStart && quiz.scheduleStart > now) || (quiz.scheduleEnd && quiz.scheduleEnd <= now))) throw new ApiError(403, 'OUTSIDE_SCHEDULE', 'This assessment is outside its scheduled availability.');
}

function freeze(quiz: LoadedQuiz): FrozenQuestion[] {
  const shuffle = <T,>(items: T[]) => { for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; } return items; };
  const questions = quiz.questions.map(q => { const content = normalizeQuestion(q.questionData); if (quiz.settings?.randomizeOptions) content.options = shuffle([...content.options]); return { id: q.id, orderIndex: q.orderIndex, marks: q.marks, content }; });
  if (quiz.settings?.randomizeQuestions) shuffle(questions);
  return questions.map((q, i) => ({ ...q, orderIndex: i + 1 }));
}

export async function startAttempt(identifier: string, user: AuthUser, preferences: { practiceDurationMin?: number; practiceUntimed?: boolean } = {}) {
  const quiz = await resolveQuiz(identifier);
  await assertQuizAccess(quiz, user, true);
  return lockedTransaction(async tx => {
    // Starts for one student serialize; different students share the quiz lock.
    // Quiz editors take FOR UPDATE, so snapshots and frozen-content checks agree.
    const studentLock = JSON.stringify([quiz.id, user.id]);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentLock}, 0))::text`;
    await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${quiz.id} FOR SHARE`;
    const current = await tx.quiz.findUniqueOrThrow({ where: { id: quiz.id }, include: quizInclude });
    const active = await tx.quizAttempt.findFirst({ where: { quizId: quiz.id, studentId: user.id, status: 'IN_PROGRESS' }, orderBy: { startedAt: 'desc' }, include: { answers: true } });
    if (active) return attemptResponse(active, current);
    await assertQuizAccess(current, user, true, tx);
    if (current.status !== 'PUBLISHED') throw new ApiError(403, 'NOT_PUBLISHED', 'Assessment is not published.');
    const count = await tx.quizAttempt.count({ where: { quizId: quiz.id, studentId: user.id } });
    if (count >= (current.settings?.allowRetries || current.id.startsWith('practice-') ? current.settings?.maxAttempts ?? 1 : 1)) throw new ApiError(403, 'ATTEMPT_LIMIT', 'Maximum number of attempts reached.');
    const practice = current.id.startsWith('practice-');
    const now = new Date(), duration = practice && preferences.practiceUntimed ? 1440 : practice && preferences.practiceDurationMin ? preferences.practiceDurationMin : current.durationMin ?? 45;
    const assigned = current.visibility === 'PRIVATE' && current.teacherId !== user.id && user.role !== 'ADMIN' ? await tx.quizAssignment.findMany({ where: { quizId: current.id, classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } }) : [];
    const assignmentDeadline = assigned.length ? Math.max(...assigned.map(a => a.deadline?.getTime() ?? Infinity)) : Infinity;
    if (assignmentDeadline <= now.getTime()) throw new ApiError(403, 'ASSIGNMENT_CLOSED', 'The assignment deadline has passed.');
    const deadline = new Date(Math.min(now.getTime() + duration * 60000, current.scheduleEnd?.getTime() ?? Infinity, assignmentDeadline));
    const attempt = await tx.quizAttempt.create({ data: { quizId: quiz.id, studentId: user.id, attemptNumber: count + 1, startedAt: now, deadline, questionSnapshot: freeze(current) }, include: { answers: true } });
    await tx.durableJob.create({ data: { ownerId: user.id, kind: 'EXAM_FINALIZE', availableAt: deadline, payload: { quizId: quiz.id, attemptId: attempt.id } } });
    await tx.assessmentEvent.create({ data: { attemptId: attempt.id, eventType: 'ATTEMPT_STARTED' } });
    return attemptResponse(attempt, current);
  });
}

export async function recoverAttempt(identifier: string, user: AuthUser) {
  const quiz = await resolveQuiz(identifier);
  const attempt = await prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, studentId: user.id, status: 'IN_PROGRESS' }, orderBy: { startedAt: 'desc' }, include: { answers: true } });
  return attempt ? { hasActiveAttempt: true, attempt: attemptResponse(attempt, quiz) } : { hasActiveAttempt: false };
}

type AttemptWithAnswers = Prisma.QuizAttemptGetPayload<{ include: { answers: true } }>;
function attemptResponse(attempt: AttemptWithAnswers, quiz: LoadedQuiz) {
  const questions = snapshotSchema.parse(attempt.questionSnapshot ?? freeze(quiz));
  return { tabSwitchCount: attempt.tabSwitchCount, id: attempt.id, studentId: attempt.studentId, quizId: quiz.id, quizTitle: quiz.title, startedAt: attempt.startedAt, deadline: attempt.deadline,
    remainingSeconds: Math.max(0, Math.floor((attempt.deadline.getTime() - Date.now()) / 1000)), status: attempt.status,
    settings: { tabMonitoringEnabled: quiz.settings?.tabMonitoringEnabled ?? false },
    answers: Object.fromEntries(attempt.answers.map(a => [a.questionId, { payload: a.answerPayload, version: a.version }])),
    questions: questions.map(studentQuestion) };
}

export async function saveAnswer(identifier: string, user: AuthUser, input: z.infer<typeof saveAnswerSchema>) {
  return lockedTransaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${input.attemptId} FOR UPDATE`;
    const attempt = await tx.quizAttempt.findUnique({ where: { id: input.attemptId } });
    if (!attempt || attempt.studentId !== user.id || attempt.quizId !== identifier) throw new ApiError(403, 'FORBIDDEN', 'Attempt not found or unauthorized.');
    if (attempt.status !== 'IN_PROGRESS' || attempt.deadline < new Date()) throw new ApiError(409, 'ATTEMPT_CLOSED', 'The assessment has ended. Submit the saved answers.');
    const questions = snapshotSchema.parse(attempt.questionSnapshot);
    const question = questions.find(q => q.id === input.questionId);
    if (!question) throw new ApiError(400, 'INVALID_QUESTION', 'Question does not belong to this attempt.');
    const options = new Set(question.content.options.map(o => o.id));
    if ((input.answerPayload.selectedOptionId && !options.has(input.answerPayload.selectedOptionId)) || input.answerPayload.selectedOptionIds?.some(id => !options.has(id))) throw new ApiError(400, 'INVALID_OPTION', 'Unknown answer option.');
    if (input.answerPayload.matchedPairs?.some(p => !question.content.matchingPairs.some(e => e.left === p.left) || !question.content.matchingPairs.some(e => e.right === p.right))) throw new ApiError(400, 'INVALID_MATCH', 'Unknown matching item.');
    const where = { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } };
    const previous = await tx.quizAnswer.findUnique({ where });
    if ((previous?.version ?? 0) !== input.version) {
      // A lost acknowledgement can be replayed without replacing a newer answer.
      if (previous && JSON.stringify(previous.answerPayload) === JSON.stringify(input.answerPayload)) return { version: previous.version, savedAt: previous.updatedAt };
      throw new ApiError(409, 'ANSWER_CONFLICT', 'This answer changed in another tab. Reload to recover the latest saved version.');
    }
    const answer = await tx.quizAnswer.upsert({ where, create: { attemptId: attempt.id, questionId: question.id, answerPayload: input.answerPayload, version: 1 }, update: { answerPayload: input.answerPayload, version: { increment: 1 } } });
    return { version: answer.version, savedAt: answer.updatedAt };
  });
}

// Receipt and job commit atomically before the browser is acknowledged.
export async function acceptSubmission(identifier: string, user: AuthUser, attemptId: string) {
  return lockedTransaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== user.id || attempt.quizId !== identifier) throw new ApiError(403, 'FORBIDDEN', 'Attempt not found or unauthorized.');
    if (attempt.status !== 'IN_PROGRESS') return { attemptId, status: attempt.status, submittedAt: attempt.submittedAt, alreadySubmitted: true };
    const submittedAt = new Date();
    await tx.quizAttempt.update({ where: { id: attemptId }, data: { status: 'SUBMITTED', submittedAt } });
    await tx.durableJob.create({ data: { id: 'grade-' + attemptId, ownerId: user.id, kind: 'EXAM_GRADE', payload: { quizId: identifier, attemptId } } });
    await tx.assessmentEvent.create({ data: { attemptId, eventType: 'SUBMITTED', metadata: { expired: attempt.deadline <= submittedAt, queued: true } } });
    return { attemptId, status: 'SUBMITTED' as const, submittedAt, alreadySubmitted: false };
  });
}

export async function submitFromBrowser(identifier: string, user: AuthUser, attemptId: string) {
  return process.env.ASSESSMENT_SUBMISSION_MODE === 'queued' ? acceptSubmission(identifier, user, attemptId) : submitAttempt(identifier, user, attemptId);
}

export async function submitAttempt(identifier: string, user: AuthUser, attemptId: string) {
  return lockedTransaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.quizAttempt.findUnique({ where: { id: attemptId }, include: { answers: true } });
    if (!attempt || attempt.studentId !== user.id || attempt.quizId !== identifier) throw new ApiError(403, 'FORBIDDEN', 'Attempt not found or unauthorized.');
    if (!['IN_PROGRESS','SUBMITTED'].includes(attempt.status)) return { attemptId: attempt.id, status: attempt.status, submittedAt: attempt.submittedAt, alreadySubmitted: true };
    const quiz = await tx.quiz.findUniqueOrThrow({ where: { id: attempt.quizId }, select: { settings: true } });
    const questions = snapshotSchema.parse(attempt.questionSnapshot), byId = new Map(attempt.answers.map(a => [a.questionId, a.answerPayload]));
    let total = 0, pending = false;
    const grades = questions.map(q => {
      const payload = byId.get(q.id) ?? {}, answered = hasAnswer(q, payload);
      let score = gradeAnswer(q, payload);
      if (quiz.settings?.manualGradingRequired && answered) score = null;
      if (score === 0 && quiz.settings?.negativeMarking && answered) score = -quiz.settings.negativeMarkValue;
      if (score === null) pending = true; else total += score;
      return { questionId: q.id, score, auto: score !== null };
    });
    await tx.quizAnswer.createMany({ data: questions.filter(q => !byId.has(q.id)).map(q => ({ attemptId, questionId: q.id, answerPayload: {} })), skipDuplicates: true });
    await tx.$executeRaw`UPDATE "QuizAnswer" a SET "score" = g.score, "isAutoGraded" = g.auto FROM jsonb_to_recordset(${JSON.stringify(grades)}::jsonb) AS g("questionId" text, score double precision, auto boolean) WHERE a."attemptId" = ${attemptId} AND a."questionId" = g."questionId"`;
    const status = pending ? 'GRADING_PENDING' : 'GRADED';
    const finalized = await tx.quizAttempt.update({ where: { id: attemptId }, data: { status, autoScore: total, totalScore: total, submittedAt: attempt.submittedAt ?? new Date() } });
    if (attempt.status === 'IN_PROGRESS') await tx.assessmentEvent.create({ data: { attemptId, eventType: 'SUBMITTED', metadata: { expired: attempt.deadline < new Date(), autoScore: total } } });
    return { attemptId, status, submittedAt: finalized.submittedAt };
  });
}

export function resultsReleased(settings: QuizSetting | null, submitted: boolean, now = new Date()) {
  if (!submitted) return false;
  if (settings?.resultVisibility === 'MANUAL_RELEASE') return false;
  if (settings?.resultVisibility === 'SCHEDULED') return Boolean(settings.resultReleaseDate && settings.resultReleaseDate <= now);
  return true;
}

export async function getResults(identifier: string, user: AuthUser, attemptId?: string) {
  const quiz = await resolveQuiz(identifier);
  const attempt = await prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, ...(attemptId ? { id: attemptId } : { studentId: user.id }) }, orderBy: { startedAt: 'desc' }, include: { answers: { include: { gradeRecords: true } }, student: { select: { name: true } } } });
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'Attempt not found.');
  const educator = user.role === 'ADMIN' || (user.role === 'TEACHER' && quiz.teacherId === user.id);
  if (attempt.studentId !== user.id && !educator) throw new ApiError(403, 'FORBIDDEN', 'You cannot view this attempt.');
  if (!educator && !resultsReleased(quiz.settings, attempt.status !== 'IN_PROGRESS')) throw new ApiError(403, 'RESULTS_PENDING', 'Results have not been released.');
  const processing = attempt.status === 'SUBMITTED';
  const showKey = !processing && (educator || (quiz.settings?.showCorrectAnswers ?? false)), questions = snapshotSchema.parse(attempt.questionSnapshot);
  const maximum = questions.reduce((sum, q) => sum + q.marks, 0), score = attempt.totalScore ?? 0;
  const answers = new Map(attempt.answers.map(a => [a.questionId, a]));
  const attemptCount = attempt.studentId === user.id ? await prisma.quizAttempt.count({ where: { quizId: quiz.id, studentId: user.id } }) : 0;
  const canRetake = !educator && quiz.status === 'PUBLISHED' && (!quiz.scheduleEnd || quiz.scheduleEnd > new Date()) && attemptCount < (quiz.settings?.allowRetries || quiz.id.startsWith('practice-') ? quiz.settings?.maxAttempts ?? 1 : 1);
  return { attemptId: attempt.id, quizTitle: quiz.title, studentName: attempt.student.name, status: attempt.status, score, maxMarks: maximum,
    percentage: maximum ? Math.round(score / maximum * 100) : 0, submittedAt: attempt.submittedAt, startedAt: attempt.startedAt, tabSwitchCount: attempt.tabSwitchCount,
    processing, timeSpentSec: Math.round(((attempt.submittedAt?.getTime() ?? Date.now()) - attempt.startedAt.getTime()) / 1000), canViewCorrectAnswers: showKey, educatorView: Boolean(educator), canRetake: canRetake && !processing, canGrade: Boolean(educator && !['IN_PROGRESS','SUBMITTED'].includes(attempt.status)),
    questions: questions.map(q => { const a = answers.get(q.id); return { ...studentQuestion(q), questionId: q.id, quizAnswerId: educator ? a?.id : undefined, teacherComment: a?.teacherComment, gradeRecords: a?.gradeRecords.map(g => ({ awardedMarks: g.awardedMarks, feedback: g.feedback, createdAt: g.createdAt })), studentAnswer: a?.answerPayload, scoreAwarded: a?.score, isAutoGraded: a?.isAutoGraded,
      ...(showKey ? { options: q.content.options, correctAnswerText: q.content.correctAnswerText, explanation: q.content.explanation, answerFeedback: answerFeedback(q,a?.answerPayload,a?.score), matchingPairs: q.content.matchingPairs, rubric: q.content.rubric } : {}) }; }) };
}
