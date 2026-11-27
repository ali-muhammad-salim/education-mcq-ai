import key from '@/data/physics/ssc2_2022_official_key.json';
import { physicsIxAnnualChapterMcqs, physicsIxAnnualMcqs } from '@/lib/physicsIxAnnualMcqs';
import type { PaperData } from '@/lib/paperDataService';
import { physicsX2022Items } from './physicsX2022Items';

const paperCode = 'PHY-X-2022-P1';
const keyHref = '/resources/physics-x-2022-key';
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2022-';
const diagrams = new Set([20, 27, 32, 33, 43]);
const duplicateKeys: Record<number, string> = { 40: 'physics-x-basic-gates-except-nor', 43: 'physics-x-prism-total-deviation' };
const headings: Record<number, string[]> = {
  24: ['Conductor', 'Connection'],
  29: ['Voltage', 'Current'],
};
const lensTable = [
  '| Row | Focal length | Lens power |',
  '| --- | --- | --- |',
  '| I | Positive | Positive |',
  '| II | Positive | Negative |',
  '| III | Negative | Positive |',
  '| IV | Negative | Negative |',
].join('\n');

const notes: Record<number, string> = {
  9: 'The printed question does not specify the shape of the water surface. The practice version specifies a flat surface, under which the focus moves closer.',
  10: 'A biconvex lens also converges. The digital stem asks for the general class, convex lens.',
  29: 'The board keys C. B is also valid for resistive overheating because excessive current can heat a wire even at low voltage.',
  30: 'The board keys A. The power is 242 W (B). After 2 s the energy transferred is 484 J.',
  35: 'The digital stem isolates the invalid feature shown in C. A magnetic field has one direction at each point, so its field lines cannot cross.',
  41: 'The board answer assumes small angles. For larger amplitudes, an ideal pendulum’s period increases slightly with amplitude.',
};
const unmapped: Record<number, string> = {
  4: 'Energy conversion at different points of a pendulum’s swing is not a direct outcome in current Class X Physics.',
  7: 'No current Class X outcome asks students to classify this combination of sound and light nuisances.',
  9: 'The current Class X syllabus does not directly assess focal distances of concave mirrors.',
  13: 'Identifying a microscope as an instrument is outside the current outcomes on simple magnification.',
  17: 'The current mirror outcome covers plane mirrors. It does not assess images from convex or concave mirrors.',
  21: 'Capacitance and dielectrics are outside the current Class X Physics outcomes.',
  23: 'Calculation of parallel capacitance is outside the current Class X Physics outcomes.',
  37: 'The current syllabus covers electron guns and cathode-ray oscilloscopes. Identifying a traditional television picture tube is not a direct outcome.',
  48: 'The current magnetic-pattern outcome specifies straight wires and solenoids. This question concerns a single circular loop.',
  49: 'The current truth-table outcome specifies two inputs. This question requires all combinations for four inputs.',
};

const questions = physicsIxAnnualMcqs(physicsX2022Items.map(([pageNumber, slo, stem, options, reasons], index) => {
  const { number, letter, slo: officialSlo, level } = key[index];
  return {
    pageNumber, slo, key: number === 30 ? 'B' : letter, cognitive: level, officialSlo, officialAnswer: letter,
    stem: stem.replace('{lens-table}', lensTable),
    options: options.split('|'), reasons: reasons.split('|'),
    headings: headings[number], diagram: diagrams.has(number), optionDiagrams: number === 35,
    assessmentSection: number === 1 ? 'Theory' : number === 41 ? 'Alternate to Practical' : undefined,
    mappingReason: unmapped[number], reviewNote: notes[number],
    acceptedOptions: number === 29 ? ['B', 'C'] : undefined,
    reviewedDuplicateKey: duplicateKeys[number],
  };
}), paperCode, keyHref, 10);

export const physicsX2022Paper = {
  id: paperCode, paperCode, title: 'Physics Class X Annual 2022 · Paper I',
  examYear: 2022, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
  totalMarks: 50, durationMinutes: 100, questionCount: 50, printedCode: 'S2202-1721110',
  markScalingNote: 'The board scaled the 40 Theory marks to 65 for the examination results.',
  fileUrl: pdfRoot + 'paper-i.pdf', questions,
} satisfies PaperData;

export const physicsX2022Key = { href: keyHref, label: 'Official MCQ key', fileUrl: pdfRoot + 'key.pdf', year: 2022 };
export const physicsX2022Tabs = [
  { label: 'Paper I · Theory and Alternate to Practical', href: '/past-papers/' + paperCode },
  physicsX2022Key,
];
export const physicsX2022AnswerKey = key;
export const physicsX2022ChapterMcqs = physicsIxAnnualChapterMcqs(questions.filter(q => q.topics?.length), paperCode, 2022);
