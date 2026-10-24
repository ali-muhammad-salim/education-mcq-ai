import ScientificText from './ScientificText';
import {sourceBlocks} from '@/lib/sourceTables';
import styles from './MaterialLayout.module.css';

export default function SourceDocumentText({text}:{text:string}){
  const content=(value:string)=><ScientificText text={value.replace(/<br\s*\/?>/gi,'\n')}/>;
  return <>{sourceBlocks(text).map((block,index)=>block.kind==='text'?<div key={index}><ScientificText text={block.text}/></div>:<div key={index} className={styles.sourceTableScroll} role="region" aria-label="Source table" tabIndex={0}><table className={styles.sourceTable}><thead><tr>{block.headers.map((header,i)=><th scope="col" key={i}>{content(header)}</th>)}</tr></thead><tbody>{block.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{content(cell)}</td>)}</tr>)}</tbody></table></div>)}</>;
}
