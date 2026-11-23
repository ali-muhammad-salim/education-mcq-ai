import mcqSource from '@/data/physics/ssc1_2017_mcqs.json';
import writtenSource from '@/data/physics/ssc1_2017_written.json';
import { physicsIxAnnualAnswerKey, physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';

const paperOneCode = 'PHY-IX-2017-P1';
const paperTwoCode = 'PHY-IX-2017-P2';
const keyHref = '/resources/physics-ix-2017-key';
const markingHref = '/resources/physics-ix-2017-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2017-';
const mcqs = physicsIxAnnualMcqs(mcqSource, paperOneCode, keyHref);
const written = physicsIxAnnualWritten(writtenSource, 2017);

const common = {
  examYear: 2017, examSession: 'April/May', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsIx2017Papers = [
  {
    ...common, id: paperOneCode, paperCode: paperOneCode,
    title: 'Physics Class IX Annual 2017 · Paper I', fileUrl: pdfRoot + 'paper-i.pdf',
    totalMarks: 25, durationMinutes: 35, questionCount: 25, printedCode: 'S1701-1711110',
    questions: mcqs,
  },
  {
    ...common, id: paperTwoCode, paperCode: paperTwoCode,
    title: 'Physics Class IX Annual 2017 · Paper II', fileUrl: pdfRoot + 'paper-ii.pdf',
    totalMarks: 40, durationMinutes: 145, questionCount: 11, printedCode: 'S1701-1711120',
    rubricInstruction: 'Answer all eleven questions. Attempt one alternative each for Questions 9, 10 and 11.',
    markingGuideUrl: markingHref, questions: written.questions,
  },
] satisfies PaperData[];

export const physicsIx2017References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2017 },
  { href: markingHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2017 },
];

export const physicsIx2017Tabs = [
  { label: 'Paper I · MCQs', href: '/past-papers/' + paperOneCode },
  { label: 'Paper II · Written responses', href: '/past-papers/' + paperTwoCode },
  ...physicsIx2017References,
];

export const physicsIx2017AnswerKey = physicsIxAnnualAnswerKey(mcqSource);
export const physicsIx2017ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs, paperOneCode, 2017);
export const physicsIx2017Marking = written.marking;
export const physicsIx2017ChapterWritten = written.chapters;
