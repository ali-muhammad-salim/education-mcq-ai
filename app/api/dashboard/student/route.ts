import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'STUDENT');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Available quizzes
    const availableQuizzes = await prisma.quiz.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC'
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { questions: true, attempts: true } },
        teacher: { select: { name: true } }
      }
    });

    // Student's recent attempts
    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId: user.id },
      orderBy: { startedAt: 'desc' },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            boardId: true,
            durationMin: true
          }
        }
      }
    });

    // Calculate metrics
    const completed = attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'GRADED');
    const inProgress = attempts.filter(a => a.status === 'IN_PROGRESS' && a.deadline > new Date());

    let avgPercentage = 0;
    if (completed.length > 0) {
      const totalPct = completed.reduce((sum, a) => {
        const max = a.quiz.totalMarks || 1;
        const score = a.totalScore ?? a.autoScore ?? 0;
        return sum + (score / max) * 100;
      }, 0);
      avgPercentage = Math.round(totalPct / completed.length);
    }

    return NextResponse.json({
      success: true,
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics: {
        totalAttempts: completed.length,
        inProgressCount: inProgress.length,
        avgPercentage,
        totalQuizzesAvailable: availableQuizzes.length
      },
      inProgressAttempts: inProgress.map(a => ({
        attemptId: a.id,
        quizId: a.quizId,
        title: a.quiz.title,
        deadline: a.deadline,
        remainingSec: Math.max(0, Math.floor((a.deadline.getTime() - Date.now()) / 1000))
      })),
      completedAttempts: completed.map(a => {
        const score = a.totalScore ?? a.autoScore ?? 0;
        const max = a.quiz.totalMarks || 1;
        return {
          attemptId: a.id,
          quizId: a.quizId,
          title: a.quiz.title,
          score,
          maxMarks: max,
          percentage: Math.round((score / max) * 100),
          submittedAt: a.submittedAt,
          tabSwitchCount: a.tabSwitchCount
        };
      }),
      availableQuizzes: availableQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        boardId: q.boardId,
        totalMarks: q.totalMarks,
        durationMin: q.durationMin,
        questionCount: q._count.questions,
        teacherName: q.teacher.name
      }))
    });
  } catch (err: any) {
    console.error('Student dashboard error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load dashboard' }, { status: 500 });
  }
}
