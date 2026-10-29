import {describe,expect,it} from 'vitest';
import {sourceBlocks,literalSourceText} from '@/lib/sourceTables';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SourceDocumentText from '@/components/SourceDocumentText';
describe('Literal source display',()=>{
  it('renders readable table markup while escaping embedded HTML',()=>{
    const html=renderToStaticMarkup(createElement(SourceDocumentText,{text:'| Topic | Text |\n| --- | --- |\n| 13. | A<br>B <script>alert(1)</script> |'}));
    expect(html).toContain('<table');expect(html).toContain('<th scope="col">');expect(html).not.toContain('&lt;br&gt;');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');
  });
  it('retains table cells, escaped pipes, source punctuation and surrounding text',()=>{
    expect(sourceBlocks('Header\n| Topic | URL |\n| :--- | ---: |\n| 13. A \\| B | https://example.test/KDYs<br>Second line |\nFooter')).toEqual([
      {kind:'text',text:'Header'},{kind:'table',headers:['Topic','URL'],rows:[['13. A | B','https://example.test/KDYs<br>Second line']]},{kind:'text',text:'Footer'},
    ]);
  });
  it('does not silently drop malformed tables or interpret fenced source code',()=>{
    for(const text of ['| A | B |\n| --- | --- |\n| wrong columns |','```\n| A | B |\n| --- | --- |\n| 1 | 2 |\n```','H₂ + O₂ → H₂O\nLiteral <script>alert(1)</script>'])expect(sourceBlocks(text)).toEqual([{kind:'text',text}]);
  });
  it('uses the approved extraction without duplicating its retrieval appendix',()=>{
    expect(literalSourceText({extraction:{text:'Original source'}},'Original source\nReviewed figure transcriptions: duplicate')).toBe('Original source');
    expect(literalSourceText(null,'Legacy source')).toBe('Legacy source');
    expect(literalSourceText({extraction:{text:''}},'Search appendix')).toBe('');
  });
});
