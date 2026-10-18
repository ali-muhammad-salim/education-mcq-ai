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
    const { attemptId, eventType, metadata = {} } = body;

    if (!attemptId || !eventType) {
      return NextResponse.json({ error: 'Missing attemptId or eventType' }, { status: 400 });
    }

    // Support guest students and sample quizzes
    if (!user || attemptId?.startsWith('guest-attempt-') || quizId.startsWith('sample-quiz-')) {
      return NextResponse.json({ success: true, eventLogged: false });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { settings: true }
        }
      }
    });

    if (!attempt || attempt.studentId !== user.id) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 403 });
    }

    let newSwitchCount = attempt.tabSwitchCount;

    if (eventType === 'TAB_VISIBILITY_CHANGE' || eventType === 'WINDOW_BLUR') {
      const updated = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          tabSwitchCount: { increment: 1 }
        }
      });
      newSwitchCount = updated.tabSwitchCount;
    }

    // Persist to AssessmentEvent
    await prisma.assessmentEvent.create({
      data: {
        attemptId,
        eventType,
        metadata: {
          ...metadata,
          tabSwitchCount: newSwitchCount,
          serverTimestamp: new Date().toISOString()
        }
      }
    });

    const threshold = attempt.quiz.settings?.tabWarningThreshold ?? 2;
    const thresholdExceeded = newSwitchCount > threshold;

    return NextResponse.json({
      success: true,
      tabSwitchCount: newSwitchCount,
      threshold,
      thresholdExceeded
    });
  } catch (err: any) {
    console.error('Log assessment event error:', err);
    return NextResponse.json({ error: err.message || 'Failed to log event' }, { status: 500 });
  }
}
