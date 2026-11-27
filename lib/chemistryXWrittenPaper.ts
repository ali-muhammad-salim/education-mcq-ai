import chemistryReview from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
import { chemistryOutcomes, type combinedChemistryPaper } from './combinedChemistryPaper';
import type { PaperData, QuestionData } from './paperDataService';

export type ChemistryWrittenItem = {
  number: string; page: number; notesPage: number; marks: number; slo: string;
  stem: string; solution: string; hints: string; figure?: true;
};

export function chemistryXWrittenPaper(
  { paper: paperI, tabs: paperITabs }: ReturnType<typeof combinedChemistryPaper>,
  rows: ChemistryWrittenItem[],
  durationMinutes: number,
) {
  const year = paperI.examYear;
  const code = 'CHM-X-' + year + '-P2';
  const root = '/materials/ssc/chemistry/ssc-2/chemistry-x-' + year + '-';
  const notes = {
    year, label: 'E-marking notes', href: '/resources/chemistry-x-' + year + '-emarking', fileUrl: root + 'emarking.pdf',
  };
  const tabs = [
    paperITabs[0],
    { year, label: 'Paper II', href: '/past-papers/' + code },
    paperITabs[1],
    notes,
  ];

  function responseImage(number: string, kind: 'stronger' | 'weaker') {
    return '/paper-crops/' + code + '/q' + number + '-' + kind + '.webp';
  }

  const questions = rows.map(row => {
    const outcome = chemistryOutcomes.get(row.slo);
    if (!outcome) throw new Error('Unknown ' + year + ' Chemistry SLO ' + row.slo);
    const alternative = /^(9|10)[ab]$/.test(row.number);
    const difficulty = outcome.cognitiveLevel;
    return {
      id: code.toLowerCase() + '-q' + row.number, questionNumber: row.number, questionText: row.stem,
      questionType: alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
      marks: row.marks, difficulty, diagramBased: Boolean(row.figure), isDiagram: Boolean(row.figure),
      topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
      slos: [{ slo: { code: row.slo, description: outcome.description } }],
      sourceRegion: {
        pageNumber: row.page, cognitive_level: difficulty, model_answer: row.solution,
        model_answer_origin: 'RiseLearner worked solution', official_marking_notes: row.hints,
        original_reference_verified: true, original_reference_source: notes.fileUrl + '#page=' + row.notesPage,
        better_response_image: responseImage(row.number, 'stronger'),
        weaker_response_image: responseImage(row.number, 'weaker'),
        diagramUrl: row.figure ? '/paper-crops/' + code + '/q' + row.number + '.webp' : undefined,
        choice_instruction: alternative ? (row.number.endsWith('a') ? 'EITHER' : 'OR') + ' · Attempt one alternative for Question ' + parseInt(row.number, 10) : undefined,
        current_slo: row.slo, current_mapping: [{ code: row.slo, description: outcome.description, topic: outcome.topic, grade: 10 }],
        mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Chemistry' },
        in_syllabus: true, syllabus_reviewed: true, current_syllabus_reviewed: true,
        mapping_review_source_sha256: chemistryReview.syllabus.sha256,
        mapping_review_source_url: '/materials/ssc/chemistry/ssc-2/chemistry-ssc-full-syllabus-2025.pdf',
      },
    } satisfies QuestionData;
  });

  const paper: PaperData = {
    ...paperI, id: code, paperCode: code, title: 'Chemistry Class X ' + year + ' Paper II',
    fileUrl: root + 'paper-ii.pdf', totalMarks: 40, durationMinutes,
    rubricInstruction: 'Answer all ten questions. Attempt one alternative each for Questions 9 and 10.',
    questions,
  };

  return { paper, notes, tabs, responseImage };
}
