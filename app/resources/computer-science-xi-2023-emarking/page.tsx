import Link from 'next/link';
import {hsscComputerScience2023Papers,hsscComputerScience2023Resources} from '@/lib/hsscComputerScience2023';
import PaperViewerClient from '@/components/PaperViewerClient';
import {presentPaperQuestion} from '@/lib/paperPresentation';
import styles from '@/components/MaterialLayout.module.css';

export default function Page(){
 const paper=hsscComputerScience2023Papers[1];
 return <section className={styles.page}>
  <h1>Computer Science XI 2023 e-marking notes</h1>
  <p>Official AKU-EB response examples and checking comments accompany typed questions and project-reviewed worked answers. Source errors and assumptions are explained in the answers. Both ERQ alternatives are included.</p>
  <p><Link href="/past-papers/CS-XI-2023-P2">Open Paper II</Link></p>
  <PaperViewerClient paper={{...paper,fileUrl:hsscComputerScience2023Resources.papers[3].file}} questions={paper.questions.map(presentPaperQuestion)} historical hideHeader/>
 </section>;
}
