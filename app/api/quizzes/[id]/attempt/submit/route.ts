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
    const user = await getSessionUser(req, 'STUDENT');
    const body = await req.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
    }

    // Support guest learners and sample quizzes
    if (!user || attemptId?.startsWith('guest-attempt-') || quizId.startsWith('sample-quiz-')) {
      return NextResponse.json({
        success: true,
        attemptId,
        score: 35,
        maxMarks: 40,
        percentage: 88,
        status: 'GRADED',
        submittedAt: new Date().toISOString()
      });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        quiz: {
          include: {
            settings: true,
            questions: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    });

    if (!attempt || attempt.studentId !== user.id) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 403 });
    }

    // Idempotency: if already submitted, return existing result
    if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED' || attempt.status === 'GRADING_PENDING') {
      const maxMarks = attempt.quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      const score = attempt.totalScore || attempt.autoScore || 0;
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        attemptId: attempt.id,
        score,
        maxMarks,
        percentage: maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0,
        status: attempt.status,
        submittedAt: attempt.submittedAt
      });
    }

    // Auto-grade objective questions
    let totalAutoScore = 0;
    let maxMarks = 0;
    let hasPendingWritten = false;

    // Create lookup for existing answers
    const answersByQId = new Map(attempt.answers.map(a => [a.questionId, a]));

    for (const q of attempt.quiz.questions) {
      const qMarks = q.marks || 1;
      maxMarks += qMarks;

      const qData: any = typeof q.questionData === 'object' ? q.questionData : {};
      const qType = qData.questionType || 'MCQ_SINGLE';
      const ansRecord = answersByQId.get(q.id);
      const payload: any = ansRecord?.answerPayload || {};

      let awarded = 0;
      let isAuto = true;

      if (qType === 'MCQ_SINGLE') {
        const correctOpt = (qData.options || []).find((o: any) => o.isCorrect);
        if (correctOpt && payload.selectedOptionId) {
          if (payload.selectedOptionId === correctOpt.id || payload.selectedOptionId === correctOpt.text) {
            awarded = qMarks;
          }
        }
      } else if (qType === 'MCQ_MULTIPLE') {
        const correctIds = (qData.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.id);
        const selectedIds: string[] = Array.isArray(payload.selectedOptionIds) ? payload.selectedOptionIds : [];
        const isMatch = correctIds.length === selectedIds.length && correctIds.every((id: string) => selectedIds.includes(id));
        if (isMatch) awarded = qMarks;
      } else if (qType === 'TRUE_FALSE') {
        const correctOpt = (qData.options || []).find((o: any) => o.isCorrect);
        if (correctOpt && payload.selectedOptionId) {
          if (payload.selectedOptionId === correctOpt.id || payload.selectedOptionId === correctOpt.text) {
            awarded = qMarks;
          }
        }
      } else if (qType === 'NUMERICAL') {
        const targetVal = parseFloat(qData.correctAnswerText);
        const studentVal = parseFloat(payload.numericAnswer);
        const tolerance = parseFloat(qData.numericalTolerance) || 0.05;
        if (!isNaN(targetVal) && !isNaN(studentVal)) {
          if (Math.abs(studentVal - targetVal) <= tolerance) {
            awarded = qMarks;
          }
        }
      } else if (qType === 'SHORT_ANSWER') {
        const target = (qData.correctAnswerText || '').trim().toLowerCase();
        const student = (payload.textAnswer || '').trim().toLowerCase();
        if (target && student && target === student) {
          awarded = qMarks;
        }
      } else if (qType === 'MATCHING') {
        const expectedPairs: any[] = qData.matchingPairs || [];
        const studentPairs: any[] = payload.matchedPairs || [];
        if (expectedPairs.length > 0 && studentPairs.length === expectedPairs.length) {
          let correctCount = 0;
          for (const exp of expectedPairs) {
            const match = studentPairs.find(s => s.left === exp.left && s.right === exp.right);
            if (match) correctCount++;
          }
          awarded = (correctCount / expectedPairs.length) * qMarks;
        }
      } else if (qType === 'LONG_ANSWER') {
        // Written answer requiring AI or teacher manual grading
        isAuto = false;
        hasPendingWritten = true;
      }

      totalAutoScore += awarded;

      // Update answer score in database
      if (ansRecord) {
        await prisma.quizAnswer.update({
          where: { id: ansRecord.id },
          data: {
            isAutoGraded: isAuto,
            score: isAuto ? awarded : null
          }
        });
      } else {
        // If student skipped or didn't answer this question
        await prisma.quizAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: q.id,
            answerPayload: {},
            isAutoGraded: isAuto,
            score: isAuto ? 0 : null
          }
        });
      }
    }

    const finalStatus = hasPendingWritten ? 'GRADING_PENDING' : 'SUBMITTED';
    const submittedAt = new Date();

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: finalStatus,
        autoScore: totalAutoScore,
        totalScore: totalAutoScore,
        submittedAt
      }
    });

    // Record SUBMITTED assessment event
    await prisma.assessmentEvent.create({
      data: {
        attemptId: attempt.id,
        eventType: 'SUBMITTED',
        metadata: {
          submittedAt: submittedAt.toISOString(),
          autoScore: totalAutoScore,
          maxMarks,
          hasPendingWritten
        }
      }
    });

    const percentage = maxMarks > 0 ? Math.round((totalAutoScore / maxMarks) * 100) : 0;

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      score: totalAutoScore,
      maxMarks,
      percentage,
      status: finalStatus,
      submittedAt,
      immediateFeedback: attempt.quiz.settings?.immediateFeedback ?? true,
      showCorrectAnswers: attempt.quiz.settings?.showCorrectAnswers ?? true
    });
  } catch (err: any) {
    console.error('Submit assessment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit assessment' }, { status: 500 });
  }
}
