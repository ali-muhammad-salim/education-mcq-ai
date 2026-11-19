import unit16Questions from '@/data/physics/ssc2_unit16_extra_mcqs.json';
import { physicsUnit16Resource as resource } from '@/lib/physicsUnit16Resource';

export const physicsUnit16ChapterQuestions = unit16Questions.map(question => ({
  id: `${resource.quizCode}-${question.number}`,
  unitNumber: resource.unit,
  paperCode: resource.quizCode,
  sourceTitle: 'D.C. Circuits Notes',
  sourceHref: `${resource.pdf}#page=${question.page}`,
  questionNumber: 700 + question.number,
  rawQuestionNumber: question.number,
  stem: question.stem,
  options: Object.fromEntries(question.options.map((text, index) => ['ABCD'[index], text])),
  correctOption: question.answer,
  explanation: question.explanation,
  cognitiveLevel: question.number <= 9 ? 'Understanding'
    : question.number <= 16 || question.number >= 32 ? 'Application'
    : 'Remembering',
  diagramBased: false,
}));

export function includesPhysicsUnit16Notes(quizCode: string) {
  return /^PHY-X-UNIT-(0|16)-ALL-(ALL|R|U|A)$/.test(quizCode);
}
