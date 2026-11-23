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
}

export function physicsIxAnnualWritten(rows: WrittenRow[], examYear: number) {
  const paperCode = 'PHY-IX-' + examYear + '-P2';
  const markingHref = '/resources/physics-ix-' + examYear + '-emarking';
  const pdf = '/materials/ssc/physics/ssc-1/physics-ix-' + examYear + '-emarking.pdf';
  const cropRoot = '/paper-crops/PHY-IX-' + examYear + '-EMARKING/';
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
    const syllabusMapping = physicsIxSyllabusMapping(row.slo);
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
      },
    };
  });

  const chapters = questions.filter(question => question.topics?.length).map(question => ({
    id: question.id, unitNumber: question.topics?.[0].topic.topicNumber,
    extended: question.questionType === 'EXTENDED_RESPONSE',
    questionNumber: question.questionNumber, questionText: question.questionText, marks: question.marks,
    sourceTitle: examYear + ' Annual Paper II', sourceHref: '/past-papers/' + paperCode + '#question-' + question.questionNumber,
    examYear, currentSlo: question.sourceRegion.current_slo ?? undefined,
    modelAnswer: question.sourceRegion.model_answer ?? '', solutionOrigin: 'supplied_resource',
    choiceInstruction: question.sourceRegion.choice_instruction,
    diagramUrl: question.sourceRegion.diagramUrl,
  }));

  return { questions, marking, chapters };
}
