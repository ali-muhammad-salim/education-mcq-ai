import { paperMetadata } from './paperPresentation';

type Question = {
  id?: string;
  stem?: string;
  stemText?: string;
  questionText?: string;
  problem?: string;
  questionType?: string;
  sourceRegion?: unknown;
  options?: unknown;
  choices?: unknown;
  diagramUrl?: string | null;
  diagram?: string | null;
  diagramBased?: boolean;
  isDiagram?: boolean;
  drawingSvg?: string;
  matchingPairs?: unknown[];
  paperCode?: string | null;
  sourcePaper?: string | null;
  duplicateGroup?: string;
  rawQuestionNumber?: string | number;
  questionNumber?: string | number;
};

function compareText(value: string) {
  const text = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  // Preserve case, operators, indentation and layout in code, math and tables.
  if (/[`$\\<>=|{};^₀-₉⁰-⁹]|^\s*(?:var|let|const|int|def)\s|\d\s*[\p{L}°]/mu.test(text)) return text;
  if (/^[\p{L}]{1,3}$/u.test(text)) return text;
  return text.replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').replace(/([\p{L}])[.?]$/u, '$1').toLowerCase();
}

function questionKey(question: Question) {
  if (question.duplicateGroup) return JSON.stringify(['reviewed', question.paperCode, question.duplicateGroup]);
  const stem = compareText(question.stemText || question.stem || question.questionText || question.problem || '');
  if (!stem) return undefined;
  const region = paperMetadata(question.sourceRegion);
  const raw = question.options ?? question.choices ?? region.choices ?? region.options;
  const values: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : [];
  const options = values.map(value => {
    if (typeof value === 'string') return compareText(value);
    const entry = paperMetadata(value);
    return compareText(String(entry.text ?? entry.value ?? entry.label ?? ''));
  });
  // Letter references make option order part of the question.
  if (![stem, ...options].some(text => /\b(?:options?\s+[a-z]\b|(?:[a-z] and [a-z]|[a-z] or [a-z])\b|all of the above|none of the above)/i.test(text))) options.sort();
  const diagram = question.diagramUrl || question.diagram || question.drawingSvg || region.diagramUrl || region.diagram_url || region.image_url;
  let figure = diagram || '';
  if (!figure && (question.diagramBased || question.isDiagram || region.diagramBased || region.isDiagram)) {
    const source = question.paperCode || question.sourcePaper;
    const number = question.rawQuestionNumber ?? question.questionNumber;
    const reference = source && number != null ? JSON.stringify([source, number]) : question.id;
    if (!reference) return undefined;
    figure = `unresolved:${reference}`;
  }
  const kind = question.questionType && question.questionType !== 'MULTIPLE_CHOICE' && question.questionType !== 'MCQ_SINGLE' ? question.questionType : '';
  return JSON.stringify([kind, stem, options, figure, question.matchingPairs ?? []]);
}

export function groupDuplicateQuestions<T>(items: readonly T[], question: (item: T) => Question) {
  const groups: T[][] = [];
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const key = questionKey(question(item));
    const existing = key === undefined ? undefined : byKey.get(key);
    if (existing) {
      existing.push(item);
    } else {
      const group = [item];
      groups.push(group);
      if (key !== undefined) byKey.set(key, group);
    }
  }
  return groups;
}

export function uniqueQuestions<T extends Question>(questions: readonly T[]): T[] {
  return groupDuplicateQuestions(questions, question => question).map(([first]) => first);
}
