'use client';

import React from 'react';
import katex from 'katex';

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
    .replace(/\?\?/g, "'")
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$');

  // Fix any $_{ without preceding anchor in existing math
  str = str.replace(/\$([^\$]*?)\$/g, (m, content) => {
    const fixedContent = content.replace(/^(\s*)_\{/g, '$1{}_{');
    return '$' + fixedContent + '$';
  });

  // Split by existing $...$ and $$...$$
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue;
    let seg = parts[i];
    if (!seg) continue;

    // 1. Isotopic notation: _{92}^{238}\text{U} or ^{238}_{92}\text{U}
    seg = seg.replace(/(?:_\{([0-9]+)\}\^\{([0-9]+)\}|\^\{([0-9]+)\}_\{([0-9]+)\})(\\text\{[A-Za-z]+\}|[A-Za-z]+)/g, (m, b1, t1, t2, b2, el) => {
      const sub = b1 || b2;
      const sup = t1 || t2;
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
      (seg.includes('\\') || seg.includes('^') || seg.includes('_'))
    ) {
      if (!seg.startsWith('$')) {
        const trimmed = seg.replace(/^(\s*)_\{/g, '$1{}_{');
        seg = '$' + trimmed + '$';
      }
    }

    parts[i] = seg;
  }
  return parts.join('');
}

// Render inline Markdown: `code`, ***bold-italic***, **bold**, *italic*, ~~strike~~
function renderInlineMarkdown(segment: string, keyPrefix: string): React.ReactNode[] {
  if (!segment) return [];
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|~~[^~]+~~|\*(?!\s)[^*\n]+?(?<!\s)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(segment)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(segment.slice(lastIdx, match.index));
    }
    const token = match[0];
    const k = `${keyPrefix}-${match.index}`;
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={k}
          style={{
            background: 'rgba(15, 23, 42, 0.07)',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: '0.88em',
            color: '#0f172a',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      nodes.push(
        <strong key={k}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(<del key={k}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={k}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(token);
    }
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < segment.length) {
    nodes.push(segment.slice(lastIdx));
  }
  return nodes;
}

export default function MathText({ text, className, style }: MathTextProps) {
  if (!text) return null;

  const processableText = cleanAndNormalizeMath(text);

  // Split by inline math delimiter $...$ or $$...$$
  const parts: React.ReactNode[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(processableText)) !== null) {
    if (match.index > lastIndex) {
      const plainSeg = processableText.substring(lastIndex, match.index);
      parts.push(...renderInlineMarkdown(plainSeg, `md-${lastIndex}`));
    }

    const matchedStr = match[0];
    const isDisplayMode = matchedStr.startsWith('$$');
    const mathContent = isDisplayMode
      ? matchedStr.slice(2, -2).trim()
      : matchedStr.slice(1, -1).trim();

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: isDisplayMode,
        throwOnError: false,
        strict: false,
      });
      parts.push(
        <span
          key={`math-${match.index}`}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ margin: isDisplayMode ? '0.5rem 0' : '0 2px' }}
        />
      );
    } catch {
      parts.push(matchedStr);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < processableText.length) {
    const tailSeg = processableText.substring(lastIndex);
    parts.push(...renderInlineMarkdown(tailSeg, `md-tail-${lastIndex}`));
  }

  return (
    <span className={className} style={style}>
      {parts.length > 0 ? parts : text}
    </span>
  );
}
