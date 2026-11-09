import type { PaperData, QuestionData } from './paperDataService';
import mcqs from '@/data/mathematics/ssc1_2019_past_mcqs.json';
import theory from '@/data/mathematics/ssc1_2019_past_crqs.json';
import manifest from '@/data/mathematics/ssc1_2019_source_manifest.json';

type SourceItem = (typeof mcqs)[number] | (typeof theory)[number];
function question(item: SourceItem, component: 'P1' | 'P2'): QuestionData {
  const number = String(item.questionNumber);
  const choice = 'options' in item;
  const mapped = item.current_mapping[0];
  return {
    id: `mth-ix-2019-${component.toLowerCase()}-q${number}`,
    questionNumber: number,
    questionText: choice ? item.stem : item.questionText,
    questionType: choice ? 'MULTIPLE_CHOICE' : 'CONSTRUCTED_RESPONSE',
    marks: item.marks,
    difficulty: item.cognitiveLevel,
    isDiagram: item.isDiagram,
    diagramBased: item.isDiagram,
    sourceRegion: {
      choices: choice ? item.options : undefined,
      correct_answer: choice ? item.correctOption : undefined,
      official_answer: choice ? item.official_answer : undefined,
      solved_correct_option: choice ? item.solved_correct_option : undefined,
      answer_status: choice ? item.answerStatus : 'SUPPLEMENTARY_SOLUTION',
      answer_review_note: choice ? item.answer_review_note : ('sourceDiscrepancy' in item ? (item as any).sourceDiscrepancy : undefined),
      explanation: choice ? item.explanation : undefined,
      model_answer: choice ? undefined : item.modelAnswer,
      model_answer_origin: choice ? undefined : item.modelAnswerOrigin,
      official_marking_notes: choice ? undefined : item.officialMarkingNotes,
      choice_instruction: choice ? undefined : item.choiceInstruction,
      choice_group: choice ? undefined : item.choiceGroup,
      better_response_image: choice ? undefined : item.betterResponseImage,
      weaker_response_image: choice ? undefined : item.weakerResponseImage,
      original_reference_verified: true,
      original_reference_source: choice ? manifest.sources.key.url : manifest.sources.em.url,
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
    slos: mapped ? [{ slo: { code: mapped.code, description: mapped.description } }] : [],
  };
}

export const mathematics2019Papers: PaperData[] = (['P1', 'P2'] as const).map(component => ({
  id: `MTH-IX-2019-${component}`,
  paperCode: `MTH-IX-2019-${component}`,
  title: `Mathematics SSC-I 2019 Annual Examination Paper ${component === 'P1' ? 'I' : 'II'}`,
  examYear: 2019,
  examSession: 'Annual Examination 2019',
  examType: 'ANNUAL',
  totalMarks: component === 'P1' ? 35 : 40,
  durationMinutes: component === 'P1' ? 50 : 130,
  fileUrl: manifest.sources[component === 'P1' ? 'p1' : 'p2'].url,
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'mathematics-ix', name: 'Mathematics', code: 'MTH' },
  questions: (component === 'P1' ? mcqs : theory).map(item => question(item, component)),
}));

