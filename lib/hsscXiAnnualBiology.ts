import source2017 from '@/data/biology/hssc_xi_2017.json';
import source2018 from '@/data/biology/hssc_xi_2018.json';
import source2019 from '@/data/biology/hssc_xi_2019.json';
import source2021 from '@/data/biology/hssc_xi_2021.json';
import source2022 from '@/data/biology/hssc_xi_2022.json';
import source2023 from '@/data/biology/hssc_xi_2023.json';
import source2024 from '@/data/biology/hssc_xi_2024.json';
import source2025 from '@/data/biology/hssc_xi_2025.json';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import { hsscBiologyOptionFeedback } from '@/lib/hsscBiologyOptionFeedback';
import type { PaperData, QuestionData } from '@/lib/paperDataService';

export const biologyXiAnnualYears = [2025, 2024, 2023, 2022, 2021, 2019, 2018, 2017] as const;
type AnnualYear = typeof biologyXiAnnualYears[number];
type AnnualMarkingNote = {
  page: number; originalSlo?: string; hints?: string; overall?: string; better: string; weaker: string;
  images: { better?: string; weaker?: string };
};
const sources: Record<AnnualYear, {
  mcqs: (Omit<typeof source2025.mcqs[number], 'originalSlo'> & { originalSlo?: string; universal?: boolean })[];
  written: typeof source2025.written;
  marking: Record<string, AnnualMarkingNote>;
}> = { 2017: source2017, 2018: source2018, 2019: source2019, 2021: source2021, 2022: source2022, 2023: source2023, 2024: source2024, 2025: source2025 };

export const biologyXi2022VerificationReport = 'https://www.nursinghero.com/study-files/23430367';
const additionalPracticeChoices: Partial<Record<AnnualYear, Record<string, string>>> = {
  2018: { '18': 'B' },
  2019: { '23': 'B' },
  2022: { '33': 'C', '55': 'D' },
  2023: { '13': 'C', '25': 'B', '45': 'C' },
  2024: { '50': 'D' },
};
export const biologyXi2021AnswerReview: Record<string, { answer: string; explanation: string; source: string }> = {
  '1': {
    answer: 'A',
    explanation: 'The AKU-EB key lists B. A is also accepted in practice. Hydrogen bonds can help bind the substrate at I. Point II marks the highest reaction rate, and average kinetic energy continues to rise as temperature increases.',
    source: 'https://openstax.org/books/biology/pages/6-5-enzymes',
  },
  '47': {
    answer: 'B',
    explanation: 'The AKU-EB key lists A. B is also accepted in practice. Aortic pressure peaks during ventricular ejection, when the atrioventricular valves are closed and the semilunar valves are open.',
    source: 'https://openstax.org/books/anatomy-and-physiology/pages/19-3-cardiac-cycle',
  },
};

// 2025 syllabus outcomes or named Class XI practical activities (P followed by its number).
// An empty entry means there is no verified direct match.
const mcqMapping = {
  2017: [
    '', '25.1.1', '1.4.6', '1.3.2', '2.3.1', '3.3.2', '3.3.2', '4.6.2', '4.2.2', '5.2.4',
    '5.9.2', '5.9.2', '6.4.1', '6.5.2', '6.3.1', '7.1.7', '7.2.2', '8.4.1', '8.4.2', '9.3.10',
    '', '9.3.6', '11.6.2', '12.2.5', '9.3.6', '12.2.5', '13.6.17', '13.5.3', '13.4.3', '13.6.8',
  ],
  2018: [
    '', '1.7.6', '1.3.2', '2.2.1', '23.2.2', '3.3.2', '3.3.2', '4.2.2', '4.6.2', '5.2.5',
    '5.6.1', '5.4.1', '6.3.1', '6.3.1', '6.4.1', '7.1.6', '7.2.4', '8.2.1', '9.2.1', '10.3.4',
    '10.3.7', '11.7.1', '11.1.4', '10.2.11', '12.2.5', '9.5.3', '14.2.2', '13.6.1', '', '13.6.11',
  ],
  2019: [
    '', '', '1.3.1', '1.5.5', '1.6.6', '2.3.1', '2.4.3', '', '3.3.2', '3.3.2',
    '3.4.1', '4.6.2', '5.7.1', '6.4.2', '7.1.1', '7.2.2', '8.3.1', '8.4.2', '', '9.2.1',
    '9.2.1', '9.3.2', '9.3.5', '10.2.7', '10.3.5', '10.3.7', '11.2.1', '13.6.17', '9.3.5', '12.2.3',
    '12.2.5', '13.2.3', '13.4.3', '', '13.6.3',
  ],
  2021: [
    '2.3.1', '2.4.5', '2.1.2', '2.4.3', '9.3.5', '9.5.13', '9.2.1', '9.3.1', '9.3.4', '9.5.14',
    '9.3.1', '9.5.2', '5.5.1', '5.4.1', '6.3.3', '6.1.1', '6.3.1', '', '7.2.1', '7.1.7',
    '8.2.2', '8.4.2', '8.4.3', '8.3.5', '8.4.2', '8.2.1', '10.3.7', '10.2.11', '10.3.4', '10.2.3',
    '10.3.4', '9.3.6', '11.5.1', '11.2.1', '9.3.3', '11.5.1', '9.5.3', '12.2.1', '12.3.1', '9.3.6',
    '12.2.5', '12.2.5', '13.2.5', '13.6.15', '13.6.18', '13.6.11', '13.6.3', '13.7.1', '13.6.14', '14.6.1',
    'P5', '9.2.1', '9.3.10', '5.2.4', 'P9', '6.3.1', 'P15', '8.5.1', '8.5.2', '8.5.2',
    'P27', 'P32', 'P33', 'P25', 'P25',
  ],
  2022: [
    '2.2.1', '2.3.1', '2.4.5', '', '9.2.1', '9.3.2', '9.3.3', '9.2.1', '9.3.6', '9.3.10',
    '9.5.8', '9.5.10', '5.2.5', '5.4.1', '6.3.3', '6.4.1', '7.1.3', '7.2.3', '7.2.2', '7.1.5',
    '8.2.1', '8.3.6', '8.3.2', '8.4.1', '8.5.1', '8.4.2', '10.2.7', '10.2.9', '10.2.13', '10.3.2',
    '10.3.4', '11.1.5', '11.6.5', '11.5.2', '11.5.1', '11.7.1', '12.1.1', '10.2.11', '9.5.5', '9.3.6',
    '12.2.5', '5.9.4', '13.2.4', '13.2.5', '13.4.3', '13.4.4', '13.6.18', '13.6.14', '13.6.8', '13.6.2 13.6.3',
    '2.3.1', '9.5.5', '9.3.11', '5.2.4', '5.2.4', '6.4.1', 'P15', 'P17', '8.5.2', '8.5.2',
    'P25', 'P25', '12.2.2', 'P28', 'P32',
  ],
  2023: [
    '', '', '1.6.7 1.6.6', '7.1.4', '20.5.2', '1.3.2', '1.2.1', '2.3.1', '2.4.3', '2.2.1',
    '2.5.2', '3.3.4', '3.3.2', '3.3.2', '3.3.2', '9.2.1', '9.3.5', '9.3.1', '9.3.5', '4.6.2',
    '4.8.2', '5.7.1', '', '5.3.1', '6.4.1', '6.2.1', '7.2.4', '25.2.4', '7.1.5', '8.4.2',
    '8.3.1', '8.2.1', '8.3.3', '8.2.1', '10.2.3', '10.2.8', '10.2.13', '10.3.4', '9.3.6', '11.2.1',
    '11.1.5', '11.6.3', '9.5.3', '5.9.4', '12.2.3', '13.6.2', '13.2.3', '14.5.2', '13.2.4', '13.7.1',
  ],
  2024: [
    '', '', '1.4.7', '1.6.4', '1.5.3', '1.4.6', '20.2.3', '2.3.1', '2.4.1', '2.5.1 2.1.2',
    '2.4.3', '3.3.4', '3.3.2', '3.3.2', '', '9.2.1', '9.3.5', '9.3.3', '9.3.2', '4.8.2',
    '4.2.1', '5.2.5', '5.7.1', '5.9.1', '6.3.1', '', '7.2.1', '7.1.1', '7.2.2', '8.4.3',
    '8.3.2', '8.2.2', '8.2.4', '8.4.1', '10.2.11', '10.3.2', '10.2.8', '10.3.4', '11.5.1', '9.3.3',
    '11.6.2', '11.7.1', '12.2.1', '12.2.3', '12.2.7', '9.5.3', '13.4.4', '13.8.1', '13.7.1', '14.6.2',
  ],
  2025: [
  '25.1.1', '', '1.3.1', '1.7.3', '1.5.2', '1.6.7', '1.6.6', '2.2.1', '2.5.2', '2.4.5',
  '2.4.3', '', '3.3.2', '3.4.1', '3.2.1', '9.2.1', '9.3.2', '9.3.1', '9.3.10', '4.8.2',
  '4.6.2', '5.4.1', '5.7.1', '5.10.2', '6.5.2', '6.3.1', '7.1.3', '7.2.2', '7.2.1', '8.3.1',
  '8.3.6', '', '8.2.1', '8.4.1', '10.3.4', '10.2.3', '10.3.4', '10.2.9', '9.3.3', '11.6.4',
  '11.2.1', '11.1.5', '9.3.5', '12.2.3', '12.2.7', '13.3.1', '13.8.4', '13.2.3', '14.3.2', '14.6.1',
  ],
};
const writtenMapping: Record<AnnualYear, Record<string, string>> = {
  2017: {
    '3': '5.5.1 5.2.5', '4': '6.3.1 6.4.2', '5': '7.1.5',
    '10a': '1.7.3', '10b': '3.3.4', '11a': '9.3.8 9.3.9', '11b': '11.3.1 11.4.1',
  },
  2018: {
    '2': '4.3.1 4.4.3', '4': '6.4.1', '5': '7.2.1', '6': '8.4.4 8.2.3', '8': '9.5.10',
    '10a': '1.5.2 1.5.5', '10b': '3.3.2', '11a': '9.5.12 9.5.13', '11b': '10.3.4',
  },
  2019: {
    '1': '1.6.4 1.6.10', '2': '2.4.5', '3': '3.3.4', '4': '4.6.2',
    '6': '8.2.1 8.5.1', '7': '10.3.6', '8': '11.2.1 11.6.5', '9': '5.9.4',
    '10a': '3.4.1', '10b': '9.5.8 9.5.6', '11a': '12.2.1', '11b': '13.6.4 13.6.8',
  },
  2021: {},
  2022: {},
  2023: {
    '1': '1.4.6', '2': '2.4.5', '3': '3.3.2', '4': '9.3.11', '5': '8.3.2',
    '6': '10.2.7', '7': '11.2.1', '8': '12.2.8', '9': '13.6.8',
    '10a': '3.4.1', '10b': '9.5.8 9.5.6', '11a': '12.2.5 12.2.7', '11b': '13.6.18',
  },
  2024: {
    '1': '1.6.7 1.6.6', '2': '2.3.2', '3': '3.3.2', '4': '9.3.10', '5': '8.3.5',
    '6': '10.2.5', '7': '11.5.1', '8': '12.3.1', '9': '13.6.3',
    '10a': '3.3.4', '10b': '9.3.8 9.3.9', '11b': '13.4.2 13.4.5',
  },
  2025: {
  '1': '1.5.3 1.5.5', '2': '2.3.3', '3': '3.3.2', '4': '9.3.2', '5': '8.3.2 8.3.4',
  '6': '10.2.13', '7': '11.5.1', '8': '9.5.3', '9': '13.2.6',
  '10a': '3.3.2', '10b': '9.3.5', '11a': '12.2.8 12.3.1', '11b': '13.6.8 13.6.9',
  },
};

const chapters = [11, 12].flatMap(grade => hsscBiologySyllabus('akueb', grade, 'biology')!.units
  .map(unit => ({ ...unit, grade })));
const practicals = hsscBiologySyllabus('akueb', 11, 'biology')!.practicals;

function annualQuestionMapping(year: AnnualYear | undefined, number: string, written: boolean) {
  if (year === undefined) return undefined;
  const entry = written ? writtenMapping[year][number] : mcqMapping[year][Number(number) - 1];
  if (!entry) return undefined;
  const practical = entry.startsWith('P') ? practicals.find(item => item.number === Number(entry.slice(1))) : undefined;
  const codes = practical ? [] : entry.split(' ');
  const unit = chapters.find(chapter => chapter.unitNumber === (practical?.chapter ?? Number(codes[0].split('.')[0])));
  if (!unit) throw new Error(`Unknown Biology syllabus mapping ${entry}`);
  return { unit, codes, practical };
}

function biologyXiAnnualChapter(year: AnnualYear | undefined, number: string, written = false) {
  return annualQuestionMapping(year, number, written)?.unit;
}

function syllabusMetadata(year: AnnualYear, number: string, written: boolean): QuestionData['sourceRegion'] {
  const mapping = annualQuestionMapping(year, number, written);
  if (!mapping) return {
    mapping_status: 'NO_DIRECT_OUTCOME',
    current_syllabus_reviewed: true, syllabus_reviewed: true,
  };
  const { unit, codes, practical } = mapping;
  const linked = codes.map(code => {
    const slo = unit.subtopics.flatMap(topic => topic.slos).find(item => item.code === code);
    if (!slo) throw new Error(`Unknown Biology syllabus outcome ${code}`);
    return { ...slo, topic: unit.name, grade: unit.grade };
  });
  return {
    current_slo: linked[0]?.code, current_mapping: linked,
    ...(practical ? {
      chapter_mapping_verified: true,
      chapter_href: `/akueb/XI/biology/syllabus#practical-${practical.number}`,
      chapter_name: `${unit.name} · Practical ${practical.number}`,
    } : {}),
    mapping_scope: { board: 'AKU-EB', grade: unit.grade, subject: 'Biology' },
    current_syllabus_reviewed: true, syllabus_reviewed: true, in_syllabus: true,
  };
}

function annualArchive(year: AnnualYear) {
  const source = sources[year];
  const combinesPractical = year === 2021 || year === 2022;
  const root = `/materials/hssc/biology/biology-xi-${year}-`;
  const resources = [
    { label: 'Paper 1', href: `/past-papers/BIO-XI-${year}-P1`, year },
    { label: 'Paper 1 keys', href: `/resources/biology-xi-${year}-key`, year },
    ...(!combinesPractical ? [
      { label: 'Paper 2', href: `/past-papers/BIO-XI-${year}-P2`, year },
      { label: 'Paper 2 E-marking', href: `/resources/biology-xi-${year}-emarking`, year },
    ] : []),
  ];
  const papers: PaperData[] = (combinesPractical ? [1] : [1, 2]).map(part => {
  const first = part === 1;
  const code = `BIO-XI-${year}-P${part}`;
  return {
    id: code, paperCode: code, title: `Biology Class XI Annual ${year} · Paper ${first ? 'I' : 'II'}`,
    examYear: year, examType: 'ANNUAL', examSession: year <= 2019 ? 'April/May' : 'Annual Examination',
    academicClass: { name: 'Class XI', level: 11 }, subject: { id: 'biology', name: 'Biology', code: 'BIO-XI' },
    fileUrl: root + (first ? 'paper-i.pdf' : 'paper-ii.pdf'),
    totalMarks: first ? source.mcqs.length : year <= 2018 ? 55 : year === 2019 ? 50 : 35,
    durationMinutes: year <= 2018 ? (first ? 40 : 140) : year === 2019 ? (first ? 50 : 130) : combinesPractical ? 130 : 90,
    questionCount: first ? source.mcqs.length : 11,
    markScalingNote: combinesPractical
      ? 'This paper has 50 Theory MCQs and 15 Alternate to Practical MCQs. AKU-EB equated the 50 Theory marks to 85 for its examination results.'
      : undefined,
    printedCode: `H${String(year).slice(2)}01-19111${part}0`,
    markingGuideUrl: first ? undefined : resources[3].href,
    rubricInstruction: first ? undefined : 'Answer all eleven questions. Attempt one alternative each from Questions 10 and 11.',
    questions: first ? source.mcqs.map(q => {
      const magnesiumQuestion = year === 2023 && q.number === '13';
      const bryophyteQuestion = year === 2018 && q.number === '18';
      const answerReview = year === 2021 ? biologyXi2021AnswerReview[q.number] : undefined;
      const extraChoice = answerReview?.answer ?? additionalPracticeChoices[year]?.[q.number];
      const accepted = q.universal ? Object.keys(q.choices) : [...new Set(extraChoice ? [...q.answer, extraChoice] : q.answer)];
      const practical = combinesPractical && Number(q.number) > 50;
      const feedback = hsscBiologyOptionFeedback(String(year), q.number);
      return {
      id: `${code}-q${q.number}`, questionNumber: q.number, questionText: q.stem,
      questionType: 'MULTIPLE_CHOICE', marks: q.marks, difficulty: q.level,
      diagramBased: q.stem.includes('![') || Object.values(q.choices).some(choice => choice.startsWith('![')),
      sourceRegion: {
        ...syllabusMetadata(year, q.number, false), choices: q.choices, quiz_stem: q.quizStem,
        correct_answer: answerReview?.answer ?? q.answer[0], official_answer: q.answer.join(', '),
        accepted_options: accepted.length > 1 ? accepted : undefined, score_accepted_options: accepted.length > 1 ? true : undefined,
        explanation: q.universal
          ? 'The verification report lists C and marks this question as a universal key. Any selected option earns the mark. The calculated Rf is 4.0 ÷ 12.0 ≈ 0.33.'
          : answerReview?.explanation ?? (magnesiumQuestion
          ? 'The AKU-EB key lists A. RiseLearner also accepts C because magnesium deficiency can affect mitochondrial ATP production as well as ribosome assembly.'
          : bryophyteQuestion
          ? 'The AKU-EB key lists D (hornworts). RiseLearner also accepts B (mosses) because moss and hornwort sporophytes can share the listed features. A persistent basal meristem would distinguish hornworts.'
          : extraChoice && feedback
          ? `AKU-EB lists ${q.answer.join(' or ')}. RiseLearner also accepts ${extraChoice}. ${feedback.find(option => option.key === extraChoice)?.reason ?? ''}`.trim()
          : q.answer.length > 1 ? `The official AKU-EB answer key awards credit for either ${q.answer.join(' or ')}.`
          : feedback?.find(option => option.key === q.answer[0])?.reason),
        option_feedback: feedback,
        answer_origin: 'OFFICIAL_KEY_VERIFIED', slo: q.originalSlo, original_cognitive_level: q.level,
        original_reference_source: practical && year === 2022 ? biologyXi2022VerificationReport : root + 'key.pdf',
        original_reference_verified: true,
        ...(combinesPractical ? { assessmentSection: practical ? 'Alternate to Practical' : 'Theory' } : {}),
      },
      };
    }) : source.written.map(q => {
      const note = source.marking[q.number];
      const alternative = q.number.endsWith('a') ? 'EITHER' : q.number.endsWith('b') ? 'OR' : undefined;
      return {
        id: `${code}-q${q.number}`, questionNumber: q.number, questionText: q.stem,
        questionType: alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: q.marks, diagramBased: q.stem.includes('!['),
        sourceRegion: {
          ...syllabusMetadata(year, q.number, true), slo: note.originalSlo, choice_instruction: alternative,
          group_question_number: alternative === 'EITHER' ? Number.parseInt(q.number, 10) : undefined,
          emarkingExamples: [{
            part: q.number, solution: note.hints ?? '', better: note.images.better, weaker: note.images.weaker,
            pdf: root + 'emarking.pdf#page=' + note.page, originalSlo: note.originalSlo,
            overall: note.overall, betterNotes: note.better, weakerNotes: note.weaker,
          }],
        },
      };
    }),
  };
  });
  return { year, root, resources, papers, key: source.mcqs, marking: Object.entries(source.marking).map(([number, note]) => ({ number, ...note })) };
}

export const biologyXiAnnualArchives = biologyXiAnnualYears.map(annualArchive);
export const biologyXiAnnualPapers = biologyXiAnnualArchives.flatMap(archive => archive.papers);
export { biologyXiAnnualChapter };
