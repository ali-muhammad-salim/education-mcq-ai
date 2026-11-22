import prisma from '@/lib/prisma';
import { publicMaterialWhere } from '@/lib/materialVisibility';
export async function publishedCurriculum(board: string, grade: number, subject: string, bundledSyllabusId?: string) {
  const version = await prisma.syllabusVersion.findFirst({ where: { isLatest: true, subject: { name: { equals: subject, mode: 'insensitive' }, academicClass: { level: grade, programme: { board: { shortCode: { equals: board, mode: 'insensitive' } } } } }, OR: [{ sourceDocument: publicMaterialWhere }, ...(bundledSyllabusId ? [{ id: bundledSyllabusId, sourceDocumentId: null }] : [])] }, orderBy: [{ validFrom: 'desc' }, { id: 'asc' }], include: { topics: { include: { subtopics: { include: { slos: { orderBy: [{ sourceOrdinal: 'asc' }, { id: 'asc' }] } } } } } } });
  if (!version) return null;
  const numeric = (a: { topicNumber: string | null }, b: { topicNumber: string | null }) => (a.topicNumber || '').localeCompare(b.topicNumber || '', undefined, { numeric: true });
  const original = version.sourceDocumentId ? `/api/materials/${version.sourceDocumentId}/original` : version.fileUrl;
  return { id: version.id, original, units: version.topics.sort(numeric).map((topic, i) => ({ unitNumber: Number(topic.topicNumber) || i + 1, name: topic.name, subtopics: topic.subtopics.sort((a, b) => (a.subtopicNum || '').localeCompare(b.subtopicNum || '', undefined, { numeric: true })).map(sub => ({ name: sub.name, slos: sub.slos.map(s => ({ code: s.code || '', description: s.description, cognitiveLevel: s.cognitiveLevel || '', sourcePage: s.sourcePage })) })) })) };
}
