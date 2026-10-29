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

    // 5. If whole segment is a formula with no spaces (e.g. an option)
    if (!seg.includes(' ') && (seg.includes('\\') || seg.includes('^') || seg.includes('_'))) {
      if (!seg.startsWith('$')) {
        let trimmed = seg.replace(/^(\s*)_\{/g, '$1{}_{');
        seg = '$' + trimmed + '$';
      }
    }

    parts[i] = seg;
  }
  return parts.join('');
}

export default function MathText({ text, className, style }: MathTextProps) {
  if (!text) return null;

  const processableText = cleanAndNormalizeMath(text);

  // Split by inline math delimiter $...$ or $$...$$
  const parts: React.ReactNode[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(processableText)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      parts.push(processableText.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    const isDisplayMode = matchedStr.startsWith('$$');
    let mathContent = isDisplayMode
      ? matchedStr.slice(2, -2).trim()
      : matchedStr.slice(1, -1).trim();

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: isDisplayMode,
        throwOnError: false,
        strict: false
      });
      parts.push(
        <span
          key={`math-${match.index}`}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ margin: isDisplayMode ? '0.5rem 0' : '0 2px' }}
        />
      );
    } catch (e) {
      parts.push(matchedStr);
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < processableText.length) {
    parts.push(processableText.substring(lastIndex));
  }

  return (
    <span className={className} style={style}>
      {parts.length > 0 ? parts : text}
    </span>
  );
}
