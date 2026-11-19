import mcqs from '@/data/computer-science/hssc_xi_2025_mcqs.json';
import written from '@/data/computer-science/hssc_xi_2025_written.json';
import { hsscComputerScienceSyllabus } from './hsscComputerScienceSyllabus';
import type { PaperData, QuestionData } from './paperDataService';

const root = '/materials/hssc/computer-science/computer-science-xi-2025-';

export const computerScienceXi2025Resources: Array<{ label: string; href: string; year: number; original?: string }> = [
  { label: "Paper 1", href: `/past-papers/CS-XI-2025-P1`, year: 2025 },
  { label: "Paper 1 keys", href: root + "key.pdf", year: 2025 },
  { label: "Paper 2", href: `/past-papers/CS-XI-2025-P2`, year: 2025 },
];

export const hsscXiAnnualComputerSciencePapers: PaperData[] = [1, 2].map(part => {
  const mcq = part === 1;
  const code = `CS-XI-2025-P${part}`;
  const rows = mcq
    ? mcqs.map(q => ({
        ...q,
        marks: 1,
        solution: undefined as string | undefined,
        rubric: undefined as string[] | undefined,
        diagramUrl: undefined as string | undefined,
      }))
    : written.map(q => {
        const mapping = q.mapping?.split(':');
        return {
          ...q,
          slo: mapping?.[1],
          grade: mapping ? Number(mapping[0]) : null,
          explanation: undefined,
          solution: q.answer,
          answer: undefined,
          choices: undefined,
          officialAnswer: undefined,
          originalSlo: undefined,
          level: undefined,
          diagramUrl: q.number === '8a' ? '/paper-crops/CS-XI-2025-P2/question-8a.png' : undefined,
          feedback: undefined,
        };
      });

  return {
    id: code,
    paperCode: code,
    title: `Computer Science Class XI Annual 2025 · Paper ${mcq ? 'I' : 'II'}`,
    examYear: 2025,
    examType: 'ANNUAL',
    examSession: 'Annual Examination',
    totalMarks: mcq ? 50 : 35,
    durationMinutes: 90,
    rubricInstruction: mcq
      ? 'Answer all 50 questions. Black out ONE circle for your choice on the answer grid.'
      : 'There are EIGHT questions. Answer ALL questions. Questions 7 and 8 each offers TWO choices. Attempt any ONE choice from each.',
    fileUrl: root + (mcq ? 'paper-i.pdf' : 'paper-ii.pdf'),
    academicClass: { name: 'Class XI', level: 11 },
    subject: { id: 'computer-science', name: 'Computer Science', code: 'CS-XI' },
    questions: rows.map((q): QuestionData => {
      const syllabus = q.grade ? hsscComputerScienceSyllabus('akueb', q.grade, 'computer-science') : null;
      const linked = syllabus?.units.flatMap(unit =>
        unit.subtopics.flatMap(t =>
          t.slos.filter(s => s.code === q.slo).map(s => ({ ...s, topic: unit.name, unitNumber: unit.unitNumber, grade: q.grade! }))
        )
      ) ?? [];
      if (q.slo && !linked.length) throw Error(`Missing current SLO ${q.slo}`);

      const inSyllabus = Boolean(linked.length);
      return {
        id: code + '-q' + q.number,
        questionNumber: q.number,
        questionText: q.stem,
        questionType: mcq ? 'MULTIPLE_CHOICE' : /^[78][ab]$/.test(q.number) ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: q.marks,
        difficulty: q.level === 'K' ? 'R' : q.level ?? linked[0]?.cognitiveLevel ?? 'U',
        diagramBased: Boolean(q.diagramUrl),
        topics: linked.map(o => ({ topic: { name: o.topic, topicNumber: String(o.unitNumber) } })),
        slos: linked.map(o => ({ slo: { code: o.code, description: o.description } })),
        sourceRegion: {
          choices: q.choices,
          official_answer: q.officialAnswer,
          solved_correct_option: q.answer,
          explanation: q.explanation,
          option_feedback: q.feedback,
          answer_origin: mcq ? 'OFFICIAL_KEY_VERIFIED' : undefined,
          answer_status: mcq ? (q.answer ? 'OFFICIAL_CONFIRMED' : 'KEY_CONFLICT') : undefined,
          answer_review_note: mcq ? q.explanation : undefined,
          original_reference_source: root + 'key.pdf',
          original_reference_verified: mcq,
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
          model_answer: q.solution,
          model_answer_origin: mcq ? undefined : 'Project worked solution',
          official_marking_notes: q.rubric?.join('\n'),
          choice_group: !mcq && /^[78][ab]$/.test(q.number) ? q.number[0] : undefined,
          choice_instruction: !mcq && /^[78][ab]$/.test(q.number) ? 'Attempt ONE alternative from this question.' : undefined,
        },
      };
    }),
  };
});
