import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { snapshotSchema } from '@/services/assessment/scoring';
import { getDoubtQueue } from '@/lib/aiDoubtStore';
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']);
    const page = Math.max(1, Math.min(10000, Math.floor(Number(req.nextUrl.searchParams.get('page')) || 1)));
    const scope = user.role === 'ADMIN' ? {} : { teacherId: user.id };
    const [quizzes, recentSubmissions, pendingGradingCount, flaggedRows, classrooms, aiDoubts, totalQuizzes, totalSubmissions, classroomsCount] = await Promise.all([
      prisma.quiz.findMany({ where: scope, take: 100, skip: (page - 1) * 100, orderBy: { createdAt: 'desc' }, include: { _count: { select: { questions: true, attempts: true } }, settings: true } }),
      prisma.quizAttempt.findMany({ where: { quiz: scope, status: { in: ['SUBMITTED', 'GRADING_PENDING', 'GRADED'] } }, take: 25, skip: (page - 1) * 25, orderBy: { submittedAt: 'desc' }, include: { student: { select: { id: true, name: true, email: true } }, quiz: { select: { id: true, title: true, totalMarks: true } } } }),
      prisma.quizAttempt.count({ where: { quiz: scope, status: 'GRADING_PENDING' } }),
      prisma.$queryRaw<{id:string;total:number}[]>`SELECT a.id, COUNT(*) OVER()::int AS total FROM "QuizAttempt" a JOIN "Quiz" q ON q.id=a."quizId" JOIN "QuizSetting" s ON s."quizId"=q.id WHERE s."tabMonitoringEnabled" AND a."tabSwitchCount" >= s."tabWarningThreshold" AND (${user.role} = 'ADMIN' OR q."teacherId"=${user.id}) ORDER BY a."startedAt" DESC LIMIT 10`,
      prisma.classroom.findMany({ where: scope, take: 100, skip: (page - 1) * 100, include: { _count: { select: { memberships: { where: { status: 'ENROLLED' } }, quizzes: true } } } }),
      getDoubtQueue(user.role === 'ADMIN' ? undefined : user.id),
      prisma.quiz.count({ where: scope }),
      prisma.quizAttempt.count({ where: { quiz: scope, status: { in: ['SUBMITTED', 'GRADING_PENDING', 'GRADED'] } } }),
      prisma.classroom.count({ where: scope })
    ]);
    const flaggedAttempts = await prisma.quizAttempt.findMany({ where: { id: { in: flaggedRows.map(r => r.id) } }, include: { student: { select: { name: true, email: true } }, quiz: { select: { id: true, title: true } } }, orderBy: { startedAt: 'desc' } });
    return NextResponse.json({ success: true, page, hasMore: { quizzes: totalQuizzes > page * 100, submissions: totalSubmissions > page * 25, classrooms: classroomsCount > page * 100 }, teacher: { id: user.id, name: user.name, email: user.email },
      metrics: { totalQuizzes, totalSubmissions, pendingGrading: pendingGradingCount, flaggedEvents: flaggedRows[0]?.total ?? 0, classroomsCount, pendingDoubts: aiDoubts.filter(q => q.status === 'PENDING_REVIEW').length },
      quizzes: quizzes.map(q => ({ ...q, code: q.code || q.id, questionCount: q._count.questions, attemptCount: q._count.attempts })), recentSubmissions: recentSubmissions.map(a => { const frozen = snapshotSchema.safeParse(a.questionSnapshot); const maxMarks = frozen.success ? frozen.data.reduce((sum,q) => sum + q.marks, 0) : a.quiz.totalMarks; return { ...a, attemptId: a.id, studentName: a.student.name, studentEmail: a.student.email, quizTitle: a.quiz.title, score: a.status === 'GRADED' ? a.totalScore : null, maxMarks, percentage: a.totalScore == null || a.status !== 'GRADED' ? null : maxMarks ? Math.round(a.totalScore / maxMarks * 100) : 0 }; }), pendingGradingCount, flaggedAttempts,
      classrooms: classrooms.map(c => ({ ...c, gradeLevel: c.classLevel, academicYear: c.session, studentCount: c._count.memberships, assignmentCount: c._count.quizzes })), aiDoubtQueue: aiDoubts });
  } catch (error) { return apiError(error); }
}
