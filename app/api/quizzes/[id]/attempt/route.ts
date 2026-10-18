import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET /api/quizzes/[id]/attempt - Recover active in-progress attempt
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const user = await getSessionUser(req, 'STUDENT');

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        studentId: user.id,
        status: 'IN_PROGRESS'
      },
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

    if (!activeAttempt) {
      return NextResponse.json({ hasActiveAttempt: false });
    }

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((activeAttempt.deadline.getTime() - now.getTime()) / 1000));

    // If server deadline passed, mark expired
    if (remainingSeconds <= 0) {
      await prisma.quizAttempt.update({
        where: { id: activeAttempt.id },
        data: { status: 'EXPIRED' }
      });
      await prisma.assessmentEvent.create({
        data: {
          attemptId: activeAttempt.id,
          eventType: 'TIMEOUT',
          metadata: { reason: 'Authoritative server deadline expired' }
        }
      });
      return NextResponse.json({ hasActiveAttempt: false, expired: true });
    }

    // Map existing answers to a lookup dictionary: { [questionId]: payload }
    const answersMap: Record<string, any> = {};
    for (const ans of activeAttempt.answers) {
      answersMap[ans.questionId] = ans.answerPayload;
    }

    // Sanitize questions for student
    const sanitizedQuestions = activeAttempt.quiz.questions.map(q => {
      const qData: any = typeof q.questionData === 'object' ? q.questionData : {};
      const options = Array.isArray(qData.options)
        ? qData.options.map((opt: any) => ({
            id: opt.id || opt.text,
            text: opt.text
          }))
        : [];

      return {
        id: q.id,
        orderIndex: q.orderIndex,
        marks: q.marks,
        isRequired: q.isRequired,
        questionType: qData.questionType || 'MCQ_SINGLE',
        stemText: qData.stemText || '',
        difficulty: qData.difficulty || 'Medium',
        cognitiveLevel: qData.cognitiveLevel || 'Understanding',
        options,
        matchingPairs: qData.matchingPairs || [],
        drawingSvg: qData.drawingSvg || null
      };
    });

    return NextResponse.json({
      hasActiveAttempt: true,
      attempt: {
        id: activeAttempt.id,
        startedAt: activeAttempt.startedAt,
        deadline: activeAttempt.deadline,
        remainingSeconds,
        tabSwitchCount: activeAttempt.tabSwitchCount,
        answers: answersMap,
        quizTitle: activeAttempt.quiz.title,
        durationMin: activeAttempt.quiz.durationMin,
        settings: activeAttempt.quiz.settings,
        questions: sanitizedQuestions
      }
    });
  } catch (err: any) {
    console.error('Recover attempt error:', err);
    return NextResponse.json({ error: err.message || 'Failed to recover attempt' }, { status: 500 });
  }
}

// POST /api/quizzes/[id]/attempt - Start new attempt or resume
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const user = await getSessionUser(req, 'STUDENT');

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        settings: true,
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Check existing attempts count
    const attemptCount = await prisma.quizAttempt.count({
      where: {
        quizId,
        studentId: user.id
      }
    });

    const maxAttempts = quiz.settings?.maxAttempts || 1;

    // Check if there is already an active in-progress attempt
    let attempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        studentId: user.id,
        status: 'IN_PROGRESS'
      },
      include: { answers: true }
    });

    if (attempt) {
      const now = new Date();
      if (attempt.deadline <= now) {
        // Expired
        await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: { status: 'EXPIRED' }
        });
        attempt = null;
      }
    }

    if (!attempt) {
      if (attemptCount >= maxAttempts) {
        return NextResponse.json({
          error: `Maximum attempts limit (${maxAttempts}) reached for this assessment.`
        }, { status: 403 });
      }

      // Calculate server authoritative deadline
      const durationMin = quiz.durationMin || 45;
      const startedAt = new Date();
      const deadline = new Date(startedAt.getTime() + durationMin * 60 * 1000);

      attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId: user.id,
          attemptNumber: attemptCount + 1,
          status: 'IN_PROGRESS',
          startedAt,
          deadline,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || ''
        },
        include: { answers: true }
      });

      // Log ATTEMPT_STARTED event
      await prisma.assessmentEvent.create({
        data: {
          attemptId: attempt.id,
          eventType: 'ATTEMPT_STARTED',
          metadata: {
            quizId,
            attemptNumber: attempt.attemptNumber,
            durationMin,
            deadline: deadline.toISOString()
          }
        }
      });
    }

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((attempt.deadline.getTime() - now.getTime()) / 1000));

    // Map answers
    const answersMap: Record<string, any> = {};
    for (const ans of attempt.answers || []) {
      answersMap[ans.questionId] = ans.answerPayload;
    }

    // Sanitize questions for student
    const sanitizedQuestions = quiz.questions.map(q => {
      const qData: any = typeof q.questionData === 'object' ? q.questionData : {};
      const options = Array.isArray(qData.options)
        ? qData.options.map((opt: any) => ({
            id: opt.id || opt.text,
            text: opt.text
          }))
        : [];

      return {
        id: q.id,
        orderIndex: q.orderIndex,
        marks: q.marks,
        isRequired: q.isRequired,
        questionType: qData.questionType || 'MCQ_SINGLE',
        stemText: qData.stemText || '',
        difficulty: qData.difficulty || 'Medium',
        cognitiveLevel: qData.cognitiveLevel || 'Understanding',
        options,
        matchingPairs: qData.matchingPairs || [],
        drawingSvg: qData.drawingSvg || null
      };
    });

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        deadline: attempt.deadline,
        remainingSeconds,
        tabSwitchCount: attempt.tabSwitchCount,
        answers: answersMap,
        quizTitle: quiz.title,
        durationMin: quiz.durationMin,
        settings: quiz.settings,
        questions: sanitizedQuestions
      }
    });
  } catch (err: any) {
    console.error('Start attempt error:', err);
    return NextResponse.json({ error: err.message || 'Failed to start attempt' }, { status: 500 });
  }
}
