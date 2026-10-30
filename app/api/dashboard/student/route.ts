import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { snapshotSchema } from '@/services/assessment/scoring';
import { resultsReleased } from '@/services/assessment/service';
import { selfInsightSample } from '@/services/people/data';
import { summarizeTopics } from '@/services/people/insights';
import { getClassSubjects } from '@/lib/boardHierarchy';

const ROMAN: Record<number, 'IX' | 'X' | 'XI' | 'XII'> = { 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };

// Streak counts consecutive days, ending today or yesterday, on which the student
// submitted something. A gap of one day is forgiving; two breaks the run.
function streakFrom(dates: (Date | null)[]): number {
  const days = new Set<string>();
  for (const date of dates) {
    if (!date) continue;
    days.add(date.toISOString().slice(0, 10));
  }
  if (!days.size) return 0;
  const cursor = new Date();
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Math.min(10000, Math.floor(Number(req.nextUrl.searchParams.get('page')) || 1)));
    const user = await requireUser(req, ['STUDENT']);
    const [attempts, quizzes, totalAttempts, inProgressCount, totalQuizzesAvailable, classrooms, submissionDates, insightAttempts] = await Promise.all([
      prisma.quizAttempt.findMany({ where: { studentId: user.id }, take: 100, skip: (page - 1) * 100, orderBy: { startedAt: 'desc' }, include: { quiz: { include: { settings: true } } } }),
      prisma.quiz.findMany({ where: { status: 'PUBLISHED', OR: [{ visibility: 'PUBLIC' }, { assignments: { some: { classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } } }] }, take: 100, include: { _count: { select: { questions: true } }, teacher: { select: { name: true } } } })
,
      prisma.quizAttempt.count({ where: { studentId: user.id, status: { not: 'IN_PROGRESS' } } }),
      prisma.quizAttempt.count({ where: { studentId: user.id, status: 'IN_PROGRESS' } }),
      prisma.quiz.count({ where: { status: 'PUBLISHED', OR: [{ visibility: 'PUBLIC' }, { assignments: { some: { classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } } }] } }),
      prisma.classroomMembership.findMany({ where: { studentId: user.id, status: 'ENROLLED' }, include: { classroom: { select: { id: true, name: true, classLevel: true } } } }),
      prisma.quizAttempt.findMany({ where: { studentId: user.id, status: { not: 'IN_PROGRESS' } }, select: { submittedAt: true }, orderBy: { submittedAt: 'desc' }, take: 120 }),
      selfInsightSample(user.id)
    ]);
    const completed = attempts.filter(a => a.status !== 'IN_PROGRESS'), active = attempts.filter(a => a.status === 'IN_PROGRESS');
    const completedAttempts = completed.map(a => { const released = resultsReleased(a.quiz.settings, true); const frozen = snapshotSchema.safeParse(a.questionSnapshot), maximum = frozen.success ? frozen.data.reduce((sum, q) => sum + q.marks, 0) : a.quiz.totalMarks, score = a.totalScore ?? 0;
      return { attemptId: a.id, quizId: a.quizId, title: a.quiz.title, released, status: a.status, score: released && a.status === 'GRADED' ? score : null, maxMarks: maximum, percentage: !released || a.status !== 'GRADED' ? null : maximum ? Math.round(score / maximum * 100) : 0, submittedAt: a.submittedAt, tabSwitchCount: a.tabSwitchCount }; });
    const { topics, unmapped } = summarizeTopics(insightAttempts);
    const trend = completedAttempts
      .filter(a => a.percentage !== null)
      .slice(0, 10)
      .reverse()
      .map(a => ({ at: a.submittedAt, percent: a.percentage as number, title: a.title }));

    const archiveLevel = ROMAN[classrooms[0]?.classroom.classLevel ?? 9] || 'IX';
    const archive = await getClassSubjects('akueb', archiveLevel).catch(() => null);

    return NextResponse.json({ success: true, page, hasMore: totalAttempts + inProgressCount > page * 100, isGuest: false, student: { id: user.id, name: user.name, email: user.email, role: user.role },
      metrics: { totalAttempts, inProgressCount, avgPercentage: completedAttempts.some(a => a.percentage !== null) ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / completedAttempts.filter(a => a.percentage !== null).length) : 0, totalQuizzesAvailable, streakDays: streakFrom(submissionDates.map(s => s.submittedAt)) },
      classrooms: classrooms.map(m => m.classroom), completedAttempts, averageLabel: 'Recent released results', inProgressAttempts: active.map(a => ({ attemptId: a.id, quizId: a.quizId, title: a.quiz.title, deadline: a.deadline, remainingSec: Math.max(0, Math.floor((a.deadline.getTime() - Date.now()) / 1000)) })),
      availableQuizzes: quizzes.map(q => ({ id: q.id, code: q.code, title: q.title, totalMarks: q.totalMarks, durationMin: q.durationMin, questionCount: q._count.questions, teacherName: q.teacher.name })),
      topics, unmappedTopics: unmapped, trend,
      archives: { boardId: archive?.board.id ?? 'akueb', classRoman: archiveLevel, subjects: (archive?.subjects ?? []).map(s => ({ name: s.name, slug: s.slug, description: s.description, papersCount: s.papersCount, sloCount: s.sloCount })) } });
  } catch (error) { return apiError(error); }
}
