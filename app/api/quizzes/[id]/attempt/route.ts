import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getFallbackPaper } from '@/lib/paperDataService';

function buildSampleAttempt(quizId: string) {
  const isChap12 = quizId.toLowerCase().includes('chap') || quizId === 'sample-quiz-phy-chap-1-2' || quizId === 'PHY-IX-CHAP1-2' || quizId === 'physics-chap-1-and-2-past-papers';
  const isClass10 = !isChap12 && (quizId.includes('10') || quizId.includes('waves'));
  const paperCode = isChap12 ? 'PHY-IX-CHAP1-2' : isClass10 ? 'PHY-X-P1' : 'PHY-IX-P1';
  const fallback = getFallbackPaper(paperCode);
  
  let rawQuestions = fallback?.questions || [];
  if (!isChap12 && (quizId.includes('kinematics') || quizId.includes('waves'))) {
    rawQuestions = rawQuestions.slice(0, 15);
  }
  
  const sanitized = rawQuestions.map((q, idx) => {
    const meta = q.sourceRegion || {};
    const choices = meta.choices || {};
    const options = Object.entries(choices).map(([key, text]) => ({
      id: key,
      text: String(text)
    }));
    const diagramUrl = meta.diagramUrl || (q as any).diagramUrl;
    const drawingSvg = diagramUrl ? `<div style="text-align: center;"><img src="${diagramUrl}" alt="Question Diagram" style="max-width: 100%; max-height: 280px; object-fit: contain; margin: 0 auto; display: block;" /></div>` : null;

    return {
      id: q.id || `sample-q-${idx + 1}`,
      orderIndex: idx + 1,
      marks: q.marks || 1,
      isRequired: true,
      questionType: 'MCQ_SINGLE' as const,
      stemText: q.questionText,
      difficulty: q.difficulty || 'Medium',
      cognitiveLevel: meta.cognitive_level || 'Understanding',
      options,
      matchingPairs: [],
      drawingSvg
    };
  });

  const durationMin = isChap12 ? 55 : rawQuestions.length <= 15 ? 20 : 50;

  return {
    id: `guest-attempt-${quizId}`,
    attemptNumber: 1,
    startedAt: new Date().toISOString(),
    deadline: new Date(Date.now() + durationMin * 60 * 1000).toISOString(),
    remainingSeconds: durationMin * 60,
    tabSwitchCount: 0,
    answers: {},
    quizTitle: fallback?.title || 'AKU-EB Examination Practice',
    durationMin,
    settings: {
      tabMonitoringEnabled: false,
      tabWarningThreshold: 3,
      showCorrectAnswers: true,
      immediateFeedback: true
    },
    questions: sanitized
  };
}

// GET /api/quizzes/[id]/attempt - Recover active in-progress attempt
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const user = await getSessionUser(req, 'STUDENT');

    if (!user || quizId.startsWith('sample-quiz-')) {
      return NextResponse.json({ hasActiveAttempt: false });
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

    // Check if this is a sample quiz or if DB is empty
    if (quizId.startsWith('sample-quiz-')) {
      const sample = buildSampleAttempt(quizId);
      return NextResponse.json({
        success: true,
        attempt: sample
      });
    }

    const user = await getSessionUser(req, 'STUDENT');

    let quiz = null;
    try {
      quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          settings: true,
          questions: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });
    } catch (err) {
      console.error('Database query quiz error:', err);
    }

    // Fallback if quiz is not found in database
    if (!quiz) {
      const sample = buildSampleAttempt(quizId);
      return NextResponse.json({
        success: true,
        attempt: sample
      });
    }

    // If guest user taking a published quiz from database
    if (!user) {
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
          id: `guest-attempt-${quiz.id}`,
          attemptNumber: 1,
          startedAt: new Date().toISOString(),
          deadline: new Date(Date.now() + (quiz.durationMin || 45) * 60 * 1000).toISOString(),
          remainingSeconds: (quiz.durationMin || 45) * 60,
          tabSwitchCount: 0,
          answers: {},
          quizTitle: quiz.title,
          durationMin: quiz.durationMin || 45,
          settings: quiz.settings,
          questions: sanitizedQuestions
        }
      });
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
