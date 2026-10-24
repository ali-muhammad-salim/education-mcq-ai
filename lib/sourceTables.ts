export type SourceBlock = {kind:'text';text:string}|{kind:'table';headers:string[];rows:string[][]};
function cells(line:string){
  const value=line.trim();
  if(!value.startsWith('|')||!value.endsWith('|'))return null;
  return value.slice(1,-1).split(/(?<!\\)\|/).map(cell=>cell.trim().replace(/\\\|/g,'|'));
}
/** Only recognize bounded, complete Markdown tables; retain every unmatched source line. */
export function sourceBlocks(text:string):SourceBlock[]{
  const lines=text.split('\n'),result:SourceBlock[]=[];let pending:string[]=[],fenced=false;
  const flush=()=>{if(pending.length){result.push({kind:'text',text:pending.join('\n')});pending=[];}};
  for(let i=0;i<lines.length;i++){
    if(/^\s*(```|~~~)/.test(lines[i]))fenced=!fenced;
    const header=!fenced?cells(lines[i]):null,separator=header&&i+1<lines.length?cells(lines[i+1]):null;
    if(header&&header.length>=2&&header.length<=20&&separator?.length===header.length&&separator.every(cell=>/^:?-{3,}:?$/.test(cell))){
      const rows:string[][]=[];let next=i+2;
      while(next<lines.length){const row=cells(lines[next]);if(!row||row.length!==header.length)break;rows.push(row);next++;}
      if(rows.length){flush();result.push({kind:'table',headers:header,rows});i=next-1;continue;}
    }
    pending.push(lines[i]);
  }
  flush();return result;
}

/** Retrieval-only figure expansions must not be duplicated in the student document. */
export function literalSourceText(data:unknown,fallback:string){
  if(data&&typeof data==='object'&&'extraction' in data){
    const extraction=data.extraction;
    if(extraction&&typeof extraction==='object'&&'text' in extraction&&typeof extraction.text==='string')return extraction.text;
  }
  return fallback;
}
