import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentViews from '@/components/DocumentViews';
import key from '@/data/physics/ssc1_2025_official_key.json';
import styles from '@/components/MaterialLayout.module.css';

export default async function Page({params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;
  if (!['physics-ix-2025-key','physics-ix-2025-emarking'].includes(resource)) notFound();
  const isKey=resource.endsWith('-key'), title=isKey?'Physics IX · 2025 · Official answer key':'Physics IX · 2025 · E-marking notes';
  return <section className={styles.page}><Link href="/akueb/IX/physics/pastpapers">← Physics past papers</Link><h1>{title}</h1><DocumentViews title={title} original={isKey?key.sourceUrl:'/materials/ssc/physics/ssc-1/physics-ix-2025-emarking.pdf'}>
    {isKey?<div className={styles.digital}><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><caption>Official exam-year references · current syllabus mappings are separate</caption><thead><tr>{['Question','Original SLO','Answer','Level'].map(x=><th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>)}</tr></thead><tbody>{key.entries.map(row=><tr key={row.questionNumber}><td style={{padding:'.65rem'}}><Link href={'/past-papers/PHY-IX-2025-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link></td><td>{row.slo}</td><td>{row.answer}</td><td>{row.cognitiveLevel}</td></tr>)}</tbody></table></div><p>K: Knowledge · U: Understanding · A: Application and beyond</p><Link href="/past-papers/PHY-IX-2025-P1?view=solved">Paper 1 · answers & explanations →</Link></div>:undefined}
  </DocumentViews><nav className={styles.actions}><Link className={styles.button} href="/past-papers/PHY-IX-2025-P1">Paper 1</Link><Link className={styles.button} href="/past-papers/PHY-IX-2025-P2">Paper 2</Link></nav></section>;
}
