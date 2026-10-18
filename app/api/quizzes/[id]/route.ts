import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'take'; // 'take' (student) or 'edit' (teacher)

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        settings: true,
        questions: {
          orderBy: { orderIndex: 'asc' }
        },
        teacher: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Process questions: If student taking exam, STRIP isCorrect and explanations to prevent cheating!
    const questions = quiz.questions.map(q => {
      const qData: any = typeof q.questionData === 'object' ? q.questionData : {};
      
      if (mode === 'take') {
        // Safe student payload
        const sanitizedOptions = Array.isArray(qData.options)
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
          options: sanitizedOptions,
          drawingSvg: qData.drawingSvg || null
        };
      }

      // Teacher edit payload
      return {
        id: q.id,
        orderIndex: q.orderIndex,
        marks: q.marks,
        isRequired: q.isRequired,
        ...qData
      };
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        boardId: quiz.boardId,
        totalMarks: quiz.totalMarks,
        durationMin: quiz.durationMin,
        status: quiz.status,
        visibility: quiz.visibility,
        scheduleStart: quiz.scheduleStart,
        scheduleEnd: quiz.scheduleEnd,
        teacherName: quiz.teacher.name,
        settings: quiz.settings,
        questions
      }
    });
  } catch (err: any) {
    console.error('Fetch quiz error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;

    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quizSetting.deleteMany({ where: { quizId } });
    await prisma.quiz.delete({ where: { id: quizId } });

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err: any) {
    console.error('Delete quiz error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete quiz' }, { status: 500 });
  }
}

