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
    const { attemptId, questionId, answerPayload } = body;

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: 'Missing attemptId or questionId' }, { status: 400 });
    }

    // Guest student / sample quiz support
    if (!user || attemptId?.startsWith('guest-attempt-') || quizId.startsWith('sample-quiz-')) {
      return NextResponse.json({
        success: true,
        questionId,
        version: 1,
        savedAt: new Date().toISOString()
      });
    }

    // Verify attempt ownership and active status
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.studentId !== user.id || attempt.quizId !== quizId) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 403 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: `Attempt is no longer in progress (Status: ${attempt.status})` }, { status: 400 });
    }

    // Server-authoritative deadline check!
    const now = new Date();
    if (now > attempt.deadline) {
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { status: 'EXPIRED' }
      });
      return NextResponse.json({ error: 'Assessment deadline has expired' }, { status: 403 });
    }

    // Upsert answer with version increment
    const answer = await prisma.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      },
      create: {
        attemptId,
        questionId,
        answerPayload: answerPayload || {},
        version: 1
      },
      update: {
        answerPayload: answerPayload || {},
        version: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      questionId,
      version: answer.version,
      savedAt: answer.updatedAt
    });
  } catch (err: any) {
    console.error('Save answer error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save answer' }, { status: 500 });
  }
}
