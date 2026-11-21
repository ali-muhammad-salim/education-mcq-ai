import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StructuredContent from '../components/StructuredContent';
import MathText from '../components/MathText';
import biology from '../data/biology/ssc1_2023_past_mcqs.json';
import computer from '../data/computer-science/chapter_wise_theory_bank.json';
import csIxModel from '../data/computer-science/ssc1_model_mcqs.json';
import csX2019 from '../data/computer-science/ssc2_2019_past_mcqs.json';

function record(id: string, value: unknown = computer): Record<string, unknown> {
  if (value && typeof value === 'object') {
    if ('id' in value && value.id === id) return value as Record<string, unknown>;
    for (const child of Object.values(value)) {
      const found = record(id, child);
      if (found.id) return found;
    }
  }
  return {};
}
const render = (text: string, inline = false) => renderToStaticMarkup(React.createElement(inline ? MathText : StructuredContent, { text }));
const tables = (html: string) => html.match(/<table\b[\s\S]*?<\/table>/g) ?? [];
const renderedText = (html: string) => html.replace(/<[^>]*>/g, '');

describe('content parsing rendered with real React and KaTeX', () => {
  it('keeps BIO-IX-2023-P1 Q24 tables on either side of the instruction', () => {
    const html = render(biology.find(q => q.questionNumber === 24)!.stem);
    const blocks = tables(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.match(/<th\b/g)).toHaveLength(2);
    expect(blocks[0]!.match(/<td\b/g)).toHaveLength(6);
    expect(blocks[1].match(/<th\b/g)).toHaveLength(4);
    expect(blocks[1].match(/<td\b/g)).toHaveLength(16);
    expect(html.indexOf('The option that')).toBeGreaterThan(html.indexOf('</table>'));
    expect(html.indexOf('The option that')).toBeLessThan(html.lastIndexOf('<table'));
  });
  it('does not split logical OR code into extra table cells in the 2017 solution', () => {
    const html = render(String(record('cs-x-2017-p2-q2-u10').modelAnswer));
    expect(html).toMatch(/<code[^>]*>\|\|<\/code>/);
    for (const table of tables(html)) {
      const width = table.match(/<th\b/g)!.length;
      for (const row of table.match(/<tr\b[\s\S]*?<\/tr>/g)!.slice(1)) expect(row.match(/<td\b/g)).toHaveLength(width);
    }
  });
  it('preserves the complete 2025 C program without accidental math', () => {
    const html = render(String(record('cs-x-2025-p2-q3-u10').questionText));
    expect(renderedText(html)).toContain('for (int i=20;i&lt;50;i+=5)\nprintf(&quot;\\n%d&quot;, i);\n');
    expect(html).not.toContain('katex');
    expect(html).not.toContain('```');
  });
  it('composes bold with math and code from the 2024 solution', () => {
    const html = render(String(record('cs-x-2024-p2-q4-u8').modelAnswer));
    expect(html).not.toContain('**');
    const example = render('**Output $X$ uses `A`**', true);
    expect(example).toMatch(/<strong>Output [\s\S]*class="katex"[\s\S]*<code[^>]*>A<\/code><\/strong>/);
  });
  it('keeps escaped pipes, code pipes and empty cells in a simple table', () => {
    const html = render('| Label | Value | Empty |\n| --- | --- | --- |\n| left\\|right | `a || b` | |');
    expect(html.match(/<td\b/g)).toHaveLength(3);
    expect(html).toContain('left|right');
    expect(renderedText(html)).toContain('a || b');
  });
  it('keeps fenced content opaque to table, list, math and HTML parsing', () => {
    const html = render('Before\n```c\n| a | b |\n| c | d |\na. $x$ <script>\nb. **literal** \\frac{1}{2}\n```\nAfter');
    expect(tables(html)).toHaveLength(0);
    expect(html).not.toContain('katex');
    expect(renderedText(html)).toContain('a. $x$ &lt;script&gt;\nb. **literal** \\frac{1}{2}');
    expect(html.indexOf('Before')).toBeLessThan(html.indexOf('<code'));
    expect(html.indexOf('After')).toBeGreaterThan(html.indexOf('</code>'));
  });
  it('keeps absolute-value math inside one table cell', () => {
    const html = render('| A | B |\n| --- | --- |\n| $|x|$ | 2 |');
    expect(html.match(/<td\b/g)).toHaveLength(2);
    expect(html).toContain('class="katex"');
    expect(html).toContain('|x|');
  });
  it('keeps Windows-line-ending fenced programs opaque', () => {
    const html = render('```c\r\nint x = 1;\r\nprintf("$x$");\r\n```');
    expect(html.match(/<code\b/g)).toHaveLength(1);
    expect(html).not.toContain('```');
    expect(html).not.toContain('katex');
    expect(renderedText(html)).toContain('int x = 1;');
    expect(html).toContain('$x$');
  });
  it('preserves the existing ungapped prose wrappers surrounding a simple table', () => {
    const html = render('Intro\nDetails\n| A | B |\n| --- | --- |\n| one | two |\nAfter\nEnd');
    expect(html).toContain('<div><div><span>Intro</span></div><div><span>Details</span></div></div>');
    expect(html).toContain('<div><div><span>After</span></div><div><span>End</span></div></div>');
  });
  it('retains ordinary table and lettered-list rendering controls', () => {
    const html = render('| A | B |\n| --- | --- |\n| one | two |');
    expect(tables(html)).toHaveLength(1);
    expect(html.match(/<td\b/g)).toHaveLength(2);
    expect(html).toContain('padding:9px 14px');
    const list = render('Items:\na. First\nb. Second');
    expect(list).toContain('>a.</span>');
    expect(list).toContain('>b.</span>');
    expect(list).toContain('gap:0.4rem');
    expect(render('<img src=x onerror=alert(1)>', true)).toContain('&lt;img');
  });
  it('renders GW-BASIC table cells with line breaks and HTML options as literal highlighted code', () => {
    const basic = csX2019.find(q => q.questionNumber === 13)!;
    const html = render(basic.stem);
    expect(tables(html)).toHaveLength(2);
    expect(html.match(/<br\/?\s*>/g)).toHaveLength(14);
    expect(html).not.toContain('&lt;br&gt;');
    const option = render(csIxModel.find(q => q.questionNumber === 15)!.options.B);
    expect(option).toContain('<pre');
    expect(option).toMatch(/<span[^>]*>&lt;tr<\/span>/);
    expect(renderedText(option)).toContain('&lt;tr&gt;\n  &lt;th&gt;Name&lt;/th&gt;');
    expect(option).not.toContain('<tr>');
  });
});
