'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import reviewed from '@/data/physics/ssc1_2025_current_mapping.json';
import { annualAnswerReviews } from '@/lib/legacyPaperEvidence';
export default function LegacyPaperChecks() {
  const [admin,setAdmin]=useState(false);
  useEffect(()=>{let alive=true;void fetch('/api/account').then(async response=>{if(response.ok && alive)setAdmin((await response.json()).user?.role==='ADMIN');}).catch(()=>{});return()=>{alive=false;};},[]);
  if(!admin)return null;
  return <section style={{maxWidth:1050,margin:'1rem auto',padding:'1rem',border:'1px solid var(--border-color)',borderRadius:12,color:'var(--text-color)',background:'var(--card-bg)'}}><details><summary style={{cursor:'pointer',minHeight:44}}>Legacy Physics 2025 · source checks ({reviewed.pending.length + Object.keys(annualAnswerReviews).length})</summary><p>These source-backed checks need an educator decision; no current mapping or explanation has been invented for them.</p><ul>{reviewed.pending.map(item=><li key={item.questionNumber} style={{padding:'.6rem 0'}}><Link href={'/past-papers/PHY-IX-2025-P1#question-'+item.questionNumber}>Question {item.questionNumber}</Link> · {item.reason}</li>)}{Object.entries(annualAnswerReviews).map(([number,note])=><li key={'answer-'+number} style={{padding:'.6rem 0'}}><Link href={'/past-papers/PHY-IX-2025-P1#question-'+number}>Question {number}</Link> · {note} The official key is preserved.</li>)}</ul><Link href="/resources/physics-ix-2025-key">Official key</Link> · <Link href="/resources/physics-ix-2025-emarking">E-marking notes</Link><p>Resolve source and mapping decisions through the reviewed upload workflow so the evidence and syllabus edition remain recorded.</p></details></section>;
}
