import React from 'react';
import styles from './CodeSnippet.module.css';

const codeTokens = /^(?<directive>\s*#\s*(?:include|define)\b[^\n]*)|(?<comment>\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[^]*?-->|^\s*\d+\s+REM\b[^\n]*)|(?<string>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(?<number>\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?)n?\b)|(?<word>[$\w]+)|(?<operator>[^\s\w$])/gm;
const keywords = /^(?:auto|break|case|char|const|continue|default|do|double|else|end(?:if|for|while)?|float|for|function|goto|if|in|int|let|long|next|output|print|return|short|signed|start|static|step|stop|switch|then|to|unsigned|var|void|wend|while)$/i;
const constants = /^(?:true|false|null|undefined|NaN|Infinity)$/;
const markupTokens = /("[^"]*"|'[^']*')|(<\/?[\w-]+)|([\w:-]+)(?=\s*=)/g;

function tokenSpan(value: string, kind: string, index: number) {
  return <span key={index} className={styles[kind]}>{value}</span>;
}

function highlightProgram(text: string) {
  const result: React.ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(codeTokens)) {
    const { word } = match.groups!;
    const end = match.index + match[0].length;
    const kind = word
      ? keywords.test(word) || constants.test(word) ? 'keyword' : /^\s*\(/.test(text.slice(end)) ? 'call' : 'identifier'
      : Object.keys(match.groups!).find(name => match.groups![name] !== undefined)!;
    result.push(text.slice(offset, match.index), tokenSpan(match[0], kind, match.index));
    offset = end;
  }
  result.push(text.slice(offset));
  return result;
}

function highlightTag(tag: string) {
  const result: React.ReactNode[] = [];
  let offset = 0;
  for (const match of tag.matchAll(markupTokens)) {
    result.push(tag.slice(offset, match.index), tokenSpan(match[0], match[1] ? 'string' : match[2] ? 'tag' : 'identifier', match.index));
    offset = match.index + match[0].length;
  }
  result.push(tag.slice(offset));
  return result;
}

function highlightHtml(text: string) {
  const result: React.ReactNode[] = [];
  let offset = 0;
  let embeddedCode = false;
  const tags = /<!--[^]*?-->|<\/?[a-z][\w:-]*(?=[\s/>=:])(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  for (const match of text.matchAll(tags)) {
    const tag = match[0];
    if (embeddedCode && !/^<\/(?:script|style)\s*>$/i.test(tag)) continue;
    const prefix = text.slice(offset, match.index);
    result.push(
      <React.Fragment key={match.index}>
        {embeddedCode ? highlightProgram(prefix) : prefix}
        {tag.startsWith('<!--') ? tokenSpan(tag, 'comment', match.index) : highlightTag(tag)}
      </React.Fragment>,
    );
    if (/^<\/?(?:script|style)(?:\s|>)/i.test(tag)) embeddedCode = !tag.startsWith('</');
    offset = match.index + tag.length;
  }
  result.push(embeddedCode ? highlightProgram(text.slice(offset)) : text.slice(offset));
  return result;
}

export default function CodeSnippet({ text, language = '', inline = false, inlineBlock = false }: {
  text: string;
  language?: string;
  inline?: boolean;
  inlineBlock?: boolean;
}) {
  const html = /^html?$/i.test(language) || (!language && /<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/i.test(text));
  const program = /^(?:c|basic|javascript|js|css|pseudocode)$/i.test(language)
    || (language === 'text' && /^\s*Step\s+\d+:/im.test(text))
    || (!language && (/^\s*\d+\s+(?:LET|PRINT|FOR|NEXT|END|WHILE|WEND)\b/im.test(text)
      || /^(?:const|let|var|int|void|return|if|for|while)\b|[A-Za-z_$][\w.$]*\s*\(|\w\s*(?:\+\+|--|[&|]{2}|[=<>!]=|=(?!=))/i.test(text)));
  const content = html ? highlightHtml(text) : program ? highlightProgram(text) : text;
  if (inlineBlock) return <code className={styles.embeddedBlock}>{content}</code>;
  if (inline) return <code className={html || program ? styles.inlineCode : styles.inlineText}>{content}</code>;
  return <pre className={styles.block}><code>{content}</code></pre>;
}
