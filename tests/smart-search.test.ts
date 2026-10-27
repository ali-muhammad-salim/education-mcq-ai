import { describe, expect, it } from 'vitest';
import { smartMatch, smartScore } from '@/lib/smartSearch';
import { filterSyllabus } from '@/lib/syllabusPresentation';
import physicsIX from '@/data/physics/ssc1_exact_syllabus.json';
import physicsX from '@/data/physics/ssc2_exact_syllabus.json';

describe('Typo-tolerant and synonym-aware smart search', () => {
  it('matches misspelled physics terms via Damerau-Levenshtein and trigram similarity', () => {
    expect(smartMatch('Unit 2: Kinematics — speed, velocity, and acceleration', 'kinametics')).toBe(true);
    expect(smartMatch('Vernier callipers and micrometer screw gauge', 'vernier calipar')).toBe(true);
    expect(smartMatch('Resistance of a metallic conductor', 'resistence')).toBe(true);
    expect(smartMatch('Electromagnetic induction and transformers', 'electromagntism')).toBe(true);
  });

  it('matches different words with the same scientific meaning (synonyms)', () => {
    expect(smartMatch('differentiate between electromotive force (e.m.f.) and potential difference', 'voltage')).toBe(true);
    expect(smartMatch('explain the reason why upthrust acts in the upward direction', 'buoyancy')).toBe(true);
    expect(smartMatch('explain the turning effect of force by relating it to everyday life', 'torque')).toBe(true);
    expect(smartMatch('describe short-sightedness and long-sightedness in the human eye', 'myopia')).toBe(true);
    expect(smartMatch('double convex lens image formation', 'magnifying glass')).toBe(true);
  });

  it('matches multi-word queries regardless of word order', () => {
    expect(smartMatch('calculate the area under the speed-time graph of uniformly accelerated objects', 'graph speed time')).toBe(true);
    expect(smartScore('Unit 1: Measurement', 'completely unrelated biology photosynthesis')).toBe(0);
  });

  it('filters syllabus outcomes accurately across typos, synonyms, and exact SLO codes', () => {
    const exact = filterSyllabus(physicsIX, '1.2.2', 'all', 'all').flatMap(u => u.subtopics.flatMap((s: { slos: { code: string }[] }) => s.slos));
    expect(exact.map((s: { code: string }) => s.code)).toEqual(['1.2.2']);

    const typoKinematics = filterSyllabus(physicsIX, 'kinametics', 'all', 'all').flatMap(u => u.subtopics.flatMap((s: { slos: unknown[] }) => s.slos));
    expect(typoKinematics.length).toBeGreaterThan(0);

    const synonymVoltage = filterSyllabus(physicsX, 'voltage', 'all', 'all').flatMap(u => u.subtopics.flatMap((s: { slos: unknown[] }) => s.slos));
    expect(synonymVoltage.length).toBeGreaterThan(0);
  });
});
