import { hsscPhysicsPapers } from './hsscPhysicsResources';
import { hsscXiAnnualPapers } from './hsscXiAnnualPhysics';
import { hsscPhysicsSyllabus } from './hsscPhysicsSyllabus';
import { paperAnswer, paperChoices, paperMetadata } from './paperPresentation';
import type { QuestionData } from './paperDataService';

/**
 * The question payload TakeQuizModal needs: it resolves choices, the answer key,
 * option feedback and diagrams from sourceRegion when a learner answers.
 */
export interface HsscQuizQuestion {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty?: string;
  diagramBased?: boolean;
  topics?: Array<{ topic: { name: string; topicNumber?: string } }>;
  sourceRegion: Record<string, unknown>;
}

export interface HsscPaperView {
  code: string;
  title: string;
  session: string;
  year: number | null;
  paper: 'I' | 'II';
  href: string;
  questions: HsscQuizQuestion[];
}

export interface HsscUnitView {
  unitNumber: number;
  name: string;
  topics: string[];
  href: string;
  groups: Array<{ paperCode: string; questionIds: string[] }>;
}

export interface HsscMcqsData {
  units: HsscUnitView[];
  papers: HsscPaperView[];
  totalQuestions: number;
}

function quizQuestion(question: QuestionData): HsscQuizQuestion | null {
  const meta = paperMetadata(question.sourceRegion);
  const choices = paperChoices(meta.choices);
  const answer = paperAnswer(meta, choices);
  if (!answer) return null;
  return {
    id: question.id,
    questionNumber: String(question.questionNumber),
    questionText: question.questionText,
    questionType: 'MULTIPLE_CHOICE',
    marks: question.marks || 1,
    difficulty: question.difficulty,
    diagramBased: Boolean(question.diagramBased),
    topics: question.topics?.slice(0, 1).map(item => ({
      topic: {
        name: item.topic.name,
        topicNumber: item.topic.topicNumber == null ? undefined : String(item.topic.topicNumber),
      },
    })),
    sourceRegion: {
      choices,
      correct_answer: answer,
      ...(typeof meta.explanation === 'string' ? { explanation: meta.explanation } : {}),
      ...(Array.isArray(meta.option_feedback) ? { option_feedback: meta.option_feedback } : {}),
      ...(typeof meta.diagramUrl === 'string' ? { diagramUrl: meta.diagramUrl } : {}),
      ...(typeof meta.secondDiagramUrl === 'string' ? { secondDiagramUrl: meta.secondDiagramUrl } : {}),
      ...(typeof meta.assessmentSection === 'string' ? { assessmentSection: meta.assessmentSection } : {}),
    },
  };
}

export function hsscMcqsData(level: number, base: string): HsscMcqsData {
  const syllabus = hsscPhysicsSyllabus('akueb', level, 'physics');
  if (!syllabus) return { units: [], papers: [], totalQuestions: 0 };

  const papers = [...hsscPhysicsPapers, ...hsscXiAnnualPapers]
    .filter(paper => paper.academicClass.level === level)
    .sort((a, b) => b.examYear - a.examYear || a.paperCode.localeCompare(b.paperCode));

  const questionUnits = new Map<string, number[]>();
  // Class XII units carry the syllabus numbering 11–20, so membership must come
  // from the unit list itself rather than the 1..N length of the array.
  const unitNumbers = new Set(syllabus.units.map(unit => unit.unitNumber));
  const views: HsscPaperView[] = papers.map(paper => {
    const paperNumber: 'I' | 'II' = paper.paperCode.endsWith('-P2') ? 'II' : 'I';
    const year = paper.examType === 'ANNUAL' ? paper.examYear : null;
    const questions: HsscQuizQuestion[] = [];
    for (const question of paper.questions) {
      if (question.questionType !== 'MULTIPLE_CHOICE') continue;
      const units = [
        ...new Set(
          (question.topics ?? [])
            .map(topic => Number(topic.topic.topicNumber))
            .filter(number => Number.isInteger(number) && unitNumbers.has(number))
        ),
      ];
      if (!units.length) continue;
      questionUnits.set(question.id, units);
      const view = quizQuestion(question);
      if (view) questions.push(view);
    }
    return {
      code: paper.paperCode,
      title: year ? `${year} Annual Paper ${paperNumber}` : `Model Paper ${paperNumber}`,
      session: year ? String(year) : 'Model',
      year,
      paper: paperNumber,
      href: '/past-papers/' + paper.paperCode,
      questions,
    };
  });

  const units: HsscUnitView[] = syllabus.units.map(unit => ({
    unitNumber: unit.unitNumber,
    name: unit.name,
    topics: unit.subtopics.map(subtopic => subtopic.name),
    href: base + '/mcqs/chapter-wise/' + unit.unitNumber,
    groups: views.map(paper => ({
      paperCode: paper.code,
      questionIds: paper.questions
        .filter(question => questionUnits.get(question.id)?.includes(unit.unitNumber))
        .map(question => question.id),
    })),
  }));

  const unique = new Set(units.flatMap(unit => unit.groups.flatMap(group => group.questionIds)));
  return { units, papers: views, totalQuestions: unique.size };
}
