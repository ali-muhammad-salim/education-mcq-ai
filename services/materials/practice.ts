import prisma from '@/lib/prisma';
import { publicMaterialWhere } from '@/lib/materialVisibility';
import { paperMetadata, paperChoices, paperAnswer, paperQuestionNumber, paperScoringAnswers } from '@/lib/paperPresentation';
import { combinedChemistryXArchives, getFallbackPaper } from '@/lib/paperDataService';
import { chemistryX2026Papers } from '@/lib/chemistryX2026';
import { chemistryIx2026DuplicateKey, chemistryIx2026Papers } from '@/lib/chemistryIx2026';
import { mathematicsIx2026DuplicateKey } from '@/lib/mathematicsIx2026';
import { bundledMathematicsPaperCodes, isMathematicsWorkedQuestion, mathematicsChapterCognitiveLevel, mathematicsChapterSourcesFor, mathematicsChapterSyllabus } from '@/lib/mathematicsChapterPapers';
import { isBundledMathematics, mathematicsStoreUnavailable } from './mathematicsAvailability';
import { chemistryX2019PaperII } from '@/lib/chemistryX2019';
import { chemistryX2018PaperII } from '@/lib/chemistryX2018';
import { chemistryX2017PaperII } from '@/lib/chemistryX2017';
import { biologyIxAnnualArchives } from '@/lib/biologyPapers';
import { syllabusLevel } from '@/lib/syllabusPresentation';
import { normalizeQuestion } from '@/services/assessment/scoring';
import { ApiError } from '@/lib/api';
import type { Prisma } from '@prisma/client';
import type { ChapterUnitData } from '@/components/ChapterTheoryPracticeClient';

// Source-pipeline publications and explicitly reviewed local imports both feed
// chapter lists. An unreviewed upload or a withdrawn linked source never does.
export const chapterPaperWhere: Prisma.PastPaperWhereInput = {
  OR: [
    { sourceDocument: publicMaterialWhere },
    { sourceDocumentId: null, verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES', sourceHash: { not: null } },
  ],
};
export function chapterPaperIsPublished(paper: { id: string; sourceDocumentId: string | null; sourceHash: string | null; verificationStatus: string; sourceDocument: { catalogMetadata: Prisma.JsonValue | null } | null }) {
  if (paper.sourceDocumentId) return (paper.sourceDocument?.catalogMetadata as Record<string, unknown> | null)?.compiledPaperId === paper.id;
  return paper.verificationStatus === 'REVIEWED_WITH_SOURCE_NOTES' && /^[a-f0-9]{64}$/.test(paper.sourceHash || '');
}

export function currentChapterTopics(board: string, grade: number, subject: string) {
  return prisma.topic.findMany({ where: { syllabusVersion: { isLatest: true, subject: { name: { equals: subject, mode: 'insensitive' }, academicClass: { level: grade, programme: { board: { shortCode: { equals: board, mode: 'insensitive' } } } } } } }, orderBy: { topicNumber: 'asc' }, include: { subtopics: { include: { slos: true } } } });
}
export function sourceChoiceContent(question: { id?: string; syllabusVersionId?: string | null; questionText: string; marks: number | null; sourceRegion: unknown }) {
  const meta = paperMetadata(question.sourceRegion), choices = paperChoices(meta.choices), answers = paperScoringAnswers(meta, choices);
  if (!answers.length) throw new ApiError(422, 'ANSWER_KEY_REQUIRED', 'This source question has no verified answer key.');
  return normalizeQuestion({ questionType: 'MCQ_SINGLE', stemText: question.questionText, marks: question.marks || 1, cognitiveLevel: typeof meta.cognitive_level === 'string' ? meta.cognitive_level : 'Unspecified', options: Object.entries(choices).map(([id, text]) => ({ id, text, isCorrect: answers.includes(id), feedback: Array.isArray(meta.option_feedback) ? meta.option_feedback.find((f: { key: string }) => f.key === id)?.reason : undefined })), acceptAnyCorrectOption: answers.length > 1 ? true : undefined, explanation: typeof meta.explanation === 'string' ? meta.explanation : undefined, diagramUrl: typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined, provenance: 'PAST_PAPER', sourceQuestionId: question.id, sourceDocumentId: meta.sourceDocumentId, syllabusVersionId: question.syllabusVersionId || undefined });
}
async function chapterSourceQuestions(topicId: string, questionTypes: string[], supplementalMathematics = false) {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, syllabusVersion: { isLatest: true } }, include: { syllabusVersion: { include: { subject: { include: { academicClass: true } } } } } });
  if (!topic) throw new ApiError(404, 'CHAPTER_NOT_FOUND', 'This chapter is not in the current syllabus.');
  const version = topic.syllabusVersion;
  const grade = version.subject.academicClass.level;
  const chemModelPrefix = !version.sourceDocumentId && version.subject.name === 'Chemistry'
    && (grade === 9 || grade === 10)
    && version.fileUrl === `/materials/ssc/chemistry/ssc-${grade - 8}/chemistry-ssc-full-syllabus-2025.pdf`
    ? `CHM-${grade === 9 ? 'IX' : 'X'}` : null;
  const bundledPaperCodes = chemModelPrefix ? [
    chemModelPrefix + '-P1', chemModelPrefix + '-P2',
    ...combinedChemistryXArchives.map(archive => archive.paper.paperCode),
    ...[chemistryX2017PaperII, chemistryX2018PaperII, chemistryX2019PaperII, ...chemistryIx2026Papers, ...chemistryX2026Papers].filter(paper => paper.academicClass.level === grade).map(paper => paper.paperCode),
  ]
    : !version.sourceDocumentId && (grade === 9 || grade === 10) && version.subject.name === 'Biology'
      && version.fileUrl === '/materials/ssc/biology/biology-ssc-syllabus-2025.pdf'
      ? [...biologyIxAnnualArchives.flatMap(archive => archive.papers.map(paper => paper.paperCode)), 'BIO-IX-2021-P1', 'BIO-IX-2026-P1', 'BIO-IX-2026-P2']
      : [];
  if (version.sourceDocumentId && !await prisma.knowledgeDocument.findFirst({ where: { ...publicMaterialWhere, id: version.sourceDocumentId }, select: { id: true } })) throw new ApiError(404, 'CURRICULUM_WITHDRAWN', 'This curriculum source is awaiting review.');
  const paperWhere = supplementalMathematics ? {
    AND: [chapterPaperWhere, { OR: [{ paperCode: null }, { paperCode: { notIn: [...bundledMathematicsPaperCodes] } }] }],
  } : chapterPaperWhere;
  const rows = await prisma.pastPaperQuestion.findMany({ where: { verified: true, syllabusVersionId: version.id, questionType: { in: questionTypes }, topics: { some: { topicId } }, pastPaper: paperWhere }, include: { pastPaper: { select: { id: true, paperCode: true, examYear: true, examType: true, academicClass: { select: { level: true } }, title: true, sourceDocumentId: true, sourceHash: true, verificationStatus: true, sourceDocument: { select: { catalogMetadata: true } } } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 301 });
  if (rows.length > 300) throw new ApiError(422, 'CHAPTER_PRACTICE_TOO_LARGE', 'This chapter needs paginated practice sets before starting one assessment.');
  const questions = rows.filter(q => {
    if (!chapterPaperIsPublished(q.pastPaper)) return false;
    if (supplementalMathematics && bundledMathematicsPaperCodes.has(q.pastPaper.paperCode ?? '')) return false;
    if (!q.pastPaper.sourceDocumentId && bundledPaperCodes.includes(q.pastPaper.paperCode || '')) return false;
    const meta = paperMetadata(q.sourceRegion);
    // A reviewed Chemistry packet can also contain legacy, unreviewed rows.
    if (!q.pastPaper.sourceDocumentId && q.pastPaper.paperCode?.startsWith('CHM-') && !/^[a-f0-9]{64}$/.test(meta.mapping_review_source_sha256 || '')) return false;
    // An old IX paper can map to a current X chapter; use the target scope.
    return q.pastPaper.sourceDocumentId || (meta.current_syllabus_reviewed === true && meta.current_slo && meta.mapping_scope?.grade === version.subject.academicClass.level && String(meta.mapping_scope?.subject).toLowerCase() === version.subject.name.toLowerCase());
  }).map(q => {
    const duplicateKey = chemistryIx2026DuplicateKey(q.pastPaper.paperCode, q.questionNumber)
      ?? mathematicsIx2026DuplicateKey(q.pastPaper.paperCode, q.questionNumber);
    return {
      id: q.id, questionNumber: q.questionNumber, questionText: q.questionText, questionType: q.questionType,
      marks: q.marks, syllabusVersionId: q.syllabusVersionId, numericalOrConceptual: q.numericalOrConceptual,
      pastPaper: q.pastPaper, pastPaperId: q.pastPaperId,
      sourceRegion: { ...paperMetadata(q.sourceRegion), in_syllabus: true, out_of_syllabus: false,
        ...(duplicateKey && { reviewed_duplicate_key: duplicateKey }) },
    };
  });
  if (bundledPaperCodes.length) {
    for (const paperCode of bundledPaperCodes) {
      const paper = getFallbackPaper(paperCode)!;
      for (const q of paper.questions) {
        if (!questionTypes.includes(q.questionType) || q.topics?.[0]?.topic?.topicNumber !== Number(topic.topicNumber)
          || paperMetadata(q.sourceRegion).mapping_scope?.grade !== grade) continue;
        questions.push({
          id: q.id, questionNumber: q.questionNumber, questionText: q.questionText, questionType: q.questionType,
          marks: q.marks, syllabusVersionId: version.id, numericalOrConceptual: null,
          pastPaperId: paper.paperCode, pastPaper: {
            id: paper.paperCode, paperCode: paper.paperCode, examYear: paper.examYear, examType: paper.examType ?? null,
            academicClass: { level: paper.academicClass.level }, title: paper.title, sourceDocumentId: null,
            sourceDocument: null, sourceHash: null, verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES',
          },
          sourceRegion: { ...q.sourceRegion, in_syllabus: true, out_of_syllabus: false },
        });
      }
    }
  }
  return { topic, questions };
}
export async function mappedChapterQuestions(topicId: string, filter = 'ALL') {
  const result = await chapterSourceQuestions(topicId, ['MULTIPLE_CHOICE']);
  return { ...result, questions: result.questions.filter(q => {
    const meta = paperMetadata(q.sourceRegion);
    if (!paperAnswer(meta, paperChoices(meta.choices))) return false;
    return filter === 'ALL' || (filter === 'DIAGRAM' ? Boolean(meta.diagramUrl || meta.diagramBased) : syllabusLevel(String(meta.cognitive_level || '')) === filter);
  }) };
}
export async function mappedChapterGroups(board: string, grade: number, subject: string) {
  if (isBundledMathematics(board, grade, subject)) {
    const published = await optionalMathematicsImports(databaseChapterGroups(board, grade, subject, true));
    const sources = mathematicsChapterSourcesFor(getFallbackPaper, grade);
    return mathematicsChapterSyllabus[grade].flatMap(unit => {
      const bundled = sources.filter(entry => entry.unit === unit.unitNumber && entry.question.questionType === 'MULTIPLE_CHOICE' && entry.answers.length)
        .map(({ paper, question, mapping, options }) => ({
          id: question.id, originalQuestionNumber: question.questionNumber, rawQuestionNumber: question.questionNumber,
          paperCode: paper.paperCode, sourceTitle: paper.title, sourcePaperId: paper.paperCode,
          sourceYear: paper.examYear, examYear: paper.examType === 'ANNUAL' ? paper.examYear : undefined, examType: paper.examType ?? null,
          sourceGrade: paper.academicClass.level, unitNumber: unit.unitNumber, unitName: unit.name,
          current_slo: mapping.code, stem: question.questionText, options, correctOption: paperAnswer(question.sourceRegion, options),
          explanation: question.sourceRegion.explanation, diagramUrl: question.sourceRegion.diagramUrl,
          diagramBased: question.diagramBased, option_feedback: question.sourceRegion.option_feedback,
          marks: question.marks,
          cognitiveLevel: mathematicsLevelLabels[mathematicsChapterCognitiveLevel(question) ?? ''] ?? 'Unspecified',
          sourceRegion: paperMetadata({ ...question.sourceRegion, current_slo: mapping.code, current_mapping: [mapping], mapping_scope: { board: 'AKU-EB', subject: 'Mathematics', grade } }),
        }));
      const imported = published.flatMap(group => group.questions).filter(q => q.unitNumber === unit.unitNumber);
      const questions = [...bundled, ...imported].map((question, index) => ({ ...question, questionNumber: index + 1 }));
      return questions.length ? [{ id: `mathematics-${grade}-${unit.unitNumber}`, name: unit.name, questions }] : [];
    });
  }
  return databaseChapterGroups(board, grade, subject);
}

async function databaseChapterGroups(board: string, grade: number, subject: string, supplemental = false) {
  const topics = await currentChapterTopics(board, grade, subject);
  const groups = [];
  for (const topic of topics) {
    const result = await chapterSourceQuestions(topic.id, ['MULTIPLE_CHOICE'], supplemental).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
    const questions = result?.questions.filter(q => {
      const meta = paperMetadata(q.sourceRegion);
      return paperAnswer(meta, paperChoices(meta.choices))
        || (q.pastPaper.paperCode === 'CHM-IX-P1' && meta.single_answer_review_required === true && meta.answer_review_note);
    });
    if (!questions?.length) continue;
    groups.push({ id: topic.id, name: topic.name, questions: questions.map((q, i) => {
      const meta = paperMetadata(q.sourceRegion);
      const level = syllabusLevel(String(meta.cognitive_level ?? ''));
      return { id: q.id, questionNumber: i + 1, originalQuestionNumber: q.questionNumber, marks: q.marks ?? 1,
        rawQuestionNumber: q.questionNumber, paperCode: q.pastPaper.paperCode || q.pastPaperId,
        sourceTitle: q.pastPaper.title, sourcePaperId: q.pastPaperId, sourceYear: q.pastPaper.examYear,
        examYear: !supplemental || q.pastPaper.examType === 'ANNUAL' ? q.pastPaper.examYear : undefined,
        sourceGrade: q.pastPaper.academicClass?.level, examType: q.pastPaper.examType,
        unitNumber: Number(topic.topicNumber), unitName: topic.name, current_slo: meta.current_slo,
        stem: q.questionText, options: paperChoices(meta.choices), correctOption: paperAnswer(meta, paperChoices(meta.choices)),
        explanation: typeof meta.explanation === 'string' ? meta.explanation : undefined,
        cognitiveLevel: supplemental ? mathematicsLevelLabels[level ?? ''] ?? 'Unspecified' : typeof meta.cognitive_level === 'string' ? meta.cognitive_level : 'Unspecified',
        diagramUrl: typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined,
        diagramBased: Boolean(meta.diagramBased || meta.diagramUrl),
        option_feedback: meta.option_feedback, sourceRegion: meta };
    }) });
  }
  return groups;
}

const mathematicsLevelLabels: Record<string, string> = { R: 'Remembering', U: 'Understanding', A: 'Application' };

async function optionalMathematicsImports<T>(work: Promise<T[]>): Promise<T[]> {
  try {
    return await work;
  } catch (error) {
    if (mathematicsStoreUnavailable(error)) return [];
    throw error;
  }
}

/** Build the theory directory from reviewed syllabus mappings. */
export async function mappedTheoryUnits(board: string, grade: number, subject: string): Promise<ChapterUnitData[]> {
  if (isBundledMathematics(board, grade, subject)) {
    const published = await optionalMathematicsImports(databaseTheoryUnits(board, grade, subject, true));
    const sources = mathematicsChapterSourcesFor(getFallbackPaper, grade);
    return mathematicsChapterSyllabus[grade].map(unit => {
      const added = published.find(entry => entry.unitNumber === unit.unitNumber);
      const result: ChapterUnitData = {
        unitNumber: unit.unitNumber, name: unit.name, subtopics: unit.subtopics.map(topic => topic.name),
        sloCount: unit.subtopics.reduce((count, topic) => count + topic.slos.length, 0),
        definitions: [], crqs: added?.crqs ?? [], erqs: added?.erqs ?? [], numericals: added?.numericals ?? [],
      };
      for (const { paper, question, mapping, unit: mappedUnit } of sources) {
        if (mappedUnit !== unit.unitNumber || question.questionType === 'MULTIPLE_CHOICE') continue;
        const meta = question.sourceRegion;
        const item = {
          id: question.id, questionNumber: question.questionNumber, sourceTitle: paper.title,
          sourceHref: `/past-papers/${paper.paperCode}#question-${paperQuestionNumber(question.questionNumber)}`,
          examYear: paper.examType === 'ANNUAL' ? paper.examYear : undefined,
          questionText: question.questionText, marks: question.marks, cognitiveLevel: meta.cognitive_level,
          originalSlo: meta.slo, currentSlo: mapping.code, currentSloDescription: mapping.description,
          diagramUrl: meta.diagramUrl, modelAnswer: meta.model_answer ?? '',
          betterResponseImage: meta.better_response_image || undefined, weakerResponseImage: meta.weaker_response_image || undefined,
          solutionOrigin: meta.model_answer_origin, sourceNote: meta.answer_review_note, choiceInstruction: meta.choice_instruction,
        };
        (question.questionType === 'EXTENDED_RESPONSE' ? result.erqs : result.crqs).push(item);
        if (isMathematicsWorkedQuestion(paper.paperCode, question)) result.numericals.push({ ...item, problem: item.questionText, solution: item.modelAnswer });
      }
      return result;
    });
  }
  return databaseTheoryUnits(board, grade, subject);
}

async function databaseTheoryUnits(board: string, grade: number, subject: string, supplemental = false): Promise<ChapterUnitData[]> {
  const topics = await currentChapterTopics(board, grade, subject);
  const units: ChapterUnitData[] = [];
  for (const topic of topics) {
    const result = await chapterSourceQuestions(topic.id, ['CONSTRUCTED_RESPONSE', 'EXTENDED_RESPONSE'], supplemental).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
    if (!result?.questions.length) continue;
    const unit: ChapterUnitData = { unitNumber: Number(topic.topicNumber), name: topic.name, subtopics: topic.subtopics.map(s => s.name), sloCount: topic.subtopics.reduce((sum, s) => sum + s.slos.length, 0), definitions: [], crqs: [], erqs: [], numericals: [] };
    for (const q of result.questions) {
      const meta = paperMetadata(q.sourceRegion);
      const item: ChapterUnitData['crqs'][number] = {
        id: q.id, questionNumber: q.questionNumber, sourceTitle: q.pastPaper.title,
        sourceHref: `/past-papers/${q.pastPaperId}#question-${q.questionNumber}`, examYear: q.pastPaper.examYear,
        questionText: q.questionText, marks: q.marks || 0, cognitiveLevel: meta.cognitive_level,
        originalSlo: meta.slo, currentSlo: meta.current_slo,
        currentSloDescription: meta.current_mapping?.find((m: { topic?: string }) => m.topic === topic.name)?.description || meta.slo_text,
        currentTopic: topic.name, outOfSyllabus: false, diagramUrl: meta.diagramUrl,
        modelAnswer: meta.model_answer || '', betterResponseImage: meta.better_response_image || undefined,
        weakerResponseImage: meta.weaker_response_image || undefined,
        solutionOrigin: meta.model_answer_origin, sourceNote: meta.answer_review_note,
        choiceInstruction: meta.choice_instruction,
      };
      (q.questionType === 'EXTENDED_RESPONSE' ? unit.erqs : unit.crqs).push(item);
      if (meta.is_numerical === true || q.numericalOrConceptual === 'NUMERICAL') unit.numericals.push({ ...item, problem: item.questionText, solution: item.modelAnswer });
    }
    units.push(unit);
  }
  return units.sort((a, b) => a.unitNumber - b.unitNumber);
}
