export interface QuestionTelemetry {
  peerAvgTimeSec: number;
  optionDistribution: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  cityOrCampus?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  attemptedAccuracyPct: number;
  totalTimeSec: number;
  avgTimePerQuestionSec: number;
  percentile: number;
  isCurrentUser?: boolean;
}

export interface PaperAnalyticsPayload {
  questionStats?: Record<string, QuestionTelemetry>;
  totalParticipants?: number;
  firstAttemptLeaderboard?: LeaderboardEntry[];
  bestScoreLeaderboard?: LeaderboardEntry[];
}

export function getBaselineQuestionTelemetry(
  _paperCode: string,
  _questionNumber: string | number,
  _correctOption: string,
  _hasDiagram: boolean,
  _difficulty?: string,
): QuestionTelemetry {
  return { peerAvgTimeSec: 0, optionDistribution: {} };
}

export function computeCompositeIndex(score: number, timeSpentSec: number, allowedSec: number): number {
  return Math.max(0, Math.round(score * (1 + Math.max(0, allowedSec - timeSpentSec) / Math.max(allowedSec, 1))));
}

export function classifySpeedAccuracyQuadrant(accuracyPct: number, avgTimeSec: number, peerAvgTimeSec: number): string {
  const accuracy = accuracyPct >= 70 ? 'Accurate' : 'Needs practice';
  return peerAvgTimeSec > 0 ? `${accuracy} · ${avgTimeSec <= peerAvgTimeSec ? 'Quick' : 'Deliberate'}` : accuracy;
}
