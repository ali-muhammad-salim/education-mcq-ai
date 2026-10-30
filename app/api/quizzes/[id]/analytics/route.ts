import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiError, apiError } from '@/lib/api';
import { requireUser } from '@/lib/security';
import { MIN_PERCENTILE_ATTEMPTS, scorePercentile } from '@/lib/quiz-analytics';
import { resultsReleased } from '@/services/assessment/service';

type ScoreGroup = { score: number; count: number };
const scoreCache = new Map<string, { until: number; values: Promise<ScoreGroup[]> }>();

function gradedFirstAttemptScores(quizId: string): Promise<ScoreGroup[]> {
  const cached = scoreCache.get(quizId);
  if (cached && cached.until > Date.now()) return cached.values;
  const values = prisma.quizAttempt.groupBy({
    by: ['totalScore'],
    where: { quizId, attemptNumber: 1, status: 'GRADED', totalScore: { not: null }, student: { role: 'STUDENT' } },
    _count: { _all: true },
  }).then(rows => rows.map(row => ({ score: row.totalScore!, count: row._count._all })));
  if (scoreCache.size > 256) scoreCache.clear();
  scoreCache.set(quizId, { until: Date.now() + 60_000, values });
  void values.catch(() => scoreCache.delete(quizId));
  return values;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await context.params;
    const attemptId = req.nextUrl.searchParams.get('attemptId');
    if (!attemptId || attemptId.length > 100) throw new ApiError(400, 'ATTEMPT_REQUIRED', 'Choose an attempt.');
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, studentId: user.id, quiz: { OR: [{ id }, { code: id.toUpperCase() }] } },
      include: { quiz: { include: { settings: true } } },
    });
    if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'Attempt not found.');
    if (!resultsReleased(attempt.quiz.settings, attempt.status !== 'IN_PROGRESS'))
      throw new ApiError(403, 'RESULTS_PENDING', 'Results have not been released.');
    if (attempt.status !== 'GRADED' || attempt.totalScore === null)
      return NextResponse.json({ success: true, pending: true }, { status: 202 });

    const scores = await gradedFirstAttemptScores(attempt.quizId);
    const sampleSize = scores.reduce((total, row) => total + row.count, 0);
    return NextResponse.json({
      success: true,
      percentile: scorePercentile(attempt.totalScore, scores),
      sampleSize,
      minimumSample: MIN_PERCENTILE_ATTEMPTS,
    });
  } catch (error) { return apiError(error); }
}
