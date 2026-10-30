import { describe, expect, it } from 'vitest';
import { scorePercentile } from '@/lib/quiz-analytics';

describe('verified score percentile', () => {
  it('stays unavailable below the minimum real sample', () => {
    expect(scorePercentile(8, [{ score: 8, count: 29 }])).toBeNull();
  });

  it('uses the midrank of tied first attempts', () => {
    expect(scorePercentile(8, [{ score: 4, count: 10 }, { score: 8, count: 10 }, { score: 10, count: 10 }])).toBe(50);
    expect(scorePercentile(2, [{ score: 4, count: 30 }])).toBe(0);
  });
});
