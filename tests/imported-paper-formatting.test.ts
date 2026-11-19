import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MathText from '../components/MathText';

describe('previously imported paper formatting', () => {
  it('renders the known duplicated angle command from stored paper metadata', () => {
    // The database can retain the original imported typo after the bundled JSON is corrected.
    const html = renderToStaticMarkup(React.createElement(MathText, {
      text: 'In the triangle, $\\anglengle B = 180^\\circ - (50^\\circ + 45^\\circ) = 85^\\circ$.',
    }));
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('anglengle');
    expect(html).toContain('\\angle B');
  });

  it('does not silently reinterpret unrelated unsupported commands', () => {
    const html = renderToStaticMarkup(React.createElement(MathText, {
      text: '$\\unknownangle B$',
    }));
    expect(html).toContain('\\unknownangle B');
    expect(html).not.toContain('class="katex"');
  });
});
