import key from '@/data/physics/ssc2_2019_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2019Items } from './physicsX2019Items';
import { physicsX2019Written } from './physicsX2019Written';

const paperI = 'PHY-X-2019-P1';
const paperII = 'PHY-X-2019-P2';
const keyHref = '/resources/physics-x-2019-key';
const notesHref = '/resources/physics-x-2019-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2019-';
const headings: Record<number, string[]> = {
  4: ['Vibrating area', 'Amplitude'],
  9: ['Glass rod', 'Silk cloth'],
};
const notes: Record<number, string> = {
  5: 'The board lists A (4 cm). Using opposite signs for the real object and the virtual image gives the focal length 12 cm, option C.',
  8: 'The board lists C, which gives a finite magnified virtual image. A is also valid for the relaxed-eye adjustment, with the virtual image at infinity.',
  22: 'The digital stem fixes the element. Its proton number is therefore constant, while mass number and neutron number distinguish its isotopes.',
};
const unmapped: Record<number, string> = {
  5: 'The current syllabus does not assess focal length calculations for spherical mirrors.',
  18: 'Computer hardware and the World Wide Web are outside the current Class X Physics outcomes.',
  19: 'Distinguishing search engines from browsers is outside the current Class X Physics outcomes.',
};
const modelPairs = [[4, 8], [18, 32], [21, 36], [22, 37], [23, 38], [24, 39], [25, 40]] as const;
const duplicates: Record<number, string> = {
  ...Object.fromEntries(modelPairs.map(([annual]) => [annual, 'physics-x-2019-q' + annual])),
  2: 'physics-x-2021-q4',
};
export const physicsX2019ModelDuplicateKeys: Partial<Record<number, string>> = Object.fromEntries(
  modelPairs.map(([annual, model]) => [model, duplicates[annual]]),
);

const mcqs = physicsIxAnnualMcqs(physicsX2019Items.map(([pageNumber, slo, stem, options, reasons], index) => {
  const { number, letter, level } = key[index];
  return {
    pageNumber, slo, key: number === 5 ? 'C' : letter, cognitive: level, officialAnswer: letter,
    stem, options: options.split('|'), reasons: reasons.split('|'), headings: headings[number],
    diagram: number === 16, mappingReason: unmapped[number], reviewNote: notes[number],
    acceptedOptions: number === 8 ? ['A', 'C'] : undefined, reviewedDuplicateKey: duplicates[number],
  };
}), paperI, keyHref, 10);

const written = physicsIxAnnualWritten(physicsX2019Written, 2019, 10);
export const physicsX2019Marking = written.marking;
export const physicsX2019AnswerKey = key;
export const physicsX2019ChapterWritten = written.chapters;
const common = {
  examYear: 2019, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};
export const physicsX2019Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2019 · Paper I',
    fileUrl: pdfRoot + 'paper-i.pdf', totalMarks: 25, durationMinutes: 40,
    questionCount: 25, printedCode: 'S1902-1721110', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2019 · Paper II',
    fileUrl: pdfRoot + 'paper-ii.pdf', totalMarks: 40, durationMinutes: 140,
    questionCount: 11, printedCode: 'S1902-1721120', questions: written.questions,
    rubricInstruction: 'Answer all eleven questions. Attempt one alternative each for Questions 9, 10 and 11.',
  },
] satisfies PaperData[];
export const physicsX2019References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2019 },
  { href: notesHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2019 },
];
export const physicsX2019Tabs = [
  { href: '/past-papers/' + paperI, label: 'Paper I · MCQs' },
  { href: '/past-papers/' + paperII, label: 'Paper II · Written responses' },
  ...physicsX2019References,
];
export const physicsX2019ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs.filter(q => q.topics?.length), paperI, 2019);
