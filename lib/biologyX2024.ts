import type { PaperData, QuestionData } from './paperDataService';
import mcqs from '@/data/biology/ssc2_2024_past_mcqs.json';
import written from '@/data/biology/ssc2_2024_written.json';
import manifest from '@/data/biology/ssc2_2024_source_manifest.json';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';

const grade10Outcomes = new Map<string, { unitNumber: number; topic: string; description: string; cognitiveLevel: string }>();
for (const unit of syllabus['10']) {
  for (const st of unit.subtopics) {
    for (const slo of st.slos) {
      grade10Outcomes.set(slo.code, {
        unitNumber: unit.unitNumber,
        topic: unit.name,
        description: slo.description,
        cognitiveLevel: slo.cognitiveLevel,
      });
    }
  }
}

const choicesRecord = (values: string[]) => Object.fromEntries(values.map((v, i) => ['ABCD'[i], v]));

function mcqQuestion(item: (typeof mcqs)[number]): QuestionData {
  const number = item.number;
  const mapped = grade10Outcomes.get(item.code);
  const choices = choicesRecord(item.choices);
  return {
    id: `bio-x-2024-p1-q${number}`,
    questionNumber: number,
    questionText: item.stem,
    questionType: 'MULTIPLE_CHOICE',
    marks: 1,
    difficulty: item.originalLevel === 'K' ? 'R' : item.originalLevel,
    isDiagram: Boolean(item.diagramUrl),
    diagramBased: Boolean(item.diagramUrl),
    sourceRegion: {
      choices,
      correct_answer: item.answer,
      official_answer: item.officialAnswer,
      solved_correct_option: item.answer,
      answer_status: item.answerStatus,
      answer_origin: item.answerOrigin,
      answer_review_note: item.answerReviewNote ?? undefined,
      explanation: item.explanation,
      option_feedback: item.feedback.map((reason, i) => ({ key: 'ABCD'[i], reason })),
      original_reference_verified: true,
      original_reference_source: manifest.sources.key.url,
      slo: item.originalSlo,
      current_slo: item.code,
      current_mapping: mapped ? [{
        code: item.code,
        topic: mapped.topic,
        description: mapped.description,
        grade: 10,
      }] : [],
      mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Biology' },
      mapping_status: 'REVIEWED',
      syllabus_edition: '2025 SSC Biology',
      in_syllabus: true,
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
      cognitive_level: item.originalLevel === 'K' ? 'R' : item.originalLevel,
      diagramUrl: item.diagramUrl || undefined,
      pageNumber: item.page,
      source_sha256: manifest.sources.p1.sha256,
    },
    topics: mapped ? [{ topic: { name: mapped.topic, topicNumber: String(mapped.unitNumber) } }] : [],
    slos: mapped ? [{ slo: { code: item.code, description: mapped.description } }] : [],
  };
}

type WrittenTuple = [string, number, number, string, string, number, string, string, string];

function writtenQuestion(rawRow: (typeof written)[number]): QuestionData {
  const [number, page, marks, code, originalSlo, notesPage, text, answer, notes] = rawRow as WrittenTuple;
  const mapped = grade10Outcomes.get(code);
  const diagramUrl = number === '3' ? '/materials/ssc/biology/ssc-2/biology-x-2024-paper-ii-q3.png' : undefined;
  return {
    id: `bio-x-2024-p2-q${number}`,
    questionNumber: number,
    questionText: text,
    questionType: marks === 6 ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    marks,
    difficulty: number === '4' ? 'A' : 'U',
    isDiagram: Boolean(diagramUrl),
    diagramBased: Boolean(diagramUrl),
    sourceRegion: {
      model_answer: answer,
      model_answer_origin: 'Project worked solution',
      official_marking_notes: notes,
      choice_instruction: marks === 6 ? `${number.endsWith('a') ? 'EITHER' : 'OR'} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
      choice_group: marks === 6 ? String(parseInt(number, 10)) : undefined,
      better_response_image: `/materials/ssc/biology/ssc-2/biology-x-2024-emarking-q${number}-stronger.png`,
      weaker_response_image: `/materials/ssc/biology/ssc-2/biology-x-2024-emarking-q${number}-weaker.png`,
      original_reference_verified: true,
      original_reference_source: manifest.sources.em.url + '#page=' + notesPage,
      slo: originalSlo,
      current_slo: code,
      current_mapping: mapped ? [{
        code,
        topic: mapped.topic,
        description: mapped.description,
        grade: 10,
      }] : [],
      mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Biology' },
      mapping_status: 'REVIEWED',
      syllabus_edition: '2025 SSC Biology',
      in_syllabus: true,
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
      cognitive_level: number === '4' ? 'A' : 'U',
      diagramUrl,
      pageNumber: page,
      source_sha256: manifest.sources.p2.sha256,
    },
    topics: mapped ? [{ topic: { name: mapped.topic, topicNumber: String(mapped.unitNumber) } }] : [],
    slos: mapped ? [{ slo: { code, description: mapped.description } }] : [],
  };
}

export const biologyX2024Papers: PaperData[] = (['P1', 'P2'] as const).map(component => ({
  id: `BIO-X-2024-${component}`,
  paperCode: `BIO-X-2024-${component}`,
  title: `Biology SSC-II 2024 Annual Examination Paper ${component === 'P1' ? 'I' : 'II'}`,
  examYear: 2024,
  examSession: 'Annual Examination 2024',
  examType: 'ANNUAL',
  totalMarks: component === 'P1' ? 40 : 25,
  durationMinutes: component === 'P1' ? 70 : 110,
  fileUrl: manifest.sources[component === 'P1' ? 'p1' : 'p2'].url,
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'biology-x', name: 'Biology', code: 'BIO' },
  questions: component === 'P1' ? mcqs.map(mcqQuestion) : (written as WrittenTuple[]).map(writtenQuestion),
}));
