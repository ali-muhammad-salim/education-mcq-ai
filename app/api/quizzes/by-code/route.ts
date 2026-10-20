import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { resolveQuiz, assertQuizAccess } from '@/services/assessment/service';
import { normalizeQuestion, studentQuestion } from '@/services/assessment/scoring';
export async function GET(req: NextRequest) {
  try {
    const code = z.string().trim().min(4).max(100).parse(req.nextUrl.searchParams.get('code'));
    const quiz = await resolveQuiz(code); await assertQuizAccess(quiz, await getSessionUser(req));
    return NextResponse.json({ success: true, quiz: { id: quiz.id, code: quiz.code, title: quiz.title, durationMin: quiz.durationMin, totalMarks: quiz.totalMarks, teacherName: quiz.teacher.name,
      questions: quiz.questions.map(q => studentQuestion({ id: q.id, orderIndex: q.orderIndex, marks: q.marks, content: normalizeQuestion(q.questionData) })) } });
  } catch (error) { return apiError(error); }
}
