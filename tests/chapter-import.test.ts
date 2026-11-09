import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
const mocks = vi.hoisted(() => ({ topics: vi.fn(), topic: vi.fn(), questions: vi.fn(), document: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { topic: { findMany: mocks.topics, findFirst: mocks.topic }, pastPaperQuestion: { findMany: mocks.questions }, knowledgeDocument: { findFirst: mocks.document } } }));
import { chapterPaperIsPublished, mappedChapterGroups, mappedChapterQuestions, mappedTheoryUnits } from '@/services/materials/practice';

const paper = { id: 'MTH-IX-2025-P1', paperCode: 'MTH-IX-2025-P1', title: 'Mathematics IX Annual 2025', examYear: 2025, sourceDocumentId: null, sourceDocument: null, sourceHash: 'a'.repeat(64), verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES' };
const topic = { id: 'factorisation', name: 'Factorisation', topicNumber: '5', subtopics: [], syllabusVersion: { id: 'current-ix', sourceDocumentId: null, subject: { name: 'Mathematics', academicClass: { level: 9 } } } };
const row = (number: string, component = 'P1') => {
  const q = getFallbackPaper(`MTH-IX-2025-${component}`)!.questions.find(q => q.questionNumber === number)!;
  return { ...q, sourceRegion: structuredClone(q.sourceRegion), pastPaperId: paper.id, pastPaper: paper, syllabusVersionId: 'current-ix' };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.topics.mockResolvedValue([topic]);
  mocks.topic.mockResolvedValue(topic);
  mocks.questions.mockResolvedValue([]);
  mocks.document.mockResolvedValue(null);
});

describe('Automatic reviewed imports in chapter materials', () => {
  it('accepts reviewed imports but rejects raw or detached publications', () => {
    expect(chapterPaperIsPublished(paper)).toBe(true);
    expect(chapterPaperIsPublished({ ...paper, verificationStatus: 'PENDING' })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceHash: null })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceDocumentId: 'withdrawn', sourceDocument: null })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceDocumentId: 'published', sourceDocument: { catalogMetadata: { compiledPaperId: paper.id } } })).toBe(true);
  });

  it('reads newly imported mapped questions without copying a chapter file', async () => {
    mocks.questions.mockResolvedValueOnce([row('18')]).mockResolvedValueOnce([row('18'), row('19')]);
    const before = await mappedChapterGroups('AKU-EB', 9, 'Mathematics');
    const after = await mappedChapterGroups('AKU-EB', 9, 'Mathematics');
    expect(before[0].questions).toHaveLength(1);
    expect(after[0].questions).toHaveLength(2);
    expect(after[0].questions[0].correctOption).toBe('D');
    expect(after[0].questions[0].rawQuestionNumber).toBe('18');
    expect(after[0].questions[0].sourceRegion.official_answer).toBe('C');
  });

  it('uses the current target grade while retaining the historical paper reference', async () => {
    const moved = row('33');
    mocks.questions.mockResolvedValue([moved]);
    expect((await mappedChapterQuestions(topic.id)).questions).toHaveLength(0);
    mocks.topic.mockResolvedValue({ ...topic, id: 'matrices', name: 'Matrices and Determinants', syllabusVersion: { ...topic.syllabusVersion, subject: { name: 'Mathematics', academicClass: { level: 10 } } } });
    const result = await mappedChapterQuestions('matrices');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].sourceRegion.out_of_syllabus).toBe(false);
    expect(result.questions[0].pastPaperId).toBe('MTH-IX-2025-P1');
    expect(moved.sourceRegion.out_of_syllabus).toBe(true);
  });

  it('carries theory solutions, diagrams, choice rules and source corrections into chapter pages', async () => {
    const q = row('8b', 'P2');
    mocks.questions.mockResolvedValue([q]);
    const units = await mappedTheoryUnits('AKU-EB', 9, 'Mathematics');
    const entry = units[0].crqs[0];
    expect(entry.modelAnswer).toContain('4.5');
    expect(entry.sourceNote).toContain('5.4');
    expect(entry.choiceInstruction).toContain('any two');
    expect(entry.diagramUrl).toContain('q8b.png');
    expect(entry.sourceHref).toContain('#question-8b');
  });
});
