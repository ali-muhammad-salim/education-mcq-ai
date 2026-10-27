import key from '@/data/physics/ssc1_2025_official_key.json';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import reviewed2024 from '@/data/physics/ssc1_2024_current_mapping.json';
import current from '@/data/physics/ssc1_exact_syllabus.json';

export const physics2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking', year: 2024 },
];

export const physics2024Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking', year: 2024 },
];

export const annualAnswerReviews: Record<number, string> = {
  12: 'Official key: D (80 N). The ideal-rope tension interpretation (40 N) needs educator review before approving a teaching explanation.',
  39: 'Official key: C (poor absorbers and good emitters). This combination conflicts with the usual relationship between absorption and emission for the same radiation. An educator must review the source before this is used as a teaching explanation.',
  40: 'Official key: B (white). This appears to conflict with the usual result that a dull black surface is the better heat radiator under comparable conditions. An educator must review the source before this is used as a teaching explanation.',
};

export const annual2024AnswerReviews: Record<number, string> = {
  2: 'Printed key PDF shows "0" due to a source OCR scan typo; verified mathematical answer is D (5.09 × 10⁻⁵).',
  11: 'Official key: B (Unaffected / Less). Physically, for a constant propelling force, increasing friction reduces speed (A) while decreasing friction increases speed (C).',
  20: 'Printed key PDF shows "0" due to a source OCR scan typo; verified Newton gravitation answer is D (2.668 × 10⁻⁸ N).',
  21: 'Printed key PDF shows "0" due to a source OCR scan typo; verified direction of gravitational weight is D (downward).',
  24: 'Printed key PDF shows "0" due to a source OCR scan typo; verified work done (W = Fd = 100 × 500) is D (50000 J).',
  25: 'Printed key PDF shows "•" (missing glyph); the diagram depicts solar, wind, and biomass, so the absent renewable source is C (hydel).',
  31: 'Printed key PDF shows "0" due to a source OCR scan typo; verified atmospheric pressure comparison is D (High at sea level, Low on the mountain).',
  35: 'Printed key PDF shows "0" due to a source OCR scan typo; verified Kelvin temperature (20 + 273) is D (293 K).',
  36: 'Printed key PDF shows "0" due to a source OCR scan typo; verified thermal expansion explanation is D (metal expands more and glass expands less).',
};

export function annualOriginalReference(number: string | number): {
  slo?: string;
  original_reference_verified?: boolean;
  original_reference_source?: string;
  cognitive_level?: string;
  answer_review_note?: string;
} {
  const entry = key.entries.find(row => row.questionNumber === Number(number));
  return entry
    ? {
        slo: entry.slo,
        original_reference_verified: true,
        original_reference_source: '/resources/physics-ix-2025-key',
        cognitive_level: entry.cognitiveLevel,
        ...(annualAnswerReviews[entry.questionNumber]
          ? { answer_review_note: annualAnswerReviews[entry.questionNumber] }
          : {}),
      }
    : {};
}

export function annual2024OriginalReference(number: string | number): {
  slo?: string;
  original_reference_verified?: boolean;
  original_reference_source?: string;
  cognitive_level?: string;
  answer_review_note?: string;
} {
  const entry = key2024.entries.find(row => row.questionNumber === Number(number));
  return entry
    ? {
        slo: entry.slo,
        original_reference_verified: true,
        original_reference_source: '/resources/physics-ix-2024-key',
        cognitive_level: entry.cognitiveLevel,
        ...(annual2024AnswerReviews[entry.questionNumber]
          ? { answer_review_note: annual2024AnswerReviews[entry.questionNumber] }
          : {}),
      }
    : {};
}

/** Apply a source-reviewed legacy mapping only while the exact stem and outcome
 * still match the reviewed content. A newer compiled syllabus must bypass this. */
export function annualCurrentMapping(number: string | number, stem: string) {
  const row = reviewed.entries.find(item => item.questionNumber === Number(number));
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  if (!row || normalize(row.stem) !== normalize(stem)) return {};
  const outcome = current
    .flatMap(unit => unit.subtopics.flatMap(topic => topic.slos))
    .find(item => item.code === row.code);
  if (!outcome || outcome.description !== row.description) return {};
  return {
    current_syllabus_reviewed: true,
    mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Physics' },
    current_mapping: [{ code: row.code, description: row.description, topic: row.topic }],
    mapping_reason: reviewed.reviewMethod,
  };
}

export function annual2024CurrentMapping(number: string | number, stem: string) {
  const row = reviewed2024.entries.find(item => item.questionNumber === Number(number));
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  if (!row || normalize(row.stem) !== normalize(stem)) {
    const isPending = reviewed2024.pending.some(item => item.questionNumber === Number(number));
    if (isPending) {
      return {
        current_syllabus_reviewed: true,
        out_of_syllabus: true,
        in_syllabus: false,
        mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Physics' },
        current_mapping: [],
      };
    }
    return {};
  }
  const outcome = current
    .flatMap(unit => unit.subtopics.flatMap(topic => topic.slos))
    .find(item => item.code === row.code);
  if (!outcome || outcome.description !== row.description) return {};
  return {
    current_syllabus_reviewed: true,
    mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Physics' },
    current_mapping: [{ code: row.code, description: row.description, topic: row.topic }],
    mapping_reason: reviewed2024.reviewMethod,
  };
}
