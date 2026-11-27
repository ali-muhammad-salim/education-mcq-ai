import gradeNine from '@/data/computer-science/ssc1_exact_syllabus.json';
import gradeTen from '@/data/computer-science/ssc2_exact_syllabus.json';

export const sscComputerScienceUnits = { 9: gradeNine, 10: gradeTen };

export const sscComputerScienceOutcomes = new Map(
  ([9, 10] as const).flatMap(grade => sscComputerScienceUnits[grade].flatMap(unit =>
    unit.subtopics.flatMap(topic => topic.slos.map(outcome => [
      outcome.code, { code: outcome.code, description: outcome.description, topic: unit.name, unitNumber: unit.unitNumber, grade },
    ] as const)),
  )),
);

// Differences from the earlier transcription. Null indicates no assessed match in either grade.
// Written alternatives can have separate outcomes. A question-level entry lists their assessed coverage.
const reviewedChanges: Record<string, Record<string, string | null>> = {
  'CS-IX-2017-P1': { 4: null, 12: '8.1.3', 13: '8.1.3', 14: '8.1.3', 17: '8.5.3', 18: '8.4.2', 19: '13.2.2', 22: '8.5.3' },
  'CS-IX-2019-P1': { 11: '8.1.1', 13: '8.1.3', 14: '8.2.1', 16: '8.5.3', 17: '13.2.2', 18: '13.2.2', 23: '8.5.3' },
  'CS-IX-2022-P1': { 14: '1.2.4', 44: '3.5.1 3.9.2' },
  'CS-IX-2023-P1': {
    1: null, 12: '8.4.2', 13: '8.4.2', 14: '8.5.1', 15: '8.5.3', 16: '8.5.2',
    19: '13.2.2', 20: '13.2.2', 22: '1.3.1', 24: null, 35: null,
  },
  'CS-IX-2024-P1': { 7: '1.2.4', 12: '8.4.2', 13: '8.4.2', 14: '8.5.3', 15: '8.5.2', 16: '8.5.1', 19: '13.2.2', 20: '13.2.2', 27: '1.3.1' },
  'CS-IX-2025-P1': { 1: null, 12: '8.5.3', 13: '8.5.2', 14: '8.5.1', 15: '8.4.2', 16: '8.5.2', 18: '13.2.2', 19: '13.2.2', 25: '1.3.1' },
  'CS-IX-P1': { 22: '3.9.2 3.3.2', 25: '4.3.3 4.1.2', 35: '6.1.1 5.1.2' },
  'CS-X-2017-P1': { 1: '1.8.1', 3: '6.3.2', 5: '6.1.2', 6: '2.3.2', 11: null, 14: '10.4.3', 21: null, 22: '10.3.8 10.3.1' },
  'CS-X-2019-P1': { 1: '1.8.1', 2: '6.3.1', 3: '5.1.2', 7: '2.2.2', 12: null, 15: '10.4.3' },
  'CS-X-2022-P1': { 1: '2.3.2', 3: '2.3.2', 4: '2.3.2', 5: '2.1.3', 6: '2.1.3', 11: '10.1.2 10.1.3', 15: null, 20: '10.3.1 10.3.2', 22: '10.3.7', 25: null },
  'CS-X-2023-P1': { 1: '2.1.3', 3: '2.3.2', 4: '2.3.2', 8: '3.10.4', 10: '3.10.2', 11: '10.4.1 10.1.2', 18: null, 38: null, 39: '6.3.2', 40: '6.3.1' },
  'CS-X-2024-P1': { 1: '2.1.3', 2: '2.1.3', 4: '2.3.1', 5: '2.3.2', 21: null, 37: null, 38: null, 39: '6.3.1', 40: '6.3.2' },
  'CS-X-2025-P1': { 1: '2.3.2', 2: '2.3.2', 3: '2.1.3', 6: '2.1.3', 10: '3.10.2', 13: '3.10.4', 16: null, 36: '13.1.2', 39: '6.3.2' },
  'CS-X-P1': { 22: '11.3.4 11.3.1', 24: '12.1.7 12.1.2' },
  'CS-IX-2017-P2': { 2: '1.2.1 1.3.1', 3: '8.1.3 8.2.1', '3a': '8.1.3', '3b': '8.2.1', 4: '8.4.2 3.1.1', '4a': '8.4.2 3.1.1', 5: '1.5.2 8.5.3', '5a': '1.5.2 8.5.3', '6b': null, 7: '1.5.3 8.5.3', '7b': '8.5.3' },
  'CS-IX-2018-P2': { 2: '1.3.1 1.2.1', 3: '8.2.1', '3a': null, '3b': '8.2.1', 4: '13.2.2', '4b': '13.2.2', 5: '8.5.3', '5a': '8.5.3', 6: '1.2.5 1.6.3 1.3.2', '6a': null, '6b': '1.2.5 1.6.3 1.3.2', 7: '1.5.3 1.5.2' },
  'CS-IX-2019-P2': { 1: '1.6.3 1.6.2', 2: '1.3.1 1.2.1', 3: '8.1.3', 5: '1.5.2 8.5.3', '5a': '1.5.2 8.5.3', 6: '1.6.2 1.2.4 1.2.5', '6a': '1.6.2 1.6.3', '6b': '1.2.4 1.2.5', 7: '8.5.3', '7a': '8.5.3' },
  'CS-IX-2023-P2': { 1: '8.5.3', 6: '1.9.3 1.9.2' },
  'CS-IX-2024-P2': { 1: '8.4.2', 5: '1.2.1 1.5.4', 6: '1.9.3 1.9.2' },
  'CS-IX-2025-P2': { 1: '8.5.3', 5: '1.2.3 1.2.1', 6: '1.9.3 1.9.4', '6b': '1.9.4' },
  'CS-IX-P2': { 2: '3.11.3 3.10.5 3.10.4', 4: '3.10.5 3.10.4', 5: '7.2.1 7.2.3', 6: '1.2.4 4.3.3', 7: '5.1.2 6.2.1' },
  'CS-X-2017-P2': { 2: '10.3.5 10.3.1 10.3.4', '2a': '10.3.5 10.3.1 10.3.4', 3: '10.5.3 10.5.4', 7: '6.2.1 6.2.3 6.3.2', '7a': '6.2.1 6.2.3', '7b': '6.3.2', 8: '10.5.3 10.4.3 10.3.1', '8a': '10.5.3 10.3.1' },
  'CS-X-2018-P2': { 2: '10.3.1 10.3.4', 7: '11.1.1 6.2.1 6.2.3', '7a': '6.2.1 6.2.3', '7b': '11.1.1', 8: '10.3.1 10.4.3 10.6.3', '8a': '10.3.1 10.4.3' },
  'CS-X-2019-P2': { 2: '10.3.1 10.3.4 10.3.8', 3: '10.5.4 10.4.2', 7: '6.1.2 12.1.3', '7a': '6.1.2', 8: '10.5.3 10.4.3' },
  'CS-X-2023-P2': { 1: '2.3.2', 5: '10.4.3 10.5.3', 6: '6.3.2', '6a': '6.3.2' },
  'CS-X-2024-P2': { 5: '10.4.3 10.5.3', 6: '13.1.2 6.3.2', '6a': '13.1.2 6.3.2' },
  'CS-X-2025-P2': { 1: '2.3.2', 5: '10.5.3 10.4.3', 6: '6.3.1', '6a': '6.3.1' },
  'CS-X-P2': { 5: '10.4.3 10.2.3 10.3.1', 6: '10.4.3 10.5.3 10.2.3', 7: '12.2.2 11.1.2' },
};

export function sscComputerScienceMapping(paperCode: string, number: number | string, currentCode?: string | null, stem = '') {
  const paper = /^CS-(IX|X)-(?:\d{4}-)?P[12]$/.exec(paperCode);
  if (!paper) return undefined;
  const questionNumber = String(number).replace(/^Q\.?\s*/i, '').trim().toLowerCase();
  const changes = reviewedChanges[paperCode];
  const codes = changes && Object.hasOwn(changes, questionNumber) ? changes[questionNumber] : currentCode;
  const outcomes = (codes ?? '').split(/\s+/).flatMap(code => sscComputerScienceOutcomes.get(code) ?? []);
  const primary = outcomes[0];
  const originalGrade = paper[1] === 'IX' ? 9 : 10;
  const grade = primary?.grade ?? originalGrade;
  const legacyCode = /\bGW[ -]BASIC\b|\bC (?:program(?:ming)?|language|code|statement)\b|```(?:c|basic)\b/i.test(stem);
  return {
    current_slo: primary?.code ?? null,
    current_mapping: outcomes,
    mapping_scope: { board: 'AKU-EB', grade, subject: 'Computer Science' },
    current_syllabus_reviewed: true,
    syllabus_reviewed: true,
    in_syllabus: Boolean(primary),
    out_of_syllabus: !primary,
    mapping_reason: primary && legacyCode ? 'This past question uses a legacy language. The linked outcome covers the transferable skill. The current programming syllabus uses JavaScript.' : undefined,
  };
}
