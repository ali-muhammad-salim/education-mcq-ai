/** Repair missing SLO relations only when both the bundled code and description match an active outcome. */
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { mkdirSync, writeFileSync } from 'node:fs';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
async function main() {
 const versions=await db.syllabusVersion.findMany({where:{isLatest:true},include:{subject:{include:{academicClass:{include:{programme:{include:{board:true}}}}}},topics:{include:{subtopics:{include:{slos:true}}}}}});
 const papers=await db.pastPaper.findMany({where:{sourceDocumentId:null},include:{questions:true}});
 const plans=[];
 for(const summary of getAllStandardPapers()) {
  const paper=getFallbackPaper(summary.paperCode)!;
  for(const saved of papers.filter(p=>p.paperCode===paper.paperCode))for(const q of paper.questions) {
   const meta=q.sourceRegion, row=saved.questions.find(r=>r.questionNumber===q.questionNumber);
   if(!row||row.sloId||!meta.current_slo||!meta.current_syllabus_reviewed||!meta.mapping_scope)continue;
   const description=meta.current_mapping?.[0]?.description||meta.slo_text||'';
   const targets=versions.filter(v=>v.subject.name===meta.mapping_scope!.subject&&v.subject.academicClass.level===meta.mapping_scope!.grade&&v.subject.academicClass.programme.board.shortCode.replace(/[^a-z]/gi,'').toLowerCase()==='akueb').flatMap(v=>v.topics.flatMap(t=>t.subtopics.flatMap(s=>s.slos.filter(o=>o.code===meta.current_slo&&normalized(o.description)===normalized(description)).map(o=>({sloId:o.id,topicId:t.id,subtopicId:s.id,syllabusVersionId:v.id,subjectId:v.subjectId})))));
   const own=targets.filter(t=>t.subjectId===saved.subjectId);
   const target=own.length===1?own[0]:targets.length===1?targets[0]:null;
   if(!target)continue;
   if(row.questionText.trim()!==q.questionText.trim())throw new Error('Source mismatch '+paper.paperCode+'/'+q.questionNumber);
   plans.push({code:paper.paperCode,number:q.questionNumber,row,target});
  }
 }
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'APPLY':'READ_ONLY',exactSyllabusMatches:plans.length}));
 if(!process.argv.includes('--apply'))return;
 mkdirSync('output/resource-audit',{recursive:true});writeFileSync('output/resource-audit/slo-link-repair-backup.json',JSON.stringify(plans,null,2));
 await db.$transaction(async tx=>{for(const {row,target}of plans){
  const {subjectId: _subjectId,...data}=target;
  await tx.pastPaperQuestion.update({where:{id:row.id},data});
  await tx.pastPaperQuestionTopic.upsert({where:{pastPaperQuestionId_topicId:{pastPaperQuestionId:row.id,topicId:target.topicId}},update:{},create:{pastPaperQuestionId:row.id,topicId:target.topicId}});
  await tx.pastPaperQuestionSubtopic.upsert({where:{pastPaperQuestionId_subtopicId:{pastPaperQuestionId:row.id,subtopicId:target.subtopicId}},update:{},create:{pastPaperQuestionId:row.id,subtopicId:target.subtopicId}});
  await tx.pastPaperQuestionSLO.upsert({where:{pastPaperQuestionId_sloId:{pastPaperQuestionId:row.id,sloId:target.sloId}},update:{},create:{pastPaperQuestionId:row.id,sloId:target.sloId}});
 }},{timeout:60000});
}
main().catch(e=>{console.error(e instanceof Error?e.message:'SLO repair failed');process.exitCode=1}).finally(()=>db.$disconnect());
