import type { PaperData, QuestionData } from './paperDataService';
import mcqs from '@/data/biology/ssc2_2021_past_mcqs.json';
import manifest from '@/data/biology/ssc2_2021_source_manifest.json';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';

const allOutcomes = new Map<string, { unitNumber: number; topic: string; description: string; cognitiveLevel: string; grade: number }>();
for (const gradeKey of ['9', '10'] as const) {
  for (const unit of syllabus[gradeKey]) {
    for (const st of unit.subtopics) {
      for (const slo of st.slos) {
        if (!allOutcomes.has(slo.code) || slo.cognitiveLevel === 'U') {
          allOutcomes.set(slo.code, {
            unitNumber: unit.unitNumber,
            topic: unit.name,
            description: slo.description,
            cognitiveLevel: slo.cognitiveLevel,
            grade: Number(gradeKey),
          });
        }
      }
    }
  }
}

const choicesRecord = (values: string[]) => Object.fromEntries(values.map((v, i) => ['ABCD'[i], v]));

function mcqQuestion(item: (typeof mcqs)[number]): QuestionData {
  const number = item.number;
  const mapped = allOutcomes.get(item.code);
  const choices = choicesRecord(item.choices);
  return {
    id: `bio-x-2021-p1-q${number}`,
    questionNumber: number,
    questionText: item.stem,
    questionType: 'MULTIPLE_CHOICE',
    marks: 1,
    difficulty: item.originalLevel === 'K' ? 'R' : item.originalLevel,
    isDiagram: Boolean(item.diagramUrl),
    diagramBased: Boolean(item.diagramUrl),
    sourceRegion: {
      choices,
      correct_answer: item.answer ?? undefined,
      official_answer: item.officialAnswer,
      solved_correct_option: item.answer ?? undefined,
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
        grade: mapped.grade,
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

export const biologyX2021Papers: PaperData[] = [
  {
    id: 'BIO-X-2021-P1',
    paperCode: 'BIO-X-2021-P1',
    title: 'Biology SSC-II 2021 Examination Paper I',
    examYear: 2021,
    examSession: 'Annual 2021',
    examType: 'ANNUAL',
    totalMarks: 50,
    durationMinutes: 100,
    fileUrl: manifest.sources.p1.url,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'biology-x', name: 'Biology', code: 'BIO' },
    questions: mcqs.map(mcqQuestion),
  },
];

