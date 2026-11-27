import key from '@/data/physics/ssc2_2017_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2017Items } from './physicsX2017Items';
import { physicsX2017Written } from './physicsX2017Written';

const paperI = 'PHY-X-2017-P1';
const paperII = 'PHY-X-2017-P2';
const keyHref = '/resources/physics-x-2017-key';
const notesHref = '/resources/physics-x-2017-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2017-';
const diagrams = new Set([3, 7, 8]);
const notes: Record<number, string> = {
  3: 'This figure shows five successive wavefronts, so the 60 cm span contains four wavelengths.',
  6: 'The printed stem uses aperture. The digital stem specifies axial length because a longer eyeball, rather than a wider pupil, can cause short-sightedness.',
  23: 'The board gives mass number 24 without naming the element. The digital stem supplies the sodium-24 nuclide, including proton number 11.',
  24: 'The printed stem refers to the surface. The digital version specifies the Sun’s core, where the energy-producing fusion takes place.',
  25: 'The digital version specifies a conventional uranium-fuelled nuclear power station because fusion can also release energy.',
};
const unmapped: Record<number, string> = {
  9: 'The current Class X syllabus does not assess parallel capacitance.',
  18: 'Computer software tasks are outside the current Class X Physics outcomes.',
  19: 'Data management is outside the current Class X Physics outcomes.',
  20: 'Word processing is outside the current Class X Physics outcomes.',
};
const duplicates: Record<number, string> = {
  2: 'physics-x-2021-q8',
  7: 'physics-x-eye-hyperopia-convex-lens',
  11: 'physics-x-neutral-current-20-amp',
  13: 'physics-x-2021-q33',
  15: 'physics-x-2021-q34',
};
const mcqs = physicsIxAnnualMcqs(physicsX2017Items.map(([pageNumber, slo, stem, options, reasons], index) => {
  const { number, letter, level } = key[index];
  return {
    pageNumber, slo, key: letter, cognitive: level, officialAnswer: letter,
    stem, options: options.split('|'), reasons: reasons.split('|'),
    headings: number === 1 ? ['Wavelength', 'Wave speed'] : undefined,
    diagram: diagrams.has(number), mappingReason: unmapped[number], reviewNote: notes[number],
    reviewedDuplicateKey: duplicates[number],
  };
}), paperI, keyHref, 10);

const written = physicsIxAnnualWritten(physicsX2017Written, 2017, 10);
export const physicsX2017Marking = written.marking;
export const physicsX2017AnswerKey = key;
export const physicsX2017ChapterWritten = written.chapters;
const common = {
  examYear: 2017, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};
export const physicsX2017Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2017 · Paper I',
    fileUrl: pdfRoot + 'paper-i.pdf', totalMarks: 25, durationMinutes: 35,
    questionCount: 25, printedCode: 'S1702-1721110', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2017 · Paper II',
    fileUrl: pdfRoot + 'paper-ii.pdf', totalMarks: 40, durationMinutes: 145,
    questionCount: 11, printedCode: 'S1702-1721120', questions: written.questions,
    rubricInstruction: 'Answer all eleven questions. Attempt one alternative each for Questions 9, 10 and 11.',
  },
] satisfies PaperData[];
export const physicsX2017References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2017 },
  { href: notesHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2017 },
];
export const physicsX2017Tabs = [
  { href: '/past-papers/' + paperI, label: 'Paper I · MCQs' },
  { href: '/past-papers/' + paperII, label: 'Paper II · Written responses' },
  ...physicsX2017References,
];
export const physicsX2017ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs.filter(q => q.topics?.length), paperI, 2017);
