import { loadEnvConfig } from '@next/env';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { gradablePracticeQuestions } from '../services/assessment/service';
import { mkdirSync, writeFileSync } from 'node:fs';
loadEnvConfig(process.cwd());
async function main() {
 const base=process.env.CHAPTER_CHECK_URL||'http://localhost:3001';
 const papers=getAllStandardPapers();
 const routes=new Set(papers.map(p=>'/past-papers/'+p.paperCode));
 for(const grade of ['IX','X'])for(const subject of ['physics','computer-science','chemistry','mathematics'])for(const tail of ['pastpapers','model-papers','mcqs/chapter-wise','crqs','syllabus'])routes.add(`/akueb/${grade}/${subject}/${tail}`);
 const issues:{route:string;detail:string}[]=[], checks:{route:string;status:number}[]=[];
 const referenceRoutes=new Set<string>();
 async function check(route:string,quiz=false){
  try{
   const response=await fetch(base+route,{signal:AbortSignal.timeout(60000)});
   const body=await response.text();
   for(const match of body.matchAll(/href="(\/resources\/[^"?#]+)"/g))referenceRoutes.add(match[1]);
   checks.push({route,status:response.status});
   if(!response.ok||body.includes('Internal Server Error')){issues.push({route,detail:'HTTP '+response.status});return;}
   if(quiz){const data=JSON.parse(body);const code=decodeURIComponent(route.slice('/api/quizzes/'.length));const expected=gradablePracticeQuestions(code,getFallbackPaper(code)!.questions).length;if(data.quiz?.questions?.length!==expected)issues.push({route,detail:`Expected ${expected} questions, got ${data.quiz?.questions?.length}`});}
  }catch(e){issues.push({route,detail:e instanceof Error?e.message:'Request failed'});}
 }
 const list=[...routes];
 for(let i=0;i<list.length;i+=3)await Promise.all(list.slice(i,i+3).map(route=>check(route)));
 for(const summary of papers){const p=getFallbackPaper(summary.paperCode)!;if(p.questions.length&&p.questions.every(q=>q.questionType==='MULTIPLE_CHOICE'))await check('/api/quizzes/'+encodeURIComponent(p.paperCode),true);}
 const references=[...referenceRoutes];
 for(let i=0;i<references.length;i+=3)await Promise.all(references.slice(i,i+3).map(route=>check(route)));
 const result={checkedAt:new Date().toISOString(),base,checks,issues};mkdirSync('output/resource-audit',{recursive:true});writeFileSync('output/resource-audit/routes.json',JSON.stringify(result,null,2));console.log(JSON.stringify({routesChecked:checks.length,issues},null,2));
 if(issues.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
