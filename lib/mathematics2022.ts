import type { PaperData, QuestionData } from './paperDataService';
import mcqs from '@/data/mathematics/ssc1_2022_past_mcqs.json';
import manifest from '@/data/mathematics/ssc1_2022_source_manifest.json';

type SourceItem = (typeof mcqs)[number];
function question(item: SourceItem, component: 'P1'): QuestionData {
  const number = String(item.questionNumber);
  const mapped = item.current_mapping[0];
  return {
    id: `mth-ix-2022-${component.toLowerCase()}-q${number}`,
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
      slo_text: item.sloText,
      cognitive_level: item.cognitiveLevel,
      diagramUrl: item.diagramUrl || undefined,
      pageNumber: item.pageNumber,
      source_sha256: item.sourceSha256,
    },
    topics: mapped ? [{ topic: { name: mapped.topic, topicNumber: item.unitNumber || undefined } }] : [],
    slos: item.current_mapping.map(outcome => ({ slo: { code: outcome.code, description: outcome.description } })),
  };
}

export const mathematics2022Papers: PaperData[] = (['P1'] as const).map(component => ({
  id: `MTH-IX-2022-${component}`,
  paperCode: `MTH-IX-2022-${component}`,
  title: 'Mathematics SSC-I 2022 Annual Examination Paper I',
  examYear: 2022,
  examSession: 'Annual Examination 2022',
  examType: 'ANNUAL',
  totalMarks: 50,
  durationMinutes: 100,
  fileUrl: manifest.sources.p1.url,
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'mathematics-ix', name: 'Mathematics', code: 'MTH' },
  questions: mcqs.map(item => question(item, component)),
}));
