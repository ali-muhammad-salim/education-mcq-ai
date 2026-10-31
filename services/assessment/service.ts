import { Prisma, QuizSetting } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { AuthUser } from '@/lib/auth';
import { getFallbackPaper, type QuestionData } from '@/lib/paperDataService';
import { lockedTransaction } from '@/repositories/transaction';
import { saveAnswerSchema } from '@/lib/validations/assessment';
import { FrozenQuestion, answerFeedback, gradeAnswer, hasAnswer, normalizeQuestion, snapshotSchema, studentQuestion } from './scoring';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import {publicMaterialWhere} from '@/lib/materialVisibility';
import {mappedChapterQuestions,sourceChoiceContent} from '@/services/materials/practice';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import { applyAnswerDecision, legacyAnswerCases } from '@/lib/legacyAnswerReview';

export const quizInclude = { settings: true, questions: { orderBy: { orderIndex: 'asc' as const } }, teacher: { select: { name: true } } } satisfies Prisma.QuizInclude;
export type LoadedQuiz = Prisma.QuizGetPayload<{ include: typeof quizInclude }>;
const practiceCodes: Record<string, string> = {
  'SAMPLE-QUIZ-PHY-9': 'PHY-IX-P1', 'SAMPLE-QUIZ-PHY-10': 'PHY-X-P1',
  'SAMPLE-QUIZ-KINEMATICS': 'PHY-IX-P1', 'SAMPLE-QUIZ-WAVES': 'PHY-X-P1',
};
const autoGradable = (q: QuestionData) => q.id !== 'cs-ix-2023-p1-q11' && q.id !== 'cs-ix-2024-p1-q9';
const allowedPractice = new Set(['PHY-IX-P1', 'PHY-IX-P2', 'PHY-X-P1', 'PHY-X-P2', 'PHY-IX-2025-P1', 'PHY-IX-2025-P2', 'PHY-IX-2024-P1', 'PHY-IX-2024-P2', 'PHY-X-2025-P1', 'PHY-X-2025-P2', 'CS-IX-P1', 'CS-IX-P2', 'CS-IX-2025-P1', 'CS-IX-2025-P2', 'CS-IX-2024-P1', 'CS-IX-2024-P2', 'CS-IX-2023-P1', 'CS-IX-2023-P2', 'CS-IX-2022-P1']);

// Source JSON can represent an absent diagram as null; assessment input uses
// omitted optional fields. Normalize at this boundary, keeping teacher input strict.
export function sourcePracticeQuestion(q: QuestionData) {
  const meta = q.sourceRegion;
  const fbList = Array.isArray(meta.option_feedback) ? meta.option_feedback : [];
  return normalizeQuestion({
    questionType: q.questionType === 'MULTIPLE_CHOICE' ? 'MCQ_SINGLE' : 'LONG_ANSWER',
    stemText: q.questionText, marks: q.marks || 1, difficulty: q.difficulty,
    cognitiveLevel: typeof meta.cognitive_level === 'string' ? meta.cognitive_level : undefined,
    explanation: typeof meta.explanation === 'string' ? meta.explanation : undefined,
    diagramUrl: typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined,
    options: Object.entries(meta.choices || {}).map(([id, text]) => {
      const fbItem = fbList.find(item => item.key.toUpperCase() === id.toUpperCase());
      return { id, text, isCorrect: id === meta.correct_answer, ...(fbItem?.reason ? { feedback: fbItem.reason } : {}) };
    }),
    rubric: meta.rubric ? JSON.stringify(meta.rubric) : undefined,
  });
}

const parsedSnapshotCache = new Map<string, FrozenQuestion[]>();
const practiceQuizCache = new Map<string, { quiz: LoadedQuiz; expiresAt: number }>();
function getParsedSnapshot(attemptId: string, rawSnapshot: Prisma.JsonValue | null, fallbackQuiz?: LoadedQuiz): FrozenQuestion[] {
  const cached = parsedSnapshotCache.get(attemptId);
  if (cached) return cached;
  const parsed = snapshotSchema.parse(rawSnapshot ?? (fallbackQuiz ? freeze(fallbackQuiz) : []));
  if (parsedSnapshotCache.size > 2048) parsedSnapshotCache.clear();
  parsedSnapshotCache.set(attemptId, parsed);
  return parsed;
}

export async function resolveQuiz(identifier: string): Promise<LoadedQuiz> {
  const cacheKey = identifier.toUpperCase();
  if (!process.env.VITEST) {
    const hit = practiceQuizCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.quiz;
  }
  const chapter=/^CURRICULUM:([^:]{1,100}):(ALL|R|U|A|DIAGRAM)$/i.exec(identifier);
  if(chapter){
    const {topic,questions}=await mappedChapterQuestions(chapter[1],chapter[2].toUpperCase());
    if(!questions.length)throw new ApiError(404,'CHAPTER_QUESTIONS_UNAVAILABLE','No reviewed questions are available for this chapter filter.');
    const hash=(await import('node:crypto')).createHash('sha256').update(questions.map(q=>q.id).join(':')).digest('hex').slice(0,24);
    const id='practice-chapter-'+hash;
    const owner=await prisma.user.upsert({where:{email:'practice-content@system.invalid'},update:{},create:{email:'practice-content@system.invalid',name:'Practice Library',role:'TEACHER',status:'SUSPENDED'}});
    const content=questions.map(sourceChoiceContent);
    return prisma.quiz.upsert({where:{id},update:{},include:quizInclude,create:{id,code:id,teacherId:owner.id,subjectId:topic.syllabusVersion.subjectId,classId:topic.syllabusVersion.subject.classId,title:topic.name+' — mapped past questions',status:'PUBLISHED',visibility:'PUBLIC',durationMin:50,totalMarks:content.reduce((s,q)=>s+q.marks,0),questions:{create:content.map((q,i)=>({orderIndex:i+1,marks:q.marks,questionData:q}))},settings:{create:{maxAttempts:100,allowRetries:true,showCorrectAnswers:true,immediateFeedback:true,tabMonitoringEnabled:false}}}});
  }
  const quiz = await prisma.quiz.findFirst({ where: { OR: [{ id: identifier }, { code: identifier.toUpperCase() }] }, include: quizInclude });
  if (quiz) return quiz;
  const key = identifier.toUpperCase();

  // Support multi-paper Unit / Chapter / Cognitive timed quizzes (Model + 2025 + 2024)
  const unitMatch = /^(PHY|CS)-(IX|X)-UNIT-(\d{1,2})-(ALL|PAST)-(ALL|R|U|A|DIAGRAM)$/.exec(key);
  if (unitMatch) {
    const [, subjPrefix, roman, unitNumStr, mode, cogFilter] = unitMatch;
    const unitNum = Number(unitNumStr);
    const paperCodes = subjPrefix === 'CS'
      ? (mode === 'PAST' ? ['CS-IX-2025-P1', 'CS-IX-2024-P1', 'CS-IX-2023-P1', 'CS-IX-2022-P1'] : ['CS-IX-P1', 'CS-IX-2025-P1', 'CS-IX-2024-P1', 'CS-IX-2023-P1', 'CS-IX-2022-P1'])
      : roman === 'IX'
        ? (mode === 'PAST' ? ['PHY-IX-2025-P1', 'PHY-IX-2024-P1'] : ['PHY-IX-P1', 'PHY-IX-2025-P1', 'PHY-IX-2024-P1'])
        : (mode === 'PAST' ? ['PHY-X-2025-P1'] : ['PHY-X-P1', 'PHY-X-2025-P1']);
    const allQuestions = paperCodes.flatMap(code => getFallbackPaper(code)?.questions || []).filter(autoGradable);
    const filtered = allQuestions.filter(q => {
      if (unitNum > 0) {
        const qTopicNum = Number(q.topics?.[0]?.topic?.topicNumber || 0);
        if (qTopicNum !== unitNum) return false;
      }
      if (cogFilter === 'DIAGRAM') return Boolean(q.diagramBased || q.sourceRegion?.diagramUrl);
      if (cogFilter !== 'ALL') {
        const qCog = (q.difficulty || q.sourceRegion?.cognitive_level || 'U').toUpperCase();
        const normalizedCog = qCog.startsWith('R') || qCog === 'K' ? 'R' : qCog.startsWith('A') ? 'A' : 'U';
        if (normalizedCog !== cogFilter) return false;
      }
      return true;
    });
    if (!filtered.length) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'No practice questions found for this unit filter.');
    const questions = filtered.map((q, i) => {
      const content = sourcePracticeQuestion(q);
      return { orderIndex: i + 1, marks: content.marks, questionData: content };
    });
    const owner = await prisma.user.upsert({ where: { email: 'practice-content@system.invalid' }, update: {}, create: { email: 'practice-content@system.invalid', name: 'Practice Library', role: 'TEACHER', status: 'SUSPENDED' } });
    const subjTitle = subjPrefix === 'CS' ? 'Computer Science' : 'Physics';
    const title = unitNum > 0 ? `${subjTitle} Class ${roman} — Unit ${unitNum} Practice (${questions.length} questions)` : `${subjTitle} Class ${roman} — Complete Bank (${questions.length} questions)`;
    return prisma.quiz.upsert({
      where: { id: `practice-${key}` },
      update: {},
      include: quizInclude,
      create: {
        id: `practice-${key}`,
        code: `PRACTICE-${key}`,
        teacherId: owner.id,
        title,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        durationMin: questions.length <= 15 ? 20 : 55,
        totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
        questions: { create: questions },
        settings: { create: { maxAttempts: 100, allowRetries: true, showCorrectAnswers: true, immediateFeedback: true, tabMonitoringEnabled: false } },
      },
    });
  }

  const subset = /^((?:PHY|CS)-(?:IX|X)(?:-2025|-2024)?-P1)-SET-([0-9-]+)$/.exec(key);
  const paperCode = subset?.[1] || practiceCodes[key] || key;
  if (!allowedPractice.has(paperCode)) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Assessment not found.');
  const paper = getFallbackPaper(paperCode);
  if (!paper) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Practice paper not found.');
  let source = paper.questions.filter(autoGradable);
  if (subset) {
    const numbers = new Set(subset[2].split('-').map(Number));
    if (numbers.size > 40 || [...numbers].some(n => !Number.isInteger(n) || n < 1 || n > 40)) throw new ApiError(400, 'INVALID_PRACTICE', 'Invalid practice selection.');
    source = source.filter(q => numbers.has(Number(q.questionNumber)));
    if (source.length !== numbers.size) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Some selected practice questions are unavailable.');
  }
  if (key.includes('KINEMATICS') || key.includes('WAVES')) source = source.slice(0, 15);
  const questions = source.map((q, i) => {
    const content = sourcePracticeQuestion(q);
    return { orderIndex: i + 1, marks: content.marks, questionData: content };
  });
  // A suspended, passwordless content owner can never authenticate.
  const owner = await prisma.user.upsert({ where: { email: 'practice-content@system.invalid' }, update: {}, create: { email: 'practice-content@system.invalid', name: 'Practice Library', role: 'TEACHER', status: 'SUSPENDED' } });
  return prisma.quiz.upsert({ where: { id: `practice-${key}` }, update: {}, include: quizInclude,
    create: { id: `practice-${key}`, code: `PRACTICE-${key}`, teacherId: owner.id, title: subset ? paper.title + ' — Selected practice (' + questions.length + ' questions)' : paper.title, status: 'PUBLISHED', visibility: 'PUBLIC', durationMin: questions.length <= 15 ? 20 : 55,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0), questions: { create: questions }, settings: { create: { maxAttempts: 100, allowRetries: true, showCorrectAnswers: true, immediateFeedback: true, tabMonitoringEnabled: false } } } });
}

export async function assertQuizAccess(quiz: LoadedQuiz, user: AuthUser | null, taking = false, db: Prisma.TransactionClient = prisma) {
  if(quiz.id.startsWith('practice-chapter-')){
    const ids=quiz.questions.map(q=>(q.questionData as Record<string,Prisma.JsonValue>).sourceQuestionId).filter((id):id is string=>typeof id==='string');
    const sources=await db.pastPaperQuestion.findMany({where:{id:{in:ids},verified:true,syllabusVersion:{isLatest:true,OR:[{sourceDocumentId:null},{sourceDocument:publicMaterialWhere}]},pastPaper:{sourceDocument:publicMaterialWhere}},select:{pastPaperId:true,pastPaper:{select:{sourceDocument:{select:{catalogMetadata:true,totalPages:true,_count:{select:{artifacts:true}}}}}}}});
    if(ids.length!==quiz.questions.length||sources.length!==ids.length||sources.some(q=>{const d=q.pastPaper.sourceDocument;return !d||d.totalPages!==d._count.artifacts||(d.catalogMetadata as Record<string,unknown>|null)?.compiledPaperId!==q.pastPaperId;}))throw new ApiError(404,'CHAPTER_SOURCE_CHANGED','The chapter source or syllabus changed. Start a fresh chapter practice.');
  }
  if(quiz.sourceDocumentId){
    const source=await db.knowledgeDocument.findFirst({where:{...publicMaterialWhere,id:quiz.sourceDocumentId},select:{catalogMetadata:true,totalPages:true,_count:{select:{artifacts:true}}}});
    if(!source||source.totalPages!==source._count.artifacts||(source.catalogMetadata as Record<string,unknown>|null)?.compiledPaperId!==quiz.id)throw new ApiError(404,'SOURCE_WITHDRAWN','This source assessment was revised or is awaiting review. Start its current version.');
    const current=await db.pastPaperQuestion.count({where:{pastPaperId:quiz.id,verified:true,syllabusVersion:{isLatest:true,OR:[{sourceDocumentId:null},{sourceDocument:publicMaterialWhere}]}}});
    if(current!==quiz.questions.length)throw new ApiError(404,'CURRICULUM_CHANGED','This paper is being verified against the current syllabus.');
  }
  const owner = user && (user.role === 'ADMIN' || quiz.teacherId === user.id);
  if (owner && !taking) return;
  if (quiz.status !== 'PUBLISHED') throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Assessment is not published.');
  if (quiz.visibility === 'PRIVATE' && !owner) {
    if (!user || !await db.quizAssignment.findFirst({ where: { quizId: quiz.id, classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } })) throw new ApiError(403, 'FORBIDDEN', 'This assessment is restricted to its assigned classroom.');
  }
  const now = new Date();
  if (taking && ((quiz.scheduleStart && quiz.scheduleStart > now) || (quiz.scheduleEnd && quiz.scheduleEnd <= now))) throw new ApiError(403, 'OUTSIDE_SCHEDULE', 'This assessment is outside its scheduled availability.');
}

async function freezeReviewedQuiz(quiz:LoadedQuiz,db:Prisma.TransactionClient) {
  const legacyAnnual=!quiz.sourceDocumentId && (/^practice-PHY-IX-2025-P1(?:$|-SET-[0-9-]+$)/.test(quiz.id)||quiz.code==='PHY-IX-2025-P1');
  if(!legacyAnnual)return freeze(quiz);
  const decisions=await publishedAnswerDecisions(db);
  if(!decisions.some(item=>item.status==='APPROVE_CORRECTION'))return freeze(quiz);
  return freeze({...quiz,questions:quiz.questions.map(q=>{
    const content=normalizeQuestion(q.questionData), options=Object.fromEntries(content.options.map(option=>[option.id,option.text]));
    const item=legacyAnswerCases.find(candidate=>candidate.stem.replace(/\s+/g,' ').trim()===content.stemText.replace(/\s+/g,' ').trim());
    const approved=item?applyAnswerDecision({},item.number,content.stemText,options,decisions):{};
    return approved.correct_answer?{...q,questionData:{...content,explanation:approved.explanation,options:content.options.map(option=>({...option,isCorrect:option.id===approved.correct_answer,feedback:''}))}}:q;
  })});
}
function freeze(quiz: LoadedQuiz): FrozenQuestion[] {
  const shuffle = <T,>(items: T[]) => { for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; } return items; };
  const questions = quiz.questions.map(q => { const content = normalizeQuestion(q.questionData); if (quiz.settings?.randomizeOptions) content.options = shuffle([...content.options]); return { id: q.id, orderIndex: q.orderIndex, marks: q.marks, content }; });
  if (quiz.settings?.randomizeQuestions) shuffle(questions);
  return questions.map((q, i) => ({ ...q, orderIndex: i + 1 }));
}

export async function startAttempt(identifier: string, user: AuthUser, preferences: { practiceDurationMin?: number; practiceUntimed?: boolean; forceNewAttempt?: boolean } = {}) {
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
    if (active) {
      if (preferences.forceNewAttempt) {
        await tx.quizAttempt.update({ where: { id: active.id }, data: { status: 'GRADED', submittedAt: new Date() } });
      } else {
        return attemptResponse(active, current);
      }
    }
    await assertQuizAccess(current, user, true, tx);
    if (current.status !== 'PUBLISHED') throw new ApiError(403, 'NOT_PUBLISHED', 'Assessment is not published.');
    const count = await tx.quizAttempt.count({ where: { quizId: current.id, studentId: user.id } });
    if (count >= (current.settings?.allowRetries || current.id.startsWith('practice-') ? current.settings?.maxAttempts ?? 1 : 1)) throw new ApiError(403, 'ATTEMPT_LIMIT', 'Maximum number of attempts reached.');
    const practice = current.id.startsWith('practice-');
    const now = new Date(), duration = practice && preferences.practiceUntimed ? 1440 : practice && preferences.practiceDurationMin ? preferences.practiceDurationMin : current.durationMin ?? 45;
    const assigned = current.visibility === 'PRIVATE' && current.teacherId !== user.id && user.role !== 'ADMIN' ? await tx.quizAssignment.findMany({ where: { quizId: current.id, classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } }) : [];
    const assignmentDeadline = assigned.length ? Math.max(...assigned.map(a => a.deadline?.getTime() ?? Infinity)) : Infinity;
    if (assignmentDeadline <= now.getTime()) throw new ApiError(403, 'ASSIGNMENT_CLOSED', 'The assignment deadline has passed.');
    const deadline = new Date(Math.min(now.getTime() + duration * 60000, current.scheduleEnd?.getTime() ?? Infinity, assignmentDeadline));
    const attempt = await tx.quizAttempt.create({ data: { quizId: quiz.id, studentId: user.id, attemptNumber: count + 1, startedAt: now, deadline, questionSnapshot: await freezeReviewedQuiz(current,tx) }, include: { answers: true } });
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
  const questions = getParsedSnapshot(attempt.id, attempt.questionSnapshot, quiz);
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
    const questions = getParsedSnapshot(attempt.id, attempt.questionSnapshot);
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
