import key from '@/data/physics/ssc2_2023_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2023Items } from './physicsX2023Items';
import { physicsX2023Written } from './physicsX2023Written';

const paperI = 'PHY-X-2023-P1';
const paperII = 'PHY-X-2023-P2';
const keyHref = '/resources/physics-x-2023-key';
const notesHref = '/resources/physics-x-2023-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2023-';
const figures = new Set([1, 20, 24, 26, 27, 28, 29]);
const duplicateKeys: Record<number, string> = {
  19: 'physics-x-bulbs-added-in-series',
  22: 'physics-x-2021-q33',
  30: 'physics-x-cro-background-radiation',
};
const headings: Record<number, string[]> = {
  13: ['Apparent speed', 'Apparent distance'],
  18: ['Branch current', 'Potential difference'],
  27: ['Input X', 'Input Y'],
};
const notes: Record<number, string> = {
  2: 'The board lists C and B. Pond ripples combine motion perpendicular and parallel to their direction of travel, so either earns credit.',
  5: 'The board keys A (pitch). Pitch alone does not distinguish a steady musical tone from irregular noise. Digital option A describes the regularity of vibration.',
  12: 'The board keys D (undetermined). For an ideal concave mirror, the focal-point image is at infinity, so D states there is no finite image distance.',
  39: 'The board keys D (I and III). The digital option D is I only. Generating electricity is the direct peaceful application of fission listed. Crop irradiation is an application of ionising radiation.',
};
const unmapped: Record<number, string> = {
  1: 'The question concerns kinetic energy along a track. No current Class X outcome directly assesses it.',
  5: 'The current syllabus defines pitch, loudness and sound quality. It does not directly assess the distinction between a regular tone and irregular noise.',
  12: 'The current Class X syllabus does not cover concave-mirror image distances.',
  14: 'The current Class X syllabus does not assess series capacitance.',
  17: 'No current Class X outcome directly asks for the change in electrical potential energy when work is done on a charge.',
  32: 'Ranking computer storage media is outside the current Class X Physics outcomes.',
  33: 'Sending documents by fax is outside the current Class X Physics outcomes.',
  34: 'Identifying computer components is outside the current Class X Physics outcomes.',
  38: 'This is an induced nuclear reaction. The current equation outcome is specific to alpha and beta decay.',
  39: 'The current syllabus describes fission and fusion reactions. It has no outcome covering this comparison of their practical uses.',
};

const mcqs = physicsIxAnnualMcqs(physicsX2023Items.map(([pageNumber, slo, answer, stem, options, reasons], index) => {
  const { number, letter, slo: officialSlo, level } = key[index];
  return {
    pageNumber, slo, key: answer, cognitive: level, officialSlo, officialAnswer: letter, stem,
    options: options.split('|'), reasons: reasons.split('|'),
    headings: headings[number], diagram: figures.has(number), mappingReason: unmapped[number],
    reviewNote: notes[number], acceptedOptions: number === 2 ? ['B', 'C'] : undefined,
    reviewedDuplicateKey: duplicateKeys[number],
  };
}), paperI, keyHref, 10);

const written = physicsIxAnnualWritten(physicsX2023Written, 2023, 10);
export const physicsX2023Marking = written.marking;
export const physicsX2023AnswerKey = key;
export const physicsX2023ChapterWritten = written.chapters;

const common = {
  examYear: 2023, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsX2023Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2023 · Paper I',
    fileUrl: pdfRoot + 'paper-i.pdf', totalMarks: 40, durationMinutes: 70,
    questionCount: 40, printedCode: 'S2302-1721110', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2023 · Paper II',
    fileUrl: pdfRoot + 'paper-ii.pdf', totalMarks: 25, durationMinutes: 110,
    questionCount: 7, printedCode: 'S2302-1721120', questions: written.questions,
    rubricInstruction: 'Answer all seven questions. Attempt one alternative each for Questions 6 and 7.',
  },
] satisfies PaperData[];

export const physicsX2023References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2023 },
  { href: notesHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2023 },
];

export const physicsX2023Tabs = [
  { href: '/past-papers/' + paperI, label: 'Paper I · MCQs' },
  { href: '/past-papers/' + paperII, label: 'Paper II · Written responses' },
  ...physicsX2023References,
];

export const physicsX2023ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs.filter(q => q.topics?.length), paperI, 2023);
