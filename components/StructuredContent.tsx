'use client';

import React from 'react';
import MathText from '@/components/MathText';

interface StructuredContentProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function StructuredContent({ text, className = '', style = {} }: StructuredContentProps) {
  if (!text) return null;

  // 1. Check if text contains a Markdown table (| col1 | col2 |)
  if (text.includes('|') && text.split('\n').some(line => line.trim().startsWith('|') && line.trim().endsWith('|'))) {
    const lines = text.split('\n');
    const tableLines: string[] = [];
    const beforeLines: string[] = [];
    const afterLines: string[] = [];
    let state: 'before' | 'table' | 'after' = 'before';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        state = 'table';
        tableLines.push(trimmed);
      } else if (state === 'table') {
        state = 'after';
        afterLines.push(line);
      } else if (state === 'before') {
        beforeLines.push(line);
      } else {
        afterLines.push(line);
      }
    });

    if (tableLines.length >= 2) {
      // Parse header, separator, rows
      const headerCells = tableLines[0].split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const isSeparator = tableLines[1].replace(/[\s|:-]/g, '').length === 0;
      const dataRows = (isSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(row => 
        row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      );

      return (
        <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
          {beforeLines.length > 0 && (
            <div>
              {beforeLines.map((l, idx) => (
                <div key={idx}><MathText text={l} /></div>
              ))}
            </div>
          )}

          <div style={{ overflowX: 'auto', margin: '0.6rem 0' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1.5px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              overflow: 'hidden',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ background: 'var(--primary-light, #e6f0ed)', borderBottom: '2px solid var(--border-color, #cbd5e1)' }}>
                  {headerCells.map((cell, cIdx) => (
                    <th key={cIdx} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--primary-color, #0b5e4a)'
                    }}>
                      <MathText text={cell} />
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
                        padding: '9px 14px',
                        color: 'var(--text-color, #1e293b)'
                      }}>
                        <MathText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {afterLines.length > 0 && (
            <div>
              {afterLines.map((l, idx) => (
                <div key={idx}><MathText text={l} /></div>
              ))}
            </div>
          )}
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

          <div style={{
            margin: '0.5rem 0',
            border: '1.5px solid var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
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
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? 'var(--card-bg, #ffffff)' : 'var(--bg-color, #f8fafc)',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)'
                  }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>{item.label}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-color, #1e293b)' }}><MathText text={item.value} /></td>
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

  // 3. Multiline with Roman numerals or bullets
  if (text.includes('\n') || text.includes('•')) {
    const lines = text.split('\n');
    return (
      <div className={`structured-content ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', ...style }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} style={{ height: '0.25rem' }} />;
          const isBullet = trimmed.startsWith('•') || /^(I|II|III|IV|V)\./i.test(trimmed);
          if (isBullet) {
            const cleanText = trimmed.replace(/^•\s*/, '');
            return (
              <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', paddingLeft: '0.75rem' }}>
                <span style={{ color: 'var(--primary-color, #0b5e4a)', fontWeight: 800 }}>•</span>
                <span style={{ flex: 1 }}><MathText text={cleanText} /></span>
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

  // Standard single line MathText
  return (
    <div className={`structured-content ${className}`} style={style}>
      <MathText text={text} />
    </div>
  );
}
