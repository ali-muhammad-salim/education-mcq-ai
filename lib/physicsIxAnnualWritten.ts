import { physicsIxSyllabusMapping } from '@/lib/physicsIxAnnualMcqs';
import type { QuestionData } from '@/lib/paperDataService';

interface WrittenRow {
  number: string;
  marks: number;
  slo: string | null;
  officialSlo?: string;
  level?: string;
  page: number;
  figure?: boolean;
  stem: string;
  solution: string;
  checking: string;
  better: string;
  weaker: string;
  paperPage?: number;
  numerical?: boolean;
  mappingReason?: string;
}

export function physicsIxAnnualWritten(rows: WrittenRow[], examYear: number, grade: 9 | 10 = 9) {
  const roman = grade === 10 ? 'X' : 'IX';
  const paperCode = 'PHY-' + roman + '-' + examYear + '-P2';
  const fileStem = 'physics-' + roman.toLowerCase() + '-' + examYear + '-emarking';
  const markingHref = '/resources/' + fileStem;
  const pdf = '/materials/ssc/physics/ssc-' + (grade - 8) + '/' + fileStem + '.pdf';
  const cropRoot = '/paper-crops/PHY-' + roman + '-' + examYear + '-EMARKING/';
  const marking = rows.map(row => ({
    ...row,
    example: {
      part: row.number, solution: row.checking, originalSlo: row.officialSlo, level: row.level,
      pdf: pdf + '#page=' + row.page,
      better: cropRoot + 'q' + row.number + '-better.webp',
      weaker: cropRoot + 'q' + row.number + '-weaker.webp',
      betterNotes: row.better, weakerNotes: row.weaker,
    },
  }));

  const questions: QuestionData[] = marking.map(row => {
    const syllabusMapping = physicsIxSyllabusMapping(row.slo, grade);
    const choice = row.number.endsWith('a') ? 'EITHER' : row.number.endsWith('b') ? 'OR' : undefined;
    return {
      ...syllabusMapping, id: paperCode + '-q' + row.number, questionNumber: row.number,
      questionText: row.stem, marks: row.marks, diagramBased: Boolean(row.figure),
      questionType: choice ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
      sourceRegion: {
        ...syllabusMapping.sourceRegion,
        slo: row.officialSlo, original_reference_verified: true, original_reference_source: markingHref,
        original_cognitive_level: row.level, cognitive_level: row.level,
        diagramUrl: row.figure ? '/paper-crops/' + paperCode + '/question-' + row.number + '.webp' : undefined,
        model_answer: row.solution, model_answer_origin: 'RiseLearner worked solution',
        emarkingExamples: [row.example], choice_instruction: choice,
        group_question_number: choice === 'EITHER' ? Number.parseInt(row.number, 10) : undefined,
        pageNumber: row.paperPage,
        is_numerical: row.numerical,
        mapping_reason: row.mappingReason,
      },
    };
  });

  const chapters = questions.filter(question => question.topics?.length).map(question => ({
    id: question.id, unitNumber: question.topics?.[0].topic.topicNumber,
    extended: question.questionType === 'EXTENDED_RESPONSE',
    questionNumber: question.questionNumber, questionText: question.questionText, marks: question.marks,
    sourceTitle: examYear + ' Annual Paper II', sourceHref: '/past-papers/' + paperCode + '#question-' + question.questionNumber,
    examYear, currentSlo: question.sourceRegion.current_slo ?? undefined,
    numerical: question.sourceRegion.is_numerical,
    modelAnswer: question.sourceRegion.model_answer ?? '', solutionOrigin: 'supplied_resource',
    choiceInstruction: question.sourceRegion.choice_instruction,
    diagramUrl: question.sourceRegion.diagramUrl,
  }));

  return { questions, marking, chapters };
}
