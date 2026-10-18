import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'TEACHER');
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: true,
        isGuest: true,
        teacher: null,
        metrics: {
          totalQuizzes: 4,
          totalSubmissions: 312,
          pendingGrading: 0,
          flaggedEvents: 3,
          classroomsCount: 2
        },
        quizzes: [
          {
            id: 'sample-quiz-phy-9',
            title: 'Class IX Physics Model Examination 2025 (Paper I - 40 MCQs)',
            totalMarks: 40,
            durationMin: 50,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            createdAt: new Date().toISOString(),
            _count: { questions: 40, attempts: 142 }
          },
          {
            id: 'sample-quiz-phy-10',
            title: 'Class X Physics Model Examination 2025 (Paper I - 40 MCQs)',
            totalMarks: 40,
            durationMin: 50,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            createdAt: new Date().toISOString(),
            _count: { questions: 40, attempts: 98 }
          }
        ],
        recentSubmissions: [],
        pendingGradingCount: 0,
        flaggedAttempts: [],
        classrooms: []
      });
    }

    // Teacher's quizzes
    const quizzes = await prisma.quiz.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true, attempts: true } },
        settings: true
      }
    });

    // Submissions across teacher's quizzes
    const recentSubmissions = await prisma.quizAttempt.findMany({
      where: {
        quiz: { teacherId: user.id },
        status: { in: ['SUBMITTED', 'GRADING_PENDING', 'GRADED'] }
      },
      orderBy: { submittedAt: 'desc' },
      take: 15,
      include: {
        student: { select: { id: true, name: true, email: true } },
        quiz: { select: { id: true, title: true, totalMarks: true } }
      }
    });

    // Pending manual grading count
    const pendingGradingCount = await prisma.quizAttempt.count({
      where: {
        quiz: { teacherId: user.id },
        status: 'GRADING_PENDING'
      }
    });

    // Flagged anti-cheating events (tab switches > threshold)
    const flaggedAttempts = await prisma.quizAttempt.findMany({
      where: {
        quiz: { teacherId: user.id },
        tabSwitchCount: { gt: 2 }
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        student: { select: { name: true, email: true } },
        quiz: { select: { title: true } }
      }
    });

    // Teacher's classrooms
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: user.id },
      include: {
        _count: { select: { memberships: true, quizzes: true } }
      }
    });

    return NextResponse.json({
      success: true,
      teacher: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics: {
        totalQuizzes: quizzes.length,
        totalSubmissions: recentSubmissions.length,
        pendingGrading: pendingGradingCount,
        flaggedEvents: flaggedAttempts.length,
        classroomsCount: classrooms.length
      },
      quizzes: quizzes.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        boardId: q.boardId,
        totalMarks: q.totalMarks,
        durationMin: q.durationMin,
        status: q.status,
        visibility: q.visibility,
        questionCount: q._count.questions,
        attemptCount: q._count.attempts,
        createdAt: q.createdAt
      })),
      recentSubmissions: recentSubmissions.map(s => {
        const score = s.totalScore ?? s.autoScore ?? 0;
        const max = s.quiz.totalMarks || 1;
        return {
          attemptId: s.id,
          quizId: s.quizId,
          quizTitle: s.quiz.title,
          studentName: s.student.name,
          studentEmail: s.student.email,
          score,
          maxMarks: max,
          percentage: Math.round((score / max) * 100),
          status: s.status,
          submittedAt: s.submittedAt,
          tabSwitchCount: s.tabSwitchCount
        };
      }),
      flaggedAttempts: flaggedAttempts.map(f => ({
        attemptId: f.id,
        quizTitle: f.quiz.title,
        studentName: f.student.name,
        tabSwitchCount: f.tabSwitchCount,
        startedAt: f.startedAt
      })),
      classrooms: classrooms.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        gradeLevel: c.classLevel,
        academicYear: c.session || '2025-2026',
        studentCount: c._count.memberships,
        assignmentCount: c._count.quizzes
      }))
    });

  } catch (err: any) {
    console.error('Teacher dashboard error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load teacher dashboard' }, { status: 500 });
  }
}
