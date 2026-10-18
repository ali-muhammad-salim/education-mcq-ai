'use client';

import React from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MathText({ text, className, style }: MathTextProps) {
  if (!text) return null;

  // Split by inline math delimiter $...$ or $$...$$
  // Regex matches $...$ (non-greedy) or $$...$$
  const parts: React.ReactNode[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    const isDisplayMode = matchedStr.startsWith('$$');
    const mathContent = isDisplayMode
      ? matchedStr.slice(2, -2)
      : matchedStr.slice(1, -1);

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: isDisplayMode,
        throwOnError: false,
      });
      parts.push(
        <span
          key={match.index}
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
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <span className={className} style={style}>
      {parts.length > 0 ? parts : text}
    </span>
  );
}
