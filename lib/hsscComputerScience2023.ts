import mcqs from '@/data/computer-science/hssc_xi_2023_mcqs.json';
import written from '@/data/computer-science/hssc_xi_2023_written.json';
import { hsscComputerScienceSyllabus } from './hsscComputerScienceSyllabus';
import type { PaperData, QuestionData } from './paperDataService';
const root='/materials/hssc/computer-science/computer-science-xi-2023-';
export const hsscComputerScience2023Resources = {
  grade:11,roman:'XI',year:2023,
  papers:[
    {label:'Paper 1',slug:'paper-i',file:root+'paper-i.pdf',href:'/past-papers/CS-XI-2023-P1',pages:16,marks:50,minutes:90},
    {label:'Paper 1 keys',slug:'keys',file:root+'keys.pdf',href:root+'keys.pdf',pages:1,marks:0,minutes:0},
    {label:'Paper 2',slug:'paper-ii',file:root+'paper-ii.pdf',href:'/past-papers/CS-XI-2023-P2',pages:12,marks:35,minutes:90},
    {label:'Paper 2 E-marking',slug:'emarking',file:root+'emarking.pdf',href:'/resources/computer-science-xi-2023-emarking',pages:22,marks:0,minutes:0},
  ],
};
export const hsscComputerScience2023Papers: PaperData[]=[1,2].map(part=>{
  const mcq=part===1;const code=`CS-XI-2023-P${part}`;
  const source=hsscComputerScience2023Resources.papers[mcq?0:2];
  const rows=mcq?mcqs.map(q=>({...q,marks:1,solution:undefined as string|undefined,officialNotes:undefined as string|undefined,betterImage:undefined as string|undefined,weakerImage:undefined as string|undefined,better:undefined as string|undefined,weaker:undefined as string|undefined,overall:undefined as string|undefined}))
    :written.map(q=>{const mapping=q.mapping?.split(':');return {...q,slo:mapping?.[1],grade:mapping?Number(mapping[0]):null,explanation:undefined,solution:q.answer,answer:undefined,choices:undefined,officialAnswer:undefined,diagramUrl:undefined,feedback:undefined}});
  return {id:code,paperCode:code,title:`Computer Science Class XI 2023 Paper ${mcq?'I':'II'}`,examYear:2023,examType:'ANNUAL',examSession:'Annual Examination',totalMarks:source.marks,durationMinutes:90,fileUrl:source.file,
    rubricInstruction:mcq?'Answer all 50 questions. Source-key issues are explained beside affected items.':'Answer Questions 1–6. Choose ONE alternative from each of Questions 7 and 8.',
    academicClass:{name:'Class XI',level:11},subject:{id:'computer-science',name:'Computer Science',code:'CS-XI'},
    questions:rows.map((q):QuestionData=>{
      const syllabus=q.grade?hsscComputerScienceSyllabus('akueb',q.grade,'computer-science'):null;
      const linked=syllabus?.units.flatMap(unit=>unit.subtopics.flatMap(t=>t.slos.filter(s=>s.code===q.slo).map(s=>({...s,topic:unit.name,unitNumber:unit.unitNumber,grade:q.grade!})) ))??[];
      if(q.slo&&!linked.length)throw Error(`Missing current SLO ${q.slo}`);
      return {id:code+'-q'+q.number,questionNumber:q.number,questionText:q.stem,questionType:mcq?'MULTIPLE_CHOICE':/^[78][ab]$/.test(q.number)?'EXTENDED_RESPONSE':'CONSTRUCTED_RESPONSE',marks:q.marks,difficulty:q.level==='K'?'R':q.level??linked[0]?.cognitiveLevel??'U',diagramBased:Boolean(q.diagramUrl),
        topics:linked.map(o=>({topic:{name:o.topic,topicNumber:String(o.unitNumber)}})),slos:linked.map(o=>({slo:{code:o.code,description:o.description}})),
        sourceRegion:{choices:q.choices,official_answer:q.officialAnswer,solved_correct_option:q.answer,
          explanation:q.explanation,option_feedback:q.feedback,answer_origin:mcq?'PROJECT_REVIEW_AGAINST_OFFICIAL_KEY':undefined,
          answer_status:mcq?!q.answer?'KEY_CONFLICT':q.officialAnswer===q.answer?'OFFICIAL_CONFIRMED':'ANSWER_CORRECTED':undefined,
          answer_review_note:mcq?q.explanation:undefined,original_reference_source:root+(mcq?'keys.pdf':'emarking.pdf'),original_reference_verified:true,
          slo:q.originalSlo,original_cognitive_level:q.level,
          current_slo:q.slo,current_mapping:linked,mapping_scope:{board:'AKU-EB',grade:q.grade??11,subject:'Computer Science'},
          mapping_status:linked.length?'MAPPED':'NO_DIRECT_OUTCOME',in_syllabus:Boolean(linked.length),out_of_syllabus:!linked.length,syllabus_reviewed:true,current_syllabus_reviewed:true,
          mapping_reason:linked.length?'Reviewed by content against the 2025 syllabus; the mapping grade identifies its current class.':'This historical topic has no direct outcome in the supplied 2025 HSSC Computer Science syllabus.',
          cognitive_level:q.level==='K'?'R':q.level??linked[0]?.cognitiveLevel??'U',pageNumber:q.page,diagramUrl:q.diagramUrl,
          model_answer:q.solution,model_answer_origin:mcq?undefined:'Project-reviewed worked solution alongside official AKU-EB e-marking notes',official_marking_notes:q.officialNotes,
          better_response_image:q.betterImage,weaker_response_image:q.weakerImage,better_response:q.better,weaker_response:q.weaker,overall_performance:q.overall,
          choice_group:!mcq&&/^[78][ab]$/.test(q.number)?q.number[0]:undefined,choice_instruction:!mcq&&/^[78][ab]$/.test(q.number)?'Attempt ONE alternative from this question.':undefined},
      };
    }),
  };
});
