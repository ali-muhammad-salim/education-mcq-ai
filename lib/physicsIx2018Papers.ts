import mcqSource from '@/data/physics/ssc1_2018_mcqs.json';
import writtenSource from '@/data/physics/ssc1_2018_written.json';
import { physicsIxAnnualAnswerKey, physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxAnnualWritten } from '@/lib/physicsIxAnnualWritten';
import type { PaperData } from '@/lib/paperDataService';

const paperOneCode = 'PHY-IX-2018-P1';
const paperTwoCode = 'PHY-IX-2018-P2';
const keyHref = '/resources/physics-ix-2018-key';
const markingHref = '/resources/physics-ix-2018-emarking';
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2018-';
const mcqs = physicsIxAnnualMcqs(mcqSource, paperOneCode, keyHref);
const written = physicsIxAnnualWritten(writtenSource, 2018);

const common = {
  examYear: 2018, examSession: 'April/May', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};

export const physicsIx2018Papers = [
  {
    ...common, id: paperOneCode, paperCode: paperOneCode,
    title: 'Physics Class IX Annual 2018 · Paper I', fileUrl: pdfRoot + 'paper-i.pdf',
    totalMarks: 25, durationMinutes: 35, questionCount: 25, printedCode: 'S1801-1711110',
    questions: mcqs,
  },
  {
    ...common, id: paperTwoCode, paperCode: paperTwoCode,
    title: 'Physics Class IX Annual 2018 · Paper II', fileUrl: pdfRoot + 'paper-ii.pdf',
    totalMarks: 40, durationMinutes: 145, questionCount: 11, printedCode: 'S1801-1711120',
    rubricInstruction: 'Answer all eleven questions. Attempt one alternative each for Questions 9, 10 and 11.',
    markingGuideUrl: markingHref, questions: written.questions,
  },
] satisfies PaperData[];

export const physicsIx2018References = [
  { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2018 },
  { href: markingHref, label: 'Official e-marking notes', fileUrl: pdfRoot + 'emarking.pdf', year: 2018 },
];

export const physicsIx2018Tabs = [
  { label: 'Paper I · MCQs', href: '/past-papers/' + paperOneCode },
  { label: 'Paper II · Written responses', href: '/past-papers/' + paperTwoCode },
  ...physicsIx2018References,
];

export const physicsIx2018AnswerKey = physicsIxAnnualAnswerKey(mcqSource);
export const physicsIx2018ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs, paperOneCode, 2018);
export const physicsIx2018Marking = written.marking;
export const physicsIx2018ChapterWritten = written.chapters;
