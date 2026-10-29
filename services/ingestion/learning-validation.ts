import type { z } from 'zod';
import { pageExtraction } from './trust';
/** Reject incomplete syllabus indexes even when every extracted row is individually faithful. */
export function syllabusCoverageConflicts(pages: { pageNumber: number; extraction: z.infer<typeof pageExtraction> }[], assignments: { classLevel: number; chapterCode: string }[]) {
  const rows = pages.flatMap(page => page.extraction.learning.outcomes);
  const conflicts: string[] = [];
  for (const assignment of assignments) if (!rows.some(row=>row.grade===assignment.classLevel && row.chapterCode===assignment.chapterCode)) conflicts.push(`Class ${assignment.classLevel}, chapter ${assignment.chapterCode}: no structured outcomes were extracted.`);
  for (const page of pages) {
    const codes = new Set(Array.from(page.extraction.text.matchAll(/\b\d{1,2}\.\d{1,2}\.\d{1,2}\b/g), match=>match[0]));
    const indexed = new Set(rows.map(row=>row.code));
    for (const code of codes) if (!indexed.has(code)) conflicts.push(`Page ${page.pageNumber}: printed SLO ${code} is absent from the structured syllabus.`);
  }
  return conflicts;
}
/** Structured records index the transcription; they cannot silently rewrite it. */
export function learningTranscriptionConflicts(value: z.infer<typeof pageExtraction>) {
  const normalize = (s: string) => s.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const source = normalize(value.text), conflicts: string[] = [];
  if (value.learning.printedExamYear && !source.includes(value.learning.printedExamYear)) conflicts.push('The structured exam year is not printed in the source transcription.');
  for (const row of value.learning.outcomes) { if (!row.code.trim() || !row.description.trim() || !source.includes(normalize(row.code)) || !source.includes(normalize(row.description))) conflicts.push('Outcome ' + row.code + ': structured text is not present in the page transcription.'); }
  for (const q of value.learning.questions) { if (!q.number.trim() || !q.stem.trim() || !source.includes(normalize(q.stem)) || q.options.some(o => !o.text.trim() || !source.includes(normalize(o.text)))) conflicts.push('Question ' + q.number + ': structured stem or options differ from the source transcription.'); if(q.originalSloCode && !source.includes(normalize(q.originalSloCode))) conflicts.push('Question '+q.number+': original SLO is not printed in the source.'); }
  for (const entry of value.learning.keyEntries) { if (entry.notes.trim() && !source.includes(normalize(entry.notes))) conflicts.push('Marking notes for ' + entry.number + ' are not verbatim source text.'); if(entry.originalSloCode && !source.includes(normalize(entry.originalSloCode))) conflicts.push('Key '+entry.number+': original SLO is not printed in the source.'); }
  return conflicts;
}
