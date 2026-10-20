import { z } from 'zod';
export const optionSchema = z.object({ id: z.string().min(1).max(160).optional(), text: z.string().min(1).max(4000), isCorrect: z.boolean() });
export const questionSchema = z.object({
  questionType: z.enum(['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'NUMERICAL', 'SHORT_ANSWER', 'LONG_ANSWER', 'CRQ', 'MATCHING']).default('MCQ_SINGLE'),
  stemText: z.string().trim().min(1).max(20000), options: z.array(optionSchema).max(20).default([]),
  marks: z.coerce.number().positive().max(100).default(1), isRequired: z.boolean().default(true),
  difficulty: z.string().max(80).default('Medium'), cognitiveLevel: z.string().max(80).default('Understanding'),
  sloCode: z.string().max(160).optional(), sloId: z.string().max(160).optional(), explanation: z.string().max(20000).optional(), correctAnswerText: z.string().max(20000).optional(),
  topicName: z.string().trim().max(160).optional(),
  numericalTolerance: z.coerce.number().nonnegative().max(1000000).default(0.05), rubric: z.string().max(20000).nullable().optional(),
  unit: z.string().max(100).optional(), acceptedAnswers: z.array(z.string().max(4000)).max(50).optional(),
  pastPaperRef: z.string().max(500).optional(), customDifficultyDesc: z.string().max(2000).optional(),
  reviewId: z.string().max(160).optional(), provenance: z.enum(['TEACHER_CREATED', 'QUESTION_BANK', 'AI_GENERATED', 'IMPORTED', 'PAST_PAPER']).optional(),
  drawingSvg: z.string().max(200000).optional(), diagramUrl: z.string().max(250000).refine(v => v.startsWith('/') && !v.startsWith('//') || /^https?:\/\//i.test(v) || v.startsWith('data:image/'), 'Use a valid image URL.').optional(), matchingPairs: z.array(z.object({ left: z.string(), right: z.string() })).max(30).default([]),
}).superRefine((q, ctx) => {
  const choice = ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(q.questionType), correct = q.options.filter(o => o.isCorrect).length;
  if (choice && (q.options.length < 2 || (q.questionType === 'MCQ_MULTIPLE' ? correct < 1 : correct !== 1))) ctx.addIssue({ code: 'custom', message: 'Choice questions require valid options and answer keys.' });
  if (new Set(q.options.map(o => o.text.trim().toLowerCase())).size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'Options must be distinct.' });
  const ids = q.options.map((o, i) => o.id || String.fromCharCode(65 + i));
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Option IDs must be distinct.' });
  if (q.questionType === 'NUMERICAL' && (!q.correctAnswerText?.trim() || !Number.isFinite(Number(q.correctAnswerText)))) ctx.addIssue({ code: 'custom', message: 'Numerical questions require a numeric answer.' });
  if (q.questionType === 'MATCHING' && (!q.matchingPairs.length || q.matchingPairs.some(p => !p.left.trim() || !p.right.trim()) || new Set(q.matchingPairs.map(p => p.left)).size !== q.matchingPairs.length)) ctx.addIssue({ code: 'custom', message: 'Matching questions require distinct, non-empty left items and non-empty matches.' });
});
export type QuestionContent = z.infer<typeof questionSchema>;
export const answerPayloadSchema = z.object({
  selectedOptionId: z.string().max(160).optional(), selectedOptionIds: z.array(z.string().max(160)).max(20).optional(),
  textAnswer: z.string().max(30000).optional(), numericAnswer: z.string().max(100).optional(),
  matchedPairs: z.array(z.object({ left: z.string().max(1000), right: z.string().max(1000) })).max(30).optional(),
}).strict().superRefine((a, ctx) => {
  if (a.matchedPairs && new Set(a.matchedPairs.map(p => p.left)).size !== a.matchedPairs.length) ctx.addIssue({ code: 'custom', message: 'Choose only one match for each left item.' });
});
export const saveAnswerSchema = z.object({ attemptId: z.string().min(1), questionId: z.string().min(1), version: z.number().int().nonnegative(), answerPayload: answerPayloadSchema });
export const submitSchema = z.object({ attemptId: z.string().min(1) });
export const quizSettingsSchema = z.preprocess(value => { if (value && typeof value === 'object' && 'immediateFeedback' in value && value.immediateFeedback === false && !('resultVisibility' in value)) return { ...value, resultVisibility: 'MANUAL_RELEASE' }; return value; }, z.object({
  maxAttempts: z.coerce.number().int().min(1).max(100).default(1), allowRetries: z.boolean().default(false),
  randomizeQuestions: z.boolean().default(false), randomizeOptions: z.boolean().default(false), immediateFeedback: z.boolean().default(false), showCorrectAnswers: z.boolean().default(false),
  resultVisibility: z.enum(['IMMEDIATE', 'MANUAL_RELEASE', 'SCHEDULED']).default('IMMEDIATE'), resultReleaseDate: z.string().datetime().nullable().optional(),
  manualGradingRequired: z.boolean().default(false), aiGradingMode: z.literal('OFF').default('OFF'),
  tabMonitoringEnabled: z.boolean().default(false), tabWarningThreshold: z.coerce.number().int().min(1).max(100).default(3),
  negativeMarking: z.boolean().default(false), negativeMarkValue: z.coerce.number().min(0).max(100).default(0), lateSubmissionAllowed: z.literal(false).default(false),
})).superRefine((settings, ctx) => { if (settings.resultVisibility === 'SCHEDULED' && !settings.resultReleaseDate) ctx.addIssue({ code: 'custom', message: 'Choose a result release date.' }); });
export const quizSchema = z.object({
  id: z.string().nullish(), code: z.preprocess(v => v === '' || v === null ? undefined : v, z.string().trim().regex(/^[A-Za-z0-9-]{4,80}$/).optional()), title: z.string().trim().min(1).max(300),
  scheduleStart: z.string().datetime().nullable().optional(), scheduleEnd: z.string().datetime().nullable().optional(), description: z.string().max(10000).optional(), boardId: z.string().optional(), classLevel: z.coerce.number().int().min(1).max(12).default(9), subject: z.string().max(160).default('Physics'),
  durationMin: z.coerce.number().int().min(1).max(600).default(45), visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('PRIVATE'), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  settings: quizSettingsSchema.default(() => quizSettingsSchema.parse({})), questions: z.array(questionSchema).max(300),
}).refine(q => q.status !== 'PUBLISHED' || q.questions.length > 0, 'Published quizzes require questions.');
