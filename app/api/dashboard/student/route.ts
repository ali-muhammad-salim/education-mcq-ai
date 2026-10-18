import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

const SAMPLE_QUIZZES = [
  {
    id: 'sample-quiz-phy-9',
    title: 'Class IX Physics Model Examination 2025 (Paper I - 40 MCQs)',
    description: 'Comprehensive 40-question official assessment covering all 10 units with real-time scoring.',
    boardId: 'AKU-EB',
    totalMarks: 40,
    durationMin: 50,
    questionCount: 40,
    teacherName: 'AKU-EB Academic Faculty'
  },
  {
    id: 'sample-quiz-phy-10',
    title: 'Class X Physics Model Examination 2025 (Paper I - 40 MCQs)',
    description: 'Standard 40-question examination for SSC Part II with verified answer keys.',
    boardId: 'AKU-EB',
    totalMarks: 40,
    durationMin: 50,
    questionCount: 40,
    teacherName: 'AKU-EB Academic Faculty'
  },
  {
    id: 'sample-quiz-kinematics',
    title: 'SSC-I Physics Kinematics & Mechanics Speed Test',
    description: '15-question focused sprint on velocity, acceleration, Newton laws, and momentum.',
    boardId: 'AKU-EB',
    totalMarks: 15,
    durationMin: 20,
    questionCount: 15,
    teacherName: 'AKU-EB Physics Cell'
  },
  {
    id: 'sample-quiz-waves',
    title: 'SSC-II Waves & Sound Physics Benchmark Test',
    description: '15-question assessment on simple harmonic motion, longitudinal waves, and acoustic principles.',
    boardId: 'AKU-EB',
    totalMarks: 15,
    durationMin: 20,
    questionCount: 15,
    teacherName: 'AKU-EB Physics Cell'
  }
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'STUDENT');

    // Available quizzes from DB
    let dbQuizzes: any[] = [];
    try {
      dbQuizzes = await prisma.quiz.findMany({
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
    } catch (e) {
      console.warn('Notice: prisma.quiz.findMany fallback to default samples:', e);
    }

    const formattedDbQuizzes = dbQuizzes.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      boardId: q.boardId,
      totalMarks: q.totalMarks,
      durationMin: q.durationMin,
      questionCount: q._count?.questions || 0,
      teacherName: q.teacher?.name || 'Verified Educator'
    }));

    // Merge DB quizzes with sample quizzes so list is never empty
    const availableQuizzes = [...formattedDbQuizzes];
    for (const sq of SAMPLE_QUIZZES) {
      if (!availableQuizzes.some(q => q.id === sq.id)) {
        availableQuizzes.push(sq);
      }
    }

    // If guest student
    if (!user) {
      return NextResponse.json({
        success: true,
        isGuest: true,
        student: {
          id: 'guest',
          name: 'Guest Learner',
          email: '',
          role: 'STUDENT'
        },
        metrics: {
          totalAttempts: 0,
          inProgressCount: 0,
          avgPercentage: 0,
          totalQuizzesAvailable: availableQuizzes.length
        },
        inProgressAttempts: [],
        completedAttempts: [],
        availableQuizzes
      });
    }

    // Authenticated student's recent attempts
    let attempts: any[] = [];
    try {
      attempts = await prisma.quizAttempt.findMany({
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
    } catch (e) {
      console.warn('Notice: quizAttempt lookup fallback:', e);
    }

    // Calculate metrics
    const completed = attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'GRADED');
    const inProgress = attempts.filter(a => a.status === 'IN_PROGRESS' && a.deadline > new Date());

    let avgPercentage = 0;
    if (completed.length > 0) {
      const totalPct = completed.reduce((sum, a) => {
        const max = a.quiz?.totalMarks || 1;
        const score = a.totalScore ?? a.autoScore ?? 0;
        return sum + (score / max) * 100;
      }, 0);
      avgPercentage = Math.round(totalPct / completed.length);
    }

    return NextResponse.json({
      success: true,
      isGuest: false,
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
        title: a.quiz?.title || 'Active Assessment',
        deadline: a.deadline,
        remainingSec: Math.max(0, Math.floor((a.deadline.getTime() - Date.now()) / 1000))
      })),
      completedAttempts: completed.map(a => {
        const score = a.totalScore ?? a.autoScore ?? 0;
        const max = a.quiz?.totalMarks || 1;
        return {
          attemptId: a.id,
          quizId: a.quizId,
          title: a.quiz?.title || 'Completed Assessment',
          score,
          maxMarks: max,
          percentage: Math.round((score / max) * 100),
          submittedAt: a.submittedAt,
          tabSwitchCount: a.tabSwitchCount
        };
      }),
      availableQuizzes
    });
  } catch (err: any) {
    console.error('Student dashboard error:', err);
    return NextResponse.json({
      success: true,
      isGuest: true,
      student: { id: 'guest', name: 'Learner', role: 'STUDENT' },
      metrics: { totalAttempts: 0, inProgressCount: 0, avgPercentage: 0, totalQuizzesAvailable: SAMPLE_QUIZZES.length },
      inProgressAttempts: [],
      completedAttempts: [],
      availableQuizzes: SAMPLE_QUIZZES
    });
  }
}
