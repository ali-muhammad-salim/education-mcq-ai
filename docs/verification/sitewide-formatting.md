# Site-wide educational formatting verification

The shared mathematical and list rendering fixes now apply to syllabuses, paper questions and options, worked solutions, chapter practice, quiz displays/results, study text and review previews. Legacy syllabus and practical pages that rendered content directly now use the same components.

Changes include stacked fractions (including matrix cells), matrix rows/brackets, exponent grouping, single/double conjugate bars, consistent identity symbols, set notation, and one marker per lettered/Roman list item. Known imported LaTeX control-character escapes and unsupported arc/unit notation are repaired for display. Code snippets, links, paths, dates and already-typeset chemical notation are protected. Unsupported expressions remain visible as source text instead of a red renderer error. Stored question and answer values were not rewritten.

## Checks

- 11,208 unique content strings and 8,799 detected formula spans audited.
- 0 math parser errors in the audited corpus.
- 228 local resource, paper, syllabus, chapter and quiz-preview routes passed.
- 220 tests passed; 68 database integration tests skipped by their existing configuration.
- Type checking and lint passed.
- Browser check confirmed fractional answer choices inside matrix cells and an expanded paper solution.

## Reproduce

```powershell
npx tsx scripts/verify-educational-formatting.ts
npx tsx scripts/verify-resource-routes.ts
npm run typecheck
npm run lint
npm test
```

The content audit covers the registered bundled papers and four subjects’ IX/X syllabus JSON. It is a rendering check, not an independent academic review of every answer or mapping. Runtime audit results and a browser screenshot are in `output/sitewide-format-review/`.
