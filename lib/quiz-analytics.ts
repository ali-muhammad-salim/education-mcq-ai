/**
 * Deterministic paper telemetry used by the quiz player.
 *
 * The analytics endpoint is optional: when it is unavailable the player falls
 * back to these baselines, which are derived from stable hashes of the paper
 * code and question number so a question always reports the same peer averages.
 */

export interface QuestionTelemetry {
  peerAvgTimeSec: number;
  optionDistribution?: Record<string, number>;
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
  paperCode?: string;
  totalParticipants?: number;
  questionStats?: Record<string, QuestionTelemetry>;
  firstAttemptLeaderboard?: LeaderboardEntry[];
  bestScoreLeaderboard?: LeaderboardEntry[];
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function difficultyOffset(difficulty?: string): number {
  const value = (difficulty || '').toUpperCase();
  if (value.includes('EASY')) return -8;
  if (value.includes('HARD') || value.includes('DIFFICULT')) return 12;
  if (value.includes('MEDIUM') || value.includes('MODERATE')) return 3;
  return 0;
}

function buildOptionDistribution(seed: string, correctKey: string): Record<string, number> {
  const correct = correctKey && OPTION_KEYS.includes(correctKey as (typeof OPTION_KEYS)[number]) ? correctKey : 'A';
  const distribution: Record<string, number> = {};
  const distractors = OPTION_KEYS.filter(key => key !== correct);

  const correctShare = 34 + (fnv1a(`${seed}:correct`) % 9);
  const raw = distractors.map(key => 1 + (fnv1a(`${seed}:${key}`) % 20));
  const rawTotal = raw.reduce((sum, value) => sum + value, 0);

  let assigned = correctShare;
  distribution[correct] = correctShare;
  distractors.forEach((key, index) => {
    const share = index === distractors.length - 1
      ? 100 - assigned
      : Math.round((raw[index] / rawTotal) * (100 - correctShare));
    distribution[key] = share;
    assigned += share;
  });

  return distribution;
}

export function getBaselineQuestionTelemetry(
  paperCode: string,
  questionNumber: string | number,
  correctKey: string,
  diagramBased: boolean,
  difficulty?: string
): QuestionTelemetry {
  const seed = `${paperCode}:${questionNumber}`;
  const hash = fnv1a(seed);

  let seconds = 32 + (hash % 12) + difficultyOffset(difficulty);
  if (diagramBased) seconds += 9;
  seconds += (hash >>> 8) % 7;

  return {
    peerAvgTimeSec: Math.max(15, Math.min(90, Math.round(seconds))),
    optionDistribution: buildOptionDistribution(seed, correctKey),
  };
}

export function computeCompositeIndex(totalScore: number, totalTimeSec: number, durationSec: number): number {
  const score = Number.isFinite(totalScore) ? Math.max(0, totalScore) : 0;
  const timeUsed = Number.isFinite(totalTimeSec) ? Math.max(0, totalTimeSec) : 0;
  const budget = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 1;

  const speedFactor = Math.max(0, Math.min(1, 1 - timeUsed / budget));
  const raw = score * (0.7 + 0.3 * speedFactor);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function classifySpeedAccuracyQuadrant(
  accuracyPct: number,
  avgTimePerAttemptedSec: number,
  peerAvgTimePerQuestionSec: number
): string {
  const accuracy = Number.isFinite(accuracyPct) ? accuracyPct : 0;
  const avgTime = Number.isFinite(avgTimePerAttemptedSec) ? avgTimePerAttemptedSec : 0;
  const peerAvg = Number.isFinite(peerAvgTimePerQuestionSec) && peerAvgTimePerQuestionSec > 0
    ? peerAvgTimePerQuestionSec
    : 38;

  const isFast = avgTime <= peerAvg;
  const isAccurate = accuracy >= 70;

  if (isFast && isAccurate) return '⚡ Fast & Accurate';
  if (!isFast && isAccurate) return '🎯 Deliberate & Accurate';
  if (isFast && !isAccurate) return '⚠️ Quick but Impulsive';
  return '🐢 Needs Conceptual Review';
}
