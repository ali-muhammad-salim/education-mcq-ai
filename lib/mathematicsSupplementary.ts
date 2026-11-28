import questionBank from '@/data/mathematics/supplementary-practice.json';
import classNine from '@/data/mathematics/ssc1_exact_syllabus.json';
import classTen from '@/data/mathematics/ssc2_exact_syllabus.json';
import type { PaperData, QuestionData } from './paperDataService';

export const mathematicsXSubjectHref = '/akueb/X/mathematics';
export const mathematicsXResourcesHref = mathematicsXSubjectHref + '/resources/other';

const pdfPath = '/materials/ssc/mathematics/ssc-2/supplementary/';
const resources = {
  'school-mcq-quiz': {
    title: 'Aga Khan School, Garden · Mathematics MCQ practice',
    paperCode: 'MTH-X-SCHOOL-QUIZ',
    note: 'Reviewed questions from the supplied school quiz. Where the supplied answer or wording contained a mistake, the digital question shows the corrected version.',
  },
  'knowledge-platform-practice': {
    title: 'Knowledge Platform · Mathematics practice papers',
    paperCode: 'MTH-X-KP-PRACTICE',
    original: pdfPath + 'knowledge-platform-practice.pdf',
    answers: pdfPath + 'knowledge-platform-answers.pdf',
    note: 'Questions and worked answers from the paired practice PDFs. The original packet also covers topics from the earlier syllabus.',
  },
  'annotated-practice-paper': {
    title: 'Mathematics practice paper · Annotated scan',
    paperCode: 'MTH-X-ANNOTATED-SCAN',
    original: pdfPath + 'annotated-practice-paper.pdf',
    note: 'The scan contains handwritten workings. The digital questions use independently checked answers.',
  },
  'practice-marking-guide': {
    title: 'Mathematics practice marking guide · Selected Paper II questions',
    paperCode: 'MTH-X-PRACTICE-GUIDE',
    original: pdfPath + 'practice-marking-guide.pdf',
    note: 'The supplied guide includes a Paper I answer list with no matching question paper. Its independently solvable Paper II questions are available below.',
  },
} satisfies Record<keyof typeof questionBank, {
  title: string;
  paperCode: string;
  note: string;
  original?: string;
  answers?: string;
}>;

type ResourceSlug = keyof typeof resources;
type Resource = (typeof resources)[ResourceSlug] & { original?: string; answers?: string };
type ResourceQuestion = {
  number: string;
  stem: string;
  solution: string;
  slo?: string;
  options?: Record<string, string>;
  answer?: string;
  diagram?: string;
  marks?: number;
  worked?: boolean;
  extended?: boolean;
};

const outcomes = new Map(([9, 10] as const).flatMap(grade =>
  (grade === 9 ? classNine : classTen).flatMap(unit => unit.subtopics.flatMap(topic =>
    topic.slos.map(slo => [slo.code, {
      code: slo.code,
      description: slo.description,
      topic: unit.name,
      grade,
      level: slo.cognitiveShort,
    }] as const))),
));

export const mathematicsXResources = (Object.keys(resources) as ResourceSlug[]).map(slug => {
  const resource: Resource = resources[slug];
  return { ...resource, slug, href: mathematicsXResourcesHref + '/' + slug };
});

export const mathematicsSupplementaryPapers: PaperData[] = mathematicsXResources.map(resource => {
  const questions: QuestionData[] = (questionBank[resource.slug] as ResourceQuestion[]).map(item => {
    const outcome = item.slo ? outcomes.get(item.slo) : undefined;
    return {
      id: resource.paperCode.toLowerCase() + '-' + item.number,
      questionNumber: item.number,
      questionText: item.stem,
      questionType: item.options ? 'MULTIPLE_CHOICE' : item.extended ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
      marks: item.marks ?? 1,
      difficulty: outcome?.level,
      diagramBased: Boolean(item.diagram),
      sourceRegion: {
        choices: item.options,
        correct_answer: item.answer,
        explanation: item.solution,
        model_answer: item.options ? undefined : item.solution,
        model_answer_origin: item.options ? undefined : 'RiseLearner worked solution',
        diagramUrl: item.diagram,
        is_numerical: item.worked,
        current_syllabus_reviewed: true,
        current_slo: outcome?.code,
        current_mapping: outcome ? [outcome] : [],
        mapping_scope: outcome ? { board: 'AKU-EB', grade: outcome.grade, subject: 'Mathematics' } : undefined,
        cognitive_level: outcome?.level,
      },
    };
  });
  return {
    id: resource.paperCode,
    paperCode: resource.paperCode,
    title: resource.title,
    examYear: 0,
    examType: 'SUPPLEMENTARY',
    fileUrl: resource.original,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'mathematics-x', name: 'Mathematics', code: 'MTH' },
    questions,
  };
});

export function mathematicsSupplementarySourceHref(paperCode: string, questionNumber: string) {
  const resource = mathematicsXResources.find(item => item.paperCode === paperCode);
  return resource ? resource.href + '#question-' + encodeURIComponent(questionNumber) : undefined;
}
