import type { ChapterUnitData } from '@/components/ChapterTheoryPracticeClient';
import type { HsscMcqsData, HsscPaperView } from '@/lib/hsscMcqsData';
import { hsscBiologyMcqMetadata, hsscBiologyModelPapers } from '@/lib/hsscBiologyModelPapers';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import { biologyStudyResourceQuiz, hsscBiologyStudyResources } from '@/lib/hsscBiologyStudyResources';
import { biologyXiAnnualArchives, biologyXiAnnualChapter, biologyXiAnnualYears } from '@/lib/hsscXiAnnualBiology';
import { presentPaperQuestion } from '@/lib/paperPresentation';

// Match each printed question to the current chapter it assesses. Paper II
// alternatives are indexed independently because they assess different chapters.
const chapters = {
  11: {
    mcqs: [1,1,20,1,1,1,3,3,3,3,3,3,2,2,2,4,4,4,4,5,5,6,6,6,7,7,7,8,8,9,9,10,10,10,10,10,10,13,13,13,13,13,13,13,11,11,12,12,14,14],
    crqs: [2,5,8,9,11,12,14],
    erqs: [[3,1],[10,13]],
  },
  12: {
    mcqs: [15,15,15,15,15,15,20,20,20,20,20,20,20,16,16,16,16,16,16,17,17,17,17,17,17,17,22,22,22,22,22,22,18,18,19,19,21,21,21,23,23,24,24,25,25,25,26,26,27,27],
    crqs: [16,18,19,21,23,24,25,26],
    erqs: [[15,20],[17,22]],
  },
};

export function hsscBiologyQuestionChapter(grade: 11 | 12, part: number, question: number, alternative?: number) {
  const mapping = chapters[grade];
  if (part === 1) return mapping.mcqs[question - 1];
  if (alternative === undefined) return mapping.crqs[question - 1];
  return mapping.erqs[question - mapping.crqs.length - 1]?.[alternative];
}

export function hsscBiologyChapterMcqs(board: string, grade: number, subject: string, baseUrl: string): HsscMcqsData | null {
  const syllabus = hsscBiologySyllabus(board, grade, subject);
  if (!syllabus || (grade !== 11 && grade !== 12)) return null;
  const papers: HsscPaperView[] = ([grade, grade === 11 ? 12 : 11] as const).flatMap(sourceGrade =>
    hsscBiologyModelPapers(board, sourceGrade, subject).filter(paper => sourceGrade === grade || paper.part === 1).map((paper): HsscPaperView => ({
    code: `BIO-${paper.roman}-MODEL-${paper.year}-P${paper.part}`,
    title: `${paper.year} Model ${paper.label}`,
    session: 'Model', year: null, paper: paper.part === 1 ? 'I' : 'II', href: paper.href,
    chapterOnly: sourceGrade !== grade,
    questions: paper.questions.flatMap(question => {
      if (!('choices' in question)) return [];
      if (sourceGrade !== grade && !syllabus.units.some(unit => unit.unitNumber === hsscBiologyQuestionChapter(sourceGrade, 1, question.number))) return [];
      // Carry the reviewed key and distractor feedback so chapter practice and quizzes can score.
      const metadata = hsscBiologyMcqMetadata(paper.roman, question);
      return [{
        id: `biology-${paper.roman}-${question.number}`,
        questionNumber: String(question.number), questionText: metadata.quiz_stem ?? question.stem,
        questionType: 'MULTIPLE_CHOICE', marks: question.marks, diagramBased: question.figures.length > 0,
        sourceRegion: metadata,
      }];
    }),
    })).filter(paper => !paper.chapterOnly || paper.questions.length > 0));
  for (const { year, papers: [first] } of biologyXiAnnualArchives) {
    papers.push({
      code: first.paperCode, title: `${year} Annual Paper I`, session: String(year), year, paper: 'I',
      href: `/past-papers/${first.paperCode}`, chapterOnly: grade === 12,
      questions: first.questions
        .filter(question => grade === 11 || biologyXiAnnualChapter(year, question.questionNumber)?.grade === grade)
        .map(question => ({ ...presentPaperQuestion(question), marks: question.marks })),
    });
  }
  if (grade === 11) for (const resource of hsscBiologyStudyResources) {
    papers.push({
      code: resource.slug, title: resource.title, session: 'Study resource', year: null, paper: 'I',
      href: resource.href, chapterOnly: true, studyResource: true,
      questions: biologyStudyResourceQuiz(resource),
    });
  }
  return {
    papers, totalQuestions: papers.filter(paper => !paper.chapterOnly || paper.studyResource).reduce((count, paper) => count + paper.questions.length, 0),
    units: syllabus.units.map(unit => ({
      unitNumber: unit.unitNumber, name: unit.name, topics: unit.subtopics.map(topic => topic.name),
      href: `${baseUrl}/mcqs/chapter-wise/${unit.unitNumber}`,
      groups: papers.map(paper => ({ paperCode: paper.code, questionIds: paper.questions
        .filter(question => (paper.studyResource ? Number(String(question.sourceRegion.current_slo).split('.')[0]) : paper.year === null
          ? hsscBiologyQuestionChapter(paper.code.startsWith('BIO-XII-') ? 12 : 11, 1, Number(question.questionNumber))
          : biologyXiAnnualChapter(biologyXiAnnualYears.find(year => year === paper.year), question.questionNumber)?.unitNumber) === unit.unitNumber).map(question => question.id) })),
    })),
  };
}

export function hsscBiologyChapterTheory(board: string, grade: number, subject: string): ChapterUnitData[] | null {
  const syllabus = hsscBiologySyllabus(board, grade, subject);
  if (!syllabus || (grade !== 11 && grade !== 12)) return null;
  const paper = hsscBiologyModelPapers(board, grade, subject).find(item => item.part === 2)!;
  const units: ChapterUnitData[] = syllabus.units.map(unit => ({
    unitNumber: unit.unitNumber, name: unit.name,
    subtopics: unit.subtopics.map(topic => topic.name), sloCount: unit.subtopics.reduce((total, topic) => total + topic.slos.length, 0),
    definitions: [], crqs: [], erqs: [], numericals: [],
  }));
  const byNumber = new Map(units.map(unit => [unit.unitNumber, unit]));
  for (const question of paper.questions) {
    const item = (number: string, text: string) => ({
      id: `biology-${paper.roman}-written-${number}`, questionNumber: `Q.${number}`,
      sourceTitle: `${paper.year} Model Paper II`, sourceHref: `${paper.href}#question-${number}`,
      examYear: paper.year, marks: question.marks, questionText: text, modelAnswer: '',
    });
    if ('alternatives' in question && question.alternatives) {
      question.alternatives.forEach((text, index) => {
        const unit = hsscBiologyQuestionChapter(grade, 2, question.number, index);
        byNumber.get(unit)!.erqs.push({ ...item(`${question.number}${index === 0 ? 'a' : 'b'}`, text),
          choiceInstruction: `${index === 0 ? 'Either' : 'Or'} · Attempt one alternative for Question ${question.number}` });
      });
    } else if ('text' in question) {
      const unit = hsscBiologyQuestionChapter(grade, 2, question.number);
      byNumber.get(unit)!.crqs.push(item(String(question.number), question.text));
    }
  }
  if (grade === 11) for (const { year, papers: [, second] } of biologyXiAnnualArchives) {
    if (!second) continue;
    for (const question of second.questions) {
      const unit = biologyXiAnnualChapter(year, question.questionNumber, true);
      if (!unit) continue;
      const isExtended = question.questionType === 'EXTENDED_RESPONSE';
      const item = {
        id: question.id, questionNumber: `Q.${question.questionNumber}`,
        sourceTitle: `${year} Annual Paper II`, sourceHref: `/past-papers/${second.paperCode}#question-${question.questionNumber}`,
        examYear: year, marks: question.marks, questionText: question.questionText,
        modelAnswer: question.sourceRegion.emarkingExamples?.map(note => note.solution || note.betterNotes).join('\n\n') ?? '',
        choiceInstruction: isExtended ? `${question.sourceRegion.choice_instruction} · Attempt one alternative for Question ${Number.parseInt(question.questionNumber, 10)}` : undefined,
      };
      byNumber.get(unit.unitNumber)?.[isExtended ? 'erqs' : 'crqs'].push(item);
    }
  }
  if (grade === 11) for (const resource of hsscBiologyStudyResources) {
    for (const question of resource.written) {
      const unit = byNumber.get(Number(question.slo.split('.')[0]));
      const item = {
        id: `${resource.slug}-${question.id}`, questionNumber: question.id,
        sourceTitle: question.year ? `${resource.title} · ${question.year}` : resource.title,
        sourceHref: `${resource.href}#question-${question.id}`,
        questionText: question.stem, currentSlo: question.slo, modelAnswer: question.answer,
        solutionOrigin: 'supplied_resource',
      };
      if (question.extended && question.year) {
        unit?.erqs.push({ ...item, examYear: question.year, marks: question.marks });
      } else {
        unit?.crqs.push({ ...item, marks: question.marks });
      }
    }
  }
  return units;
}
