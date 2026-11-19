import mcqs from '@/data/computer-science/hssc_xi_2019_mcqs.json';
import written from '@/data/computer-science/hssc_xi_2019_written.json';
import { hsscComputerScienceSyllabus } from './hsscComputerScienceSyllabus';
import type { PaperData, QuestionData } from './paperDataService';
const root='/materials/hssc/computer-science/computer-science-xi-2019-';
export const hsscComputerScience2019Resources = {
  grade:11,roman:'XI',year:2019,
  papers:[
    {label:'Paper 1',slug:'paper-i',file:root+'paper-i.pdf',href:'/past-papers/CS-XI-2019-P1',pages:12,marks:30,minutes:45},
    {label:'Paper 1 keys',slug:'keys',file:root+'keys.pdf',href:root+'keys.pdf',pages:1,marks:0,minutes:0},
    {label:'Paper 2',slug:'paper-ii',file:root+'paper-ii.pdf',href:'/past-papers/CS-XI-2019-P2',pages:12,marks:55,minutes:135},
    {label:'Paper 2 E-marking',slug:'emarking',file:root+'emarking.pdf',href:'/resources/computer-science-xi-2019-emarking',pages:23,marks:0,minutes:0},
  ],
};
export const hsscComputerScience2019Papers: PaperData[]=[1,2].map(part=>{
  const mcq=part===1;const code=`CS-XI-2019-P${part}`;
  const source=hsscComputerScience2019Resources.papers[mcq?0:2];
  const rows=mcq?mcqs.map(q=>({...q,marks:1,diagramUrl:undefined as string|undefined,sloCodes:q.slo?[q.slo]:[],solution:undefined as string|undefined,officialNotes:undefined as string|undefined,betterImage:undefined as string|undefined,weakerImage:undefined as string|undefined,better:undefined as string|undefined,weaker:undefined as string|undefined,overall:undefined as string|undefined}))
    :written.map(q=>{const mappings=q.mapping?.split(',').map(m=>m.split(':'))??[];return {...q,slo:mappings[0]?.[1],sloCodes:mappings.map(m=>m[1]),grade:mappings.length?Number(mappings[0][0]):null,originalSlo:undefined,level:undefined,explanation:undefined,solution:q.answer,answer:undefined,choices:undefined,officialAnswer:undefined,feedback:undefined,overall:undefined}});
  return {id:code,paperCode:code,title:`Computer Science Class XI 2019 Paper ${mcq?'I':'II'}`,examYear:2019,examType:'ANNUAL',examSession:'Annual Examination',totalMarks:source.marks,durationMinutes:source.minutes,fileUrl:source.file,
    rubricInstruction:mcq?'Answer all 30 questions. Source-key issues are explained beside affected items.':'Answer Questions 1–9. Choose ONE alternative from Question 10.',
    academicClass:{name:'Class XI',level:11},subject:{id:'computer-science',name:'Computer Science',code:'CS-XI'},
    questions:rows.map((q):QuestionData=>{
      const syllabus=q.grade?hsscComputerScienceSyllabus('akueb',q.grade,'computer-science'):null;
      const linked=syllabus?.units.flatMap(unit=>unit.subtopics.flatMap(t=>t.slos.filter(s=>q.sloCodes.includes(s.code)).map(s=>({...s,topic:unit.name,unitNumber:unit.unitNumber,grade:q.grade!})) ))??[];
      if(q.slo&&!linked.length)throw Error(`Missing current SLO ${q.slo}`);
      return {id:code+'-q'+q.number,questionNumber:q.number,questionText:q.stem,questionType:mcq?'MULTIPLE_CHOICE':/^10[ab]$/.test(q.number)?'EXTENDED_RESPONSE':'CONSTRUCTED_RESPONSE',marks:q.marks,difficulty:q.level==='K'?'R':q.level??linked[0]?.cognitiveLevel??'U',diagramBased:Boolean(q.diagramUrl || q.choices?.A?.includes('![')),
        topics:linked.map(o=>({topic:{name:o.topic,topicNumber:String(o.unitNumber)}})),slos:linked.map(o=>({slo:{code:o.code,description:o.description}})),
        sourceRegion:{choices:q.choices,official_answer:q.officialAnswer,solved_correct_option:q.answer,
          explanation:q.explanation,option_feedback:q.feedback,answer_origin:mcq?'PROJECT_REVIEW_AGAINST_OFFICIAL_KEY':undefined,
          answer_status:mcq?!q.answer?'KEY_CONFLICT':q.officialAnswer===q.answer?'OFFICIAL_CONFIRMED':'ANSWER_CORRECTED':undefined,
          answer_review_note:mcq?q.explanation:undefined,original_reference_source:root+(mcq?'keys.pdf':'emarking.pdf'),original_reference_verified:true,
          slo:q.originalSlo||undefined,original_cognitive_level:q.level,
          current_slo:q.slo,current_mapping:linked,mapping_scope:{board:'AKU-EB',grade:q.grade??11,subject:'Computer Science'},
          mapping_status:linked.length?'MAPPED':'NO_DIRECT_OUTCOME',in_syllabus:Boolean(linked.length),out_of_syllabus:!linked.length,syllabus_reviewed:true,current_syllabus_reviewed:true,
          mapping_reason:linked.length?'Reviewed by content against the 2025 syllabus; the mapping grade identifies its current class.':'This historical topic has no direct outcome in the supplied 2025 HSSC Computer Science syllabus.',
          cognitive_level:q.level==='K'?'R':q.level??linked[0]?.cognitiveLevel??'U',pageNumber:q.page,diagramUrl:q.diagramUrl,
          model_answer:q.solution,model_answer_origin:mcq?undefined:'Project-reviewed worked solution alongside official AKU-EB e-marking notes',official_marking_notes:q.officialNotes,
          better_response_image:q.betterImage,weaker_response_image:q.weakerImage,better_response:q.better,weaker_response:q.weaker,overall_performance:q.overall,
          choice_group:!mcq&&/^10[ab]$/.test(q.number)?'10':undefined,choice_instruction:!mcq&&/^10[ab]$/.test(q.number)?'Attempt ONE alternative from this question.':undefined},
      };
    }),
  };
});
