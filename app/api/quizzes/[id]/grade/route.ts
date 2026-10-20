import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { snapshotSchema } from '@/services/assessment/scoring';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await context.params;
    const input = z.object({ quizAnswerId: z.string().min(1), awardedMarks: z.coerce.number().finite().nonnegative(), feedback: z.string().max(20000).default('') }).parse(await req.json());
    const result = await serializable(async tx => {
      const answer = await tx.quizAnswer.findUnique({ where: { id: input.quizAnswerId }, include: { attempt: { include: { quiz: true } } } });
      if (!answer || answer.attempt.quizId !== id || (user.role !== 'ADMIN' && answer.attempt.quiz.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot grade this answer.');
      await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${answer.attemptId} FOR UPDATE`;
      if (['IN_PROGRESS','SUBMITTED'].includes(answer.attempt.status)) throw new ApiError(409, 'ATTEMPT_ACTIVE', 'Wait until submission processing has completed.');
      const question = snapshotSchema.parse(answer.attempt.questionSnapshot).find(q => q.id === answer.questionId);
      if (!question || input.awardedMarks > question.marks) throw new ApiError(400, 'INVALID_MARKS', 'Marks exceed the available marks.');
      const gradeRecord = await tx.answerGrade.create({ data: { quizAnswerId: answer.id, graderId: user.id, awardedMarks: input.awardedMarks, maxMarks: question.marks, feedback: input.feedback, isAiGraded: false } });
      await tx.quizAnswer.update({ where: { id: answer.id }, data: { score: input.awardedMarks, isAutoGraded: false, teacherComment: input.feedback } });
      const answers = await tx.quizAnswer.findMany({ where: { attemptId: answer.attemptId } }), totalScore = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
      const status = answers.some(a => a.score === null) ? 'GRADING_PENDING' : 'GRADED';
      await tx.quizAttempt.update({ where: { id: answer.attemptId }, data: { totalScore, manualScore: totalScore - (answer.attempt.autoScore ?? 0), status } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'ANSWER_GRADED', resource: 'QuizAnswer', resourceId: answer.id, details: { gradeId: gradeRecord.id, awardedMarks: input.awardedMarks } } });
      return { gradeRecord, totalScore, status };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) { return apiError(error); }
}
