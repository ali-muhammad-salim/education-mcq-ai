import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');

    const user = await getSessionUser(req, 'STUDENT');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find attempt
    const where: any = { quizId };
    if (attemptId) {
      where.id = attemptId;
    } else {
      where.studentId = user.id;
    }

    const attempt = await prisma.quizAttempt.findFirst({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        answers: {
          include: { gradeRecords: true }
        },
        quiz: {
          include: {
            settings: true,
            questions: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        student: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Assessment attempt not found' }, { status: 404 });
    }

    // Security: Student can only view their own attempt; Teachers/Admins can view any
    if (user.role === 'STUDENT' && attempt.studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = attempt.quiz.settings;
    const canViewCorrectAnswers = user.role !== 'STUDENT' || (settings?.showCorrectAnswers ?? true);

    const answersMap = new Map(attempt.answers.map(a => [a.questionId, a]));

    const questionResults = attempt.quiz.questions.map(q => {
      const qData: any = typeof q.questionData === 'object' ? q.questionData : {};
      const ans = answersMap.get(q.id);
      const payload: any = ans?.answerPayload || {};

      const baseResult: any = {
        questionId: q.id,
        orderIndex: q.orderIndex,
        marks: q.marks,
        questionType: qData.questionType || 'MCQ_SINGLE',
        stemText: qData.stemText || '',
        difficulty: qData.difficulty || 'Medium',
        scoreAwarded: ans?.score ?? 0,
        isAutoGraded: ans?.isAutoGraded ?? true,
        studentAnswer: payload,
        drawingSvg: qData.drawingSvg || null
      };

      if (canViewCorrectAnswers) {
        baseResult.options = qData.options || [];
        baseResult.correctAnswerText = qData.correctAnswerText;
        baseResult.explanation = qData.explanation || 'No explanation provided.';
        baseResult.pastPaperRef = qData.pastPaperRef;
        baseResult.rubric = qData.rubric;
        baseResult.gradeRecords = ans?.gradeRecords || [];
      } else {
        baseResult.options = (qData.options || []).map((o: any) => ({
          id: o.id || o.text,
          text: o.text
        }));
      }

      return baseResult;
    });

    const maxMarks = attempt.quiz.questions.reduce((sum, q) => sum + q.marks, 0);
    const score = attempt.totalScore ?? attempt.autoScore ?? 0;
    const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;

    // Time spent in seconds
    const timeSpentSec = attempt.submittedAt
      ? Math.max(0, Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000))
      : 0;

    return NextResponse.json({
      success: true,
      result: {
        attemptId: attempt.id,
        quizTitle: attempt.quiz.title,
        studentName: attempt.student.name,
        status: attempt.status,
        score,
        maxMarks,
        percentage,
        timeSpentSec,
        tabSwitchCount: attempt.tabSwitchCount,
        submittedAt: attempt.submittedAt,
        startedAt: attempt.startedAt,
        canViewCorrectAnswers,
        questions: questionResults
      }
    });
  } catch (err: any) {
    console.error('Fetch results error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch results' }, { status: 500 });
  }
}
