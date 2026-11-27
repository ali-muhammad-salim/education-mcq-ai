'use client';

import React from 'react';
import MathText from '@/components/MathText';
import CodeSnippet from '@/components/CodeSnippet';
import { educationalLines, restoreInlineLetteredLists } from '@/lib/inlineEducationalLists';

interface StructuredContentProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// Split only structural pipes: code spans and escaped pipes belong to the cell.
function tableCells(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  const source = line.trim().slice(1, -1);
  for (let i = 0; i < source.length; i++) {
    const math = /^(\$\$[^\n]*?\$\$|\$[^$\n]+\$|\\\([^\n]*?\\\)|\\\[[^\n]*?\\\])/.exec(source.slice(i));
    if (math) {
      cell += math[0];
      i += math[0].length - 1;
    } else if (source[i] === '\\' && i + 1 < source.length) {
      cell += source[i + 1] === '|' ? '|' : source[i] + source[i + 1];
      i++;
    } else if (source[i] === '`') {
      const run = /^`+/.exec(source.slice(i))![0];
      const end = source.indexOf(run, i + run.length);
      if (end !== -1) {
        cell += source.slice(i, end + run.length);
        i = end + run.length - 1;
      } else cell += source[i];
    } else if (source[i] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else cell += source[i];
  }
  cells.push(cell.trim());
  return cells;
}

const imageLine = /^\s*!\[([^\]]*)\]\((\/(?:paper-crops\/|materials\/hssc\/biology\/model-paper-questions\/)[^\s)]+)\)\s*$/;

function contentBlocks(text: string) {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ kind: 'text' | 'table' | 'code' | 'image'; text: string; language?: string }> = [];
  const isRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
  for (let i = 0; i < lines.length;) {
    const fence = /^\s*(`{3,}|~{3,})\s*([\w+-]*)[^\r\n]*$/.exec(lines[i]);
    if (fence) {
      const start = ++i;
      const close = new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`);
      while (i < lines.length && !close.test(lines[i])) i++;
      blocks.push({ kind: 'code', language: fence[2], text: lines.slice(start, i).join('\n') + (i > start ? '\n' : '') });
      if (i < lines.length) i++;
    } else if (imageLine.test(lines[i])) {
      blocks.push({ kind: 'image', text: lines[i++] });
    } else if (isRow(lines[i]) && i + 1 < lines.length && isRow(lines[i + 1])) {
      const start = i++;
      while (i < lines.length && isRow(lines[i])) i++;
      blocks.push({ kind: 'table', text: lines.slice(start, i).join('\n') });
    } else {
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === 'text') previous.text += '\n' + lines[i];
      else blocks.push({ kind: 'text', text: lines[i] });
      i++;
    }
  }
  return blocks;
}

function TableCellContent({ text }: { text: string }) {
  if (/^[A-Z][a-z]+(?:_[A-Za-z][A-Za-z0-9]*)+$/.test(text)) return text;
  // Only line-break markers outside code spans have table formatting meaning.
  const lines: string[] = [];
  let start = 0;
  for (const match of text.matchAll(/`[^`]*`|<br\s*\/?>/gi)) {
    if (match[0].startsWith('`')) continue;
    lines.push(text.slice(start, match.index));
    start = match.index + match[0].length;
  }
  lines.push(text.slice(start));
  return lines.map((line, index) => <React.Fragment key={index}>
    {index > 0 && <br />}
    <MathText text={line} />
  </React.Fragment>);
}

export default function StructuredContent({ text, className = '', style = {} }: StructuredContentProps) {
  if (!text) return null;
  const image = imageLine.exec(text);
  if (image) return <img className={className} src={image[2]} alt={image[1]} loading="lazy" style={{maxWidth:'100%',height:'auto',...style}} />;
  const blocks = contentBlocks(text);
  if (blocks.some(block => block.kind === 'code') || blocks.length > 1) {
    return <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%', gap: blocks.some(block => block.kind === 'table') ? '0.75rem' : '0.4rem', ...style }}>
      {blocks.map((block, index) => block.kind === 'code'
        ? <CodeSnippet key={index} text={block.text} language={block.language} />
        : block.kind === 'text' && blocks.some(item => item.kind === 'table')
          ? <div key={index}>{block.text.split(/\r?\n/).map((line, lineIndex) => <div key={lineIndex}><MathText text={line} /></div>)}</div>
          : <StructuredContent key={index} text={block.text} />)}
    </div>;
  }
  // Preserve display equations when the surrounding prose is split into lines.
  text = restoreInlineLetteredLists(text.replace(
    /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g,
    formula => formula.replace(/\r?\n/g, ' '),
  ));

  // 1. Check if text contains a Markdown table (| col1 | col2 |)
  if (text.includes('|') && text.split('\n').some(line => line.trim().startsWith('|') && line.trim().endsWith('|'))) {
    const tableLines = text.split('\n');
    if (blocks[0]?.kind === 'table') {
      const headerCells = tableCells(tableLines[0]);
      const columnRules = tableCells(tableLines[1]);
      const isSeparator = columnRules.length === headerCells.length && columnRules.every(cell => /^:?-+:?$/.test(cell));
      const alignment = (index: number) => {
        const rule = isSeparator ? columnRules[index] : '';
        return rule?.endsWith(':') ? (rule.startsWith(':') ? 'center' : 'right') : 'left';
      };
      const dataRows = (isSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(tableCells);

      return (
        <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, maxWidth: '100%', width: '100%', ...style }}>

          <div className="content-table-scroll" role="region" aria-label="Question table" tabIndex={0} style={{ overflowX: 'auto' }}>
            <table style={{
              borderCollapse: 'collapse',
              border: '1.5px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ background: 'var(--primary-light, #e6f0ed)', borderBottom: '2px solid var(--border-color, #cbd5e1)' }}>
                  {headerCells.map((cell, cIdx) => (
                    <th key={cIdx} scope="col" style={{
                      border: '1px solid var(--border-color, #cbd5e1)',
                      textAlign: alignment(cIdx),
                      fontWeight: 700,
                      color: 'var(--primary-color, #0b5e4a)'
                    }}>
                      <TableCellContent text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{
                    background: rIdx % 2 === 0 ? 'var(--card-bg, #ffffff)' : 'var(--bg-color, #f8fafc)',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)'
                  }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{
                        border: '1px solid var(--border-color, #cbd5e1)',
                        textAlign: alignment(cIdx),
                        verticalAlign: 'top',
                        color: 'var(--text-color, #1e293b)'
                      }}>
                        <TableCellContent text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      );
    }
  }

  // 2. Check for Segmented Table lines (e.g., "Segment I: 0-10 m\nSegment II: 11-22 m")
  if (text.includes('Segment I:') || text.includes('Segment 1:') || (text.includes('Column A') && text.includes('Column B'))) {
    const lines = text.split('\n');
    const intro: string[] = [];
    const tableItems: Array<{ label: string; value: string; extra?: string }> = [];
    const outro: string[] = [];
    let parsingTable = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      const segmentMatch = trimmed.match(/^(Segment\s+[IVX0-9]+)\s*:\s*([^(\n]+)(?:\((.*)\))?/i);
      if (segmentMatch) {
        parsingTable = true;
        tableItems.push({
          label: segmentMatch[1],
          value: segmentMatch[2].trim(),
          extra: segmentMatch[3]?.trim()
        });
      } else if (parsingTable) {
        outro.push(line);
      } else {
        intro.push(line);
      }
    });

    if (tableItems.length >= 2) {
      return (
        <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', ...style }}>
          {intro.length > 0 && (
            <div>
              {intro.map((l, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}><MathText text={l} /></div>
              ))}
            </div>
          )}

          <div className="content-table-scroll" role="region" aria-label="Segment table" tabIndex={0} style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem', border: '1px solid var(--border-color, #cbd5e1)' }}>
              <thead>
                <tr style={{ background: 'var(--primary-light, #e6f0ed)', borderBottom: '1.5px solid var(--border-color, #cbd5e1)' }}>
                  <th style={{ textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Segment</th>
                  <th style={{ textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Distance Covered</th>
                  {tableItems.some(i => i.extra) && (
                    <th style={{ textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Notes / Displacement</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, idx) => (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? 'var(--card-bg, #ffffff)' : 'var(--bg-color, #f8fafc)',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)'
                  }}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>{item.label}</td>
                    <td style={{ color: 'var(--text-color, #1e293b)' }}><MathText text={item.value} /></td>
                    {tableItems.some(i => i.extra) && (
                      <td style={{ color: 'var(--text-light, #64748b)', fontSize: '0.88rem' }}>
                        {item.extra ? <MathText text={item.extra} /> : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {outro.length > 0 && (
            <div>
              {outro.map((l, idx) => (
                <div key={idx} style={{ marginTop: '4px' }}><MathText text={l} /></div>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // Shared markers are also used by answers, explanations and quiz text.
  if (text.includes('\n') || text.includes('•')) {
    return (
      <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', ...style }}>
        {educationalLines(text).map((line, index) => !line.body.trim()
          ? <div key={index} style={{ height: '0.25rem' }} />
          : line.marker
            ? <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', paddingLeft: line.kind === 'roman' ? '1.1rem' : '0.4rem' }}>
                <span style={{ fontWeight: line.kind === 'roman' ? 400 : 700, color: 'var(--primary-color, #0b5e4a)', minWidth: line.kind === 'roman' ? '1.65rem' : '1.35rem' }}>{line.marker}</span>
                <span style={{ flex: 1, minWidth: 0 }}><MathText text={line.body} /></span>
              </div>
            : <div key={index}><MathText text={line.body} /></div>)}
      </div>
    );
  }

  // Standard single line MathText
  return (
    <div className={`structured-content ${className}`} style={style}>
      <MathText text={text} />
    </div>
  );
}
