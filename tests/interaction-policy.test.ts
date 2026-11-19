import { describe, expect, it } from 'vitest';
import { isMotionRoute, shouldAnimateActivation } from '../lib/interaction-policy';

describe('motion route isolation', () => {
  it.each(['/past-papers/PHY-IX-2024-P1', '/materials/123', '/aku-eb/ssc-i/physics/model-papers/2025'])('keeps the protected document route %s unchanged', path => {
    expect(isMotionRoute(path)).toBe(false);
  });
  it.each(['/', '/past-papers', '/aku-eb/ssc-i/physics/pastpapers', '/quizzes/123/take', '/admin', '/account', '/teacher/quizzes/builder'])('enables feedback on %s', path => {
    expect(isMotionRoute(path)).toBe(true);
  });
});

describe('activation feedback policy', () => {
  const activation = { reducedMotion: false, disabled: false, protectedContent: false, defaultPrevented: false, button: 0, modified: false };
  it('allows normal pointer and synthesized keyboard activation', () => {
    expect(shouldAnimateActivation(activation)).toBe(true);
  });
  it.each(['reducedMotion', 'disabled', 'protectedContent', 'defaultPrevented', 'modified'] as const)('does not animate when %s is true', key => {
    expect(shouldAnimateActivation({ ...activation, [key]: true })).toBe(false);
  });
  it('does not animate a secondary-button action', () => {
    expect(shouldAnimateActivation({ ...activation, button: 2 })).toBe(false);
  });
});
