import Link from 'next/link';
import {hsscComputerScience2019Papers,hsscComputerScience2019Resources} from '@/lib/hsscComputerScience2019';
import PaperViewerClient from '@/components/PaperViewerClient';
import {presentPaperQuestion} from '@/lib/paperPresentation';
import styles from '@/components/MaterialLayout.module.css';

export default function Page(){
 const paper=hsscComputerScience2019Papers[1];
 return <section className={styles.page}>
  <h1>Computer Science XI 2019 e-marking notes</h1>
  <p>Official AKU-EB response examples and checking comments accompany typed questions and project-reviewed worked answers. Source errors and assumptions are explained in the answers. Both ERQ alternatives are included.</p>
  <PaperViewerClient paper={{...paper,fileUrl:hsscComputerScience2019Resources.papers[3].file}} questions={paper.questions.map(presentPaperQuestion)} historical hideHeader resourceLinks={<Link href="/past-papers/CS-XI-2019-P2">Open Paper II</Link>}/>
 </section>;
}
