import key from '@/data/physics/ssc1_2025_official_key.json';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import reviewed2024 from '@/data/physics/ssc1_2024_current_mapping.json';
import paper2024 from '@/data/physics/ssc1_2024_past_mcqs.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
import paperX2025 from '@/data/physics/ssc2_2025_past_mcqs.json';
import current from '@/data/physics/ssc1_exact_syllabus.json';
import currentX from '@/data/physics/ssc2_exact_syllabus.json';

export const physics2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2025-emarking', year: 2025 },
];

export const physics2024Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking', year: 2024 },
];

export const physicsX2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-x-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-x-2025-emarking', year: 2025 },
];

export const annualX2025AnswerReviews: Record<number, string> = {
  3: 'The printed key says B (amplitude only). For a general oscillator, energy can also depend on frequency. An educator must review the interpretation before this explanation is treated as verified.',
};

export const annualAnswerReviews: Record<number, string> = {
  12: 'Official key: D (80 N). The ideal-rope tension interpretation (40 N) needs educator review before approving a teaching explanation.',
  39: 'Official key: C (poor absorbers and good emitters). This combination conflicts with the usual relationship between absorption and emission for the same radiation. An educator must review the source before this is used as a teaching explanation.',
  40: 'Official key: B (white). This appears to conflict with the usual result that a dull black surface is the better heat radiator under comparable conditions. An educator must review the source before this is used as a teaching explanation.',
};

export const annual2024AnswerReviews: Record<number, string> = {
  2: 'The supplied key PDF visibly prints “0”, not a readable option letter. D is the proposed mathematical answer; administrator review is pending.',
  11: 'The key prints B. Its friction explanation appears physically inconsistent; keep the printed answer until an administrator decides.',
  20: 'The supplied key PDF visibly prints “0”. D is the proposed calculation result; administrator review is pending.',
  21: 'The supplied key PDF visibly prints “0”. D is the proposed direction of weight; administrator review is pending.',
  24: 'The supplied key PDF visibly prints “0”. D is the proposed work calculation; administrator review is pending.',
  25: 'The supplied key PDF has no readable option letter. C is inferred from the diagram and options; administrator review is pending.',
  31: 'The supplied key PDF visibly prints “0”. D is the proposed pressure comparison; administrator review is pending.',
  35: 'The supplied key PDF visibly prints “0”. D is the proposed Kelvin conversion; administrator review is pending.',
  36: 'The supplied key PDF visibly prints “0”. D is the proposed thermal expansion explanation; administrator review is pending.',
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

export function annualX2025OriginalReference(number: string | number): {
  slo?: string;
  original_reference_verified?: boolean;
  original_reference_source?: string;
  cognitive_level?: string;
  answer_review_note?: string;
} {
  const entry = keyX2025.entries.find(row => row.questionNumber === Number(number));
  return entry ? {
    slo: entry.slo,
    original_reference_verified: true,
    original_reference_source: '/resources/physics-x-2025-key',
    cognitive_level: entry.cognitiveLevel,
    ...(annualX2025AnswerReviews[entry.questionNumber]
      ? { answer_review_note: annualX2025AnswerReviews[entry.questionNumber] }
      : {}),
  } : {};
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
    const isPending = reviewed2024.pending.some(item => item.questionNumber === Number(number)) &&
      paper2024.some(item => Number(item.questionNumber) === Number(number) && normalize(item.stem) === normalize(stem));
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

export function annualX2025CurrentMapping(number: string | number, stem: string) {
  const row = paperX2025.find(item => Number(item.questionNumber) === Number(number));
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  if (!row || row.current_syllabus_reviewed !== true || normalize(row.stem) !== normalize(stem)) return {};
  const mapped = row.current_mapping?.[0];
  if (!mapped) return {};
  const outcome = currentX
    .flatMap(unit => unit.subtopics.flatMap(topic => topic.slos))
    .find(item => item.code === mapped.code);
  if (!outcome || outcome.description !== mapped.description) return {};
  return {
    current_syllabus_reviewed: true,
    mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Physics' },
    current_mapping: [{ code: mapped.code, description: mapped.description, topic: mapped.topic }],
  };
}

export const cs2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2024-key', year: 2024 },
  { label: 'Paper II study notes · AI draft', href: '/resources/computer-science-ix-2024-emarking', year: 2024 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2023-key', year: 2023 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2023-emarking', year: 2023 },
  { label: 'Paper 1 (Theory + ATP) · official answer key', href: '/resources/computer-science-ix-2022-key', year: 2022 },
];

export const csAnnual2025AnswerReviews: Record<number, string> = {};

export const csAnnual2024AnswerReviews: Record<number, string> = {
  9: 'Official 2024 AKU-EB Answer Key credits both D and A ("D,A"): Statement D ("Level 3 cache memory is smallest in storage capacity than other two levels") is FALSE because L3 cache is the largest in capacity, while Statement A ("Level 2 cache memory is located on the microprocessor") was historically considered false in older textbooks where L2 resided on the motherboard.',
  39: 'Printed key PDF shows "•" (bullet glyph) due to font encoding; verified HTML anchor syntax answer is A (<a href="https://www.piac.com.pk">Visit PIA Website</a>).',
};

export const csAnnual2023AnswerReviews: Record<number, string> = {
  11: 'The board key prints * for this item. It must not be scored as a single-answer question until an educator reviews it.',
};

export const csAnnual2022AnswerReviews: Record<number, string> = {
  5: 'Official 2022 AKU-EB Answer Key is D ("Level 3 cache memory is smaller in storage capacity than other two levels" is FALSE because L3 cache is the largest in capacity). Option A reflects legacy textbook phrasing where L2 cache was originally placed on the motherboard.',
};
