import type { PaperData, QuestionData } from './paperDataService';
import { paperChoices } from './paperPresentation';
import mcqs from '@/data/mathematics/ssc2_2018_past_mcqs.json';
import theory from '@/data/mathematics/ssc2_2018_past_crqs.json';
import manifest from '@/data/mathematics/ssc2_2018_source_manifest.json';

type SourceItem = (typeof mcqs)[number] | (typeof theory)[number];

function question(item: SourceItem, component: 'P1' | 'P2'): QuestionData {
  const number = String(item.questionNumber);
  const choice = 'options' in item;
  const mapped = item.current_mapping[0];
  return {
    id: `mth-x-2018-${component.toLowerCase()}-q${number}`,
    questionNumber: number,
    questionText: choice ? item.stem : item.questionText,
    questionType: choice ? 'MULTIPLE_CHOICE' : 'CONSTRUCTED_RESPONSE',
    marks: item.marks,
    difficulty: item.cognitiveLevel,
    isDiagram: item.isDiagram,
    diagramBased: item.isDiagram,
    sourceRegion: {
      choices: choice ? paperChoices(item.options) : undefined,
      correct_answer: choice ? item.correctOption : undefined,
      official_answer: choice ? item.official_answer : undefined,
      solved_correct_option: choice ? item.solved_correct_option : undefined,
      answer_status: choice ? item.answerStatus : 'SUPPLEMENTARY_SOLUTION',
      answer_origin: choice ? item.answer_origin : undefined,
      answer_review_note: choice ? (item as typeof mcqs[number]).answer_review_note : undefined,
      explanation: choice ? item.explanation : undefined,
      model_answer: choice ? undefined : item.modelAnswer,
      model_answer_origin: choice ? undefined : item.modelAnswerOrigin,
      official_marking_notes: choice ? undefined : item.officialMarkingNotes,
      choice_instruction: choice ? undefined : (item.choiceInstruction || undefined),
      choice_group: choice ? undefined : (item.choiceGroup || undefined),
      better_response_image: choice ? undefined : ((item as typeof theory[number]).emarkingAnalysis?.betterResponses[0] || undefined),
      weaker_response_image: choice ? undefined : ((item as typeof theory[number]).emarkingAnalysis?.weakerResponses[0] || undefined),
      original_reference_verified: true,
      original_reference_source: choice ? manifest.sources.key.url : manifest.sources.em.url,
      slo: item.originalSlo || undefined,
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

export const mathematicsX2018Papers: PaperData[] = (['P1', 'P2'] as const).map(component => ({
  id: `MTH-X-2018-${component}`,
  paperCode: `MTH-X-2018-${component}`,
  title: `Mathematics SSC-II 2018 Annual Examination Paper ${component === 'P1' ? 'I' : 'II'}`,
  examYear: 2018,
  examSession: 'Annual Examination 2018',
  examType: 'ANNUAL',
  totalMarks: component === 'P1' ? 30 : 45,
  durationMinutes: component === 'P1' ? 40 : 140,
  fileUrl: manifest.sources[component === 'P1' ? 'p1' : 'p2'].url,
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'mathematics-x', name: 'Mathematics', code: 'MTH' },
  questions: (component === 'P1' ? mcqs : theory).map(item => question(item, component)),
}));
