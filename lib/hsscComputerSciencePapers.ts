import transcripts from '@/data/computer-science/hssc_model_transcripts.json';
import reviewXI from '@/data/computer-science/hssc_xi_model_answer_review.json';
import reviewXII from '@/data/computer-science/hssc_xii_model_answer_review.json';
import written from '@/data/computer-science/hssc_model_written_review.json';
import { hsscComputerScienceSyllabus } from './hsscComputerScienceSyllabus';
import { hsscComputerScienceResources } from './hsscComputerScienceResources';
import { hsscXiAnnualComputerSciencePapers } from './hsscXiAnnualComputerScience';
import type { PaperData, QuestionData } from './paperDataService';

type Review = { slo: string; answer: string | null; explanation: string; feedback: Array<{key: string; reason: string}> };

const modelPapers: PaperData[] = ([11, 12] as const).flatMap(grade => {
  const roman = grade === 11 ? 'XI' : 'XII';
  const resources = hsscComputerScienceResources('akueb', grade, 'computer-science')!;
  const syllabus = hsscComputerScienceSyllabus('akueb', grade, 'computer-science')!;
  const outcomes = new Map(syllabus.units.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(slo => [slo.code, { ...slo, topic: unit.name, unitNumber: unit.unitNumber }] as const))));
  const review: Record<string, Review> = grade === 11 ? reviewXI : reviewXII;
  return [1, 2].map(part => {
    const id = `CS-${roman}-P${part}`;
    const mcq = part === 1;
    const source = resources.papers[part - 1];
    const rows = mcq ? transcripts[roman].map(row => ({
      number: String(row.number), page: row.page, stem: row.stem, marks: 1,
      codes: [review[String(row.number)].slo], choices: row.choices as Record<string, string>,
      answer: review[String(row.number)].answer, explanation: review[String(row.number)].explanation,
      feedback: review[String(row.number)].feedback,
      solution: undefined as string | undefined,
      diagram: 'diagramUrl' in row ? row.diagramUrl as string : undefined,
    })) : written[roman].map(row => ({
      ...row, codes: row.slos, choices: undefined, answer: undefined,
      explanation: undefined, feedback: undefined, solution: row.answer, diagram: undefined,
    }));
    return {
      id, paperCode: id, title: `Computer Science Class ${roman} Model Paper ${mcq ? 'I' : 'II'}`,
      examYear: resources.year, examType: 'MODEL_EXAM', examSession: 'Model Examination',
      totalMarks: source.marks, durationMinutes: source.minutes, fileUrl: source.file,
      rubricInstruction: mcq ? 'Answer all 50 questions. Source issues are noted beside affected items.' : 'Answer Questions 1–7 and choose ONE alternative from each of Questions 8 and 9.',
      academicClass: { name: `Class ${roman}`, level: grade },
      subject: { id: 'computer-science', name: 'Computer Science', code: `CS-${roman}` },
      questions: rows.map((row): QuestionData => {
        const linked = row.codes.map(code => {
          const outcome = outcomes.get(code);
          if (!outcome) throw Error(`Missing Computer Science outcome ${code}`);
          return outcome;
        });
        const first = linked[0];
        return {
          id: `${id}-q${row.number}`, questionNumber: row.number, questionText: row.stem,
          marks: row.marks, questionType: mcq ? 'MULTIPLE_CHOICE' : row.marks === 7 ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
          difficulty: first.cognitiveLevel, diagramBased: Boolean(row.diagram),
          topics: [...new Map(linked.map(o => [o.unitNumber, { topic: { name: o.topic, topicNumber: String(o.unitNumber) } }])).values()],
          slos: linked.map(o => ({ slo: { code: o.code, description: o.description } })),
          sourceRegion: {
            choices: row.choices, solved_correct_option: row.answer,
            answer_origin: mcq ? 'PROJECT_SOLVED' : undefined,
            answer_status: mcq ? row.answer ? 'PROJECT_REVIEWED' : 'KEY_CONFLICT' : undefined,
            explanation: row.explanation, option_feedback: row.feedback,
            answer_review_note: mcq && (!row.answer || (grade === 11 && [8, 16, 43].includes(Number(row.number))) || (grade === 12 && [30, 44].includes(Number(row.number)))) ? row.explanation : undefined,
            model_answer: row.solution, model_answer_origin: mcq ? undefined : 'Project worked solution',
            choice_group: !mcq && /^[89][ab]$/.test(row.number) ? row.number[0] : undefined,
            choice_instruction: !mcq && /^[89][ab]$/.test(row.number) ? 'Attempt ONE alternative from this question.' : undefined,
            current_syllabus_reviewed: true, syllabus_reviewed: true, current_slo: first.code,
            current_mapping: linked, mapping_scope: { board: 'AKU-EB', grade, subject: 'Computer Science' },
            in_syllabus: true, cognitive_level: first.cognitiveLevel,
            pageNumber: row.page, diagramUrl: row.diagram,
          },
        };
      }),
    };
  });
});

export const hsscComputerSciencePapers: PaperData[] = [
  ...modelPapers,
  ...hsscXiAnnualComputerSciencePapers,
];

