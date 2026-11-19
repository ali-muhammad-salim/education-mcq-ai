import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock only Prisma: the real route, authentication, people scope, snapshot
// parsing and HTTP error handling run offline without a database connection.
const db = vi.hoisted(() => ({
  userSession: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  quizAttempt: { findFirst: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
import { GET } from '@/app/api/people/[id]/attempts/[attemptId]/route';

const submittedAt = new Date('2026-11-01T10:00:00Z');
const snapshot = [{ id: 'written', orderIndex: 1, marks: 3,
  content: { questionType: 'LONG_ANSWER', stemText: 'Explain your reasoning', marks: 3 } }];
const savedAnswer = { id: 'answer', attemptId: 'attempt', questionId: 'written', answerPayload: { textAnswer: 'My explanation' },
  version: 1, score: null, isAutoGraded: false, teacherComment: null, createdAt: submittedAt, updatedAt: submittedAt };
function attempt(status: string) {
  return { id: 'attempt', quizId: 'quiz', studentId: 'student', attemptNumber: 1, status,
    startedAt: new Date(submittedAt.getTime() - 60000), deadline: submittedAt, submittedAt,
    totalScore: 0, autoScore: 0, manualScore: null, tabSwitchCount: 0, ipAddress: null, userAgent: null,
    questionSnapshot: snapshot, answers: [savedAnswer], quiz: { title: 'Written assessment' } };
}
function request() {
  return new NextRequest('http://localhost/api/people/student/attempts/attempt', { headers: { authorization: 'Bearer offline-session' } });
}
const context = () => ({ params: Promise.resolve({ id: 'student', attemptId: 'attempt' }) });
function actor(role: 'TEACHER' | 'ADMIN' | 'STUDENT') {
  db.userSession.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60000),
    user: { id: 'educator', name: 'Educator', email: 'educator@example.test', role, status: 'ACTIVE' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  actor('TEACHER');
  db.user.findFirst.mockResolvedValue({ id: 'student', role: 'STUDENT' });
  db.quizAttempt.findFirst.mockResolvedValue(attempt('GRADING_PENDING'));
});

describe('people attempt review states (offline DB boundary)', () => {
  it.each(['TEACHER', 'ADMIN'] as const)('allows %s to review answers awaiting manual grading', async role => {
    actor(role);
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, attempt: { id: 'attempt', status: 'GRADING_PENDING', score: 0,
      submittedAt: submittedAt.toISOString(), questions: [{ id: 'written', answer: { answerPayload: { textAnswer: 'My explanation' }, score: null, isAutoGraded: false } }] } });
    expect(db.quizAttempt.findFirst).toHaveBeenCalledWith({
      where: { studentId: 'student', ...(role === 'TEACHER' ? { quiz: { teacherId: 'educator' } } : {}), id: 'attempt' },
      include: { answers: true, quiz: { select: { title: true } } },
    });
  });

  it('continues to allow fully graded answer review', async () => {
    db.quizAttempt.findFirst.mockResolvedValue(attempt('GRADED'));
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect((await response.json()).attempt.status).toBe('GRADED');
  });

  it.each(['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'])('does not expose unprocessed %s answers', async status => {
    db.quizAttempt.findFirst.mockResolvedValue(attempt(status));
    const response = await GET(request(), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'PROCESSING' } });
  });

  it('keeps attempts outside the educator query scope unavailable', async () => {
    db.quizAttempt.findFirst.mockResolvedValue(null);
    const response = await GET(request(), context());
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'ATTEMPT_NOT_FOUND' } });
  });

  it('does not allow a student to use educator answer review', async () => {
    actor('STUDENT');
    const response = await GET(request(), context());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(db.quizAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('reports a missing frozen snapshot for a manual-pending attempt', async () => {
    db.quizAttempt.findFirst.mockResolvedValue({ ...attempt('GRADING_PENDING'), questionSnapshot: null });
    const response = await GET(request(), context());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'SNAPSHOT_UNAVAILABLE' } });
  });
});
