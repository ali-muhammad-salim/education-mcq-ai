import questions from '@/data/physics/ssc1_2025_past_mcqs.json';
import key from '@/data/physics/ssc1_2025_official_key.json';

export const answerReviewPaper = 'PHY-IX-2025-P1';
const proposals = [
  { number:12, answer:'C', reason:'Each team pulls with 4 × 10 = 40 N. For an ideal balanced rope, its tension is the pull from one side (40 N), rather than the sum of both opposing pulls.', page:4 },
  { number:39, answer:'D', reason:'Proposed school-level interpretation: a surface protected from infrared heating should absorb poorly. Under comparable thermal-radiation conditions, poor absorbers are also poor emitters. Review the wording and the applicable conditions before deciding.', page:10 },
  { number:40, answer:'A', reason:'Under the usual school-level comparison, a dull black surface is a better thermal radiator than a shiny/light surface. The question omits surface finish and temperature details, so the proposed answer still needs your decision.', page:10 },
];
export const legacyAnswerCases = proposals.map(proposal => {
  const question = questions.find(q => Number(q.questionNumber) === proposal.number)!;
  return { ...proposal, stem:question.stem, options:question.options as Record<string,string>, official:key.entries.find(row=>row.questionNumber===proposal.number)!.answer };
});
export type AnswerReviewCase = typeof legacyAnswerCases[number];
export type PublishedAnswerDecision = { number:number; status:'KEEP_OFFICIAL'|'APPROVE_CORRECTION'; answer:string; note:string; decidedAt:string; sourceFingerprint:string };
const normalize = (value:string) => value.replace(/\s+/g,' ').trim();
export function matchesAnswerCase(item:AnswerReviewCase, stem:string, options:Record<string,string>) {
  return normalize(stem)===normalize(item.stem) && Object.entries(item.options).every(([letter,text])=>normalize(options[letter]||'')===normalize(text)) && Object.keys(options).length===Object.keys(item.options).length;
}
export function applyAnswerDecision(meta:Record<string,any>, number:string|number, stem:string, options:Record<string,string>, decisions:PublishedAnswerDecision[]) {
  const item=legacyAnswerCases.find(row=>row.number===Number(number));
  const decision=decisions.find(row=>row.number===Number(number));
  if(!item || !decision || decision.status!=='APPROVE_CORRECTION' || !matchesAnswerCase(item,stem,options) || !item.options[decision.answer]) return meta;
  return {...meta,correct_answer:decision.answer,correctOption:decision.answer,official_answer:item.official,answer_review_note:`Administrator-approved correction: ${decision.answer} (${item.options[decision.answer]}). The original answer sheet prints ${item.official}. ${decision.note}`,explanation:decision.note,option_feedback:[]};
}
