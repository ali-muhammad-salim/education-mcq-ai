import prisma from '@/lib/prisma';
import { publicMaterialWhere } from '@/lib/materialVisibility';
import { paperMetadata, paperChoices, paperAnswer } from '@/lib/paperPresentation';
import { syllabusLevel } from '@/lib/syllabusPresentation';
import { normalizeQuestion } from '@/services/assessment/scoring';
import { ApiError } from '@/lib/api';
export function sourceChoiceContent(question: { id?: string; syllabusVersionId?: string | null; questionText: string; marks: number | null; sourceRegion: unknown }) {
  const meta = paperMetadata(question.sourceRegion), choices = paperChoices(meta.choices), answer = paperAnswer(meta, choices);
  if (!answer) throw new ApiError(422, 'ANSWER_KEY_REQUIRED', 'This source question has no verified answer key.');
  return normalizeQuestion({ questionType: 'MCQ_SINGLE', stemText: question.questionText, marks: question.marks || 1, cognitiveLevel: typeof meta.cognitive_level === 'string' ? meta.cognitive_level : 'Unspecified', options: Object.entries(choices).map(([id, text]) => ({ id, text, isCorrect: id === answer, feedback: Array.isArray(meta.option_feedback) ? meta.option_feedback.find((f: { key: string }) => f.key === id)?.reason : undefined })), explanation: typeof meta.explanation === 'string' ? meta.explanation : undefined, diagramUrl: typeof meta.diagramUrl === 'string' ? meta.diagramUrl : undefined, provenance: 'PAST_PAPER', sourceQuestionId: question.id, sourceDocumentId: meta.sourceDocumentId, syllabusVersionId: question.syllabusVersionId || undefined });
}
export async function mappedChapterQuestions(topicId: string, filter = 'ALL') {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, syllabusVersion: { isLatest: true } }, include: { syllabusVersion: { include: { subject: { include: { academicClass: true } } } } } });
  if (!topic) throw new ApiError(404, 'CHAPTER_NOT_FOUND', 'This chapter is not in the current syllabus.');
  const version = topic.syllabusVersion;
  if (version.sourceDocumentId && !await prisma.knowledgeDocument.findFirst({ where: { ...publicMaterialWhere, id: version.sourceDocumentId }, select: { id: true } })) throw new ApiError(404, 'CURRICULUM_WITHDRAWN', 'This curriculum source is awaiting review.');
  const rows = await prisma.pastPaperQuestion.findMany({ where: { verified: true, syllabusVersionId: version.id, questionType: 'MULTIPLE_CHOICE', topics: { some: { topicId } }, pastPaper: { sourceDocument: publicMaterialWhere } }, include: { pastPaper: { select: { examYear: true, title: true, sourceDocument: { select: { catalogMetadata: true } } } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 301 });
  if (rows.length > 300) throw new ApiError(422, 'CHAPTER_PRACTICE_TOO_LARGE', 'This chapter needs paginated practice sets before starting one assessment.');
  return { topic, questions: rows.filter(q => { const meta = paperMetadata(q.sourceRegion); if ((q.pastPaper.sourceDocument?.catalogMetadata as Record<string, unknown> | null)?.compiledPaperId !== q.pastPaperId) return false; return filter === 'ALL' || (filter === 'DIAGRAM' ? Boolean(meta.diagramUrl) : syllabusLevel(String(meta.cognitive_level || '')) === filter); }) };
}
export async function mappedChapterGroups(board: string, grade: number, subject: string) {
  const topics = await prisma.topic.findMany({ where: { syllabusVersion: { isLatest: true, subject: { name: { equals: subject, mode: 'insensitive' }, academicClass: { level: grade, programme: { board: { shortCode: { equals: board, mode: 'insensitive' } } } } } } }, orderBy: { topicNumber: 'asc' }, select: { id: true, name: true } });
  const groups = [];
  for (const topic of topics) {
    const result = await mappedChapterQuestions(topic.id).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
    if (!result?.questions.length) continue;
    groups.push({ id: topic.id, name: topic.name, questions: result.questions.map((q, i) => { const content = sourceChoiceContent(q), meta = paperMetadata(q.sourceRegion); return { id: q.id, questionNumber: i + 1, originalQuestionNumber: q.questionNumber, sourceTitle: q.pastPaper.title, stem: q.questionText, options: paperChoices(meta.choices), correctOption: paperAnswer(meta, paperChoices(meta.choices)), explanation: content.explanation, cognitiveLevel: content.cognitiveLevel, diagramUrl: content.diagramUrl, option_feedback: meta.option_feedback, sourceRegion: meta }; }) });
  }
  return groups;
}
