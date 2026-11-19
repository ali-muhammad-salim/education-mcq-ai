import mcqs from '@/data/computer-science/hssc_xi_2022_mcqs.json';
import { hsscComputerScienceSyllabus } from './hsscComputerScienceSyllabus';
import type { PaperData, QuestionData } from './paperDataService';

const root = '/materials/hssc/computer-science/computer-science-xi-2022-';

export const hsscComputerScience2022Resources = {
  grade: 11,
  roman: 'XI',
  year: 2022,
  papers: [
    { label: 'Paper 1', slug: 'paper-i', file: root + 'paper-i.pdf', href: '/past-papers/CS-XI-2022-P1', pages: 24, marks: 65, minutes: 130 },
    { label: 'Paper 1 keys', slug: 'keys', file: root + 'key.pdf', href: root + 'key.pdf', pages: 3, marks: 0, minutes: 0 },
  ],
};

export const hsscComputerScience2022Papers: PaperData[] = [
  {
    id: 'CS-XI-2022-P1',
    paperCode: 'CS-XI-2022-P1',
    title: 'Computer Science Class XI 2022 Paper I',
    examYear: 2022,
    examType: 'ANNUAL',
    examSession: 'Annual Examination',
    totalMarks: 65,
    durationMinutes: 130,
    fileUrl: root + 'paper-i.pdf',
    rubricInstruction: 'There are two sections: Theory (Questions 1–50) and Alternate to Practical (Questions 51–65). Answer all 65 questions.',
    academicClass: { name: 'Class XI', level: 11 },
    subject: { id: 'computer-science', name: 'Computer Science', code: 'CS-XI' },
    questions: mcqs.map((q): QuestionData => {
      const syllabus = q.grade ? hsscComputerScienceSyllabus('akueb', q.grade, 'computer-science') : null;
      const linked = syllabus?.units.flatMap(unit =>
        unit.subtopics.flatMap(t =>
          t.slos.filter(s => s.code === q.slo).map(s => ({ ...s, topic: unit.name, unitNumber: unit.unitNumber, grade: q.grade! }))
        )
      ) ?? [];
      if (q.slo && !linked.length) throw Error(`Missing current SLO ${q.slo}`);

      const inSyllabus = Boolean(linked.length);
      const isDiagram = Boolean(q.diagramUrl || (typeof q.choices?.A === 'string' && q.choices.A.includes('![')));

      return {
        id: 'CS-XI-2022-P1-q' + q.number,
        questionNumber: q.number,
        questionText: q.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: q.level === 'K' ? 'R' : q.level ?? linked[0]?.cognitiveLevel ?? 'U',
        diagramBased: isDiagram,
        topics: linked.map(o => ({ topic: { name: o.topic, topicNumber: String(o.unitNumber) } })),
        slos: linked.map(o => ({ slo: { code: o.code, description: o.description } })),
        sourceRegion: {
          choices: q.choices,
          official_answer: q.officialAnswer,
          solved_correct_option: q.answer,
          explanation: q.explanation,
          option_feedback: q.feedback,
          answer_origin: 'OFFICIAL_KEY_VERIFIED',
          answer_status: 'OFFICIAL_CONFIRMED',
          answer_review_note: q.explanation,
          original_reference_source: root + 'key.pdf',
          original_reference_verified: true,
          slo: q.originalSlo,
          original_cognitive_level: q.level,
          current_slo: q.slo,
          current_mapping: linked,
          mapping_scope: { board: 'AKU-EB', grade: q.grade ?? 11, subject: 'Computer Science' },
          mapping_status: linked.length ? 'MAPPED' : 'NO_DIRECT_OUTCOME',
          in_syllabus: inSyllabus,
          out_of_syllabus: !inSyllabus,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_reason: linked.length
            ? (q.grade === 12
                ? 'Reviewed against the 2025 syllabus. Database items now belong to Class XII.'
                : 'Reviewed against the 2025 syllabus.')
            : 'This historical topic has no direct outcome in the supplied 2025 HSSC Computer Science syllabus.',
          cognitive_level: q.level === 'K' ? 'R' : q.level ?? linked[0]?.cognitiveLevel ?? 'U',
          pageNumber: q.page,
          diagramUrl: q.diagramUrl,
          assessmentSection: Number(q.number) <= 50 ? 'Theory' : 'Alternate to Practical (ATP)',
        },
      };
    }),
  },
];
