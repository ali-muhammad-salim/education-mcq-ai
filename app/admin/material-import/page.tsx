'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { materialImportManifest,relativeSourceMatches,type MaterialImportManifest } from '@/lib/materialImportManifest';
import styles from './page.module.css';
type Row={path:string;title:string;sha256:string;status:string;jobId?:string;error?:string};
type Job={id:string;status:string;title:string;sha256?:string;error?:string;result?:{documentId?:string;pagesProcessed?:number;totalPages?:number;message?:string;status?:string}};
const hash=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
export default function Page(){
  const [manifest,setManifest]=useState<MaterialImportManifest|null>(null),[batch,setBatch]=useState(''),[files,setFiles]=useState<File[]>([]),[rows,setRows]=useState<Row[]>([]),[jobs,setJobs]=useState<Job[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function readManifest(file?:File){if(!file)return;try{const text=await file.text(),parsed=materialImportManifest.parse(JSON.parse(text));setManifest(parsed);setBatch(await hash(new TextEncoder().encode(text).buffer));setRows(parsed.entries.map(entry=>({path:entry.relativePath,title:entry.title,sha256:entry.sha256,status:'Ready'})));setError('');}catch{setError('Choose a valid, duplicate-free import manifest.');}}
  useEffect(()=>{if(!batch)return;const controller=new AbortController();async function refresh(){try{const response=await fetch('/api/admin/material-import?batch='+batch,{signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Could not read import status.');setJobs(data.jobs);setRows(current=>current.map(row=>{const job=(data.jobs as Job[]).find(job=>job.sha256===row.sha256);return job?{...row,jobId:job.id,status:job.status}:row;}));}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Could not read status.');}}void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>{controller.abort();clearInterval(timer);};},[batch]);
  function update(path:string,patch:Partial<Row>){setRows(current=>current.map(row=>row.path===path?{...row,...patch}:row));}
  async function upload(limit=Infinity){let uploaded=0;if(!manifest||!batch)return;setBusy(true);setError('');try{
    for(const entry of manifest.entries){
      if(rows.find(row=>row.path===entry.relativePath)?.jobId)continue;
      const matches=files.filter(file=>relativeSourceMatches(file.webkitRelativePath||file.name,entry.relativePath)||(!file.webkitRelativePath&&file.name===entry.relativePath.replace(/\\/g,'/').split('/').at(-1)));
      if(!matches.length)throw new Error('Select the source folder or PDFs; missing file: '+entry.relativePath);
      update(entry.relativePath,{status:'Checking source'});
      let file:File|undefined;
      for(const candidate of matches)if(await hash(await candidate.arrayBuffer())===entry.sha256){file=candidate;break;}
      if(!file)throw new Error('No matching source hash: '+entry.relativePath);
      const form=new FormData();form.set('file',file);form.set('expectedSha256',entry.sha256);form.set('importBatchId',batch);form.set('board',manifest.board);
      for(const name of ['title','subject','classLevel','resourceType','examYear','paperComponent','syllabusEffectiveFrom','syllabusSourceSha256'] as const)if(entry[name])form.set(name,entry[name]!);
      form.set('classLevels',JSON.stringify(entry.classLevels));form.set('publishAfterReview',String(entry.publishAfterReview));form.set('studyResources',String(entry.studyResources));
      if(entry.note)form.set('importNote',entry.note);
      if(entry.studyKinds)form.set('studyKinds',JSON.stringify(entry.studyKinds));
      update(entry.relativePath,{status:'Uploading'});
      const response=await fetch('/api/admin/material-import',{method:'POST',body:form}),data=await response.json();
      if(!response.ok)throw new Error(entry.relativePath+': '+(data.error?.message||'Upload failed.'));
      update(entry.relativePath,{status:data.duplicate?'Already imported':data.status,jobId:data.jobId,error:undefined});
      if(++uploaded>=limit)break;
    }
  }catch(error){setError(error instanceof Error?error.message:'Import stopped. Already queued jobs are safe; resume after resolving the error.');}finally{setBusy(false);}}
  return <main className={styles.page}><Link href="/upload">← Upload centre</Link><h1>Import resource folder</h1><p>Choose the reviewed manifest and source folder. Files upload one at a time; exact duplicates are skipped. Verified sources publish in their subject, while doubtful pages remain in source review.</p><div className={styles.controls}><label>Import manifest<input type="file" accept="application/json,.json" disabled={busy} onChange={event=>void readManifest(event.target.files?.[0])}/></label><label>Material folder<input type="file" multiple {...{webkitdirectory:''}} disabled={busy} onChange={event=>setFiles(Array.from(event.target.files||[]).filter(file=>file.name.toLowerCase().endsWith('.pdf')))}/></label><label>PDF files (alternative)<input type="file" multiple accept="application/pdf,.pdf" disabled={busy} onChange={event=>setFiles(Array.from(event.target.files||[]))}/></label><button type="button" disabled={busy||!manifest||!files.length} onClick={()=>void upload(1)}>Queue next source</button><button type="button" disabled={busy||!manifest||!files.length} onClick={()=>void upload()}>{busy?'Uploading…':'Start / resume import'}</button></div><p role="status">{files.length} PDFs selected · {rows.length} unique sources planned · {rows.filter(row=>row.jobId).length} queued</p>{error&&<p role="alert">{error}</p>}<div className={styles.table}><table><thead><tr><th>Resource</th><th>Upload</th><th>Processing</th></tr></thead><tbody>{rows.map(row=>{const job=jobs.find(job=>job.id===row.jobId);return <tr key={row.path}><td>{row.title}<details><summary>Source</summary>{row.path}</details></td><td>{row.status}</td><td>{job?`${job.status}${job.result?.pagesProcessed?' · '+job.result.pagesProcessed+'/'+job.result.totalPages+' pages':''}`:'—'}{job?.error&&<p>{job.error}</p>}{job?.result?.documentId&&<Link href="/admin/knowledge">Source review</Link>}</td></tr>;})}</tbody></table></div></main>;
}
