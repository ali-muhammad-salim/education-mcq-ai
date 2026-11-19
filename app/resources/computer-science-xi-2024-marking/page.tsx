import Link from 'next/link';
import DocumentViews from '@/components/DocumentViews';
import StructuredContent from '@/components/StructuredContent';
import questions from '@/data/computer-science/hssc_xi_2024_written.json';
import styles from '@/components/MaterialLayout.module.css';
export default function Page(){
 return <section className={styles.page}>
  <h1>Computer Science XI 2024 marking guide</h1>
  <p>Project-authored study guidance with worked answers and proposed mark allocations. This guide was created because official e-marking notes were unavailable. It includes both alternatives for Questions 7 and 8.</p>
  <p><Link href="/past-papers/CS-XI-2024-P2">Open Paper II</Link></p>
  <DocumentViews title="Project-authored marking guide" original="/materials/hssc/computer-science/computer-science-xi-2024-project-marking-guide.pdf" continuousPdf>
   <div className={styles.digital}>{questions.map(q=><section key={q.number}>
    <h2>Question {q.number} · {q.marks} marks</h2>
    <StructuredContent text={q.stem}/>
    <h3>Worked answer</h3><StructuredContent text={q.answer}/>
    <h3>Proposed marking allocation</h3><ul>{q.rubric.map(item=><li key={item}>{item}</li>)}</ul>
   </section>)}</div>
  </DocumentViews>
 </section>;
}
