import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const teacher = await getSessionUser(req, 'TEACHER');

    if (!teacher || (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Teacher or Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      attemptId,
      quizAnswerId,
      awardedMarks,
      feedback,
      aiMode = 'MEDIUM',
      isAiGraded = false
    } = body;

    if (!quizAnswerId || awardedMarks === undefined) {
      return NextResponse.json({ error: 'Missing quizAnswerId or awardedMarks' }, { status: 400 });
    }

    const quizAnswer = await prisma.quizAnswer.findUnique({
      where: { id: quizAnswerId },
      include: {
        question: true,
        attempt: true
      }
    });

    if (!quizAnswer) {
      return NextResponse.json({ error: 'Quiz answer not found' }, { status: 404 });
    }

    const maxMarks = quizAnswer.question.marks || 1;
    const validatedMarks = Math.max(0, Math.min(maxMarks, parseFloat(awardedMarks) || 0));

    // Create or update AnswerGrade
    const gradeRecord = await prisma.answerGrade.create({
      data: {
        quizAnswerId,
        graderId: teacher.id,
        isAiGraded,
        aiMode: (aiMode as any) || 'MEDIUM',
        awardedMarks: validatedMarks,
        maxMarks,
        feedback: feedback || 'Evaluated against published scoring rubric.',
        status: 'FINAL'
      }
    });

    // Update QuizAnswer score
    await prisma.quizAnswer.update({
      where: { id: quizAnswerId },
      data: {
        score: validatedMarks,
        teacherComment: feedback
      }
    });

    // Recalculate QuizAttempt totalScore
    const allAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: quizAnswer.attemptId }
    });

    const totalScore = allAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    const hasRemainingUngraded = allAnswers.some(a => a.score === null);

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: quizAnswer.attemptId },
      data: {
        manualScore: totalScore - (quizAnswer.attempt.autoScore || 0),
        totalScore,
        status: hasRemainingUngraded ? 'GRADING_PENDING' : 'GRADED'
      }
    });

    return NextResponse.json({
      success: true,
      gradeRecord,
      totalScore,
      attemptStatus: updatedAttempt.status
    });
  } catch (err: any) {
    console.error('Grading evaluation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to grade answer' }, { status: 500 });
  }
}
