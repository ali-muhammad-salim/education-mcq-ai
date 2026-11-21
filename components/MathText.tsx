'use client';

import React from 'react';
import katex from 'katex';
import CodeSnippet from '@/components/CodeSnippet';
import { formatEducationalMath, formatExplicitMath, repairMathEscapes } from '@/lib/syllabusMath';
import { educationalLines } from '@/lib/inlineEducationalLists';

interface MathTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// Clean common character encoding corruptions and normalize LaTeX delimiters
function cleanAndNormalizeMath(text: string): string {
  if (!text) return '';
  let str = String(text)
    .replace(/20A\s*°?\s*C/g, '20°C')
    .replace(/A°C/g, '°C')
    .replace(/Â°C/g, '°C')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$');

  // Fix any $_{ without preceding anchor in existing math
  str = str.replace(/\$([^\$]*?)\$/g, (m, content) => {
    let fixedContent = content.replace(/^(\s*)_\{/g, '$1{}_{');
    return '$' + fixedContent + '$';
  });

  // Split by existing $...$ and $$...$$
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // If odd index, it is already delimited math
    if (i % 2 === 1) continue;
    let seg = parts[i];
    if (!seg) continue;

    // 1. Isotopic notation: _{92}^{238}\text{U} or ^{238}_{92}\text{U}
    seg = seg.replace(/(?:_\{([0-9]+)\}\^\{([0-9]+)\}|\^\{([0-9]+)\}_\{([0-9]+)\})(\\text\{[A-Za-z]+\}|[A-Za-z]+)/g, (m, b1, t1, t2, b2, el) => {
      let sub = b1 || b2;
      let sup = t1 || t2;
      return '${}_{' + sub + '}^{' + sup + '}' + el + '$';
    });

    // 2. Unwrapped fractions: \frac{a}{b}
    seg = seg.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})/g, '$$$1$$');

    // 3. Unwrapped sqrt: \sqrt{...}
    seg = seg.replace(/(\\sqrt\{[^{}]*\})/g, '$$$1$$');

    // 4. Unwrapped scientific notation: 1.23 \times 10^3 or 10^{-9}
    seg = seg.replace(/([0-9.]+\s*\\times\s*10\^\{?-?[0-9]+\}?|10\^\{?-?[0-9]+\}?)/g, '$$$1$$');

    // 5. If whole segment is a formula with no spaces (and not an HTML tag/path or markdown)
    if (
      !seg.includes(' ') &&
      !seg.includes('<') &&
      !seg.includes('>') &&
      !seg.includes('`') &&
      !seg.includes('*') &&
      !seg.includes('/') &&
      !/^(?:[A-Za-z]:\\|\\\\)/.test(seg) &&
      (seg.includes('\\') || seg.includes('^') || seg.includes('_'))
    ) {
      if (!seg.startsWith('$')) {
        let trimmed = seg.replace(/^(\s*)_\{/g, '$1{}_{');
        seg = '$' + trimmed + '$';
      }
    }

    parts[i] = seg;
  }
  return parts.join('');
}

// Render inline Markdown: `code`, ***bold-italic***, **bold**, *italic*, ~~strike~~
function renderInlineMarkdown(segment: string, keyPrefix: string, plain: (text: string) => React.ReactNode = text => text): React.ReactNode[] {
  if (!segment) return [];
  const tokenRegex = /(`[^`]+`|<u>[^<>\n]+<\/u>|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|~~[^~]+~~|\*(?!\s)[^*\n]+?(?<!\s)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(segment)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(plain(segment.slice(lastIdx, match.index)));
    }
    const token = match[0];
    const k = `${keyPrefix}-${match.index}`;
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <CodeSnippet key={k} text={token.slice(1, -1)} inline />
      );
    } else if (token.startsWith('<u>')) {
      nodes.push(<u key={k}>{renderInlineMarkdown(token.slice(3, -4), k, plain)}</u>);
    } else if (token.startsWith('***') && token.endsWith('***')) {
      nodes.push(
        <strong key={k}>
          <em>{renderInlineMarkdown(token.slice(3, -3), k, plain)}</em>
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={k}>{renderInlineMarkdown(token.slice(2, -2), k, plain)}</strong>);
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(<del key={k}>{renderInlineMarkdown(token.slice(2, -2), k, plain)}</del>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={k}>{renderInlineMarkdown(token.slice(1, -1), k, plain)}</em>);
    } else {
      nodes.push(token);
    }
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < segment.length) {
    nodes.push(plain(segment.slice(lastIdx)));
  }
  return nodes;
}

export default function MathText({ text, className, style }: MathTextProps) {
  if (!text) return null;

  const lines = educationalLines(text);
  if (!text.includes('```') && (lines.filter(line => line.marker).length > 1 || lines.some(line => line.kind === 'bullet'))) {
    return <span className={className} style={{ display: 'block', ...style }}>
      {lines.map((line, index) => <span key={index} style={{ display: line.marker ? 'flex' : 'block', gap: '0.5rem', marginBottom: '0.35rem', paddingLeft: line.kind === 'roman' ? '1.1rem' : 0 }}>
        {line.marker && <span style={{ minWidth: line.kind === 'roman' ? '1.65rem' : '1.35rem', fontWeight: line.kind === 'roman' ? 400 : 700 }}>{line.marker}</span>}
        <span style={{ minWidth: 0, flex: 1 }}><MathText text={line.body} /></span>
      </span>)}
    </span>;
  }
  const processableText = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, i) => i % 2 ? part : formatEducationalMath(cleanAndNormalizeMath(repairMathEscapes(part)))).join('');

  // Opaque math/code nodes remain inside surrounding Markdown emphasis.
  // Choose a marker absent from the source so user text can never reference a node.
  let marker = '\uE000';
  while (processableText.includes(marker)) marker += '\uE000';
  const parts: React.ReactNode[] = [];
  let markdown = '';
  const protect = () => { markdown += `${marker}${parts.length - 1}\uE001`; };
  const regex = /(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(processableText)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      const plainSeg = processableText.substring(lastIndex, match.index);
      markdown += plainSeg;
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('`')) {
      const fenced = matchedStr.startsWith('```');
      if (fenced) {
        const body = matchedStr.slice(3, -3);
        const fence = /^([\w+-]*)\r?\n/.exec(body);
        // MathText can be nested in inline markup. StructuredContent uses a block-level pre.
        parts.push(<CodeSnippet key={`code-${match.index}`} text={body.slice(fence?.[0].length ?? 0)} language={fence?.[1]} inlineBlock />);
      }
      else parts.push(...renderInlineMarkdown(matchedStr, `code-${match.index}`));
      protect();
      lastIndex = regex.lastIndex;
      continue;
    }
    const isDisplayMode = matchedStr.startsWith('$$');
    let mathContent = isDisplayMode
      ? matchedStr.slice(2, -2).trim()
      : matchedStr.slice(1, -1).trim();

    mathContent = formatExplicitMath(mathContent);
    try {
      const html = katex.renderToString(mathContent, {
        displayMode: isDisplayMode,
        throwOnError: true,
        trust: false,
        maxExpand: 1000,
        maxSize: 50,
        strict: false
      });
      parts.push(
        <span
          key={`math-${match.index}`}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ margin: isDisplayMode ? '0.5rem 0' : '0 2px', ...(isDisplayMode ? { display: 'block', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden' } : {}) }}
        />
      );
    } catch {
      parts.push(matchedStr);
    }
    protect();

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < processableText.length) {
    const tailSeg = processableText.substring(lastIndex);
    markdown += tailSeg;
  }
  const resolve = (segment: string) => segment.split(new RegExp(`(${marker}\\d+\uE001)`, 'g')).map((part, index) =>
    part.startsWith(marker) && part.endsWith('\uE001')
      ? <React.Fragment key={index}>{parts[Number(part.slice(marker.length, -1))]}</React.Fragment>
      : part);

  return (
    <span className={className} style={style}>
      {renderInlineMarkdown(markdown, 'md', resolve)}
    </span>
  );
}
