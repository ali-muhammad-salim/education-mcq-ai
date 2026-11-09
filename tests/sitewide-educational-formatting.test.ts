import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import MathText from '@/components/MathText';
import ScientificText from '@/components/ScientificText';
import StructuredContent from '@/components/StructuredContent';
import { formatEducationalMath, formatExplicitMath, repairMathEscapes } from '@/lib/syllabusMath';

describe('Site-wide educational formatting',()=>{
 const render=(text:string,component:typeof MathText|typeof ScientificText|typeof StructuredContent=MathText)=>renderToStaticMarkup(React.createElement(component,{text}));
 it('typesets imported ASCII roots and named Greek letters in choices',()=>{
  for(const text of ['sqrt(29)', '3sqrt(2)', 'a × sqrt(b)', 'sin theta', '2pi', '2pi / 3', 'sqrt(3)/2']) {
   const html=render(text);
   expect(html).toContain('katex');
   expect(html).not.toContain('katex-error');
   expect(html.replace(/<annotation[\s\S]*?<\/annotation>/g,'')).not.toMatch(/sqrt\(|theta|2pi/);
  }
  expect(render('a^(n-1)')).toContain('a^{n-1}');
  expect(render('$a^(n+1)$')).toContain('a^{n+1}');
  expect(formatExplicitMath('PI = PQ')).toBe('PI = PQ');
 });
 it('renders plain and already-delimited fractions in questions, choices and reading text',()=>{
  for(const component of [MathText,ScientificText,StructuredContent])for(const text of ['x/y','$x/y$','1/2','P(E) = n(E) / n(S)']){
   const html=render(text,component);
   expect(html).toContain('katex');expect(html).toContain('\\frac');expect(html).not.toContain('katex-error');
  }
 });
 it('preserves existing LaTeX commands and multiplication/division precedence',()=>{
  expect(formatExplicitMath(String.raw`\frac{1}{2}/x`)).toBe(String.raw`\frac{\frac{1}{2}}{x}`);
  expect(formatExplicitMath(String.raw`a/b\times c`)).toBe(String.raw`\frac{a}{b}\times  c`);
  expect(formatExplicitMath('a/b*c')).toBe(String.raw`\frac{a}{b}* c`);
  expect(formatExplicitMath(String.raw`\text{and/or}`)).toBe(String.raw`\text{and/or}`);
  expect(render(String.raw`$\frac{x}{y}$`)).toContain(String.raw`\frac{x}{y}`);
 });
 it('renders source matrices and conjugates throughout the shared components',()=>{
  for(const component of [MathText,ScientificText,StructuredContent]){
   expect(render('A = [[2, 1], [0, 3]]',component)).toContain('bmatrix');
   const html=render('conjugate(z_1 / z_2) = z̄_1 / z̄_2',component);
   expect(html).toContain('\\overline{\\frac');expect(html).not.toContain('operatorname{conjugate}');
   expect(render('z̿ = z',component)).toContain('\\overline{\\overline{z}}');
  }
 });
 it('uses identical single list markers in answers, papers and source reading',()=>{
  for(const component of [MathText,ScientificText,StructuredContent]){
   const html=render('Properties:\na. first;\nb. nested:\n  i. one;\n  ii. two;\nc. last.',component);
   expect(html).not.toContain('•');expect(html).toContain('>i.</span>');expect(html).toContain('>ii.</span>');
  }
 });
 it('does not reinterpret code, links, paths, dates, chemistry notation or question marks',()=>{
  for(const source of ['`a/b`','https://example.com/a/b?x=1','a.b@example.com',String.raw`C:\work\file.txt`,'27/10/2026','2025/2026','H₂ + O₂ → H₂O; Na⁺, 20°C, 0.001 m','Why ??'])expect(formatEducationalMath(source)).toBe(source);
  expect(render('Why ??')).toContain('Why ??');
  expect(render('`a/b`')).toContain('<code');expect(render('`a/b`')).not.toContain('katex');
  expect(render('`$x/y$`')).not.toContain('katex');
  expect(render('`\\frac{x}{y}`')).not.toContain('katex');
  expect(render('```text\na. x/y\nb. z/w\n```')).not.toContain('katex');
  expect(render('https://example.com/a/b?x=1')).not.toContain('katex');
 });
 it('repairs imported command escapes and formats fractions inside matrix cells',()=>{
  const broken = '$' + String.fromCharCode(12) + 'rac{1}{2}$';
  expect(repairMathEscapes(broken)).toBe(String.raw`$\frac{1}{2}$`);
  expect(render(broken)).toContain(String.raw`\frac{1}{2}`);
  const matrix=String.raw`\begin{bmatrix}0\\1/3\end{bmatrix}`;
  expect(formatExplicitMath(matrix)).toBe(String.raw`\begin{bmatrix}0\\\frac{1}{3}\end{bmatrix}`);
  expect(render('$'+matrix+'$')).not.toContain('katex-error');
  expect(formatExplicitMath(String.raw`O\'`)).toBe("O'");
  expect(formatExplicitMath(String.raw`\text{ \mu F}`)).toBe(String.raw`\mu\,\mathrm{F}`);
  expect(formatExplicitMath(String.raw`\overarc{AB}`)).toBe(String.raw`\overset{\frown}{AB}`);
  expect(formatEducationalMath('A = {1, 2, 3}')).toContain(String.raw`\{1, 2, 3\}`);
 });
 it('keeps unit powers in fraction denominators and renders set operations together',()=>{
  for(const component of [MathText,ScientificText,StructuredContent]){
   const html=render('Take g as 10 m/s2 and density as 1050 kg/m3.',component);
   expect(html).toContain('s²');
   expect(html).toContain('m³');
   expect(html).not.toMatch(/m\/s2|kg\/m3/);
  }
  expect(formatEducationalMath('30 kg/cm²')).toContain(String.raw`\frac{30 kg}{cm²}`);
  expect(formatEducationalMath('A ∩ B = {1, 2}')).toContain(String.raw`A \cap B = \{1, 2\}`);
 });
 it('keeps unsupported notation visible and escapes source HTML',()=>{
  expect(render(String.raw`$\unknownmath{x}$`)).toContain('unknownmath');
  expect(render(String.raw`$\unknownmath{x}$`)).not.toContain('katex-error');
  expect(render('<img src=x onerror=alert(1)>')).not.toContain('<img');
 });
});
