import key from '@/data/physics/ssc2_2024_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2024Items } from './physicsX2024Items';
import { physicsX2024Written } from './physicsX2024Written';

const paperI = 'PHY-X-2024-P1';
const paperII = 'PHY-X-2024-P2';
const keyHref = '/resources/physics-x-2024-key';
const notesHref = '/resources/physics-x-2024-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2024-';
const figures = new Set([11, 12, 13, 15, 20, 22, 24, 28]);
const headings: Record<number, string[]> = { 15: ['Charge on PQ', 'Charge on R'], 24: ['Finger 1', 'Finger 2', 'Finger 3'] };
const corrections: Record<number, string> = {
  2: 'The printed question imagines Earth as the bob. The digital version makes the ideal-model assumption explicit by holding local gravity and length fixed.',
  10: 'The board key prints a dot and none of the original choices gives 15 cm. The digital stem specifies the object-side focus, and option C is corrected to 15 cm.',
  23: 'The board keys A. For the stated external induction setup, steady current in the pickup coil also does not determine the induced e.m.f., so C earns credit.',
  30: 'The printed question describes a constant rate of change. Analogue means continuously variable, so the digital question tests that distinction explicitly.',
};
const duplicates: Record<number, string> = {
  6: 'physics-x-sound-timbre-same-pitch-loudness',
  11: 'physics-x-prism-total-deviation',
  12: 'physics-x-eye-hyperopia-convex-lens',
  20: 'physics-x-voltmeter-2-4-2-ohm',
  21: 'physics-x-neutral-current-20-amp',
  23: 'physics-x-external-flux-pickup-emf',
  25: 'physics-x-motor-energy-conversion',
  27: 'physics-x-thermionic-particles',
  39: 'physics-x-alpha-ionisation',
};
const truthTable = [
  '| Input A | Input B | Output |',
  '| --- | --- | --- |',
  '| 0 | 0 | 0 |',
  '| 0 | 1 | 0 |',
  '| 1 | 0 | 0 |',
  '| 1 | 1 | 1 |',
].join('\n');

const mcqs = physicsIxAnnualMcqs(physicsX2024Items.map(([pageNumber, slo, answer, stem, options, reasons], index) => {
  const { number, letter, slo: originalSlo, level } = key[index];
  const keyNote = letter === '0' ? ' The answer cell in the board PDF shows 0. The independently checked practice answer is D.' : '';
  const mappingReason = slo ? undefined : number === 14 ? 'Parallel capacitance is not assessed by a current Class X Physics outcome.'
    : 'General information technology is not assessed by a current Class X Physics outcome.';
  return {
    pageNumber, slo, key: answer, cognitive: level, officialSlo: originalSlo, officialAnswer: letter,
    stem: number === 31 ? stem + '\n\n' + truthTable : stem,
    options: options.split('|'), reasons: reasons.split('|'),
    headings: headings[number], diagram: figures.has(number), optionDiagrams: number === 16,
    mappingReason,
    reviewNote: (corrections[number] ?? '') + keyNote || undefined,
    acceptedOptions: number === 23 ? ['A', 'C'] : undefined,
    reviewedDuplicateKey: duplicates[number],
  };
}), paperI, keyHref, 10);

const written = physicsIxAnnualWritten(physicsX2024Written, 2024, 10);
export const physicsX2024Marking = written.marking;
export const physicsX2024AnswerKey = key;
export const physicsX2024ChapterWritten = written.chapters;

const common = {
  examYear: 2024, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsX2024Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2024 · Paper I',
    fileUrl: pdfRoot + 'paper-i.pdf', totalMarks: 40, durationMinutes: 70,
    questionCount: 40, printedCode: 'S2402-1721110', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2024 · Paper II',
    fileUrl: pdfRoot + 'paper-ii.pdf', totalMarks: 25, durationMinutes: 110,
    questionCount: 7, printedCode: 'S2402-1721120', questions: written.questions,
    rubricInstruction: 'Answer all seven questions. Attempt one alternative each for Questions 6 and 7.',
  },
] satisfies PaperData[];

export const physicsX2024References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2024 },
  { href: notesHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2024 },
];

export const physicsX2024Tabs = [
  { href: '/past-papers/' + paperI, label: 'Paper I · MCQs' },
  { href: '/past-papers/' + paperII, label: 'Paper II · Written responses' },
  ...physicsX2024References,
];

export const physicsX2024ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs.filter(q => q.topics?.length), paperI, 2024);
