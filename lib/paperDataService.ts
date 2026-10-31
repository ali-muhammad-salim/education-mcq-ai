import fs from 'fs';
import path from 'path';

import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc1ModelCrqs from '@/data/physics/ssc1_model_crqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';
import ssc2ModelCrqs from '@/data/physics/ssc2_model_crqs.json';
import ssc1Past2025Mcqs from '@/data/physics/ssc1_2025_past_mcqs.json';
import ssc1Past2025Crqs from '@/data/physics/ssc1_2025_past_crqs.json';
import ssc1Past2024Mcqs from '@/data/physics/ssc1_2024_past_mcqs.json';
import ssc1Past2024Crqs from '@/data/physics/ssc1_2024_past_crqs.json';
import ssc2Past2025Mcqs from '@/data/physics/ssc2_2025_past_mcqs.json';
import ssc2Past2025Crqs from '@/data/physics/ssc2_2025_past_crqs.json';
import cs1ModelMcqs from '@/data/computer-science/ssc1_model_mcqs.json';
import cs1ModelCrqs from '@/data/computer-science/ssc1_model_crqs.json';
import cs1Past2025Mcqs from '@/data/computer-science/ssc1_2025_past_mcqs.json';
import cs1Past2025Crqs from '@/data/computer-science/ssc1_2025_past_crqs.json';
import cs1Past2024Mcqs from '@/data/computer-science/ssc1_2024_past_mcqs.json';
import cs1Past2024Crqs from '@/data/computer-science/ssc1_2024_past_crqs.json';
import cs1Past2023Mcqs from '@/data/computer-science/ssc1_2023_past_mcqs.json';
import cs1Past2023Crqs from '@/data/computer-science/ssc1_2023_past_crqs.json';
import cs1Past2022Mcqs from '@/data/computer-science/ssc1_2022_past_mcqs.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
import { annual2024AnswerReviews, annualX2025AnswerReviews } from '@/lib/legacyPaperEvidence';

export interface QuestionData {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CONSTRUCTED_RESPONSE' | 'EXTENDED_RESPONSE';
  marks: number;
  difficulty?: string;
  diagramBased?: boolean;
  sourceRegion: {
    choices?: Record<string, string>;
    correct_answer?: string;
    explanation?: string;
    option_feedback?: Array<{ key: string; reason: string }>;
    rubric?: Array<{ marks: number; description: string }>;
    model_answer?: string;
    better_response?: string;
    weaker_response?: string;
    overall_performance?: string;
    better_response_image?: string;
    weaker_response_image?: string;
    suggestions?: string;
    in_syllabus?: boolean;
    out_of_syllabus?: boolean;
    syllabus_reviewed?: boolean;
    current_syllabus_reviewed?: boolean;
    mapping_scope?: { board: string; grade: number; subject: string };
    current_mapping?: Array<{ code: string; description: string; topic: string }>;
    current_slo?: string;
    cognitive_level?: string;
    is_numerical?: boolean;
    slo?: string;
    original_slo_text?: string;
    original_reference_verified?: boolean;
    original_reference_source?: string;
    official_answer?: string;
    answer_review_note?: string;
    answer_origin?: string;
    diagramUrl?: string;
    pageNumber?: number;
    pageScanUrl?: string;
    slo_details?: {
      description?: string;
      topic_name?: string;
    };
  };
  topics?: Array<{ topic: { name: string; topicNumber?: string } }>;
  slos?: Array<{ slo: { code?: string; description: string } }>;
}

export interface PaperData {
  id: string;
  title: string;
  paperCode: string;
  examYear: number;
  examSession?: string;
  examType?: string;
  fileUrl?: string;
  academicClass: {
    name: string;
    level: number;
  };
  subject: {
    id: string;
    name: string;
    code?: string;
  };
  questions: QuestionData[];
}

const JSON_BUNDLES: Record<string, any[]> = {
  'ssc1_model_mcqs.json': ssc1ModelMcqs as any[],
  'ssc1_model_crqs.json': ssc1ModelCrqs as any[],
  'ssc2_model_mcqs.json': ssc2ModelMcqs as any[],
  'ssc2_model_crqs.json': ssc2ModelCrqs as any[],
  'ssc1_2025_past_mcqs.json': ssc1Past2025Mcqs as any[],
  'ssc1_2025_past_crqs.json': ssc1Past2025Crqs as any[],
  'ssc1_2024_past_mcqs.json': ssc1Past2024Mcqs as any[],
  'ssc1_2024_past_crqs.json': ssc1Past2024Crqs as any[],
  'ssc2_2025_past_mcqs.json': ssc2Past2025Mcqs as any[],
  'ssc2_2025_past_crqs.json': ssc2Past2025Crqs as any[],
  'cs1_model_mcqs.json': cs1ModelMcqs as any[],
  'cs1_model_crqs.json': cs1ModelCrqs as any[],
  'cs1_2025_past_mcqs.json': cs1Past2025Mcqs as any[],
  'cs1_2025_past_crqs.json': cs1Past2025Crqs as any[],
  'cs1_2024_past_mcqs.json': cs1Past2024Mcqs as any[],
  'cs1_2024_past_crqs.json': cs1Past2024Crqs as any[],
  'cs1_2023_past_mcqs.json': cs1Past2023Mcqs as any[],
  'cs1_2023_past_crqs.json': cs1Past2023Crqs as any[],
  'cs1_2022_past_mcqs.json': cs1Past2022Mcqs as any[],
};

function loadJsonFile(filename: string): any[] {
  if (JSON_BUNDLES[filename]) {
    return JSON_BUNDLES[filename];
  }
  try {
    const fullPath = path.join(process.cwd(), 'data', 'physics', filename);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Failed to read data/physics/${filename}:`, err);
  }
  return [];
}

export function getUploadedPapers(): any[] {
  try {
    const regPath = path.join(process.cwd(), 'data', 'uploaded_past_papers.json');
    if (fs.existsSync(regPath)) {
      const raw = fs.readFileSync(regPath, 'utf8');
      const records: unknown = JSON.parse(raw);
      if (!Array.isArray(records)) return [];
      return records.filter(p => p && typeof p.paperCode === 'string' && typeof p.title === 'string' &&
        Number.isInteger(p.examYear) && Number.isInteger(p.academicClass?.level) && typeof p.subject?.name === 'string' &&
        typeof p.fileUrl === 'string' && p.fileUrl.startsWith('/') && !p.fileUrl.startsWith('//') &&
        // A model PDF cannot establish the identity of a differently named annual paper.
        (!(p.examSession || '').toLowerCase().includes('annual') || !/model[-_ ]paper/i.test(p.fileUrl)));
    }
  } catch (err) {
    console.error('Failed to read uploaded_past_papers.json:', err);
  }
  return [];
}

export function findUploadedPaper(paperCode: string): any | null {
  const list = getUploadedPapers();
  const clean = (paperCode || '').toUpperCase().trim();
  return list.find(p => 
    (p.paperCode && p.paperCode.toUpperCase() === clean) || 
    (p.id && p.id.toUpperCase() === clean)
  ) || null;
}

/**
 * Returns canonical PaperData and its questions for Model Papers & Past Papers
 */
export function getFallbackPaper(paperCodeOrId: string): PaperData | null {
  const code = (paperCodeOrId || '').replace(/\.html?$/i, '').toUpperCase().trim();

  // Computer Science SSC-I 2022 Annual Examination Paper I (50 MCQs: 40 Theory + 10 ATP)
  if (
    code === 'CS-IX-2022-P1' ||
    code === 'CSC-IX-2022-P1' ||
    (code.startsWith('CS') && code.includes('2022') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2022_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2022-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2022-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2022-P1',
      title: 'Computer Science SSC-I 2022 Annual Examination Paper I (40 Theory + 10 ATP MCQs)',
      paperCode: 'CS-IX-2022-P1',
      examYear: 2022,
      examSession: 'Annual Examination 2022',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2022-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2023 Annual Examination Paper I (MCQ)
  if (
    code === 'CS-IX-2023-P1' ||
    code === 'CSC-IX-2023-P1' ||
    (code.startsWith('CS') && code.includes('2023') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2023_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2023-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          official_answer: Number(qNum) === 11 ? '*' : item.correctOption,
          answer_review_note: item.answer_review_note || undefined,
          original_reference_source: '/resources/computer-science-ix-2023-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2023-P1',
      title: 'Computer Science SSC-I 2023 Annual Examination Paper I (MCQ)',
      paperCode: 'CS-IX-2023-P1',
      examYear: 2023,
      examSession: 'Annual Examination 2023',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2023-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2023 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2023-P2' ||
    code === 'CSC-IX-2023-P2' ||
    (code.startsWith('CS') && code.includes('2023') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2023_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 6;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2023-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2023-emarking',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.current_slo ? [{ slo: { code: item.current_slo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2023-P2',
      title: 'Computer Science SSC-I 2023 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2023-P2',
      examYear: 2023,
      examSession: 'Annual Examination 2023',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2023-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2024 Annual Examination Paper I (MCQ)
  if (
    code === 'CS-IX-2024-P1' ||
    code === 'CSC-IX-2024-P1' ||
    (code.startsWith('CS') && code.includes('2024') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2024_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2024-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          official_answer: Number(qNum) === 9 ? 'D,A' : item.correctOption,
          answer_review_note: item.answer_review_note || undefined,
          original_reference_source: '/resources/computer-science-ix-2024-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2024-P1',
      title: 'Computer Science SSC-I 2024 Annual Examination Paper I (MCQ)',
      paperCode: 'CS-IX-2024-P1',
      examYear: 2024,
      examSession: 'Annual Examination 2024',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2024-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2024 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2024-P2' ||
    code === 'CSC-IX-2024-P2' ||
    (code.startsWith('CS') && code.includes('2024') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2024_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 6;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2024-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: false,
          original_reference_source: '/resources/computer-science-ix-2024-emarking',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.current_slo ? [{ slo: { code: item.current_slo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2024-P2',
      title: 'Computer Science SSC-I 2024 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2024-P2',
      examYear: 2024,
      examSession: 'Annual Examination 2024',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2024-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2025 Annual Examination Paper I (MCQ)
  if (
    code === 'CS-IX-2025-P1' ||
    code === 'CSC-IX-2025-P1' ||
    (code.startsWith('CS') && code.includes('2025') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2025-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2025-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2025-P1',
      title: 'Computer Science SSC-I 2025 Annual Examination Paper I (MCQ)',
      paperCode: 'CS-IX-2025-P1',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2025-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2025 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2025-P2' ||
    code === 'CSC-IX-2025-P2' ||
    (code.startsWith('CS') && code.includes('2025') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2025_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 6;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2025-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.current_syllabus_reviewed === true && item.in_syllabus === true,
          out_of_syllabus: item.current_syllabus_reviewed === true && item.out_of_syllabus === true,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2025-emarking',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.current_slo ? [{ slo: { code: item.current_slo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-2025-P2',
      title: 'Computer Science SSC-I 2025 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2025-P2',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2025-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science Class IX Model Paper I (MCQ) - 2026 & Onwards
  if (
    code === 'CS-IX-P1' ||
    code === 'CSC-IX-P1' ||
    code.includes('COMPUTER-SCIENCE-MODEL-PAPER-IX-PAPER-I')
  ) {
    const rawMcqs = loadJsonFile('cs1_model_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      return {
        id: `cs-ix-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          in_syllabus: true,
          out_of_syllabus: false,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: effectiveSlo,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-P1',
      title: 'Computer Science Class IX Model Paper I (MCQ)',
      paperCode: 'CS-IX-P1',
      examYear: 2026,
      examSession: 'Model Examination 2026',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-model-paper-ix-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science Class IX Model Paper II (CRQ & ERQ) - 2026 & Onwards
  if (
    code === 'CS-IX-P2' ||
    code === 'CSC-IX-P2' ||
    code.includes('COMPUTER-SCIENCE-MODEL-PAPER-IX-PAPER-II')
  ) {
    const rawCrqs = loadJsonFile('cs1_model_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 4;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: item.cognitiveLevel || 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          in_syllabus: true,
          out_of_syllabus: false,
          syllabus_reviewed: item.syllabus_reviewed === true,
          current_syllabus_reviewed: item.syllabus_reviewed === true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || undefined,
          current_slo: item.current_slo || item.slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'CS-IX-P2',
      title: 'Computer Science Class IX Model Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-P2',
      examYear: 2026,
      examSession: 'Model Examination 2026',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-model-paper-ix-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // 0A. 2024 Annual Past Paper 1 (Class IX) - Authentic Board MCQs
  if (
    code === 'PHY-IX-2024-P1' ||
    (code.includes('2024') && (code.includes('IX') || code.includes('9')) && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('ssc1_2024_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-I Physics (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      const reviewNote = annual2024AnswerReviews[Number(qNum)];
      const printedAnswer = key2024.entries.find(entry => entry.questionNumber === Number(qNum))?.printedKey;
      return {
        id: `phy-ix-2024-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: [item.explanation, reviewNote ? `Source review: ${reviewNote}` : ''].filter(Boolean).join('\n\n'),
          ...(reviewNote ? { answer_review_note: reviewNote, answer_origin: 'PROVISIONAL_SOURCE_KEY' } : {}),
          ...(printedAnswer ? { official_answer: printedAnswer } : {}),
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-ix-2024-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'PHY-IX-2024-P1',
      title: 'Physics SSC-I 2024 Annual Examination Paper I (MCQ)',
      paperCode: 'PHY-IX-2024-P1',
      examYear: 2024,
      examSession: 'Annual Examination 2024',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions,
    };
  }

  // 0B. 2024 Annual Past Paper 2 (Class IX) - Authentic Board CRQs & ERQs
  if (
    code === 'PHY-IX-2024-P2' ||
    (code.includes('2024') && (code.includes('IX') || code.includes('9')) && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('ssc1_2024_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `${idx + 1}`;
      const isErq = item.questionType === 'EXTENDED_RESPONSE' || (item.marks || 3) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-I Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.originalSloText || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      return {
        id: `phy-ix-2024-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: item.questionType || (isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE'),
        marks: item.marks || 3,
        difficulty: item.cognitiveLevel || 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || item.modelAnswer || '',
          weaker_response: item.weakerResponse || '',
          overall_performance: item.overallPerformance || '',
          better_response_image: item.betterResponseImage || undefined,
          weaker_response_image: item.weakerResponseImage || undefined,
          suggestions: item.suggestions || '',
          cognitive_level: item.cognitiveLevel || 'A',
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          original_slo_text: item.originalSloText || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-ix-2024-emarking',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'PHY-IX-2024-P2',
      title: 'Physics SSC-I 2024 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'PHY-IX-2024-P2',
      examYear: 2024,
      examSession: 'Annual Examination 2024',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions,
    };
  }

  // 0C. 2025 Annual Past Paper 1 (Class X) - Authentic Board MCQs
  if (code === 'PHY-X-2025-P1') {
    const rawMcqs = loadJsonFile('ssc2_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-II Physics (Class X)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      const reviewNote = annualX2025AnswerReviews[Number(qNum)];
      const printedAnswer = keyX2025.entries.find(entry => entry.questionNumber === Number(qNum))?.printedKey;
      return {
        id: `phy-x-2025-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: reviewNote ? `Official key: ${printedAnswer}. ${reviewNote}` : item.explanation,
          ...(reviewNote ? { answer_review_note: reviewNote, answer_origin: 'PROVISIONAL_SOURCE_KEY' } : {}),
          ...(printedAnswer ? { official_answer: printedAnswer } : {}),
          option_feedback: reviewNote ? undefined : item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: item.current_syllabus_reviewed === true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 10, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-x-2025-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : [],
      };
    });

    return {
      id: 'PHY-X-2025-P1',
      title: 'Physics SSC-II 2025 Annual Examination Paper I (MCQ)',
      paperCode: 'PHY-X-2025-P1',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-2/physics-x-2025-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'physics-x', name: 'Physics', code: 'PHY' },
      questions,
    };
  }

  // 0D. 2025 Annual Past Paper 2 (Class X) - Authentic Board CRQs & ERQs
  if (code === 'PHY-X-2025-P2') {
    const rawCrqs = loadJsonFile('ssc2_2025_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `${idx + 1}`;
      const isErq = item.questionType === 'EXTENDED_RESPONSE' || (item.marks || 3) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-II Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      // The supplied Paper II bundle mixes source transcription with generated
      // solutions and several semantically incorrect current-SLO matches.
      const originalSloDesc = item.originalSloText || item.stem;
      return {
        id: `phy-x-2025-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: item.questionType || (isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE'),
        marks: item.marks || 3,
        difficulty: item.cognitiveLevel || 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          answer_review_note: 'The supplied generated solution and current-syllabus mapping are pending source review. Consult the original paper and E-marking PDF.',
          cognitive_level: item.cognitiveLevel || 'A',
          syllabus_reviewed: false,
          current_syllabus_reviewed: false,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 10, subject: 'Physics' },
          current_mapping: [],
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          original_slo_text: item.originalSloText || undefined,
          original_reference_verified: false,
          original_reference_source: '/resources/physics-x-2025-emarking',
          slo_details: {
            description: originalSloDesc,
            topic_name: topicName,
          },
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: originalSloDesc } }] : [],
      };
    });

    return {
      id: 'PHY-X-2025-P2',
      title: 'Physics SSC-II 2025 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'PHY-X-2025-P2',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-2/physics-x-2025-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'physics-x', name: 'Physics', code: 'PHY' },
      questions,
    };
  }

  if (code.includes('2024')) {
    const uploaded = findUploadedPaper(code);
    return uploaded ? uploadedPaper(uploaded) : null;
  }

  // 1. 2025 Annual Past Paper 1 (Class IX) - Authentic Board MCQs
  if (
    code === 'PHY-IX-2025-P1' ||
    (code.includes('2025') && (code.includes('IX') || code.includes('9')) && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('ssc1_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-I Physics (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      return {
        id: `phy-ix-2025-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          slo: item.original_slo || item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-ix-2025-key',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-IX-2025-P1',
      title: 'Physics SSC-I 2025 Annual Examination Paper I (MCQ)',
      paperCode: 'PHY-IX-2025-P1',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // 2. 2025 Annual Past Paper 2 (Class IX) - Authentic Board CRQs & ERQs
  if (
    code === 'PHY-IX-2025-P2' ||
    (code.includes('2025') && (code.includes('IX') || code.includes('9')) && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('ssc1_2025_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = item.questionType === 'EXTENDED_RESPONSE' || (item.marks || 3) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-I Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '2';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.originalSloText || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      return {
        id: `phy-ix-2025-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: item.questionType || (isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE'),
        marks: item.marks || 3,
        difficulty: 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || item.modelAnswer || '',
          weaker_response: item.weakerResponse || '',
          overall_performance: item.overallPerformance || '',
          better_response_image: item.betterResponseImage || undefined,
          weaker_response_image: item.weakerResponseImage || undefined,
          suggestions: item.suggestions || '',
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          slo: item.original_slo || item.slo || undefined,
          original_slo_text: item.originalSloText || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-ix-2025-emarking',
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: effectiveSlo ? [{ slo: { code: effectiveSlo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-IX-2025-P2',
      title: 'Physics SSC-I 2025 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'PHY-IX-2025-P2',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // 5. Check if another uploaded past paper matches
  const uploadedMatch = findUploadedPaper(code);
  if (uploadedMatch) {
    return uploadedPaper(uploadedMatch);
  }

  // Class IX Model Paper I (MCQ)
  if (
    code === 'PHY-IX-P1' ||
    code === 'P1' ||
    code === 'PAPER-1' ||
    code === 'MODEL-PAPER-1' ||
    code.includes('PHYSICS-IX-PAPER-I-MODEL') ||
    code.includes('IX-P1')
  ) {
    const rawMcqs = loadJsonFile('ssc1_model_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-I Physics (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `phy-ix-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || undefined,
          current_slo: item.current_slo || item.slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-IX-P1',
      title: 'Physics Class IX Model Paper I (MCQ)',
      paperCode: 'PHY-IX-P1',
      examYear: 2025,
      examSession: 'Annual / Model Examination',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // Class IX Model Paper II (CRQ & ERQ)
  if (
    code === 'PHY-IX-P2' ||
    code === 'P2' ||
    code === 'PAPER-2' ||
    code === 'MODEL-PAPER-2' ||
    code.includes('PHYSICS-IX-PAPER-II-MODEL') ||
    code.includes('IX-P2')
  ) {
    const rawCrqs = loadJsonFile('ssc1_model_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-I Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '2';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `phy-ix-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 9, subject: 'Physics' },
          current_mapping: item.current_mapping || undefined,
          current_slo: item.current_slo || item.slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-IX-P2',
      title: 'Physics Class IX Model Paper II (CRQ & ERQ)',
      paperCode: 'PHY-IX-P2',
      examYear: 2025,
      examSession: 'Annual / Model Examination',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // Class X Model Paper I (MCQ)
  if (
    code === 'PHY-X-P1' ||
    code.includes('PHYSICS-X-PAPER-I-MODEL') ||
    code.includes('X-P1')
  ) {
    const rawMcqs = loadJsonFile('ssc2_model_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-II Physics (Class X)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `phy-x-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || '',
          explanation: item.explanation || '',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 10, subject: 'Physics' },
          current_mapping: item.current_mapping || undefined,
          current_slo: item.current_slo || item.slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-X-P1',
      title: 'Physics Class X Model Paper I (MCQ)',
      paperCode: 'PHY-X-P1',
      examYear: 2025,
      examSession: 'Annual / Model Examination',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'physics-x', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // Class X Model Paper II (CRQ & ERQ)
  if (
    code === 'PHY-X-P2' ||
    code.includes('PHYSICS-X-PAPER-II-MODEL') ||
    code.includes('X-P2')
  ) {
    const rawCrqs = loadJsonFile('ssc2_model_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-II Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `phy-x-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: 'A',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 10, subject: 'Physics' },
          current_mapping: item.current_mapping || undefined,
          current_slo: item.current_slo || item.slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          slo_details: {
            description: mappedSloDesc,
            topic_name: topicName
          }
        },
        topics: [{ topic: { name: topicName, topicNumber: topicNum } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: mappedSloDesc } }] : []
      };
    });

    return {
      id: 'PHY-X-P2',
      title: 'Physics Class X Model Paper II (CRQ & ERQ)',
      paperCode: 'PHY-X-P2',
      examYear: 2025,
      examSession: 'Annual / Model Examination',
      examType: 'MODEL_EXAM',
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'physics-x', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  return null;
}

/**
 * Returns list of all model and past papers for the archive directory table
 */
export function getAllStandardPapers(): Array<{
  id: string;
  paperCode: string;
  examSession: string;
  examYear: number;
  title: string;
  fileUrl: string;
  academicClass: { name: string; level: number };
  subject: { name: string };
  _count: { questions: number };
}> {
  const basePapers = [
    {
      id: 'PHY-IX-P1',
      paperCode: 'PHY-IX-P1',
      title: 'Physics Class IX Model Paper I (MCQ)',
      examSession: 'Model Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 40 }
    },
    {
      id: 'PHY-IX-P2',
      paperCode: 'PHY-IX-P2',
      title: 'Physics Class IX Model Paper II (CRQ & ERQ)',
      examSession: 'Model Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 12 }
    },
    {
      id: 'PHY-X-P1',
      paperCode: 'PHY-X-P1',
      title: 'Physics Class X Model Paper I (MCQ)',
      examSession: 'Model Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Physics' },
      _count: { questions: 40 }
    },
    {
      id: 'PHY-X-P2',
      paperCode: 'PHY-X-P2',
      title: 'Physics Class X Model Paper II (CRQ & ERQ)',
      examSession: 'Model Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Physics' },
      _count: { questions: 10 }
    },
    // 2025 Annual Examination Papers (Genuine verified board papers)
    {
      id: 'PHY-IX-2025-P1',
      paperCode: 'PHY-IX-2025-P1',
      title: 'Physics SSC-I 2025 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 40 }
    },
    {
      id: 'PHY-IX-2025-P2',
      paperCode: 'PHY-IX-2025-P2',
      title: 'Physics SSC-I 2025 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 11 }
    },
    // 2024 Annual Examination Papers (Genuine verified board papers)
    {
      id: 'PHY-IX-2024-P1',
      paperCode: 'PHY-IX-2024-P1',
      title: 'Physics SSC-I 2024 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2024,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 40 }
    },
    {
      id: 'PHY-IX-2024-P2',
      paperCode: 'PHY-IX-2024-P2',
      title: 'Physics SSC-I 2024 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2024,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 9 }
    },
    {
      id: 'PHY-X-2025-P1',
      paperCode: 'PHY-X-2025-P1',
      title: 'Physics SSC-II 2025 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-2/physics-x-2025-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Physics' },
      _count: { questions: 40 }
    },
    {
      id: 'PHY-X-2025-P2',
      paperCode: 'PHY-X-2025-P2',
      title: 'Physics SSC-II 2025 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-2/physics-x-2025-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Physics' },
      _count: { questions: 9 }
    },
    {
      id: 'CS-IX-P1',
      paperCode: 'CS-IX-P1',
      title: 'Computer Science Class IX Model Paper I (MCQ)',
      examSession: 'Model Examination',
      examYear: 2026,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-model-paper-ix-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 }
    },
    {
      id: 'CS-IX-P2',
      paperCode: 'CS-IX-P2',
      title: 'Computer Science Class IX Model Paper II (CRQ & ERQ)',
      examSession: 'Model Examination',
      examYear: 2026,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-model-paper-ix-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 7 }
    },
    {
      id: 'CS-IX-2025-P1',
      paperCode: 'CS-IX-2025-P1',
      title: 'Computer Science SSC-I 2025 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2025-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 }
    },
    {
      id: 'CS-IX-2025-P2',
      paperCode: 'CS-IX-2025-P2',
      title: 'Computer Science SSC-I 2025 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2025-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 }
    },
    {
      id: 'CS-IX-2024-P1',
      paperCode: 'CS-IX-2024-P1',
      title: 'Computer Science SSC-I 2024 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2024,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2024-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 }
    },
    {
      id: 'CS-IX-2024-P2',
      paperCode: 'CS-IX-2024-P2',
      title: 'Computer Science SSC-I 2024 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2024,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2024-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 }
    },
    {
      id: 'CS-IX-2023-P1',
      paperCode: 'CS-IX-2023-P1',
      title: 'Computer Science SSC-I 2023 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2023,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2023-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 }
    },
    {
      id: 'CS-IX-2023-P2',
      paperCode: 'CS-IX-2023-P2',
      title: 'Computer Science SSC-I 2023 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2023,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2023-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 }
    },
    {
      id: 'CS-IX-2022-P1',
      paperCode: 'CS-IX-2022-P1',
      title: 'Computer Science SSC-I 2022 Annual Examination Paper I (Theory + ATP)',
      examSession: 'Annual Examination',
      examYear: 2022,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2022-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 50 }
    }
  ];

  // Dynamically merge all uploaded past papers from data/uploaded_past_papers.json
  const uploaded = getUploadedPapers();
  for (const up of uploaded) {
    const existingIdx = basePapers.findIndex(p => p.paperCode === up.paperCode);
    if (existingIdx >= 0) {
      if (up.fileUrl) {
        basePapers[existingIdx].fileUrl = up.fileUrl;
      }
      if (up.title) {
        basePapers[existingIdx].title = up.title;
      }
    } else {
      basePapers.push(up);
    }
  }

  return basePapers.map(p => ({ ...p, _count: { questions: getFallbackPaper(p.paperCode)?.questions.length ?? 0 } }));
}

function uploadedPaper(record: any): PaperData {
  return { id: record.paperCode, title: record.title, paperCode: record.paperCode, examYear: record.examYear,
    examSession: record.examSession, examType: 'ANNUAL', fileUrl: record.fileUrl, academicClass: record.academicClass,
    subject: { ...record.subject, id: record.subject.id || record.subject.name.toLowerCase() }, questions: [] };
}
