import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { quizSchema } from '@/lib/validations/assessment';
import { normalizeQuestion } from '@/services/assessment/scoring';
import { lockedTransaction } from '@/repositories/transaction';
import { randomBytes } from 'node:crypto';
import { resolveAcademicMetadata, enrichQuizMetadata } from '@/services/assessment/catalog';
import { z } from 'zod';
import { doubtDataSchema, matchesApprovedQuestion } from '@/lib/aiDoubtStore';
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req), params = req.nextUrl.searchParams, teacherId = params.get('teacherId');
    const access: Prisma.QuizWhereInput = user?.role === 'ADMIN' ? {} : { OR: [
      { status: 'PUBLISHED', visibility: 'PUBLIC' },
      ...(user ? [{ teacherId: user.id }, { status: 'PUBLISHED' as const, assignments: { some: { classroom: { status: 'ACTIVE', memberships: { some: { studentId: user.id, status: 'ENROLLED' } } } } } }] : [])
    ] };
    const status = params.has('status') ? z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).parse(params.get('status')) : undefined;
    const visibility = params.has('visibility') ? z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).parse(params.get('visibility')) : undefined;
    const page = z.coerce.number().int().min(1).max(10000).parse(params.get('page') || '1');
    const quizzes = await prisma.quiz.findMany({ where: { AND: [access, { status, visibility }, ...(teacherId ? [{ teacherId }] : [])] }, take: 100, skip: (page - 1) * 100, orderBy: { createdAt: 'desc' }, include: { settings: true, teacher: { select: { name: true } }, _count: { select: { questions: true, attempts: true } } } });
    return NextResponse.json({ success: true, page, hasMore: quizzes.length === 100, quizzes: (await enrichQuizMetadata(quizzes)).map(q => ({ ...q, code: q.code || q.id, teacherName: q.teacher.name, questionCount: q._count.questions, attemptCount: q._count.attempts })) });
  } catch (error) { return apiError(error); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), input = quizSchema.parse(await req.json());
    const { resultReleaseDate, ...settings } = input.settings;
    const settingsData = { ...settings, resultVisibility: settings.resultVisibility, resultReleaseDate: resultReleaseDate ? new Date(resultReleaseDate) : null };
    const questions = input.questions.map((q, i) => ({ orderIndex: i + 1, marks: q.marks, isRequired: q.isRequired, questionData: normalizeQuestion(q) }));
    const schedule = { scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : null, scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : null };
    if (schedule.scheduleStart && schedule.scheduleEnd && schedule.scheduleStart >= schedule.scheduleEnd) throw new ApiError(400, 'INVALID_SCHEDULE', 'The closing time must be after the opening time.');
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const quiz = await lockedTransaction(async tx => {
      const metadata = await resolveAcademicMetadata(tx, input.boardId || 'AKU-EB', input.classLevel, input.subject);
      if (input.status === 'PUBLISHED') {
        const aiQuestions = input.questions.filter(q => q.reviewId || q.provenance === 'AI_GENERATED');
        const reviews = await tx.aIDoubtRecord.findMany({ where: { id: { in: aiQuestions.flatMap(q => q.reviewId ? [q.reviewId] : []) }, status: 'APPROVED', ...(user.role !== 'ADMIN' ? { ownerId: user.id } : {}) } });
        for (const question of aiQuestions) {
          const review = reviews.find(r => r.id === question.reviewId);
          if (!review) throw new ApiError(422, 'REVIEW_REQUIRED', 'AI questions must be approved in the review queue before publication.');
          const approved = doubtDataSchema.parse(review.data).question;
          if (!matchesApprovedQuestion(question, approved)) throw new ApiError(422, 'REVIEW_CHANGED', 'An AI question changed after approval. Submit the revised question for review.');
        }
      }
      if (input.id) {
        await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${input.id} FOR UPDATE`;
        const existing = await tx.quiz.findUnique({ where: { id: input.id } });
        if (!existing || (user.role !== 'ADMIN' && existing.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'Only the author can edit this assessment.');
        if (await tx.quizAttempt.count({ where: { quizId: existing.id } })) throw new ApiError(409, 'EXAM_FROZEN', 'This assessment has attempts. Create a new assessment to revise its questions.');
        await tx.quizQuestion.deleteMany({ where: { quizId: existing.id } });
        return tx.quiz.update({ where: { id: existing.id }, data: { ...metadata, ...schedule, title: input.title, description: input.description, durationMin: input.durationMin, totalMarks, status: input.status, visibility: input.visibility,
          settings: { upsert: { create: settingsData, update: settingsData } }, questions: { create: questions } } });
      }
      return tx.quiz.create({ data: { teacherId: user.id, code: input.code?.toUpperCase() || 'EXAM-' + randomBytes(6).toString('hex').toUpperCase(), title: input.title, description: input.description, ...metadata, ...schedule,
        durationMin: input.durationMin, totalMarks, visibility: input.visibility, status: input.status, settings: { create: settingsData }, questions: { create: questions } } });
    });
    return NextResponse.json({ success: true, quizId: quiz.id, code: quiz.code, quiz, shareUrl: '/quizzes/' + quiz.id + '/take' });
  } catch (error) { return apiError(error); }
}
