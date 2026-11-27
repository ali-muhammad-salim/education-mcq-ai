// Additional current Class X outcomes confirmed against the printed Paper I questions.
// The original class and earlier valid mappings are retained in the source papers.
export const classXChapterReview: Record<string, Record<string, string>> = {
  'MTH-X-2017-P1': { '10': '16.2.1' },
  'MTH-X-2018-P1': { '10': '16.2.1' },
  'MTH-X-2019-P1': { '10': '16.2.1', '11': '16.1.2' },
  'MTH-X-2021-P1': { '27': '16.1.2', '28': '16.1.2' },
  'MTH-X-2022-P1': { '27': '16.1.2' },
  'MTH-X-2023-P1': { '20': '16.1.2', '21': '16.3.1' },
  'MTH-X-2024-P1': { '21': '16.1.2', '22': '16.3.1', '31': '19.4.1' },
  'MTH-X-2025-P1': { '20': '16.1.2', '21': '16.3.1', '33': '19.4.1' },
  'MTH-X-2026-P1': { '20': '16.1.2', '36': '19.4.1' },
  'MTH-IX-2025-P1': { '42': '21.1.2' },
  'MTH-IX-P1': { '6': '16.2.1' },
};

// The first two ask for a centroid ratio, which is not a construction outcome.
// The last two substitute into a sector-area formula without a real-world application.
export const removedClassXChapterMappings = new Set([
  'MTH-IX-2017-P1/26', 'MTH-IX-2019-P1/32', 'MTH-X-2021-P1/38', 'MTH-X-2022-P1/36',
]);

// Reprinted questions may have different crops despite testing the same setup and choices.
const repeats = [
  ['MTH-X-2019-P1/10', 'MTH-IX-P1/6'],
  ['MTH-X-2019-P1/11', 'MTH-X-2025-P1/20'],
  ['MTH-X-2024-P1/21', 'MTH-X-2026-P1/20'],
  ['MTH-X-2024-P1/22', 'MTH-X-2026-P1/22'],
  ['MTH-IX-2021-P1/48', 'MTH-IX-2023-P1/42'],
];

export const mathematicsChapterRepeats = new Map(repeats.flatMap(group =>
  group.map(reference => [reference, 'mathematics-chapter-repeat-' + group[0]] as const),
));
