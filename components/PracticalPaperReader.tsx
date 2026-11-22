import type { ReactNode } from 'react';
import PaperViewerClient from '@/components/PaperViewerClient';

export default function PracticalPaperReader({ subject, subjectCode, grade, roman, year, durationMinutes, totalMarks, original, initialView, instructions, children }: {
  subject: string;
  subjectCode?: string;
  grade: number;
  roman: string;
  year: number;
  durationMinutes: number;
  totalMarks: number;
  original: string;
  initialView?: 'original';
  instructions?: string[];
  children: ReactNode;
}) {
  const code = `${subjectCode ?? subject}-${roman}-MODEL-${year}-P3`;
  return <PaperViewerClient hideHeader readOnly initialView={initialView} questions={[]} digitalContent={children}
    paper={{ id: code, paperCode: code, title: `${subject} Paper III Practical · Class ${roman}`,
      examYear: year, examSession: 'Model Examination', durationMinutes, totalMarks, fileUrl: original,
      academicClass: { level: grade, name: `Class ${roman}` }, subject: { name: subject }, instructions }} />;
}
