import key from '@/data/physics/ssc2_2018_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2018Items } from './physicsX2018Items';
import { physicsX2018Written } from './physicsX2018Written';

const paperI = 'PHY-X-2018-P1';
const paperII = 'PHY-X-2018-P2';
const keyHref = '/resources/physics-x-2018-key';
const notesHref = '/resources/physics-x-2018-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2018-';
const diagrams = new Set([5, 7, 8, 13]);
const headings: Record<number, string[]> = {
  8: ['Vision defect', 'Correction'],
  13: ['Point P', 'Point Q'],
  22: ['Strongest ionisation', 'Greatest penetration'],
};
const notes: Record<number, string> = {
  9: 'The board lists A. C is also false: the electric field is a vector, while a field line is a graphical representation.',
  16: 'The board lists A. C is also correct for prescribed external flux when the pickup coil’s own field and self-induction are ignored.',
  19: 'The original choices say electrical and electronic signals without defining the distinction. The digital question asks for the direct voltage output before decoding.',
  21: 'The digital option specifies beta-minus. Beta-plus particles are positively charged.',
  24: 'The digital wording specifies total rest mass. The mass deficit corresponds to the energy released.',
  25: 'The original option A is liver enlargement, which can occur after liver irradiation. The digital version replaces it with an unambiguous distractor.',
};
const unmapped: Record<number, string> = {
  10: 'The current syllabus has no direct Class X outcome on storing charge in a capacitor.',
  20: 'Call routing and the structure of cellular networks are outside the current Class X Physics outcomes.',
};
const duplicates: Record<number, string> = {
  1: 'physics-x-2021-q1',
  2: 'physics-x-2021-q4',
  3: 'physics-x-sound-timbre-same-pitch-loudness',
  4: 'physics-x-2021-q6',
  16: 'physics-x-external-flux-pickup-emf',
  17: 'physics-x-thermionic-particles',
  18: 'physics-x-2021-q36',
};

const mcqs = physicsIxAnnualMcqs(physicsX2018Items.map(([pageNumber, slo, stem, options, reasons], index) => {
  const { number, letter, level } = key[index];
  return {
    pageNumber, slo, key: letter, cognitive: level, officialAnswer: letter,
    stem, options: options.split('|'), reasons: reasons.split('|'), headings: headings[number],
    diagram: diagrams.has(number), optionDiagrams: number === 11 || number === 18,
    mappingReason: unmapped[number], reviewNote: notes[number],
    acceptedOptions: number === 9 || number === 16 ? ['A', 'C'] : undefined,
    reviewedDuplicateKey: duplicates[number],
  };
}), paperI, keyHref, 10);

const written = physicsIxAnnualWritten(physicsX2018Written, 2018, 10);
export const physicsX2018Marking = written.marking;
export const physicsX2018AnswerKey = key;
export const physicsX2018ChapterWritten = written.chapters;
const common = {
  examYear: 2018, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};
export const physicsX2018Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2018 · Paper I',
    fileUrl: pdfRoot + 'paper-i.pdf', totalMarks: 25, durationMinutes: 35,
    questionCount: 25, printedCode: 'S1802-1721110', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2018 · Paper II',
    fileUrl: pdfRoot + 'paper-ii.pdf', totalMarks: 40, durationMinutes: 145,
    questionCount: 11, printedCode: 'S1802-1721120', questions: written.questions,
    rubricInstruction: 'Answer all eleven questions. Attempt one alternative each for Questions 9, 10 and 11.',
  },
] satisfies PaperData[];
export const physicsX2018References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2018 },
  { href: notesHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2018 },
];
export const physicsX2018Tabs = [
  { href: '/past-papers/' + paperI, label: 'Paper I · MCQs' },
  { href: '/past-papers/' + paperII, label: 'Paper II · Written responses' },
  ...physicsX2018References,
];
export const physicsX2018ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs.filter(q => q.topics?.length), paperI, 2018);
