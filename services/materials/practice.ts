import prisma from '@/lib/prisma';
import { publicMaterialWhere } from '@/lib/materialVisibility';
import { paperMetadata, paperChoices, paperAnswer } from '@/lib/paperPresentation';
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
  const meta = paperMetadata(question.sourceRegion), choices = paperChoices(meta.choices), answer = paperAnswer(meta, choices);
  if (!answer) throw new ApiError(422, 'ANSWER_KEY_REQUIRED', 'This source question has no verified answer key.');
  return normalizeQuestion({ questionType: 'MCQ_SINGLE', stemText: question.questionText, marks: question.marks || 1, cognitiveLevel: typeof meta.cognitive_level === 'string' ? meta.cognitive_level : 'Unspecified', options: Object.entries(choices).map(([id, text]) => ({ id, text, isCorrect: id === answer, feedback: Array.isArray(meta.option_feedback) ? meta.option_feedback.find((f: { key: string }) => f.key === id)?.reason : undefined })), explanation: typeof meta.explanation === 'string' ? meta.explanation : undefined, diagramUrl: typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined, provenance: 'PAST_PAPER', sourceQuestionId: question.id, sourceDocumentId: meta.sourceDocumentId, syllabusVersionId: question.syllabusVersionId || undefined });
}
async function chapterSourceQuestions(topicId: string, questionTypes: string[]) {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, syllabusVersion: { isLatest: true } }, include: { syllabusVersion: { include: { subject: { include: { academicClass: true } } } } } });
  if (!topic) throw new ApiError(404, 'CHAPTER_NOT_FOUND', 'This chapter is not in the current syllabus.');
  const version = topic.syllabusVersion;
  if (version.sourceDocumentId && !await prisma.knowledgeDocument.findFirst({ where: { ...publicMaterialWhere, id: version.sourceDocumentId }, select: { id: true } })) throw new ApiError(404, 'CURRICULUM_WITHDRAWN', 'This curriculum source is awaiting review.');
  const rows = await prisma.pastPaperQuestion.findMany({ where: { verified: true, syllabusVersionId: version.id, questionType: { in: questionTypes }, topics: { some: { topicId } }, pastPaper: chapterPaperWhere }, include: { pastPaper: { select: { id: true, paperCode: true, examYear: true, title: true, sourceDocumentId: true, sourceHash: true, verificationStatus: true, sourceDocument: { select: { catalogMetadata: true } } } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 301 });
  if (rows.length > 300) throw new ApiError(422, 'CHAPTER_PRACTICE_TOO_LARGE', 'This chapter needs paginated practice sets before starting one assessment.');
  const questions = rows.filter(q => {
    if (!chapterPaperIsPublished(q.pastPaper)) return false;
    const meta = paperMetadata(q.sourceRegion);
    // A reviewed Chemistry packet can also contain legacy, unreviewed rows.
    if (!q.pastPaper.sourceDocumentId && q.pastPaper.paperCode?.startsWith('CHM-') && !/^[a-f0-9]{64}$/.test(meta.mapping_review_source_sha256 || '')) return false;
    // An old IX paper can map to a current X chapter; use the target scope.
    return q.pastPaper.sourceDocumentId || (meta.current_syllabus_reviewed === true && meta.current_slo && meta.mapping_scope?.grade === version.subject.academicClass.level && String(meta.mapping_scope?.subject).toLowerCase() === version.subject.name.toLowerCase());
  }).map(q => ({ ...q, sourceRegion: { ...paperMetadata(q.sourceRegion), in_syllabus: true, out_of_syllabus: false } }));
  return { topic, questions };
}
export async function mappedChapterQuestions(topicId: string, filter = 'ALL') {
  const result = await chapterSourceQuestions(topicId, ['MULTIPLE_CHOICE']);
  return { ...result, questions: result.questions.filter(q => {
    const meta = paperMetadata(q.sourceRegion);
    if (!paperAnswer(meta, paperChoices(meta.choices))) return false;
    return filter === 'ALL' || (filter === 'DIAGRAM' ? Boolean(meta.diagramUrl) : syllabusLevel(String(meta.cognitive_level || '')) === filter);
  }) };
}
export async function mappedChapterGroups(board: string, grade: number, subject: string) {
  const topics = await currentChapterTopics(board, grade, subject);
  const groups = [];
  for (const topic of topics) {
    const result = await mappedChapterQuestions(topic.id).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
    if (!result?.questions.length) continue;
    groups.push({ id: topic.id, name: topic.name, questions: result.questions.map((q, i) => {
      const content = sourceChoiceContent(q), meta = paperMetadata(q.sourceRegion);
      return { id: q.id, questionNumber: i + 1, originalQuestionNumber: q.questionNumber,
        rawQuestionNumber: q.questionNumber, paperCode: q.pastPaper.paperCode || q.pastPaperId,
        sourceTitle: q.pastPaper.title, sourcePaperId: q.pastPaperId, sourceYear: q.pastPaper.examYear, examYear: q.pastPaper.examYear,
        unitNumber: Number(topic.topicNumber), unitName: topic.name, current_slo: meta.current_slo,
        stem: q.questionText, options: paperChoices(meta.choices), correctOption: paperAnswer(meta, paperChoices(meta.choices)),
        explanation: content.explanation, cognitiveLevel: content.cognitiveLevel, diagramUrl: content.diagramUrl,
        option_feedback: meta.option_feedback, sourceRegion: meta };
    }) });
  }
  return groups;
}

/** Build the theory directory from current database mappings, without a copied chapter bank. */
export async function mappedTheoryUnits(board: string, grade: number, subject: string): Promise<ChapterUnitData[]> {
  const topics = await currentChapterTopics(board, grade, subject);
  const units: ChapterUnitData[] = [];
  for (const topic of topics) {
    const result = await chapterSourceQuestions(topic.id, ['CONSTRUCTED_RESPONSE', 'EXTENDED_RESPONSE']).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
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
