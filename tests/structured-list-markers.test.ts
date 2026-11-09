import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import StructuredContent from '@/components/StructuredContent';

describe('Educational list markers',()=>{
  const render=(text:string)=>renderToStaticMarkup(React.createElement(StructuredContent,{text}));
  it('renders the ninth lettered item as i without adding a bullet',()=>{
    const html=render('factorise:\na. first,\nb. second,\nc. third,\nd. fourth,\ne. fifth,\nf. sixth,\ng. seventh,\nh. eighth,\ni. last;');
    expect(html).not.toContain('•');
    expect(html).toContain('>i.</span>');
    expect(html).toContain('font-weight:700');
  });
  it('renders nested Roman markers once and preserves real bullets',()=>{
    const html=render('properties:\na. first;\nb. in a parallelogram:\n   i. opposite sides,\n   ii. opposite angles,\n   iii. diagonals;\nc. midpoint;');
    expect(html).not.toContain('•');
    for(const marker of ['i.','ii.','iii.'])expect(html.split('>'+marker+'</span>')).toHaveLength(2);
    expect(render('List:\n• actual bullet')).toContain('•');
  });
});
