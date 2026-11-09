/** Read-only check of automatic chapter publication for the reviewed 2025 import. */
import { loadEnvConfig } from '@next/env';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

async function main() {
  loadEnvConfig(process.cwd());
  const year = Number(process.argv.find(arg => arg.startsWith('--year='))?.slice(7) || 2025);
  const { mappedChapterGroups, mappedTheoryUnits } = await import('../services/materials/practice');
  const { getFallbackPaper } = await import('../lib/paperDataService');
  const { default: db } = await import('../lib/prisma');
  try {
    const expected = ['P1', 'P2'].flatMap(c => getFallbackPaper(`MTH-IX-${year}-${c}`)?.questions || []);
    const counts = [];
    const routes = new Set<string>();
    for (const grade of [9, 10]) {
      const mcqs = await mappedChapterGroups('AKU-EB', grade, 'Mathematics');
      const theory = await mappedTheoryUnits('AKU-EB', grade, 'Mathematics');
      const importedMcqs = mcqs.flatMap(c => c.questions).filter(q => q.sourcePaperId === `MTH-IX-${year}-P1`);
      const importedTheory = theory.flatMap(u => [...u.crqs, ...u.erqs]).filter(q => q.id.startsWith(`mth-ix-${year}-`));
      const actual = new Set([...importedMcqs, ...importedTheory].map(q => q.id));
      const wanted = expected.filter(q => q.sourceRegion.current_slo && q.sourceRegion.mapping_scope?.grade === grade);
      assert.deepEqual([...actual].sort(), wanted.map(q => q.id).sort());
      for (const q of importedMcqs) {
        assert.equal(q.sourceRegion.out_of_syllabus, false);
        assert.equal(q.sourceRegion.mapping_scope.grade, grade);
        const source = expected.find(item => item.id === q.id)!;
        assert.equal(q.correctOption, source.sourceRegion.correct_answer);
      }
      const base = `/akueb/${grade === 9 ? 'IX' : 'X'}/mathematics`;
      routes.add(`${base}/mcqs/chapter-wise`);
      routes.add(`${base}/crqs`);
      for (const unit of theory) if (unit.crqs.length) routes.add(`${base}/crqs/${unit.unitNumber}`);
      counts.push({ grade, mcqs: importedMcqs.length, theory: importedTheory.length, mcqChapters: mcqs.length, theoryChapters: theory.length });
    }
    for (const route of routes) {
      const response = await fetch((process.env.CHAPTER_CHECK_URL || 'http://localhost:3000') + route, { signal: AbortSignal.timeout(60000) });
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert.ok(!html.includes('Internal Server Error'), route);
      if (route.includes('/crqs/')) assert.ok(html.includes('sourceHref'), `Chapter content is not rendered: ${route}`);
    }
    const result = { counts, chapterRoutesChecked: [...routes] };
    mkdirSync(`output/mathematics-ix-${year}`, { recursive: true });
    writeFileSync(`output/mathematics-ix-${year}/chapter-verification.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
