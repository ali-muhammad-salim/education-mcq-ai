import mcqSource from '@/data/physics/ssc1_2023_mcqs.json';
import writtenSource from '@/data/physics/ssc1_2023_written.json';
import { physicsIxAnnualAnswerKey, physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';

const paperOneCode = 'PHY-IX-2023-P1';
const paperTwoCode = 'PHY-IX-2023-P2';
const keyHref = '/resources/physics-ix-2023-key';
const markingHref = '/resources/physics-ix-2023-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2023-';
const mcqs = physicsIxAnnualMcqs(mcqSource.map((row, i) => ({
  ...row,
  headings: i === 13 ? ['Weight', 'Mass'] : i === 29 ? ['Inside the bubble', 'Outside the bubble'] : undefined,
  diagram: i === 22,
})), paperOneCode, keyHref);

export const physicsIx2023AnswerKey = physicsIxAnnualAnswerKey(mcqSource);

const written = physicsIxAnnualWritten(writtenSource, 2023);
export const physicsIx2023Marking = written.marking;
export const physicsIx2023ChapterWritten = written.chapters;

const common = {
  examYear: 2023, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsIx2023Papers = [
  {
    ...common, id: paperOneCode, paperCode: paperOneCode,
    title: 'Physics Class IX Annual 2023 · Paper I', fileUrl: pdfRoot + 'paper-i.pdf',
    totalMarks: 40, durationMinutes: 70, questionCount: 40, printedCode: 'S2301-1711110',
    questions: mcqs,
  },
  {
    ...common, id: paperTwoCode, paperCode: paperTwoCode,
    title: 'Physics Class IX Annual 2023 · Paper II', fileUrl: pdfRoot + 'paper-ii.pdf',
    totalMarks: 25, durationMinutes: 110, questionCount: 7, printedCode: 'S2301-1711120',
    rubricInstruction: 'Answer all seven questions. Attempt one alternative each for Questions 6 and 7.',
    markingGuideUrl: markingHref, questions: written.questions,
  },
] satisfies PaperData[];

export const physicsIx2023References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2023 },
  { href: markingHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2023 },
];

export const physicsIx2023Tabs = [
  { label: 'Paper I · MCQs', href: '/past-papers/' + paperOneCode },
  { label: 'Paper II · Written responses', href: '/past-papers/' + paperTwoCode },
  ...physicsIx2023References,
];

export const physicsIx2023ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs, paperOneCode, 2023);
