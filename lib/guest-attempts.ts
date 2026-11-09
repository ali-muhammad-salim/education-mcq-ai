import {
  GUEST_RETENTION_MS,
  listCachedExams,
  markGuestAttemptSynced,
  pruneExpiredLocalData,
  removeExam,
  type CachedExam,
  type StudentQuestion,
} from '@/lib/exam-cache';
import { answerPayloadSchema } from '@/lib/validations/assessment';
import { paperChoices } from '@/lib/paperPresentation';

export interface GuestQuestionSource {
  id?: string;
  questionNumber?: string | number;
  orderIndex?: number;
  questionText?: string;
  stem?: string;
  stemText?: string;
  questionType?: string;
  marks?: number;
  options?: unknown;
  choices?: unknown;
  sourceRegion?: unknown;
  diagramUrl?: string;
  diagramBased?: boolean;
  encryptedReveal?: string;
  matchingLeft?: string[];
  matchingRight?: string[];
}

function metadata(value: unknown): Record<string, any> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function sourceOptions(question: GuestQuestionSource): Record<string, string> {
  const meta = metadata(question.sourceRegion);
  const fromMeta = paperChoices(meta.choices || meta.options || {});
  if (Object.keys(fromMeta).length > 0) return fromMeta;
  return paperChoices(question.options || question.choices || {});
}

export function guestQuestionsFrom(paperCode: string, source: GuestQuestionSource[]): StudentQuestion[] {
  return source.map((question, index) => {
    const meta = metadata(question.sourceRegion);
    const choices = sourceOptions(question);
    const sortable = Object.keys(choices).sort();
    const stem = String(question.questionText || question.stemText || question.stem || '').trim();
    const declaredType = String(question.questionType || '');
    return {
      id: String(question.id || `${paperCode}-guest-${index + 1}`),
      orderIndex:
        Number(question.questionNumber) ||
        Number(question.orderIndex) ||
        index + 1,
      marks: Number(question.marks) || 1,
      questionType: declaredType === 'MULTIPLE_CHOICE' ? 'MCQ_SINGLE' : declaredType || 'MCQ_SINGLE',
      stemText: stem,
      options: sortable.map(key => ({ id: key, text: String(choices[key]) })),
      diagramUrl: typeof question.diagramUrl === 'string' ? question.diagramUrl : typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined,
      matchingLeft: Array.isArray(question.matchingLeft) ? question.matchingLeft : undefined,
      matchingRight: Array.isArray(question.matchingRight) ? question.matchingRight : undefined,
      encryptedReveal: typeof question.encryptedReveal === 'string' ? question.encryptedReveal : undefined,
    };
  });
}

export function guestExamCacheKey(paperCode: string) {
  return 'exam:guest:' + paperCode;
}

export function createGuestExam({
  paperCode,
  paperTitle,
  questions,
  practiceDurationMin,
  practiceUntimed,
  previous,
}: {
  paperCode: string;
  paperTitle: string;
  questions: StudentQuestion[];
  practiceDurationMin?: number;
  practiceUntimed?: boolean;
  previous?: CachedExam;
}): CachedExam {
  const now = Date.now();
  const durationMinutes = practiceUntimed ? 1440 : practiceDurationMin || 45;
  const resumable =
    previous &&
    !previous.submitted &&
    previous.expiresAt &&
    Date.parse(previous.expiresAt) > now &&
    Date.parse(previous.deadline) > now &&
    previous.questions.length === questions.length;
  if (resumable && previous) {
    return {
      ...previous,
      expiresAt: new Date(now + GUEST_RETENTION_MS).toISOString(),
      practiceDurationMin,
      practiceUntimed,
    };
  }
  return {
    id: `guest-${now}-${Math.random().toString(36).slice(2, 8)}`,
    quizId: paperCode,
    quizTitle: paperTitle || paperCode,
    deadline: new Date(now + durationMinutes * 60000).toISOString(),
    studentId: 'guest',
    questions,
    answers: {},
    settings: { tabMonitoringEnabled: false },
    currentIndex: 0,
    questionTimes: {},
    bookmarkedQuestions: [],
    startedAtMs: now,
    guest: true,
    paperCode,
    practiceDurationMin,
    practiceUntimed,
    submitted: false,
    expiresAt: new Date(now + GUEST_RETENTION_MS).toISOString(),
  };
}

interface ServerQuestion {
  id: string;
  orderIndex: number;
  questionType?: string;
  stemText?: string;
  options?: { id?: string; text?: string }[];
  matchingLeft?: string[];
  matchingRight?: string[];
}

interface ServerAttempt {
  id: string;
  quizId: string;
  status: string;
  questions: ServerQuestion[];
  answers: Record<string, { version: number }>;
}

async function request(path: string, body?: unknown, method = 'POST'): Promise<any> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : data?.error?.message || 'Request failed.';
    throw new Error(message);
  }
  return data;
}

function normalize(text: string | undefined) {
  return String(text || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchServerQuestion(guest: StudentQuestion, questions: ServerQuestion[]) {
  const stem = normalize(guest.stemText);
  if (stem) {
    const byStem = questions.find(question => question.stemText && normalize(question.stemText) === stem);
    if (byStem) return byStem;
  }
  return questions.find(question => question.orderIndex === guest.orderIndex);
}

function mapPayload(guest: StudentQuestion, server: ServerQuestion, payload: Record<string, any>) {
  const next: Record<string, any> = {};
  const optionIdAt = (id: string | undefined) => {
    if (!id) return undefined;
    const index = guest.options.findIndex(option => option.id === id);
    if (index >= 0 && server.options?.[index]?.id) return server.options[index].id;
    const byText = guest.options.find(option => option.id === id)?.text;
    if (byText != null) {
      return server.options?.find(option => normalize(option.text) === normalize(byText))?.id;
    }
    return id;
  };
  if (payload.selectedOptionId) next.selectedOptionId = optionIdAt(payload.selectedOptionId);
  if (Array.isArray(payload.selectedOptionIds)) {
    next.selectedOptionIds = payload.selectedOptionIds
      .map((id: string) => optionIdAt(id))
      .filter((id: string | undefined): id is string => Boolean(id));
  }
  if (typeof payload.numericAnswer === 'string') next.numericAnswer = payload.numericAnswer;
  if (typeof payload.textAnswer === 'string') next.textAnswer = payload.textAnswer;
  if (Array.isArray(payload.matchedPairs)) next.matchedPairs = payload.matchedPairs;
  const parsed = answerPayloadSchema.safeParse(next);
  return parsed.success ? parsed.data : null;
}

async function replayGuestExam(exam: CachedExam): Promise<boolean> {
  const identifier = exam.paperCode || exam.quizId;
  if (!identifier || !exam.questions?.length) return false;
  const started = await request(`/api/quizzes/${encodeURIComponent(identifier)}/attempt`, {
    practiceDurationMin: exam.practiceDurationMin,
    practiceUntimed: exam.practiceUntimed,
  });
  const attempt = started?.attempt as ServerAttempt | undefined;
  if (!attempt?.id) return false;
  if (attempt.status !== 'IN_PROGRESS') {
    await markGuestAttemptSynced(identifier, exam.id, attempt.id);
    return true;
  }

  const versions = new Map<string, number>();
  for (const [id, answer] of Object.entries(attempt.answers || {})) {
    versions.set(id, answer?.version ?? 0);
  }
  for (const guest of exam.questions) {
    const stored = exam.answers[guest.id];
    if (!stored?.payload) continue;
    const server = matchServerQuestion(guest, attempt.questions);
    if (!server) continue;
    const payload = mapPayload(guest, server, stored.payload as Record<string, any>);
    if (!payload) continue;
    try {
      const saved = await request(
        `/api/quizzes/${encodeURIComponent(attempt.quizId)}/attempt/answer`,
        {
          attemptId: attempt.id,
          questionId: server.id,
          version: versions.get(server.id) ?? 0,
          answerPayload: payload,
        }
      );
      versions.set(server.id, saved?.version ?? versions.get(server.id) ?? 0);
    } catch {
      // A conflicting or closed answer keeps the local copy intact for the next attempt.
    }
  }

  if (exam.submitted) {
    await request(`/api/quizzes/${encodeURIComponent(attempt.quizId)}/attempt/submit`, {
      attemptId: attempt.id,
    });
    await markGuestAttemptSynced(identifier, exam.id, attempt.id);
  }
  return exam.submitted === true;
}

export interface GuestSyncResult {
  synced: number;
  pending: number;
}

let inflight: Promise<GuestSyncResult> | null = null;

export function syncGuestAttempts(): Promise<GuestSyncResult> {
  if (typeof window === 'undefined') return Promise.resolve({ synced: 0, pending: 0 });
  if (inflight) return inflight;
  inflight = (async () => {
    await pruneExpiredLocalData();
    let signedIn = false;
    try {
      const identity = await request('/api/auth/me', undefined, 'GET');
      signedIn = Boolean(identity?.user);
    } catch {
      return { synced: 0, pending: 0 };
    }
    if (!signedIn) return { synced: 0, pending: 0 };

    const cached = await listCachedExams('exam:guest:');
    let synced = 0;
    let pending = 0;
    for (const item of cached) {
      if (!item.exam.guest && !item.key.startsWith('exam:guest:')) continue;
      try {
        const finished = await replayGuestExam(item.exam);
        if (finished) {
          await removeExam(item.key).catch(() => undefined);
          synced += 1;
        } else {
          pending += 1;
        }
      } catch {
        pending += 1;
      }
    }
    return { synced, pending };
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
