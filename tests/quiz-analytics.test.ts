import { describe, it, expect } from 'vitest';
import {
  getPaperAnalytics,
  recordAttemptAnalytics,
  computeCompositeIndex,
  classifySpeedAccuracyQuadrant,
} from '@/lib/quiz-analytics';
import { encryptQuestionReveal, decryptQuestionReveal } from '@/lib/quiz-crypto';

describe('Quiz Analytics, Percentile, Leaderboard & Encrypted Reveal Engine', () => {
  it('prioritizes higher score over faster speed in composite index and breaks ties by speed', () => {
    const highSlow = computeCompositeIndex(35, 2400, 3000);
    const lowFast = computeCompositeIndex(34, 400, 3000);
    const highFast = computeCompositeIndex(35, 1200, 3000);

    expect(highSlow).toBeGreaterThan(lowFast);
    expect(highFast).toBeGreaterThan(highSlow);
  });

  it('updates rolling per-question community average time and dual leaderboards on submission', () => {
    const initial = getPaperAnalytics('PHY-IX-2025-P1', 40);
    const q1Before = initial.questionStats['1'].peerAvgTimeSec;

    const recorded = recordAttemptAnalytics({
      paperCode: 'PHY-IX-2025-P1',
      studentId: 'student-test-1',
      studentName: 'Test Candidate',
      attemptNumber: 1,
      score: 37,
      totalMarks: 40,
      attemptedCount: 38,
      totalTimeSec: 1140,
      questionTimings: [
        { questionNumber: 1, timeSpentSec: 12, selectedOption: 'A', isCorrect: true },
        { questionNumber: 2, timeSpentSec: 25, selectedOption: 'B', isCorrect: true },
      ],
    });

    expect(recorded.percentile).toBeGreaterThan(75);
    expect(recorded.userRank).toBeGreaterThanOrEqual(1);
    expect(recorded.analytics.questionStats['1'].totalResponses).toBeGreaterThan(140);
    expect(recorded.analytics.questionStats['1'].peerAvgTimeSec).toBeLessThanOrEqual(q1Before);
    expect(recorded.analytics.firstAttemptLeaderboard.some(e => e.studentId === 'student-test-1')).toBe(true);
    expect(recorded.analytics.bestScoreLeaderboard.some(e => e.studentId === 'student-test-1')).toBe(true);
    expect(classifySpeedAccuracyQuadrant(92, 24, 38)).toContain('Fast & Accurate');
  });

  it('encrypts and decrypts per-question explanations and incorrect option feedback round-trip', () => {
    const blob = encryptQuestionReveal('q-test-99', {
      correctOptionId: 'opt-C',
      correctLetter: 'C',
      explanation: 'By Ohm law V = IR.',
      optionFeedback: {
        A: 'Option A divides instead of multiplying.',
        B: 'Option B ignores resistance.',
        D: 'Option D uses wrong SI unit.',
      },
      unit: 'Current Electricity',
    });

    const opened = decryptQuestionReveal('q-test-99', blob);
    expect(opened).not.toBeNull();
    expect(opened?.correctLetter).toBe('C');
    expect(opened?.optionFeedback?.A).toContain('divides');
  });
});
