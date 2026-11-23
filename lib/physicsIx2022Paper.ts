import source from '@/data/physics/ssc1_2022_mcqs.json';
import { physicsIxAnnualAnswerKey, physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import type { PaperData } from '@/lib/paperDataService';

const paperCode = 'PHY-IX-2022-P1';
const keyHref = '/resources/physics-ix-2022-key';
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2022-';
const mcqs = physicsIxAnnualMcqs(source.map((row, i) => ({
  ...row,
  assessmentSection: i === 0 ? 'Theory' : i === 40 ? 'Alternate to Practical' : undefined,
})), paperCode, keyHref);

export const physicsIx2022Paper = {
  id: paperCode, paperCode, title: 'Physics Class IX Annual 2022 · Paper I',
  examYear: 2022, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
  totalMarks: 50, durationMinutes: 100, questionCount: 50, printedCode: 'S2201-1711110',
  markScalingNote: 'The board scaled the 40 Theory marks to 65 for the examination results.',
  fileUrl: pdfRoot + 'paper-i.pdf', questions: mcqs,
} satisfies PaperData;

export const physicsIx2022Key = { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2022 };

export const physicsIx2022Tabs = [
  { label: 'Paper I · Theory and Alternate to Practical', href: '/past-papers/' + paperCode },
  physicsIx2022Key,
];

export const physicsIx2022AnswerKey = physicsIxAnnualAnswerKey(source);
export const physicsIx2022ChapterMcqs = physicsIxAnnualChapterMcqs(mcqs, paperCode, 2022);
