import unit17Mcqs from '@/data/physics/ssc2_unit17_extra_mcqs.json';
import { physicsUnit16ChapterQuestions } from '@/lib/physicsUnit16Questions';
import { physicsUnit17Resource as resource } from '@/lib/physicsUnit17Resources';

export const physicsUnit17ChapterQuestions = unit17Mcqs.map(question => ({
  id: `${resource.mcqSourceCode}-${question.number}`,
  unitNumber: resource.unit,
  paperCode: resource.mcqSourceCode,
  sourceTitle: 'Magnetic Fields and Flux · 17.2',
  sourceHref: `${resource.topics[0].pdf}#page=${question.page}`,
  questionNumber: 800 + question.number,
  rawQuestionNumber: question.number,
  duplicateGroup: question.duplicateGroup,
  stem: question.stem,
  options: question.options,
  correctOption: question.answer,
  explanation: question.explanation,
  cognitiveLevel: [17, 18, 21, 22].includes(question.number) ? 'Remembering' : 'Understanding',
  diagramBased: false,
  current_slo: question.slo,
  current_syllabus_reviewed: true,
}));

export const physicsSupplementaryQuestions = [
  ...physicsUnit16ChapterQuestions,
  ...physicsUnit17ChapterQuestions,
];

export function includesPhysicsSupplementaryQuestions(quizCode: string) {
  return /^PHY-X-UNIT-(0|16|17)-ALL-(ALL|R|U|A)$/.test(quizCode);
}
