import key from '@/data/physics/ssc1_2025_official_key.json';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import reviewed2024 from '@/data/physics/ssc1_2024_current_mapping.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
import reviewedX2025 from '@/data/physics/ssc2_2025_current_mapping.json';
import current from '@/data/physics/ssc1_exact_syllabus.json';
import currentX from '@/data/physics/ssc2_exact_syllabus.json';

export const physics2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking', year: 2024 },
];

export const physicsX2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-x-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-x-2025-emarking', year: 2025 },
];

export const physics2024Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking', year: 2024 },
];

// Canonical sibling-page switcher shown on every page of a Physics IX annual set.
export const physicsIx2024PaperTabs = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2024-key' },
  { label: 'E-marking notes', href: '/resources/physics-ix-2024-emarking' },
  { label: 'Paper 1 · answers & explanations', href: '/past-papers/PHY-IX-2024-P1?view=solved' },
  { label: 'Paper 2 (CRQ & ERQ)', href: '/past-papers/PHY-IX-2024-P2' },
];

export const physicsIx2025PaperTabs = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2025-key' },
  { label: 'E-marking notes', href: '/resources/physics-ix-2025-emarking' },
  { label: 'Paper 1 · answers & explanations', href: '/past-papers/PHY-IX-2025-P1?view=solved' },
  { label: 'Paper 2 (CRQ & ERQ)', href: '/past-papers/PHY-IX-2025-P2' },
];

export const chem2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2024-emarking', year: 2024 },
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2023-key', year: 2023 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2023-emarking', year: 2023 },
  { label: 'Paper 1 (Theory + ATP) · official answer key', href: '/resources/chemistry-ix-2022-key', year: 2022 },
  { label: 'Paper 1 (Theory + ATP) · official answer key', href: '/resources/chemistry-ix-2021-key', year: 2021 },
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2019-key', year: 2019 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2019-emarking', year: 2019 },
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2018-key', year: 2018 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2018-emarking', year: 2018 },
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-ix-2017-key', year: 2017 },
  { label: 'E-marking notes', href: '/resources/chemistry-ix-2017-emarking', year: 2017 },
];

export const chemX2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-x-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/chemistry-x-2025-emarking', year: 2025 },
];

export const chemX2024Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-x-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/chemistry-x-2024-emarking', year: 2024 },
];

export const chemX2023Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/chemistry-x-2023-key', year: 2023 },
  { label: 'E-marking notes', href: '/resources/chemistry-x-2023-emarking', year: 2023 },
];

export const chemXResources = [
  ...chemX2025Resources,
  ...chemX2024Resources,
  ...chemX2023Resources,
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

export const annualX2025AnswerReviews: Record<number, string> = {
  3: 'Official key: B (II only — amplitude). In a general SHM expression E = 2π²mf²A², total energy also depends on frequency (D: II and III), whereas for a fixed oscillator constant k (E = ½kA²) it is parameterized by amplitude.',
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
  return entry
    ? {
        slo: entry.slo,
        original_reference_verified: true,
        original_reference_source: '/resources/physics-x-2025-key',
        cognitive_level: entry.cognitiveLevel,
        ...(annualX2025AnswerReviews[entry.questionNumber]
          ? { answer_review_note: annualX2025AnswerReviews[entry.questionNumber] }
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

export function annualX2025CurrentMapping(number: string | number, stem: string) {
  const row = reviewedX2025.entries.find(item => item.questionNumber === Number(number));
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  if (!row || normalize(row.stem) !== normalize(stem)) return {};
  const outcome = currentX
    .flatMap(unit => unit.subtopics.flatMap(topic => topic.slos))
    .find(item => item.code === row.code);
  if (!outcome || outcome.description !== row.description) return {};
  return {
    current_syllabus_reviewed: true,
    mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Physics' },
    current_mapping: [{ code: row.code, description: row.description, topic: row.topic }],
    mapping_reason: reviewedX2025.reviewMethod,
  };
}

export const cs2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2024-emarking', year: 2024 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2023-key', year: 2023 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2023-emarking', year: 2023 },
  { label: 'Paper 1 (Theory + ATP) · official answer key', href: '/resources/computer-science-ix-2022-key', year: 2022 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2019-key', year: 2019 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2019-emarking', year: 2019 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2018-emarking', year: 2018 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-ix-2017-key', year: 2017 },
  { label: 'E-marking notes', href: '/resources/computer-science-ix-2017-emarking', year: 2017 },
];

export const csAnnual2025AnswerReviews: Record<number, string> = {};

export const csAnnual2024AnswerReviews: Record<number, string> = {
  9: 'Official 2024 AKU-EB Answer Key credits both D and A ("D,A"): Statement D ("Level 3 cache memory is smallest in storage capacity than other two levels") is FALSE because L3 cache is the largest in capacity, while Statement A ("Level 2 cache memory is located on the microprocessor") was historically considered false in older textbooks where L2 resided on the motherboard.',
  39: 'Printed key PDF shows "•" (bullet glyph) due to font encoding; verified HTML anchor syntax answer is A (<a href="https://www.piac.com.pk">Visit PIA Website</a>).',
};

export const csAnnual2023AnswerReviews: Record<number, string> = {
  11: 'Official 2023 AKU-EB Answer Key shows "*" (grace mark / ungraded item because IT careers under legacy SLO 1.2.2 overlapped in some textbooks). Verified technical answer is A ("I only" — writing programs to solve problems is the job of a Computer Programmer, whereas a System Analyst analyses requirements and plans solutions [II and III]).',
};

export const csAnnual2022AnswerReviews: Record<number, string> = {
  5: 'Official 2022 AKU-EB Answer Key is D ("Level 3 cache memory is smaller in storage capacity than other two levels" is FALSE because L3 cache is the largest in capacity). Option A reflects legacy textbook phrasing where L2 cache was originally placed on the motherboard.',
};

export const csAnnual2019AnswerReviews: Record<number, string> = {};

export const csAnnual2017AnswerReviews: Record<number, string> = {};
export const csX2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-x-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2025-emarking', year: 2025 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-x-2024-key', year: 2024 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2024-emarking', year: 2024 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-x-2023-key', year: 2023 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2023-emarking', year: 2023 },
  { label: 'Paper 1 (Theory + ATP) · official answer key', href: '/resources/computer-science-x-2022-key', year: 2022 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-x-2019-key', year: 2019 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2019-emarking', year: 2019 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2018-emarking', year: 2018 },
  { label: 'Paper 1 · official answer key', href: '/resources/computer-science-x-2017-key', year: 2017 },
  { label: 'E-marking notes', href: '/resources/computer-science-x-2017-emarking', year: 2017 },
];

export const csAnnualX2017AnswerReviews: Record<number, string> = {};

export const csAnnualX2019AnswerReviews: Record<number, string> = {
  21: "Official 2019 AKU-EB Answer Key credits both A and C ('A,C'): In GW-BASIC, lines are automatically sorted and executed in ascending order of line numbers (10 -> 20 -> 30 -> 40 -> 50 -> 60), outputting A - B = -10, A * B = 200, and A + B = 30 (Option A); Option C (30, -10, 200) corresponds to top-to-bottom visual reading order (50 -> 30 -> 40).",
};

export const csAnnualX2022AnswerReviews: Record<number, string> = {};

export const csAnnualX2025AnswerReviews: Record<number, string> = {};

export const csAnnualX2024AnswerReviews: Record<number, string> = {
  8: "Official 2024 AKU-EB Answer Key credits both C and D ('C,D'): Both structured programming languages (C) and procedural programming languages (D) are based upon the concept of modular programming.",
  26: "Official 2024 AKU-EB Answer Key is D ('int i = 5;'). In a standard 5-repetition loop for (int i = 1; i <= 5; i++), the initialisation expression int i = 1; (Option C) executes only once at loop entry, whereas int i = 5; (Option D) causes the loop itself to execute only once.",
  31: "Official 2024 AKU-EB Answer Key is A ('switch statement'). In C and JavaScript, break is used to exit from both a switch statement (A) and a for / while / do-while loop (C).",
};

export const csAnnualX2023AnswerReviews: Record<number, string> = {
  37: "Official 2023 AKU-EB Answer Key credits both D and B ('D,B'): In Microsoft Excel, the built-in function name to find the highest value in Test4 (column E) is =MAX(E2:E9) (Option B), while Option D (=MAXIMUM(E2:E9)) was also awarded credit.",
};
