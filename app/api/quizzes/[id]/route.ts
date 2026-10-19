import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFallbackPaper } from '@/lib/paperDataService';
import { getQuizFromStore } from '@/lib/submissionStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'take'; // 'take' (student) or 'edit' (teacher)

    let quiz = null;
    try {
      quiz = await prisma.quiz.findUnique({
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
    } catch (e) {
      console.warn('Prisma quiz lookup error, checking fallbacks:', e);
    }

    if (!quiz) {
      const stored = getQuizFromStore(quizId);
      if (stored) {
        return NextResponse.json({
          id: stored.id,
          code: stored.code,
          title: stored.title,
          durationMin: stored.durationMin || 55,
          totalMarks: stored.totalMarks || stored.questions.length,
          status: stored.status || 'PUBLISHED',
          visibility: stored.visibility || 'PUBLIC',
          settings: stored.settings || {},
          questions: stored.questions.map((q, idx) => ({
            id: `q-${idx + 1}`,
            orderIndex: idx + 1,
            marks: q.marks || 1,
            isRequired: true,
            questionType: 'MCQ_SINGLE',
            stemText: q.stemText,
            difficulty: 'Medium',
            cognitiveLevel: 'Understanding',
            options: (q.options || []).map((opt: any) => ({
              id: opt.id || opt.text,
              text: opt.text
            })),
            drawingSvg: q.drawingSvg || null
          })),
          teacher: { id: 'teacher-1', name: stored.teacherName || 'AKU-EB Faculty', email: 'faculty@akueb.edu.pk' }
        });
      }

      // Check fallback paper
      const fallback = getFallbackPaper(quizId);
      if (fallback) {
        return NextResponse.json({
          id: quizId,
          code: fallback.paperCode,
          title: fallback.title,
          durationMin: fallback.questions.length > 20 ? 55 : 30,
          totalMarks: fallback.questions.length,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          settings: { immediateFeedback: true, showCorrectAnswers: true },
          questions: fallback.questions.map((q, idx) => ({
            id: q.id,
            orderIndex: idx + 1,
            marks: q.marks || 1,
            isRequired: true,
            questionType: 'MCQ_SINGLE',
            stemText: q.questionText,
            difficulty: q.difficulty || 'Medium',
            cognitiveLevel: q.sourceRegion?.cognitive_level || 'Understanding',
            options: Object.entries(q.sourceRegion?.choices || {}).map(([key, text]) => ({
              id: key,
              text: String(text)
            })),
            drawingSvg: q.sourceRegion?.diagramUrl ? `<div style="text-align: center;"><img src="${q.sourceRegion.diagramUrl}" alt="Question Diagram" style="max-width: 100%; max-height: 280px; object-fit: contain; margin: 0 auto; display: block;" /></div>` : null
          })),
          teacher: { id: 'faculty-1', name: 'AKU-EB Physics Faculty', email: 'physics@akueb.edu.pk' }
        });
      }

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

