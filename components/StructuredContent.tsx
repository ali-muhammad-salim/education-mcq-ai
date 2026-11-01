'use client';

import React from 'react';
import MathText from '@/components/MathText';

interface StructuredContentProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

function renderTextSegment(segment: string, segKey: string): React.ReactNode {
  if (!segment || !segment.trim()) return null;

  // 1. Check for Segmented Table lines (e.g., "Segment I: 0-10 m\nSegment II: 11-22 m")
  if (segment.includes('Segment I:') || segment.includes('Segment 1:') || (segment.includes('Column A') && segment.includes('Column B'))) {
    const lines = segment.split('\n');
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
          extra: segmentMatch[3]?.trim(),
        });
      } else if (parsingTable) {
        outro.push(line);
      } else {
        intro.push(line);
      }
    });

    if (tableItems.length >= 2) {
      return (
        <div key={segKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {intro.length > 0 && renderNonCodeLines(intro, `${segKey}-intro`)}
          <div
            style={{
              margin: '0.5rem 0',
              border: '1.5px solid var(--border-color, #cbd5e1)',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ background: 'var(--primary-light, #e6f0ed)', borderBottom: '1.5px solid var(--border-color, #cbd5e1)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Segment</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Distance Covered</th>
                  {tableItems.some(i => i.extra) && (
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>Notes / Displacement</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? 'var(--card-bg, #ffffff)' : 'var(--bg-color, #f8fafc)',
                      borderBottom: '1px solid var(--border-color, #e2e8f0)',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>{item.label}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-color, #1e293b)' }}>
                      <MathText text={item.value} />
                    </td>
                    {tableItems.some(i => i.extra) && (
                      <td style={{ padding: '8px 12px', color: 'var(--text-light, #64748b)', fontSize: '0.88rem' }}>
                        {item.extra ? <MathText text={item.extra} /> : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {outro.length > 0 && renderNonCodeLines(outro, `${segKey}-outro`)}
        </div>
      );
    }
  }

  // 2. Group consecutive Markdown table lines vs regular lines
  const lines = segment.split('\n');
  const blocks: Array<{ type: 'table' | 'lines'; lines: string[] }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.slice(1, -1).includes('|');
    if (isTableLine) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type === 'table') {
        blocks[blocks.length - 1].lines.push(trimmed);
      } else {
        blocks.push({ type: 'table', lines: [trimmed] });
      }
    } else {
      if (blocks.length > 0 && blocks[blocks.length - 1].type === 'lines') {
        blocks[blocks.length - 1].lines.push(line);
      } else {
        blocks.push({ type: 'lines', lines: [line] });
      }
    }
  }

  return (
    <div key={segKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {blocks.map((b, bIdx) => {
        if (b.type === 'table' && b.lines.length >= 2) {
          const tableLines = b.lines;
          const headerCells = tableLines[0]
            .split('|')
            .map(c => c.trim())
            .filter((_, i, arr) => i > 0 && i < arr.length - 1);
          const isSeparator = tableLines[1].replace(/[\s|:-]/g, '').length === 0;
          const dataRows = (isSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(row =>
            row
              .split('|')
              .map(c => c.trim())
              .filter((_, i, arr) => i > 0 && i < arr.length - 1)
          );
          return (
            <div key={`${segKey}-tbl-${bIdx}`} style={{ overflowX: 'auto', margin: '0.45rem 0' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  fontSize: '0.93rem',
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--primary-light, #e6f0ed)', borderBottom: '2px solid var(--border-color, #cbd5e1)' }}>
                    {headerCells.map((cell, cIdx) => (
                      <th
                        key={cIdx}
                        style={{
                          padding: '9px 13px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: 'var(--primary-color, #0b5e4a)',
                        }}
                      >
                        <MathText text={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        background: rIdx % 2 === 0 ? 'var(--card-bg, #ffffff)' : 'var(--bg-color, #f8fafc)',
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            padding: '8px 13px',
                            color: 'var(--text-color, #1e293b)',
                          }}
                        >
                          <MathText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return renderNonCodeLines(b.lines, `${segKey}-lines-${bIdx}`);
      })}
    </div>
  );
}

function renderNonCodeLines(lines: string[], keyPrefix: string): React.ReactNode {
  return (
    <div key={keyPrefix} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: '0.2rem' }} />;

        // Horizontal rule divider (--- or ***)
        if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
          return (
            <hr
              key={lIdx}
              style={{
                border: 'none',
                borderTop: '1.5px solid var(--border-color, #cbd5e1)',
                margin: '0.55rem 0',
              }}
            />
          );
        }

        // Markdown Heading (#, ##, ###, ####)
        const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const fontSize = level === 1 ? '1.12rem' : level === 2 ? '1.05rem' : '0.98rem';
          return (
            <div
              key={lIdx}
              style={{
                fontWeight: 800,
                fontSize,
                color: 'var(--text-color, #0f172a)',
                marginTop: lIdx > 0 ? '0.4rem' : 0,
                marginBottom: '0.15rem',
              }}
            >
              <MathText text={headingMatch[2]} />
            </div>
          );
        }

        // Bullet item (• ..., - ..., or Roman numerals I. / II. / III. / IV.)
        const bulletMatch = trimmed.match(/^(?:[•\-]\s+)([\s\S]*)$/);
        if (bulletMatch) {
          return (
            <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', paddingLeft: '0.6rem' }}>
              <span style={{ color: 'var(--primary-color, #0b5e4a)', fontWeight: 800, lineHeight: 1.5 }}>•</span>
              <span style={{ flex: 1 }}>
                <MathText text={bulletMatch[1]} />
              </span>
            </div>
          );
        }

        // Roman numeral or numbered list item (e.g., "1. ...", "2. ...", "I. ...", "II. ...", "i. ...", "ii. ...")
        const numMatch = trimmed.match(/^((?:[0-9]+|[IVX]+|i{1,3}|iv)\.)\s+([\s\S]*)$/);
        if (numMatch) {
          return (
            <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', paddingLeft: '0.4rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--primary-color, #0b5e4a)', minWidth: '1.35rem' }}>
                {numMatch[1]}
              </span>
              <span style={{ flex: 1 }}>
                <MathText text={numMatch[2]} />
              </span>
            </div>
          );
        }

        return (
          <div key={lIdx}>
            <MathText text={line} />
          </div>
        );
      })}
    </div>
  );
}

export default function StructuredContent({ text, className = '', style = {} }: StructuredContentProps) {
  if (!text) return null;

  // Split out fenced code blocks: ```lang ... ```
  const fenceRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
  if (fenceRegex.test(text)) {
    fenceRegex.lastIndex = 0;
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = fenceRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        const beforeText = text.slice(lastIdx, match.index);
        const node = renderTextSegment(beforeText, `seg-${lastIdx}`);
        if (node) segments.push(node);
      }

      const rawLang = (match[1] || '').trim().toLowerCase();
      const codeBody = (match[2] || '').replace(/\n+$/, '');
      const isDiagram = rawLang === 'text' || rawLang === 'ascii' || rawLang === 'diagram';

      if (isDiagram) {
        segments.push(
          <div
            key={`code-${match.index}`}
            style={{
              background: '#ffffff',
              border: '1.5px solid #94a3b8',
              borderRadius: '8px',
              margin: '0.45rem 0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: '#f1f5f9',
                borderBottom: '1px solid #cbd5e1',
                padding: '4px 12px',
                fontSize: '0.73rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#334155',
                textTransform: 'uppercase',
              }}
            >
              Architecture / Topology Diagram
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.85rem 1.1rem',
                overflowX: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                fontSize: '0.86rem',
                lineHeight: 1.45,
                color: '#0f172a',
                whiteSpace: 'pre',
              }}
            >
              {codeBody}
            </pre>
          </div>
        );
      } else {
        const badgeLabel = rawLang ? rawLang.toUpperCase() : 'CODE';
        segments.push(
          <div
            key={`code-${match.index}`}
            style={{
              background: '#0f172a',
              border: '1.5px solid #1e293b',
              borderRadius: '8px',
              margin: '0.5rem 0',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                padding: '4px 12px',
                fontSize: '0.73rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{badgeLabel}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Source Code</span>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.9rem 1.15rem',
                overflowX: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                fontSize: '0.88rem',
                lineHeight: 1.55,
                color: '#f8fafc',
                whiteSpace: 'pre',
              }}
            >
              <code>{codeBody}</code>
            </pre>
          </div>
        );
      }

      lastIdx = fenceRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      const afterText = text.slice(lastIdx);
      const node = renderTextSegment(afterText, `seg-tail-${lastIdx}`);
      if (node) segments.push(node);
    }

    return (
      <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', ...style }}>
        {segments}
      </div>
    );
  }

  return (
    <div className={`structured-content ${className}`} style={style}>
      {renderTextSegment(text, 'root')}
    </div>
  );
}
