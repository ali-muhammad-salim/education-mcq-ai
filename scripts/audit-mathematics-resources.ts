/** Read-only consistency audit of every registered Maths paper, database row and chapter publication. */
import { loadEnvConfig } from '@next/env';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { paperAnswer, paperChoices } from '../lib/paperPresentation';

loadEnvConfig(process.cwd());
async function main() {
  const { default: db } = await import('../lib/prisma');
  const { mappedChapterGroups, mappedTheoryUnits } = await import('../services/materials/practice');
  try {
    const papers = getAllStandardPapers().filter(p => p.paperCode.startsWith('MTH-')).map(p => getFallbackPaper(p.paperCode)!);
    const saved = await db.pastPaper.findMany({ where: { subject: { name: { equals: 'Mathematics', mode: 'insensitive' } } }, include: { questions: { include: { slos: true, topics: true } } } });
    const issues: { paper: string; question?: string; detail: string }[] = [];
    const review: { paper: string; question: string; status?: string; note?: string }[] = [];
    const published = new Set<string>();
    const chapters = [];
    for (const grade of [9, 10]) {
      const mcqs = await mappedChapterGroups('AKU-EB', grade, 'Mathematics');
      const theory = await mappedTheoryUnits('AKU-EB', grade, 'Mathematics');
      const rows = [...mcqs.flatMap(g => g.questions), ...theory.flatMap(g => [...g.crqs, ...g.erqs])];
      rows.forEach(q => published.add(q.id));
      chapters.push({ grade, mcqChapters: mcqs.length, theoryChapters: theory.length, questions: new Set(rows.map(q => q.id)).size });
    }
    for (const p of papers) {
      const candidates = saved.filter(s => s.paperCode === p.paperCode);
      if (candidates.length !== 1) { issues.push({ paper: p.paperCode, detail: `Database papers: ${candidates.length}` }); continue; }
      const row = candidates[0];
      if (row.questions.length !== p.questions.length) issues.push({ paper: p.paperCode, detail: `Question count ${row.questions.length}/${p.questions.length}` });
      for (const q of p.questions) {
        const found = row.questions.filter(s => s.questionNumber.replace(/^Q\.?\s*/i, '') === q.questionNumber.replace(/^Q\.?\s*/i, ''));
        if (found.length !== 1) { issues.push({ paper: p.paperCode, question: q.questionNumber, detail: `Database questions: ${found.length}` }); continue; }
        const sq = found[0], m = q.sourceRegion, sm = sq.sourceRegion as Record<string, unknown> || {};
        const issue = (detail: string) => issues.push({ paper: p.paperCode, question: q.questionNumber, detail });
        if (sq.questionText !== q.questionText) issue('Database text differs');
        if (q.questionType === 'MULTIPLE_CHOICE') {
          const answer = paperAnswer(m, paperChoices(m.choices));
          if (!answer) review.push({ paper: p.paperCode, question: q.questionNumber, status: m.answer_status, note: m.answer_review_note });
          if (JSON.stringify(paperChoices(sm.choices)) !== JSON.stringify(paperChoices(m.choices))) issue('Database choices differ');
          if (paperAnswer(sm, paperChoices(sm.choices)) !== answer) issue('Database answer differs');
        } else if (sm.model_answer !== m.model_answer) issue('Database solution differs');
        if (m.current_slo && (!sq.sloId || !sq.slos.length || !sq.topics.length)) issue('Current SLO links missing');
        const gradable = q.questionType !== 'MULTIPLE_CHOICE' || !!paperAnswer(m, paperChoices(m.choices));
        // Model MCQs use the existing model bank; this service publishes annual past questions.
        if (/-20\d{2}-P[12]$/.test(p.paperCode) && m.current_slo && gradable && !published.has(sq.id)) issue('Missing from current chapter practice');
        for (const asset of [m.diagramUrl, m.better_response_image, m.weaker_response_image]) if (asset?.startsWith('/') && !existsSync('public' + asset)) issue('Missing image: ' + asset);
      }
    }
    const report = { checkedAt: new Date().toISOString(), papers: papers.map(p => ({ code: p.paperCode, questions: p.questions.length })), questions: papers.reduce((n, p) => n + p.questions.length, 0), chapters, review, issues };
    mkdirSync('output/mathematics-full-audit', { recursive: true });
    writeFileSync('output/mathematics-full-audit/database-and-chapters.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, papers: report.papers.length }, null, 2));
    if (issues.length) process.exitCode = 1;
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
