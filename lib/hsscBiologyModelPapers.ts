import data from '@/data/biology/hssc_model_papers.json';
import { normalizeBoardId } from '@/lib/boardCatalog';
import { hsscBiologyOptionFeedback } from '@/lib/hsscBiologyOptionFeedback';

// RiseLearner solutions in printed question order.
const answers = {
  XI: ['BBBBCBABCC', 'ADBACCBBBC', 'AABDCBCDDD', 'CAACBBBABC', 'DAAACCABDB'].join(''),
  XII: ['ACCACCDBAD', 'CDCDBCCAAC', 'BACCDDABCD', 'CBDDBACDCA', 'CCABAAADDD'].join(''),
};
const alternateAnswers: Partial<Record<string, string[]>> = { 'XI-7': ['C'], 'XI-28': ['A'] };

const reviewNotes: Partial<Record<string, string>> = {
  'XI-7': 'Either A or C earns credit. Magnesium supports ribosome assembly and mitochondrial ATP synthesis can also be affected by magnesium deficiency.',
  'XI-9': 'Magnification is a unitless ratio. Using the intended 200× gives an image size of 200 × 0.8 mm = 160 mm.',
  'XI-20': 'In C, flagella are restricted to both poles. This is amphitrichous in the broad sense, including tufts at both poles.',
  'XI-28': 'Either A or D earns credit. The listed features can occur in both moss and hornwort sporophytes. A persistent basal meristem would distinguish hornworts.',
  'XII-17': 'C is the intended choice for a response to a chemical stimulus. The precise term for sperm swimming toward the stimulus is chemotaxis.',
  'XII-20': 'C is the intended answer in the paper’s broad growth-promoting sense. The effect on bud formation or outgrowth depends on the hormone, bud type and conditions.',
};

export function hsscBiologyMcqMetadata(roman: string, question: { number: number; stem: string; choices: string[] }) {
  const table = /(?:^|\n\n)(\| Option \|[^\n]*\n\|[^\n]+\n(?:\| [A-D] \|[^\n]+\n?){4})$/.exec(question.stem);
  const rows = table?.[1].trimEnd().split('\n').map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));
  const options = rows ? rows.slice(2).map(row => row.slice(1).map((value, index) => `${rows[0][index + 1]}: ${value}`).join(' · ')) : question.choices;
  const choices = Object.fromEntries(options.map((text, index) => ['ABCD'[index], text]));
  const key = answers[roman as keyof typeof answers]?.[question.number - 1];
  const questionId = `${roman}-${question.number}`;
  const alternatives = alternateAnswers[questionId];
  const feedback = hsscBiologyOptionFeedback(roman, question.number);
  const explanation = roman === 'XI' ? ({
    4: 'Structure B has an additional carboxyl group in its side chain.',
    25: 'Diagram C shows conidia produced externally on a branching conidiophore.',
  } as Record<number, string>)[question.number] : undefined;
  return {
    choices,
    correct_answer: key,
    accepted_options: key && alternatives ? [key, ...alternatives].sort() : undefined,
    score_accepted_options: Boolean(alternatives),
    answer_origin: 'PROJECT_SOLVED',
    explanation: reviewNotes[questionId] ?? explanation ?? feedback?.find(option => option.key === key)?.reason,
    option_feedback: feedback,
    quiz_stem: table ? question.stem.slice(0, table.index).trim() : undefined,
  };
}

export function hsscBiologyModelPapers(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== 'akueb' || subject !== 'biology' || (grade !== 11 && grade !== 12)) return [];
  return data.filter(paper => paper.roman === (grade === 11 ? 'XI' : 'XII')).map(paper => ({
    ...paper,
    label: paper.part === 1 ? 'Paper I' : 'Paper II',
    slug: paper.part === 1 ? 'paper-i' : 'paper-ii',
    href: `/akueb/${paper.roman}/biology/model-papers/paper-${paper.part === 1 ? 'i' : 'ii'}`,
  }));
}

export function hsscBiologyModelQuizPaper(code: string) {
  const model = /^BIO-(XI|XII)-MODEL-(\d{4})-P1$/.exec(code);
  if (!model) return null;
  const [, roman, year] = model;
  const paper = hsscBiologyModelPapers('akueb', roman === 'XI' ? 11 : 12, 'biology')
    .find(item => item.part === 1 && String(item.year) === year);
  if (!paper) return null;
  return {
    title: `Biology Class ${roman} · Model Paper I`,
    durationMinutes: 90,
    questions: paper.questions.flatMap(question => {
      if (!('choices' in question)) return [];
      const sourceRegion = hsscBiologyMcqMetadata(roman, question);
      return [{
        id: `${code}-${question.number}`,
        questionNumber: String(question.number),
        questionText: sourceRegion.quiz_stem ?? question.stem,
        questionType: 'MULTIPLE_CHOICE' as const,
        marks: question.marks,
        sourceRegion,
      }];
    }),
  };
}
