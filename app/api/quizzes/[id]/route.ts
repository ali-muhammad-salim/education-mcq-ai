import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import prisma from '@/lib/prisma';
import { enrichQuizMetadata } from '@/services/assessment/catalog';
import { resolveQuiz, assertQuizAccess } from '@/services/assessment/service';
import { normalizeQuestion, studentQuestion } from '@/services/assessment/scoring';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params, user = await getSessionUser(req);
    if (id.includes('-SET-')) { if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to prepare selected practice questions.'); await rateLimit('practice-preview:' + user.id, 60, 60); }
    const quiz = await resolveQuiz(id);
    await assertQuizAccess(quiz, user);
    const edit = req.nextUrl.searchParams.get('mode') === 'edit';
    if (edit && (!user || (user.role !== 'ADMIN' && quiz.teacherId !== user.id))) throw new ApiError(403, 'FORBIDDEN', 'Only the author can edit this assessment.');
    return NextResponse.json({ success: true, quiz: { ...(await enrichQuizMetadata([quiz]))[0], settings: edit ? quiz.settings : { maxAttempts: quiz.settings?.maxAttempts, showCorrectAnswers: quiz.settings?.showCorrectAnswers, immediateFeedback: quiz.settings?.immediateFeedback }, teacherName: quiz.teacher.name,
      questions: quiz.questions.map(q => { const content = normalizeQuestion(q.questionData);
        return edit ? { ...content, id: q.id, orderIndex: q.orderIndex, marks: q.marks } : studentQuestion({ id: q.id, orderIndex: q.orderIndex, marks: q.marks, content }); }) } });
  } catch (error) { return apiError(error); }
}
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await context.params;
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || (user.role !== 'ADMIN' && quiz.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'Only the author can archive this assessment.');
    await prisma.quiz.update({ where: { id }, data: { status: 'ARCHIVED' } });
    return NextResponse.json({ success: true, message: 'Assessment archived. Existing records are preserved.' });
  } catch (error) { return apiError(error); }
}
