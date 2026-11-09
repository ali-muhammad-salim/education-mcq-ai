import ScientificText from './ScientificText';
import type {ReactNode} from 'react';
import {sourceBlocks} from '@/lib/sourceTables';
import styles from './MaterialLayout.module.css';

function LinkedSourceText({text}:{text:string}){
  const parts:ReactNode[]=[];
  const pattern=/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s<>()[\]]+|mailto:[^\s<>()[\]]+)/g;
  let start=0,match:RegExpExecArray|null;
  while((match=pattern.exec(text))){
    if(match.index>start)parts.push(<ScientificText key={'t'+start} text={text.slice(start,match.index)}/>);
    const explicit=Boolean(match[1]);
    const raw=match[2]||match[3];
    const target=explicit?raw:raw.replace(/[.,;:!?]+$/,'');
    const suffix=explicit?'':raw.slice(target.length);
    let valid=false;
    try{valid=['https:','http:','mailto:'].includes(new URL(target).protocol);}catch{}
    parts.push(valid?<a key={'l'+match.index} href={target} target="_blank" rel="noopener noreferrer">{explicit?match[1]:target}</a>:<ScientificText key={'t'+match.index} text={match[0]}/>);
    if(suffix)parts.push(<ScientificText key={'s'+match.index} text={suffix}/>);
    start=pattern.lastIndex;
  }
  if(start<text.length)parts.push(<ScientificText key={'t'+start} text={text.slice(start)}/>);
  return <>{parts}</>;
}

export default function SourceDocumentText({text}:{text:string}){
  const content=(value:string)=><LinkedSourceText text={value.replace(/<br\s*\/?>/gi,'\n')}/>;
  return <>{sourceBlocks(text).map((block,index)=>block.kind==='text'?<div key={index}>{content(block.text)}</div>:<div key={index} className={styles.sourceTableScroll} role="region" aria-label="Source table" tabIndex={0}><table className={styles.sourceTable}>{block.headers.some(Boolean)&&<thead><tr>{block.headers.map((header,i)=><th scope="col" key={i}>{content(header)}</th>)}</tr></thead>}<tbody>{block.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{content(cell)}</td>)}</tr>)}</tbody></table></div>)}</>;
}
