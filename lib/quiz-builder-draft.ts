export interface QuizDraftIdentity {
  accountId: string;
  mode: 'new' | 'edit' | 'duplicate';
  sourceQuizId: string | null;
}

export interface QuizDraft<Settings = Record<string, unknown>, Question = unknown> {
  quizId: string | null;
  quizCode: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  description: string;
  boardId: string;
  classLevel: number;
  subject: string;
  durationMin: number;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  scheduleStart: string;
  scheduleEnd: string;
  settings: Settings;
  questions: Question[];
}

export function createQuizDraftIdentity(accountId: string, sourceQuizId: string | null, duplicate: boolean): QuizDraftIdentity {
  return { accountId, mode: sourceQuizId ? (duplicate ? 'duplicate' : 'edit') : 'new', sourceQuizId: sourceQuizId || null };
}

export function quizDraftKey(identity: QuizDraftIdentity): string {
  return `builder-draft:v2:${encodeURIComponent(identity.accountId)}:${identity.mode}:${encodeURIComponent(identity.sourceQuizId || '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompatibleDraft(value: unknown, identity: QuizDraftIdentity): value is QuizDraft {
  if (!isRecord(value)) return false;
  if (value.quizId !== null && (typeof value.quizId !== 'string' || !value.quizId.trim())) return false;
  if (value.quizCode !== null && typeof value.quizCode !== 'string') return false;
  if (value.status !== 'DRAFT' && value.status !== 'PUBLISHED') return false;
  if (value.quizId === null && (value.status !== 'DRAFT' || value.quizCode !== null)) return false;
  if (identity.mode === 'edit' && value.quizId !== identity.sourceQuizId) return false;
  // A copy may later have its own persisted ID, but never its source's ID.
  if (identity.mode === 'duplicate' && value.quizId === identity.sourceQuizId) return false;
  if (!['title', 'description', 'boardId', 'subject', 'scheduleStart', 'scheduleEnd'].every(field => typeof value[field] === 'string')) return false;
  if (typeof value.classLevel !== 'number' || !Number.isFinite(value.classLevel)) return false;
  if (typeof value.durationMin !== 'number' || !Number.isFinite(value.durationMin)) return false;
  if (!['PUBLIC', 'UNLISTED', 'PRIVATE'].includes(value.visibility as string)) return false;
  return isRecord(value.settings) && Array.isArray(value.questions);
}

export function serializeQuizDraft<Settings, Question>(identity: QuizDraftIdentity, draft: QuizDraft<Settings, Question>): string {
  if (!isCompatibleDraft(draft, identity)) throw new Error('Incompatible quiz draft.');
  return JSON.stringify({ version: 2, identity, quiz: draft });
}

export function parseQuizDraft<Settings = Record<string, unknown>, Question = unknown>(
  raw: string | null,
  identity: QuizDraftIdentity,
  serverStatus?: QuizDraft['status'],
): QuizDraft<Settings, Question> | null {
  try {
    const stored: unknown = JSON.parse(raw || 'null');
    // Legacy drafts lack mode and publication state; guessing can overwrite or unpublish a quiz.
    if (!isRecord(stored) || stored.version !== 2 || !isRecord(stored.identity)) return null;
    if (stored.identity.accountId !== identity.accountId || stored.identity.mode !== identity.mode || stored.identity.sourceQuizId !== identity.sourceQuizId) return null;
    if (!isCompatibleDraft(stored.quiz, identity)) return null;
    const quiz = stored.quiz;
    return {
      ...quiz,
      status: identity.mode === 'edit' && serverStatus === 'PUBLISHED' ? 'PUBLISHED' : quiz.status,
    } as QuizDraft<Settings, Question>;
  } catch {
    return null;
  }
}
