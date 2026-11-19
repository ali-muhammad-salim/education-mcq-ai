import { describe, expect, it } from 'vitest';
import {
  createQuizDraftIdentity,
  parseQuizDraft,
  quizDraftKey,
  serializeQuizDraft,
  type QuizDraft,
} from '@/lib/quiz-builder-draft';

const edit = createQuizDraftIdentity('teacher-1', 'original', false);
const duplicate = createQuizDraftIdentity('teacher-1', 'original', true);
const fresh = createQuizDraftIdentity('teacher-1', null, false);

function draft(overrides: Partial<QuizDraft> = {}): QuizDraft {
  return {
    quizId: null,
    quizCode: null,
    status: 'DRAFT',
    title: 'Unsaved changes',
    description: 'Assessment description',
    boardId: 'AKU-EB',
    classLevel: 9,
    subject: 'Physics',
    durationMin: 45,
    visibility: 'UNLISTED',
    scheduleStart: '',
    scheduleEnd: '',
    settings: { maxAttempts: 1, aiGradingMode: 'OFF' },
    questions: [{ id: 'q-1', stemText: 'What is force?', marks: 2 }],
    ...overrides,
  };
}

// Literal storage fixtures also exercise validation independently of the writer.
function stored(identity: unknown, quiz: unknown, version = 2) {
  return JSON.stringify({ version, identity, quiz });
}

describe('quiz builder draft identity', () => {
  it('keeps edit, duplicate and new drafts isolated in browser storage', () => {
    const storage = new Map<string, string>();
    storage.set(quizDraftKey(edit), serializeQuizDraft(edit, draft({ quizId: 'original', title: 'Original edits' })));
    storage.set(quizDraftKey(duplicate), serializeQuizDraft(duplicate, draft({ title: 'Copy edits' })));
    storage.set(quizDraftKey(fresh), serializeQuizDraft(fresh, draft({ title: 'New quiz' })));

    expect(storage.size).toBe(3);
    expect(parseQuizDraft(storage.get(quizDraftKey(edit))!, edit)?.title).toBe('Original edits');
    expect(parseQuizDraft(storage.get(quizDraftKey(duplicate))!, duplicate)?.quizId).toBeNull();
    expect(parseQuizDraft(storage.get(quizDraftKey(fresh))!, fresh)?.title).toBe('New quiz');
  });

  it('does not collide across accounts or delimiter-containing quiz IDs', () => {
    const identities = [
      fresh,
      createQuizDraftIdentity('teacher-2', null, false),
      createQuizDraftIdentity('teacher-1', 'new', false),
      createQuizDraftIdentity('a:b', 'c', false),
      createQuizDraftIdentity('a', 'b:c', false),
      createQuizDraftIdentity('teacher-1', 'other', true),
      duplicate,
    ];
    expect(new Set(identities.map(quizDraftKey)).size).toBe(7);
    expect(createQuizDraftIdentity('teacher-1', null, true)).toEqual(fresh);
  });

  it.each([
    ['another account', createQuizDraftIdentity('teacher-2', 'original', true)],
    ['edit mode', edit],
    ['new mode', fresh],
    ['another source', createQuizDraftIdentity('teacher-1', 'other', true)],
  ])('rejects a duplicate draft from %s even if stored under the wrong key', (_label, identity) => {
    const raw = serializeQuizDraft(identity, draft({ quizId: identity.mode === 'edit' ? 'original' : null }));
    expect(parseQuizDraft(raw, duplicate)).toBeNull();
  });

  it('never restores the original persisted ID into a duplicate', () => {
    expect(parseQuizDraft(stored(duplicate, draft({ quizId: 'original', status: 'PUBLISHED' })), duplicate)).toBeNull();
    expect(() => serializeQuizDraft(duplicate, draft({ quizId: 'original' }))).toThrow();
  });

  it('retains the new copy ID and publication status for subsequent edits after reload', () => {
    const beforeSave = serializeQuizDraft(duplicate, draft({ title: 'Copy of Original' }));
    expect(parseQuizDraft(beforeSave, duplicate)?.quizId).toBeNull();

    const afterSave = serializeQuizDraft(duplicate, draft({
      quizId: 'copy-42', quizCode: 'COPY42', status: 'PUBLISHED', title: 'Copy edits after publishing',
    }));
    const restored = parseQuizDraft(afterSave, duplicate);
    expect(restored).toMatchObject({ quizId: 'copy-42', quizCode: 'COPY42', status: 'PUBLISHED', title: 'Copy edits after publishing' });
    expect(restored?.questions).toEqual([{ id: 'q-1', stemText: 'What is force?', marks: 2 }]);
  });

  it('rejects missing or unrelated persisted IDs for edit mode', () => {
    for (const quizId of [null, '', 'other-quiz']) {
      expect(parseQuizDraft(stored(edit, draft({ quizId })), edit)).toBeNull();
    }
    expect(parseQuizDraft(stored(edit, draft({ quizId: 'original' })), edit)?.quizId).toBe('original');
  });
});

describe('quiz builder draft publication and compatibility', () => {
  it.each(['DRAFT', 'PUBLISHED'] as const)('round-trips %s on the new route after the quiz has been created', status => {
    const restored = parseQuizDraft(serializeQuizDraft(fresh, draft({ quizId: 'created-quiz', quizCode: 'NEW123', status })), fresh);
    expect(restored).toMatchObject({ quizId: 'created-quiz', quizCode: 'NEW123', status });
  });

  it('rejects legacy drafts without mode/account metadata or publication status', () => {
    const legacy = { ...draft({ quizId: 'original' }), status: undefined };
    for (const identity of [edit, duplicate, fresh]) {
      expect(parseQuizDraft(JSON.stringify(legacy), identity)).toBeNull();
      expect(parseQuizDraft(stored(identity, legacy), identity)).toBeNull();
    }
  });

  it('does not downgrade an edit that the server already reports as published', () => {
    const raw = serializeQuizDraft(edit, draft({ quizId: 'original', status: 'DRAFT' }));
    expect(parseQuizDraft(raw, edit, 'PUBLISHED')?.status).toBe('PUBLISHED');
  });

  it('does not inherit publication from the original when restoring an unsaved copy', () => {
    const raw = serializeQuizDraft(duplicate, draft());
    expect(parseQuizDraft(raw, duplicate, 'PUBLISHED')?.status).toBe('DRAFT');
  });

  it('rejects an impossible published draft without a persisted quiz', () => {
    expect(parseQuizDraft(stored(fresh, draft({ status: 'PUBLISHED' })), fresh)).toBeNull();
  });

  it.each([
    ['missing status', { status: undefined }],
    ['unknown status', { status: 'ARCHIVED' }],
    ['invalid ID', { quizId: 123 }],
    ['missing questions', { questions: undefined }],
    ['missing settings', { settings: null }],
    ['missing title', { title: undefined }],
  ])('rejects damaged draft content: %s', (_label, overrides) => {
    expect(parseQuizDraft(stored(fresh, { ...draft(), ...overrides }), fresh)).toBeNull();
  });

  it('tolerates empty, invalid JSON and unsupported draft versions', () => {
    for (const raw of [null, '', '{broken', 'null', '[]', stored(fresh, draft(), 99)]) {
      expect(parseQuizDraft(raw, fresh)).toBeNull();
    }
  });
});
