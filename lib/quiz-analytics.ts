export interface QuestionTelemetry {
  questionKey: string;
  peerAvgTimeSec: number;
  peerCorrectTimeSec: number;
  totalResponses: number;
  optionDistribution: Record<string, number>; // Percentages A, B, C, D summing to 100
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  cityOrCampus: string;
  score: number;
  totalMarks: number;
  percentage: number;
  attemptedCount: number;
  attemptedAccuracyPct: number;
  totalTimeSec: number;
  avgTimePerQuestionSec: number;
  compositeIndex: number;
  percentile: number;
  attemptNumber: number;
  submittedAt: string;
  isCurrentUser?: boolean;
}

export interface PaperAnalyticsPayload {
  paperCode: string;
  totalParticipants: number;
  questionStats: Record<string, QuestionTelemetry>;
  firstAttemptLeaderboard: LeaderboardEntry[];
  bestScoreLeaderboard: LeaderboardEntry[];
}

// In-memory rolling telemetry store (persists across requests in Node process)
const paperAnalyticsStore = new Map<string, PaperAnalyticsPayload>();

function deterministicHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function computeCompositeIndex(score: number, totalTimeSec: number, maxDurationSec = 3000): number {
  const timeBonus = Math.max(0, maxDurationSec - Math.max(1, Math.round(totalTimeSec)));
  return Math.round(score * 10000 + timeBonus);
}

export function classifySpeedAccuracyQuadrant(
  attemptedAccuracyPct: number,
  avgTimePerAttemptedSec: number,
  peerAvgTimeSec: number
): string {
  const isAccurate = attemptedAccuracyPct >= 75;
  const isFast = avgTimePerAttemptedSec <= peerAvgTimeSec * 1.05;
  if (isAccurate && isFast) return '⚡ Fast & Accurate (Exam Ready)';
  if (isAccurate && !isFast) return '🎯 Careful & Accurate (Build Speed)';
  if (!isAccurate && avgTimePerAttemptedSec < peerAvgTimeSec * 0.65) return '⚠️ Rushing Warning (Slow Down & Read Carefully)';
  return '📘 Concept & Formula Revision Needed';
}

export function getBaselineQuestionTelemetry(
  paperCode: string,
  questionNumber: string | number,
  correctOption = 'B',
  isDiagram = false,
  difficulty = 'U'
): QuestionTelemetry {
  const key = `${paperCode}:${questionNumber}`;
  const h = deterministicHash(key);
  const diffUpper = (difficulty || 'U').toUpperCase();
  const baseSec =
    diffUpper.startsWith('A') ? 52 :
    diffUpper.startsWith('R') || diffUpper === 'K' ? 24 : 38;
  const diagramAdd = isDiagram ? 9 : 0;
  const peerAvgTimeSec = baseSec + diagramAdd + (h % 13) - 5;
  const peerCorrectTimeSec = Math.max(14, peerAvgTimeSec - 6 - (h % 5));

  const correctKey = ['A', 'B', 'C', 'D'].includes(correctOption.toUpperCase())
    ? correctOption.toUpperCase()
    : 'B';
  const correctShare = diffUpper.startsWith('A') ? 56 + (h % 14) : 68 + (h % 16);
  const remaining = 100 - correctShare;
  const wrongKeys = ['A', 'B', 'C', 'D'].filter(k => k !== correctKey);
  const trapShare = Math.round(remaining * 0.58);
  const secondShare = Math.round(remaining * 0.27);
  const thirdShare = Math.max(1, remaining - trapShare - secondShare);

  const dist: Record<string, number> = {
    [correctKey]: correctShare,
    [wrongKeys[h % 3]]: trapShare,
    [wrongKeys[(h + 1) % 3]]: secondShare,
    [wrongKeys[(h + 2) % 3]]: thirdShare,
  };

  return {
    questionKey: String(questionNumber),
    peerAvgTimeSec,
    peerCorrectTimeSec,
    totalResponses: 140 + (h % 95),
    optionDistribution: {
      A: dist.A ?? 10,
      B: dist.B ?? 10,
      C: dist.C ?? 10,
      D: dist.D ?? 10,
    },
  };
}

const SEED_PEERS: Array<{ name: string; city: string; scoreRatio: number; timeSec: number; attempts: number }> = [
  { name: 'Ayesha Khan', city: 'Karachi', scoreRatio: 0.975, timeSec: 1340, attempts: 1 },
  { name: 'Zainab Ali', city: 'Gilgit', scoreRatio: 0.95, timeSec: 1290, attempts: 2 },
  { name: 'Hamza Tariq', city: 'Karachi', scoreRatio: 0.95, timeSec: 1480, attempts: 1 },
  { name: 'Murtaza Hunzai', city: 'Hunza', scoreRatio: 0.925, timeSec: 1410, attempts: 1 },
  { name: 'Fatima Noor', city: 'Hyderabad', scoreRatio: 0.90, timeSec: 1520, attempts: 2 },
  { name: 'Bilal Ahmed', city: 'Karachi', scoreRatio: 0.875, timeSec: 1395, attempts: 1 },
  { name: 'Sanaullah Baig', city: 'Chitral', scoreRatio: 0.85, timeSec: 1610, attempts: 1 },
  { name: 'Maham Siddiqui', city: 'Karachi', scoreRatio: 0.825, timeSec: 1580, attempts: 3 },
  { name: 'Daniyal Raza', city: 'Sukkur', scoreRatio: 0.80, timeSec: 1690, attempts: 1 },
  { name: 'Hira Batool', city: 'Karachi', scoreRatio: 0.775, timeSec: 1740, attempts: 1 },
  { name: 'Usman Ghani', city: 'Rawalpindi', scoreRatio: 0.725, timeSec: 1820, attempts: 2 },
  { name: 'Mehak Karim', city: 'Gilgit', scoreRatio: 0.70, timeSec: 1650, attempts: 1 },
  { name: 'Saad Mansoor', city: 'Karachi', scoreRatio: 0.65, timeSec: 1910, attempts: 1 },
  { name: 'Areeba Sheikh', city: 'Hyderabad', scoreRatio: 0.60, timeSec: 1790, attempts: 1 },
];

function buildInitialAnalytics(paperCode: string, totalMarks = 40): PaperAnalyticsPayload {
  const normCode = (paperCode || 'PHY-IX-2025-P1').toUpperCase();
  const questionStats: Record<string, QuestionTelemetry> = {};
  for (let q = 1; q <= Math.max(40, totalMarks); q++) {
    questionStats[String(q)] = getBaselineQuestionTelemetry(
      normCode,
      q,
      ['A', 'B', 'C', 'D'][q % 4],
      q % 4 === 0,
      q % 3 === 0 ? 'A' : q % 2 === 0 ? 'U' : 'R'
    );
  }

  const h = deterministicHash(normCode);
  const entries: LeaderboardEntry[] = SEED_PEERS.map((peer, idx) => {
    const score = Math.max(1, Math.min(totalMarks, Math.round(totalMarks * peer.scoreRatio)));
    const timeJitter = ((h + idx * 37) % 120) - 60;
    const totalTimeSec = Math.max(420, peer.timeSec + timeJitter);
    const percentage = Math.round((score / totalMarks) * 100);
    const compositeIndex = computeCompositeIndex(score, totalTimeSec, 3000);
    return {
      rank: idx + 1,
      studentId: `peer-${idx + 1}`,
      studentName: peer.name,
      cityOrCampus: peer.city,
      score,
      totalMarks,
      percentage,
      attemptedCount: totalMarks,
      attemptedAccuracyPct: percentage,
      totalTimeSec,
      avgTimePerQuestionSec: Math.round(totalTimeSec / totalMarks),
      compositeIndex,
      percentile: 99,
      attemptNumber: peer.attempts,
      submittedAt: new Date(Date.now() - (idx + 1) * 3600_000 * 3).toISOString(),
    };
  });

  const rankedAll = rankAndPercentile(entries);
  const firstOnly = rankAndPercentile(
    entries.map(e => (e.attemptNumber > 1 ? { ...e, score: Math.max(1, e.score - 2), percentage: Math.round((Math.max(1, e.score - 2) / totalMarks) * 100), compositeIndex: computeCompositeIndex(Math.max(1, e.score - 2), e.totalTimeSec + 90, 3000), attemptNumber: 1 } : e))
  );

  return {
    paperCode: normCode,
    totalParticipants: 184 + (h % 70),
    questionStats,
    firstAttemptLeaderboard: firstOnly,
    bestScoreLeaderboard: rankedAll,
  };
}

function rankAndPercentile(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => b.compositeIndex - a.compositeIndex);
  const n = Math.max(1, sorted.length);
  return sorted.map((item, idx) => {
    const belowCount = n - 1 - idx;
    const rawPct = n <= 1 ? 99.0 : Math.max(1, Math.min(99.9, Number(((belowCount / (n - 1)) * 99 + 0.9).toFixed(1))));
    return {
      ...item,
      rank: idx + 1,
      percentile: rawPct,
    };
  });
}

export function getPaperAnalytics(paperCode: string, totalMarks = 40): PaperAnalyticsPayload {
  const normCode = (paperCode || 'PHY-IX-2025-P1').toUpperCase();
  let state = paperAnalyticsStore.get(normCode);
  if (!state) {
    state = buildInitialAnalytics(normCode, totalMarks);
    paperAnalyticsStore.set(normCode, state);
  }
  return state;
}

export interface RecordAttemptAnalyticsInput {
  paperCode: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  score: number;
  totalMarks: number;
  attemptedCount: number;
  totalTimeSec: number;
  questionTimings?: Array<{
    questionNumber: string | number;
    timeSpentSec: number;
    selectedOption?: string;
    isCorrect?: boolean;
  }>;
}

export function recordAttemptAnalytics(input: RecordAttemptAnalyticsInput) {
  const state = getPaperAnalytics(input.paperCode, input.totalMarks || 40);

  // 1. Update rolling per-question community average time & option distribution in O(1)
  for (const qt of input.questionTimings || []) {
    const qKey = String(qt.questionNumber);
    const existing = state.questionStats[qKey] || getBaselineQuestionTelemetry(state.paperCode, qKey);
    const clampedTime = Math.max(2, Math.min(300, Math.round(qt.timeSpentSec || existing.peerAvgTimeSec)));
    const nextCount = existing.totalResponses + 1;
    const nextAvg = Math.round((existing.peerAvgTimeSec * existing.totalResponses + clampedTime) / nextCount);
    const nextCorrectAvg = qt.isCorrect
      ? Math.round((existing.peerCorrectTimeSec * existing.totalResponses + clampedTime) / nextCount)
      : existing.peerCorrectTimeSec;

    const dist = { ...existing.optionDistribution };
    if (qt.selectedOption && ['A', 'B', 'C', 'D'].includes(qt.selectedOption.toUpperCase())) {
      const chosen = qt.selectedOption.toUpperCase();
      dist[chosen] = Math.min(97, (dist[chosen] || 25) + 1);
      const others = ['A', 'B', 'C', 'D'].filter(k => k !== chosen);
      const excess = dist.A + dist.B + dist.C + dist.D - 100;
      if (excess > 0) {
        for (const o of others) {
          if (dist[o] > 2) {
            dist[o] -= 1;
            break;
          }
        }
      }
    }

    state.questionStats[qKey] = {
      questionKey: qKey,
      peerAvgTimeSec: nextAvg,
      peerCorrectTimeSec: nextCorrectAvg,
      totalResponses: nextCount,
      optionDistribution: dist,
    };
  }

  // 2. Compute composite index & update both First-Attempt and Best-Score Leaderboards
  const totalMarks = Math.max(1, input.totalMarks || 40);
  const attemptedCount = Math.max(1, input.attemptedCount || totalMarks);
  const attemptedAccuracyPct = Math.round((input.score / attemptedCount) * 100);
  const percentage = Math.round((input.score / totalMarks) * 100);
  const totalTimeSec = Math.max(5, Math.round(input.totalTimeSec || 60));
  const avgTimePerQuestionSec = Math.round(totalTimeSec / attemptedCount);
  const compositeIndex = computeCompositeIndex(input.score, totalTimeSec, 3000);

  const newEntry: LeaderboardEntry = {
    rank: 1,
    studentId: input.studentId || 'current-student',
    studentName: input.studentName || 'You (Candidate)',
    cityOrCampus: 'Karachi',
    score: input.score,
    totalMarks,
    percentage,
    attemptedCount: input.attemptedCount,
    attemptedAccuracyPct,
    totalTimeSec,
    avgTimePerQuestionSec,
    compositeIndex,
    percentile: 90,
    attemptNumber: input.attemptNumber || 1,
    submittedAt: new Date().toISOString(),
    isCurrentUser: true,
  };

  // Update First-Attempt Leaderboard (only keeps the student's 1st attempt or adds if not present)
  const existingFirstIdx = state.firstAttemptLeaderboard.findIndex(
    e => e.studentId === newEntry.studentId || (e.isCurrentUser && newEntry.isCurrentUser)
  );
  if (existingFirstIdx === -1 || input.attemptNumber === 1) {
    const withoutUser = state.firstAttemptLeaderboard
      .map(e => ({ ...e, isCurrentUser: false }))
      .filter(e => e.studentId !== newEntry.studentId);
    state.firstAttemptLeaderboard = rankAndPercentile([...withoutUser, { ...newEntry, attemptNumber: 1 }]);
  } else {
    state.firstAttemptLeaderboard = state.firstAttemptLeaderboard.map((e, idx) =>
      idx === existingFirstIdx ? { ...e, isCurrentUser: true } : { ...e, isCurrentUser: false }
    );
  }

  // Update All-Time Best Score Leaderboard (replaces if new compositeIndex is higher)
  const existingBest = state.bestScoreLeaderboard.find(
    e => e.studentId === newEntry.studentId || (e.isCurrentUser && newEntry.isCurrentUser)
  );
  const bestCandidate =
    existingBest && existingBest.compositeIndex > newEntry.compositeIndex
      ? { ...existingBest, isCurrentUser: true }
      : newEntry;
  const withoutUserBest = state.bestScoreLeaderboard
    .map(e => ({ ...e, isCurrentUser: false }))
    .filter(e => e.studentId !== newEntry.studentId);
  state.bestScoreLeaderboard = rankAndPercentile([...withoutUserBest, bestCandidate]);
  state.totalParticipants += existingFirstIdx === -1 ? 1 : 0;

  const userRankedBest = state.bestScoreLeaderboard.find(e => e.studentId === newEntry.studentId) || newEntry;
  const peerAvgOverall = 38;
  const fasterRatio = Math.max(0.05, Math.min(0.99, 1 - (avgTimePerQuestionSec - 12) / (peerAvgOverall * 1.8)));
  const speedPercentile = Number((fasterRatio * 99).toFixed(1));
  const quadrantLabel = classifySpeedAccuracyQuadrant(attemptedAccuracyPct, avgTimePerQuestionSec, peerAvgOverall);

  return {
    analytics: state,
    userRank: userRankedBest.rank,
    percentile: userRankedBest.percentile,
    speedPercentile,
    compositeIndex,
    quadrantLabel,
  };
}
