/** Read-only audit of shared formatting against the registered educational content. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import katex from 'katex';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { formatEducationalMath, formatExplicitMath } from '../lib/syllabusMath';
import MathText from '../components/MathText';
import ScientificText from '../components/ScientificText';
const texts=new Map<string,string>();
function add(text:unknown,source:string){if(typeof text==='string'&&text.trim())texts.set(text,source);}
for(const summary of getAllStandardPapers()){
 const paper=getFallbackPaper(summary.paperCode)!;
 for(const q of paper.questions){const source=`${paper.paperCode}/${q.questionNumber}`;add(q.questionText,source);for(const text of Object.values(q.sourceRegion.choices||{}))add(text,source);for(const key of ['explanation','model_answer','slo_text'] as const)add(q.sourceRegion[key],source);}
}
for(const subject of ['mathematics','physics','chemistry','computer-science'])for(const part of [1,2]){
 const units=JSON.parse(readFileSync(`data/${subject}/ssc${part}_exact_syllabus.json`,'utf8'));
 for(const unit of units)for(const sub of unit.subtopics)for(const slo of sub.slos)add(slo.description,`${subject}/${part}/${slo.code}`);
}
const issues:{source:string;expression:string;error:string}[]=[];
let formulas=0;
for(const [text,source] of texts){
 const html=renderToStaticMarkup(React.createElement(MathText,{text}));
 if(html.includes('class="katex-error"'))throw new Error('Visible renderer error '+source);
 renderToStaticMarkup(React.createElement(ScientificText,{text}));
 for(const match of formatEducationalMath(text).matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){
  const expression=formatExplicitMath(match[1]||match[2]);formulas++;
  try{katex.renderToString(expression,{throwOnError:true,strict:false,trust:false,maxExpand:1000,maxSize:50});}
  catch(error){issues.push({source,expression,error:error instanceof Error?error.message:'Unsupported source expression'});}
 }
}
mkdirSync('output/sitewide-format-review',{recursive:true});writeFileSync('output/sitewide-format-review/content-audit.json',JSON.stringify({textsChecked:texts.size,formulasChecked:formulas,unsupportedSourceExpressions:issues},null,2));
console.log(JSON.stringify({textsChecked:texts.size,formulasChecked:formulas,unsupportedSourceExpressions:issues.slice(0,12),totalUnsupported:issues.length},null,2));
