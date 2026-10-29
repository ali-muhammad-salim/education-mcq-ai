import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { snapshotSchema } from '@/services/assessment/scoring';
import { resultsReleased } from '@/services/assessment/service';
export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Math.min(10000, Math.floor(Number(req.nextUrl.searchParams.get('page')) || 1)));
    const user = await requireUser(req, ['STUDENT']);
    const [attempts, quizzes, totalAttempts, inProgressCount, totalQuizzesAvailable, classrooms] = await Promise.all([
      prisma.quizAttempt.findMany({ where: { studentId: user.id }, take: 100, skip: (page - 1) * 100, orderBy: { startedAt: 'desc' }, include: { quiz: { include: { settings: true } } } }),
      prisma.quiz.findMany({ where: { status: 'PUBLISHED', OR: [{ visibility: 'PUBLIC' }, { assignments: { some: { classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } } }] }, take: 100, include: { _count: { select: { questions: true } }, teacher: { select: { name: true } } } })
,
      prisma.quizAttempt.count({ where: { studentId: user.id, status: { not: 'IN_PROGRESS' } } }),
      prisma.quizAttempt.count({ where: { studentId: user.id, status: 'IN_PROGRESS' } }),
      prisma.quiz.count({ where: { status: 'PUBLISHED', OR: [{ visibility: 'PUBLIC' }, { assignments: { some: { classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } } }] } }),
      prisma.classroomMembership.findMany({ where: { studentId: user.id, status: 'ENROLLED' }, include: { classroom: { select: { id: true, name: true } } } })
    ]);
    const completed = attempts.filter(a => a.status !== 'IN_PROGRESS'), active = attempts.filter(a => a.status === 'IN_PROGRESS');
    const completedAttempts = completed.map(a => { const released = resultsReleased(a.quiz.settings, true); const frozen = snapshotSchema.safeParse(a.questionSnapshot), maximum = frozen.success ? frozen.data.reduce((sum, q) => sum + q.marks, 0) : a.quiz.totalMarks, score = a.totalScore ?? 0;
      return { attemptId: a.id, quizId: a.quizId, title: a.quiz.title, released, status: a.status, score: released && a.status === 'GRADED' ? score : null, maxMarks: maximum, percentage: !released || a.status !== 'GRADED' ? null : maximum ? Math.round(score / maximum * 100) : 0, submittedAt: a.submittedAt, tabSwitchCount: a.tabSwitchCount }; });
    return NextResponse.json({ success: true, page, hasMore: totalAttempts + inProgressCount > page * 100, isGuest: false, student: { id: user.id, name: user.name, email: user.email, role: user.role },
      metrics: { totalAttempts, inProgressCount, avgPercentage: completedAttempts.some(a => a.percentage !== null) ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / completedAttempts.filter(a => a.percentage !== null).length) : 0, totalQuizzesAvailable },
      classrooms: classrooms.map(m => m.classroom), completedAttempts, averageLabel: 'Recent released results', inProgressAttempts: active.map(a => ({ attemptId: a.id, quizId: a.quizId, title: a.quiz.title, deadline: a.deadline, remainingSec: Math.max(0, Math.floor((a.deadline.getTime() - Date.now()) / 1000)) })),
      availableQuizzes: quizzes.map(q => ({ id: q.id, code: q.code, title: q.title, totalMarks: q.totalMarks, durationMin: q.durationMin, questionCount: q._count.questions, teacherName: q.teacher.name })) });
  } catch (error) { return apiError(error); }
}
