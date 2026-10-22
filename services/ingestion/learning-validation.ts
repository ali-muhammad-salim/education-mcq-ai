import type { z } from 'zod';
import { pageExtraction } from './trust';
/** Structured records index the transcription; they cannot silently rewrite it. */
export function learningTranscriptionConflicts(value: z.infer<typeof pageExtraction>) {
  const normalize = (s: string) => s.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const source = normalize(value.text), conflicts: string[] = [];
  if (value.learning.printedExamYear && !source.includes(value.learning.printedExamYear)) conflicts.push('The structured exam year is not printed in the source transcription.');
  for (const row of value.learning.outcomes) { if (!row.code.trim() || !row.description.trim() || !source.includes(normalize(row.code)) || !source.includes(normalize(row.description))) conflicts.push('Outcome ' + row.code + ': structured text is not present in the page transcription.'); }
  for (const q of value.learning.questions) { if (!q.number.trim() || !q.stem.trim() || !source.includes(normalize(q.stem)) || q.options.some(o => !o.text.trim() || !source.includes(normalize(o.text)))) conflicts.push('Question ' + q.number + ': structured stem or options differ from the source transcription.'); }
  for (const entry of value.learning.keyEntries) { if (entry.notes.trim() && !source.includes(normalize(entry.notes))) conflicts.push('Marking notes for ' + entry.number + ' are not verbatim source text.'); }
  return conflicts;
}
