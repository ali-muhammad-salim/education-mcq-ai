import key from '@/data/physics/ssc1_2025_official_key.json';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import current from '@/data/physics/ssc1_exact_syllabus.json';
export const physics2025Resources = [
  { label: 'Paper 1 · official answer key', href: '/resources/physics-ix-2025-key', year: 2025 },
  { label: 'E-marking notes', href: '/resources/physics-ix-2025-emarking', year: 2025 },
];
export const annualAnswerReviews: Record<number, string> = {
  12: 'Official key: D (80 N). The ideal-rope tension interpretation (40 N) needs educator review before approving a teaching explanation.',
  39: 'Official key: C (poor absorbers and good emitters). This combination conflicts with the usual relationship between absorption and emission for the same radiation. An educator must review the source before this is used as a teaching explanation.',
  40: 'Official key: B (white). This appears to conflict with the usual result that a dull black surface is the better heat radiator under comparable conditions. An educator must review the source before this is used as a teaching explanation.',
};
export function annualOriginalReference(number: string | number): {slo?:string;original_reference_verified?:boolean;original_reference_source?:string;cognitive_level?:string;answer_review_note?:string} {
  const entry = key.entries.find(row => row.questionNumber === Number(number));
  return entry ? { slo: entry.slo, original_reference_verified: true, original_reference_source: '/resources/physics-ix-2025-key', cognitive_level: entry.cognitiveLevel, ...(annualAnswerReviews[entry.questionNumber]?{answer_review_note:annualAnswerReviews[entry.questionNumber]}:{}) } : {};
}
/** Apply a source-reviewed legacy mapping only while the exact stem and outcome
 * still match the reviewed content. A newer compiled syllabus must bypass this. */
export function annualCurrentMapping(number: string | number, stem: string) {
  const row=reviewed.entries.find(item=>item.questionNumber===Number(number));
  const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
  if(!row || normalize(row.stem)!==normalize(stem)) return {};
  const outcome=current.flatMap(unit=>unit.subtopics.flatMap(topic=>topic.slos)).find(item=>item.code===row.code);
  if(!outcome || outcome.description!==row.description) return {};
  return {current_syllabus_reviewed:true,mapping_scope:{board:'AKU-EB',grade:9,subject:'Physics'},current_mapping:[{code:row.code,description:row.description,topic:row.topic}],mapping_reason:reviewed.reviewMethod};
}
