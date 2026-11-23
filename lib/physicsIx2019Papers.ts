import mcqSource from '@/data/physics/ssc1_2019_mcqs.json';
import writtenSource from '@/data/physics/ssc1_2019_written.json';
import { physicsIxAnnualAnswerKey, physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';

const paperOneCode = 'PHY-IX-2019-P1';
const paperTwoCode = 'PHY-IX-2019-P2';
const keyHref = '/resources/physics-ix-2019-key';
const markingHref = '/resources/physics-ix-2019-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2019-';
const mcqs = physicsIxAnnualMcqs(mcqSource, paperOneCode, keyHref);
const written = physicsIxAnnualWritten(writtenSource, 2019);

const common = {
  examYear: 2019, examSession: 'April/May', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsIx2019Papers = [
  {
    ...common, id: paperOneCode, paperCode: paperOneCode,
    title: 'Physics Class IX Annual 2019 · Paper I', fileUrl: pdfRoot + 'paper-i.pdf',
    totalMarks: 30, durationMinutes: 45, questionCount: 30, printedCode: 'S1901-1711110',
    questions: mcqs,
  },
  {
    ...common, id: paperTwoCode, paperCode: paperTwoCode,
    title: 'Physics Class IX Annual 2019 · Paper II', fileUrl: pdfRoot + 'paper-ii.pdf',
    totalMarks: 35, durationMinutes: 135, questionCount: 10, printedCode: 'S1901-1711120',
    rubricInstruction: 'Answer all ten questions. Attempt one alternative each for Questions 9 and 10.',
    markingGuideUrl: markingHref, questions: written.questions,
  },
] satisfies PaperData[];

export const physicsIx2019References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2019 },
  { href: markingHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2019 },
];

export const physicsIx2019Tabs = [
  { label: 'Paper I · MCQs', href: '/past-papers/' + paperOneCode },
  { label: 'Paper II · Written responses', href: '/past-papers/' + paperTwoCode },
  ...physicsIx2019References,
];

export const physicsIx2019AnswerKey = physicsIxAnnualAnswerKey(mcqSource);
export const physicsIx2019ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs, paperOneCode, 2019);
export const physicsIx2019Marking = written.marking;
export const physicsIx2019ChapterWritten = written.chapters;
