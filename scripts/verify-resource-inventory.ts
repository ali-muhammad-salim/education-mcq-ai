import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { mathematicsPaperManifests } from '../lib/mathematicsPapers';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { paperAnswer, paperChoices } from '../lib/paperPresentation';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
 const issues: {code:string;detail:string}[]=[];
 const assets = new Set<string>();
 const checkAsset=(value:unknown, code:string)=>{
  if(typeof value!=='string'||!value.startsWith('/')||! /\.(pdf|png|jpg|jpeg|webp)(?:\?|$)/i.test(value)) return;
  const url=value.split('?')[0];assets.add(url);
  if(!existsSync(path.join(process.cwd(),'public',url))) issues.push({code,detail:'Missing asset '+url});
 };
 const stored=await db.pastPaper.findMany({include:{questions:{include:{slos:{include:{slo:true}}}},subject:true,academicClass:true}});
 const papers=[];
 let pendingMappings=0;
 for(const row of getAllStandardPapers()) {
  const p=getFallbackPaper(row.paperCode)!;
  if(!p) {issues.push({code:row.paperCode,detail:'Missing digital paper'});continue;}
  checkAsset(p.fileUrl,p.paperCode);
  const candidates=stored.filter(s=>s.paperCode===p.paperCode);
  if(candidates.length!==1) issues.push({code:p.paperCode,detail:'Database paper records: '+candidates.length+' '+candidates.map(c=>c.id).join(',')});
  const saved=candidates.find(s=>s.id===p.id)||candidates.find(s=>s.academicClass.level===p.academicClass.level&&s.subject.name===p.subject.name)||candidates[0];
  if(saved&&saved.questions.length!==p.questions.length) issues.push({code:p.paperCode,detail:`Question count source ${p.questions.length}, database ${saved.questions.length}`});
  let keys=0,review=0;
  for(const q of p.questions) {
   const m=q.sourceRegion;
   if(m.mapping_status==='PENDING_REVIEW')pendingMappings++;
   for(const v of Object.values(m)) checkAsset(v,p.paperCode+'/Q'+q.questionNumber);
   if(q.questionType==='MULTIPLE_CHOICE') {if(paperAnswer(m,paperChoices(m.choices)))keys++;else review++;}
   if(saved){const matches=saved.questions.filter(s=>s.questionNumber===q.questionNumber);
    if(matches.length!==1) issues.push({code:p.paperCode,detail:`Q${q.questionNumber}: database records ${matches.length}`});
    const sq=matches[0];
    if(sq&&sq.questionText.trim()!==q.questionText.trim()) issues.push({code:p.paperCode,detail:`Q${q.questionNumber}: source/database text differs`});
    if(sq&&m.current_syllabus_reviewed&&m.current_slo&&!sq.sloId) issues.push({code:p.paperCode,detail:`Q${q.questionNumber}: reviewed SLO ${m.current_slo} missing from database (${saved.id}, scope ${JSON.stringify(m.mapping_scope)})`});
   }
  }
  papers.push({code:p.paperCode,questions:p.questions.length,usableMcqKeys:keys,keysRequiringReview:review,databaseQuestions:saved?.questions.length});
 }
 for(const [year,manifest] of Object.entries(mathematicsPaperManifests)){
  for(const source of Object.values(manifest.sources))if(source){checkAsset(source.url,'MTH '+year);if(existsSync(path.join('public',source.url))&&createHash('sha256').update(readFileSync(path.join('public',source.url))).digest('hex')!==source.sha256)issues.push({code:'MTH '+year,detail:'Source SHA mismatch '+source.url});}
  for(const crop of manifest.crops)checkAsset(crop.url,'MTH '+year);
 }
 const books=await db.book.findMany({select:{sourceFile:true,title:true}});
 for(const book of books)checkAsset(book.sourceFile,book.title);
 const warnings=issues.filter(i=>i.detail.startsWith('Database paper records: 2 '));
 const failures=issues.filter(i=>!warnings.includes(i));
 const result={checkedAt:new Date().toISOString(),papers,assetsChecked:assets.size,pendingMappings,warnings,issues:failures};
 mkdirSync('output/resource-audit',{recursive:true});writeFileSync('output/resource-audit/inventory.json',JSON.stringify(result,null,2));
 if(failures.length)process.exitCode=1;
 console.log(JSON.stringify({papers:papers.length,questions:papers.reduce((n,p)=>n+p.questions,0),assetsChecked:assets.size,pendingMappings,legacyDuplicatePaperCodes:warnings.length,issues:failures},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
