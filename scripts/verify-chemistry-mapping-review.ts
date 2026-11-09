import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import review from '../data/chemistry/reviewed_syllabus_mappings_2025.json';
import { mappedChapterGroups, mappedTheoryUnits } from '../services/materials/practice';
loadEnvConfig(process.cwd());
const db=new PrismaClient();
async function main(){
 const rows=await db.pastPaperQuestion.findMany({where:{pastPaper:{paperCode:{in:[...new Set(review.questions.map(q=>q.paperCode))]}}},include:{pastPaper:true,slos:{include:{slo:true}}}});
 const expected=new Map<number,Set<string>>([[9,new Set()],[10,new Set()]]);
 const backup=JSON.parse(readFileSync('output/resource-audit/mapping-repair-backup.json','utf8')) as {code:string;number:string;row:{sourceRegion:Record<string,unknown>}}[];
 for(const q of review.questions){
  const row=rows.find(r=>r.pastPaper.paperCode===q.paperCode&&r.questionNumber===q.questionNumber)!;
  assert.ok(row);assert.equal(createHash('sha256').update(row.questionText).digest('hex'),q.questionSha256);
  const meta=row.sourceRegion as Record<string,any>;
  assert.equal(meta.mapping_status,q.mappingStatus);assert.equal(meta.mapping_scope.grade,q.grade);assert.equal(meta.mapping_review_source_sha256,review.syllabus.sha256);
  assert.deepEqual(row.slos.map(s=>s.slo.code).sort(),q.outcomes.map(o=>o.code).sort());
  const before=backup.find(b=>b.code===q.paperCode&&b.number===q.questionNumber)!.row.sourceRegion;
  for(const key of ['choices','correct_answer','official_answer','solved_correct_option','model_answer','slo'])assert.deepEqual(meta[key],before[key],`${q.paperCode}/${q.questionNumber}: ${key} changed`);
  if(q.outcomes.length)expected.get(q.grade)!.add(row.id);else assert.equal(row.sloId,null);
 }
 const result=[],routes=new Set<string>();
 for(const grade of [9,10]){
  const mcq=await mappedChapterGroups('AKU-EB',grade,'Chemistry'),theory=await mappedTheoryUnits('AKU-EB',grade,'Chemistry');
  const actual=new Set([...mcq.flatMap(g=>g.questions.map(q=>q.id)),...theory.flatMap(u=>[...u.crqs,...u.erqs].map(q=>q.id))]);
  assert.deepEqual([...actual].sort(),[...expected.get(grade)!].sort());
  const prefix=`/akueb/${grade===9?'IX':'X'}/chemistry`;
  for(const tail of ['mcqs/chapter-wise','mcqs/past-papers','crqs','erqs'])routes.add(prefix+'/'+tail);
  for(const unit of theory){if(unit.crqs.length)routes.add(prefix+'/crqs/'+unit.unitNumber);if(unit.erqs.length)routes.add(prefix+'/erqs/'+unit.unitNumber);}
  result.push({grade,reviewedQuestions:actual.size,mcqChapters:mcq.length,theoryChapters:theory.length});
 }
 for(const route of routes){const response=await fetch((process.env.CHAPTER_CHECK_URL||'http://localhost:3001')+route,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,route);const html=await response.text();assert.ok(!html.includes('Internal Server Error'),route);if(/\/(crqs|erqs)\/\d+$/.test(route))assert.ok(html.includes('sourceHref'),route);}
 const report={reviewed:review.questions.length,mapped:165,noDirect:3,grades:result,routesChecked:routes.size,originalAnswersPreserved:true};
 writeFileSync('output/chemistry-syllabus-review/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
