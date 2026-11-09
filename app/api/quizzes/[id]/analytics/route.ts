import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ApiError, apiError } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { requireUser } from '@/lib/security';
import { resultsReleased } from '@/services/assessment/service';
import {
  MIN_PERCENTILE_ATTEMPTS,
  classifySpeedAccuracyQuadrant,
  scorePercentile,
  type LeaderboardEntry,
  type PaperAnalyticsPayload,
} from '@/lib/quiz-analytics';

type AttemptRow = {
  id: string;
  studentId: string;
  attemptNumber: number;
  totalScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  student: { name: string };
  answers: { answerPayload: unknown; score: number | null }[];
};

// Public leaderboards show abbreviated names to avoid exposing full candidate identities.
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Candidate';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function answeredPayload(payload: unknown): boolean {
  return Boolean(payload && typeof payload === 'object' && Object.keys(payload as Record<string, unknown>).length > 0);
}

function buildEntry(attempt: AttemptRow, totalMarks: number, currentUserId?: string | null): LeaderboardEntry {
  const answers = attempt.answers ?? [];
  const attempted = answers.filter(answer => answeredPayload(answer.answerPayload));
  const correct = answers.filter(answer => (answer.score ?? 0) > 0).length;
  const totalTimeSec = attempt.submittedAt
    ? Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000))
    : 0;
  const attemptedCount = attempted.length;
  const marks = totalMarks > 0 ? totalMarks : 1;
  const score = Number(attempt.totalScore ?? 0);

  return {
    rank: 0,
    studentId: attempt.studentId,
    studentName: abbreviateName(attempt.student.name),
    score,
    totalMarks: marks,
    percentage: Math.round((score / marks) * 100),
    attemptedAccuracyPct: attemptedCount ? Math.round((correct / attemptedCount) * 100) : 0,
    totalTimeSec,
    avgTimePerQuestionSec: attemptedCount ? Math.round(totalTimeSec / attemptedCount) : 0,
    percentile: 0,
    isCurrentUser: Boolean(currentUserId && attempt.studentId === currentUserId),
  };
}

function rank(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.totalTimeSec - b.totalTimeSec);
  const total = sorted.length;
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    percentile: total <= 1
      ? 100
      : Math.round((sorted.filter(other => other.score < entry.score).length / (total - 1)) * 100),
  }));
}

async function loadAnalytics(identifier: string, currentUserId?: string | null): Promise<PaperAnalyticsPayload> {
  const paperCode = identifier.trim().toUpperCase();
  const quiz = await prisma.quiz.findFirst({
    where: {
      OR: [
        { id: `practice-${paperCode}` },
        { id: identifier },
        { code: paperCode },
        { code: `PRACTICE-${paperCode}` },
      ],
    },
    select: { id: true, totalMarks: true },
  });

  if (!quiz) {
    return { paperCode, totalParticipants: 0, questionStats: {}, firstAttemptLeaderboard: [], bestScoreLeaderboard: [] };
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quizId: quiz.id,
      submittedAt: { not: null },
      status: { in: ['GRADED', 'GRADING_PENDING', 'SUBMITTED'] },
    },
    select: {
      id: true,
      studentId: true,
      attemptNumber: true,
      totalScore: true,
      startedAt: true,
      submittedAt: true,
      student: { select: { name: true } },
      answers: { select: { answerPayload: true, score: true } },
    },
    orderBy: { startedAt: 'asc' },
  });

  const entries = attempts.map(attempt => buildEntry(attempt as AttemptRow, quiz.totalMarks, currentUserId));
  const firstById = new Map<string, LeaderboardEntry>();
  const bestById = new Map<string, LeaderboardEntry>();
  attempts.forEach((attempt, index) => {
    const entry = entries[index];
    if (attempt.attemptNumber === 1 && !firstById.has(attempt.studentId)) firstById.set(attempt.studentId, entry);
    const best = bestById.get(attempt.studentId);
    if (!best || entry.score > best.score || (entry.score === best.score && entry.totalTimeSec < best.totalTimeSec)) {
      bestById.set(attempt.studentId, entry);
    }
  });

  return {
    paperCode,
    totalParticipants: new Set(attempts.map(attempt => attempt.studentId)).size,
    questionStats: {},
    firstAttemptLeaderboard: rank([...firstById.values()]),
    bestScoreLeaderboard: rank([...bestById.values()]),
  };
}

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

async function verifiedPercentile(req: NextRequest, id: string, attemptId: string) {
  const user = await requireUser(req);
  if (attemptId.length > 100) throw new ApiError(400, 'ATTEMPT_REQUIRED', 'Choose an attempt.');
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
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const attemptId = req.nextUrl.searchParams.get('attemptId');
    if (attemptId) return await verifiedPercentile(req, id, attemptId);
    const user = await getSessionUser(req).catch(() => null);
    return NextResponse.json({ success: true, analytics: await loadAnalytics(id, user?.id) });
  } catch (error) {
    return apiError(error);
  }
}

const postSchema = z.object({
  attemptNumber: z.number().int().min(1).max(1000).optional(),
  score: z.number().min(0).max(100000).optional(),
  totalMarks: z.number().min(0).max(100000).optional(),
  attemptedCount: z.number().int().min(0).max(10000).optional(),
  totalTimeSec: z.number().min(0).max(86400).optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser(req).catch(() => null);
    const body = postSchema.parse(await req.json().catch(() => ({})));
    const analytics = await loadAnalytics(id, user?.id);
    const response: Record<string, unknown> = { success: true, analytics };

    if (user && body.score != null && body.totalMarks != null) {
      const local: LeaderboardEntry = {
        rank: 0,
        studentId: user.id,
        studentName: abbreviateName(user.name),
        score: body.score,
        totalMarks: Math.max(1, body.totalMarks),
        percentage: Math.round((body.score / Math.max(1, body.totalMarks)) * 100),
        attemptedAccuracyPct: body.attemptedCount
          ? Math.min(100, Math.round((body.score / body.attemptedCount) * 100))
          : 0,
        totalTimeSec: Math.round(body.totalTimeSec ?? 0),
        avgTimePerQuestionSec: body.attemptedCount
          ? Math.round((body.totalTimeSec ?? 0) / body.attemptedCount)
          : 0,
        percentile: 0,
        isCurrentUser: true,
      };
      const first = [...(analytics.firstAttemptLeaderboard ?? []).filter(row => row.studentId !== user.id), local];
      const best = [...(analytics.bestScoreLeaderboard ?? []).filter(row => row.studentId !== user.id), local];
      analytics.firstAttemptLeaderboard = rank(first);
      analytics.bestScoreLeaderboard = rank(best);

      const peers = [...(analytics.firstAttemptLeaderboard ?? []), ...(analytics.bestScoreLeaderboard ?? [])]
        .filter(row => row.studentId !== user.id);
      const scored = rank([local, ...peers]);
      const mine = scored.find(row => row.isCurrentUser);
      response.percentile = mine?.percentile ?? 0;
      response.speedPercentile = peers.length
        ? Math.round((peers.filter(row => row.totalTimeSec > local.totalTimeSec).length / peers.length) * 100)
        : 100;
      response.userRank = analytics.firstAttemptLeaderboard.find(row => row.isCurrentUser)?.rank ?? 1;
      const peerAvgTime = peers.length
        ? Math.round(peers.reduce((sum, row) => sum + row.avgTimePerQuestionSec, 0) / peers.length)
        : local.avgTimePerQuestionSec;
      response.quadrantLabel = classifySpeedAccuracyQuadrant(
        local.attemptedAccuracyPct,
        local.avgTimePerQuestionSec,
        peerAvgTime,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
