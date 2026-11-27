import key from '@/data/physics/ssc2_2021_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2021Items } from './physicsX2021Items';

const paperCode = 'PHY-X-2021-P1';
const keyHref = '/resources/physics-x-2021-key';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2021-';
const diagrams = new Set([5, 23, 30]);
const headings: Record<number, string[]> = {
  24: ['Branch current', 'Potential difference'],
  28: ['Resistance of conductor A', 'Resistance of conductor B'],
  33: ['Speed', 'Induced e.m.f.'],
  49: ['Input A', 'Input B'],
};
const truthTable = [
  '| Row | Input P | Input Q | Output R |',
  '| --- | --- | --- | --- |',
  '| I | 0 | 1 | 0 |',
  '| II | 1 | 0 | 0 |',
  '| III | 0 | 0 | 0 |',
  '| IV | 1 | 1 | 1 |',
].join('\n');

const notes: Record<number, string> = {
  5: 'The printed λ arrow spans only half of a wavelength. Two complete wavelengths fit in 60 cm, so the digital option D is 90 cm/s instead of the printed 45 cm/s.',
  12: 'The board keys C, but statement II is false. Only statement I is correct as printed. Light must also travel from greater to smaller refractive index, the reverse of statement III.',
  25: 'The board keys C (5 Ω). The 5 Ω side is in parallel with 10 Ω through the third vertex, so B (3.333 Ω) is correct.',
  27: 'The digital version specifies that all three resistors are used and arrangements with the same equivalent resistance are counted once.',
  35: 'Whether a device contains an electromagnet depends on its design. The digital options specify the components being compared.',
  41: 'The board answer assumes small amplitudes and the same local gravitational field.',
};
const unmapped: Record<number, string> = {
  10: 'Uses of the compound microscope are outside the current Class X Physics outcomes.',
  13: 'The current syllabus does not assess concave-mirror image calculations.',
  15: 'Comparing telescope and microscope lens designs is outside the current outcomes.',
  16: 'The current mirror outcome covers plane mirrors, not image properties of convex mirrors.',
  17: 'The construction and relative focal lengths of a compound microscope are outside the current outcomes.',
  18: 'Calculation of series capacitance is outside the current Class X Physics outcomes.',
  23: 'Calculation of parallel capacitance is outside the current Class X Physics outcomes.',
  43: 'The current syllabus does not assess image formation by concave mirrors.',
  46: 'The current outcome covers uses of measuring devices. It does not directly assess how to convert a galvanometer into a voltmeter.',
};

// Original question numbers in the 2021 paper and their counterparts in the model paper.
const modelPairs = [
  [1, 1], [2, 2], [3, 3], [4, 4], [6, 5], [7, 6], [8, 7], [11, 10], [14, 12],
  [19, 15], [22, 16], [24, 18], [26, 19], [28, 20], [30, 21], [31, 22], [32, 23],
  [33, 24], [34, 25], [36, 27], [37, 28], [38, 29], [39, 30],
] as const;
const duplicates: Record<number, string> = {
  ...Object.fromEntries(modelPairs.map(([number]) => [number, 'physics-x-2021-q' + number])),
  37: 'physics-x-cro-background-radiation',
  38: 'physics-x-basic-gates-except-nor',
  39: 'physics-x-thermionic-particles',
  47: 'physics-x-bulbs-added-in-series',
};
export const physicsX2021ModelDuplicateKeys: Partial<Record<number, string>> = Object.fromEntries(
  modelPairs.map(([annual, model]) => [model, duplicates[annual]]),
);

const correctedKeys: Record<number, string> = { 12: 'A', 25: 'B' };
const questions = physicsIxAnnualMcqs(physicsX2021Items.map(([pageNumber, slo, stem, options, reasons], index) => {
  const { number, letter, slo: officialSlo, level } = key[index];
  return {
    pageNumber, slo, key: correctedKeys[number] ?? letter, cognitive: level, officialSlo, officialAnswer: letter,
    stem: stem.replace('{or-table}', truthTable),
    options: options.split('|'), reasons: reasons.split('|'),
    headings: headings[number], diagram: diagrams.has(number), optionDiagrams: number === 36 || number === 44,
    assessmentSection: number === 1 ? 'Theory' : number === 41 ? 'Alternate to Practical' : undefined,
    mappingReason: unmapped[number], reviewNote: notes[number], reviewedDuplicateKey: duplicates[number],
  };
}), paperCode, keyHref, 10);

export const physicsX2021Paper = {
  id: paperCode, paperCode, title: 'Physics Class X Annual 2021 · Paper I',
  examYear: 2021, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
  totalMarks: 50, durationMinutes: 100, questionCount: 50, printedCode: 'S2102-1721110',
  markScalingNote: 'The board scaled the 40 Theory marks to 65 for the examination results.',
  fileUrl: pdfRoot + 'paper-i.pdf', questions,
} satisfies PaperData;

export const physicsX2021Key = { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2021 };
export const physicsX2021Tabs = [
  { label: 'Paper I · Theory and Alternate to Practical', href: '/past-papers/' + paperCode },
  physicsX2021Key,
];
export const physicsX2021AnswerKey = key;
export const physicsX2021ChapterMcqs = physicsIxAnnualChapterMcqs(questions.filter(q => q.topics?.length), paperCode, 2021);
