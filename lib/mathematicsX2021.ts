import type { PaperData, QuestionData } from './paperDataService';
import mcqs from '@/data/mathematics/ssc2_2021_past_mcqs.json';
import manifest from '@/data/mathematics/ssc2_2021_source_manifest.json';

type SourceItem = (typeof mcqs)[number];

function question(item: SourceItem, component: 'P1'): QuestionData {
  const number = String(item.questionNumber);
  const mapped = item.current_mapping[0];
  return {
    id: `mth-x-2021-${component.toLowerCase()}-q${number}`,
    questionNumber: number,
    questionText: item.stem,
    questionType: 'MULTIPLE_CHOICE',
    marks: item.marks,
    difficulty: item.cognitiveLevel,
    isDiagram: item.isDiagram,
    diagramBased: item.isDiagram,
    sourceRegion: {
      choices: item.options,
      correct_answer: item.correctOption,
      official_answer: item.official_answer,
      solved_correct_option: item.solved_correct_option,
      answer_status: item.answerStatus,
      answer_origin: item.answer_origin,
      answer_review_note: item.answer_review_note,
      explanation: item.explanation,
      original_reference_verified: true,
      original_reference_source: manifest.sources.key.url,
      slo: item.originalSlo,
      current_slo: item.current_slo,
      current_mapping: item.current_mapping,
      mapping_scope: item.mapping_scope,
      mapping_status: item.mappingStatus,
      mapping_reason: item.mappingReason,
      syllabus_edition: item.syllabusEdition,
      in_syllabus: item.in_syllabus,
      out_of_syllabus: item.out_of_syllabus,
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
      slo_text: item.sloText || undefined,
      cognitive_level: item.cognitiveLevel,
      diagramUrl: item.diagramUrl || undefined,
      pageNumber: item.pageNumber,
      source_sha256: item.sourceSha256,
    },
    topics: mapped ? [{ topic: { name: mapped.topic, topicNumber: item.unitNumber || undefined } }] : [],
    slos: mapped ? [{ slo: { code: mapped.code, description: mapped.description } }] : [],
  };
}

export const mathematicsX2021Papers: PaperData[] = [
  {
    id: 'MTH-X-2021-P1',
    paperCode: 'MTH-X-2021-P1',
    title: 'Mathematics SSC-II 2021 Annual Examination Paper I',
    examYear: 2021,
    examSession: 'Annual Examination 2021',
    examType: 'ANNUAL',
    totalMarks: 50,
    durationMinutes: 100,
    fileUrl: manifest.sources.p1.url,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'mathematics-x', name: 'Mathematics', code: 'MTH' },
    questions: mcqs.map(item => question(item, 'P1')),
  },
];

