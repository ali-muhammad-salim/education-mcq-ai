'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import type { AnswerReviewCase, PublishedAnswerDecision } from '@/lib/legacyAnswerReview';
import styles from './LegacyPaperChecks.module.css';
type Item=AnswerReviewCase&{revision:string;decision:PublishedAnswerDecision|null};
export default function LegacyPaperChecks() {
  const [items,setItems]=useState<Item[]>([]), [error,setError]=useState(''), [message,setMessage]=useState('');
  async function load(signal?:AbortSignal){
    const response=await fetch('/api/admin/knowledge/answer-reviews',{signal,cache:'no-store'});
    if(response.status===401||response.status===403)return;
    const data=await response.json(); if(!response.ok)throw new Error(data.error?.message||'Could not load answer comparisons.');
    setItems(data.items);
  }
  useEffect(()=>{const controller=new AbortController();void load(controller.signal).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return()=>controller.abort();},[]);
  async function save(item:Item,status:'KEEP_OFFICIAL'|'APPROVE_CORRECTION',answer:string,note:string){
    setError('');setMessage('');
    const response=await fetch('/api/admin/knowledge/answer-reviews',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:item.number,revision:item.revision,status,answer,note})});
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Could not save this decision.');
    await load();setMessage(`Question ${item.number}: decision saved. New practice and quiz attempts use your approved answer. Existing attempt scores are unchanged.`);
  }
  if(!items.length&&!error)return null;
  return <section className={styles.panel} aria-label="Answer-sheet review"><h2>Answer-sheet review</h2><p>Compare the source with the proposed answer. Until you decide, students see the answer-sheet answer. Approving a correction updates digital answers and new quiz attempts; the original PDF and existing attempts stay intact.</p>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
    {items.map(item=><AnswerCard key={item.number+item.revision} item={item} save={save}/>)}
    <details><summary>Current syllabus checks ({reviewed.pending.length})</summary><ul>{reviewed.pending.map(item=><li key={item.questionNumber}><Link href={'/past-papers/PHY-IX-2025-P1#question-'+item.questionNumber}>Question {item.questionNumber}</Link> · {item.reason}</li>)}</ul></details>
  </section>;
}
function AnswerCard({item,save}:{item:Item;save:(item:Item,status:'KEEP_OFFICIAL'|'APPROVE_CORRECTION',answer:string,note:string)=>Promise<void>}){
  const [answer,setAnswer]=useState(item.decision?.answer||item.answer),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function decide(status:'KEEP_OFFICIAL'|'APPROVE_CORRECTION'){setBusy(true);setError('');try{await save(item,status,answer,note);}catch(error){setError(error instanceof Error?error.message:'Could not save.');}finally{setBusy(false);}}
  return <article className={styles.card}><h3>Physics IX · 2025 · Question {item.number}</h3><p style={{whiteSpace:'pre-wrap'}}>{item.stem.replace(/\\n/g,'\n')}</p><div className={styles.compare}><div><strong>Answer sheet</strong><p>{item.official} · {item.options[item.official]}</p></div><div><strong>Proposed answer · needs your decision</strong><p>{item.answer} · {item.options[item.answer]}</p><p>{item.reason}</p></div></div><p><Link href={`/materials/ssc/physics/ssc-1/physics-ix-2025-paper-i.pdf#page=${item.page}`} target="_blank" rel="noreferrer">Original question · page {item.page}</Link> · <Link href="/resources/physics-ix-2025-key" target="_blank">Answer sheet</Link></p><p><strong>Currently shown:</strong> {item.decision?.status==='APPROVE_CORRECTION'?`${item.decision.answer} · admin-approved correction`:`${item.official} · answer sheet`}{item.decision&&<> · {new Date(item.decision.decidedAt).toLocaleString()}<br/>{item.decision.note}</>}</p><fieldset disabled={busy}><legend>Your selected answer</legend>{Object.entries(item.options).map(([letter,text])=><label className={styles.option} key={letter}><input type="radio" name={'answer-'+item.number} value={letter} checked={answer===letter} onChange={()=>setAnswer(letter)}/><span>{letter} · {text}</span></label>)}<label className={styles.note}>Decision note (at least 10 characters)<textarea rows={3} value={note} maxLength={2000} onChange={event=>setNote(event.target.value)} placeholder="Record your reasoning or board correction reference"/></label><div className={styles.actions}><button type="button" disabled={busy||note.trim().length<10} onClick={()=>void decide('KEEP_OFFICIAL')}>Keep answer-sheet answer</button><button type="button" disabled={busy||note.trim().length<10||answer===item.official} onClick={()=>void decide('APPROVE_CORRECTION')}>{busy?'Saving…':'Approve selected correction'}</button></div></fieldset>{error&&<p role="alert">{error}</p>}</article>;
}
