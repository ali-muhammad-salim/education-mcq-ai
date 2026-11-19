import mcqs from '@/data/computer-science/hssc_xi_2021_mcqs.json';
import {hsscComputerScienceSyllabus} from './hsscComputerScienceSyllabus';
import type {PaperData,QuestionData} from './paperDataService';

const root='/materials/hssc/computer-science/computer-science-xi-2021-';
export const hsscComputerScience2021Resources={
 grade:11,roman:'XI',year:2021,
 papers:[
  {label:'Paper 1 (Theory & ATP)',slug:'paper-i',file:root+'paper-i.pdf',href:'/past-papers/CS-XI-2021-P1',pages:20,marks:65,minutes:130},
  {label:'Paper 1 keys',slug:'keys',file:root+'keys.pdf',href:root+'keys.pdf',pages:2,marks:0,minutes:0},
 ],
};
export const hsscComputerScience2021Papers:PaperData[]=[{
 id:'CS-XI-2021-P1',paperCode:'CS-XI-2021-P1',title:'Computer Science Class XI 2021 Combined Theory and Alternate-to-Practical Paper',examYear:2021,examType:'ANNUAL',examSession:'Annual Examination',
 totalMarks:65,durationMinutes:130,fileUrl:root+'paper-i.pdf',
 rubricInstruction:'Answer all 65 MCQs: Questions 1–50 are Theory; Questions 51–65 are Alternate to Practical.',
 markScalingNote:'The source awards 50 raw theory marks and 15 alternate-to-practical marks. For official examination results, the 50 theory marks were equated to 85. This study quiz reports raw marks and excludes items without a unique verified answer.',
 academicClass:{name:'Class XI',level:11},subject:{id:'computer-science',name:'Computer Science',code:'CS-XI'},
 questions:mcqs.map((q):QuestionData=>{
  const syllabus=q.grade?hsscComputerScienceSyllabus('akueb',q.grade,'computer-science'):null;
  const linked=syllabus?.units.flatMap(unit=>unit.subtopics.flatMap(t=>t.slos.filter(s=>s.code===q.slo).map(s=>({...s,topic:unit.name,unitNumber:unit.unitNumber,grade:q.grade!}))))??[];
  if(q.slo&&!linked.length)throw Error('Missing current SLO '+q.slo);
  return {id:'CS-XI-2021-P1-q'+q.number,questionNumber:q.number,questionText:q.stem,questionType:'MULTIPLE_CHOICE',marks:1,difficulty:q.level==='K'?'R':q.level,diagramBased:Boolean(q.diagramUrl),
   topics:linked.map(s=>({topic:{name:s.topic,topicNumber:String(s.unitNumber)}})),slos:linked.map(s=>({slo:{code:s.code,description:s.description}})),
   sourceRegion:{choices:q.choices,official_answer:q.officialAnswer,solved_correct_option:q.answer,
    explanation:q.explanation,option_feedback:q.feedback,answer_origin:'PROJECT_REVIEW_AGAINST_OFFICIAL_KEY',
    answer_status:!q.answer?'KEY_CONFLICT':q.answer===q.officialAnswer?'OFFICIAL_CONFIRMED':'ANSWER_CORRECTED',answer_review_note:q.explanation,
    original_reference_source:root+'keys.pdf',original_reference_verified:true,slo:q.originalSlo,original_cognitive_level:q.level,
    cognitive_level:q.level==='K'?'R':q.level,current_slo:q.slo,current_mapping:linked,mapping_scope:{board:'AKU-EB',grade:q.grade??11,subject:'Computer Science'},
    mapping_status:linked.length?'MAPPED':'NO_DIRECT_OUTCOME',in_syllabus:Boolean(linked.length),out_of_syllabus:!linked.length,syllabus_reviewed:true,current_syllabus_reviewed:true,
    mapping_reason:linked.length?'Reviewed by question content against the current 2025 syllabus; database topics now belong to Class XII.':'This historical topic has no direct outcome in the supplied 2025 HSSC Computer Science syllabus.',
    pageNumber:q.page,diagramUrl:q.diagramUrl,assessmentSection:q.section==='THEORY'?'Theory':'Alternate to Practical',
   },
  };
 }),
}];
