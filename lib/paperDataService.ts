import fs from 'fs';
import { createHash } from 'node:crypto';
import chemistryMappingReview from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
const chemistryReviewedMappings = new Map(chemistryMappingReview.questions.map(q => [q.paperCode + ':' + q.questionNumber, q]));
import sourceMetadata from '@/data/paper_source_metadata.json';
import path from 'path';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';

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
import cs2ModelMcqs from '@/data/computer-science/ssc2_model_mcqs.json';
import cs2ModelCrqs from '@/data/computer-science/ssc2_model_crqs.json';
import cs1Past2025Mcqs from '@/data/computer-science/ssc1_2025_past_mcqs.json';
import cs1Past2025Crqs from '@/data/computer-science/ssc1_2025_past_crqs.json';
import cs1Past2024Mcqs from '@/data/computer-science/ssc1_2024_past_mcqs.json';
import cs1Past2024Crqs from '@/data/computer-science/ssc1_2024_past_crqs.json';
import cs1Past2023Mcqs from '@/data/computer-science/ssc1_2023_past_mcqs.json';
import cs1Past2023Crqs from '@/data/computer-science/ssc1_2023_past_crqs.json';
import cs1Past2022Mcqs from '@/data/computer-science/ssc1_2022_past_mcqs.json';
import cs1Past2019Mcqs from '@/data/computer-science/ssc1_2019_past_mcqs.json';
import cs1Past2019Crqs from '@/data/computer-science/ssc1_2019_past_crqs.json';
import cs1Past2018Crqs from '@/data/computer-science/ssc1_2018_past_crqs.json';
import cs1Past2017Mcqs from '@/data/computer-science/ssc1_2017_past_mcqs.json';
import cs1Past2017Crqs from '@/data/computer-science/ssc1_2017_past_crqs.json';
import cs2Past2025Mcqs from '@/data/computer-science/ssc2_2025_past_mcqs.json';
import cs2Past2025Crqs from '@/data/computer-science/ssc2_2025_past_crqs.json';
import cs2Past2024Mcqs from '@/data/computer-science/ssc2_2024_past_mcqs.json';
import cs2Past2024Crqs from '@/data/computer-science/ssc2_2024_past_crqs.json';
import cs2Past2023Mcqs from '@/data/computer-science/ssc2_2023_past_mcqs.json';
import cs2Past2023Crqs from '@/data/computer-science/ssc2_2023_past_crqs.json';
import cs2Past2022Mcqs from '@/data/computer-science/ssc2_2022_past_mcqs.json';
import cs2Past2019Mcqs from '@/data/computer-science/ssc2_2019_past_mcqs.json';
import cs2Past2019Crqs from '@/data/computer-science/ssc2_2019_past_crqs.json';
import cs2Past2018Crqs from '@/data/computer-science/ssc2_2018_past_crqs.json';
import cs2Past2017Mcqs from '@/data/computer-science/ssc2_2017_past_mcqs.json';
import cs2Past2017Crqs from '@/data/computer-science/ssc2_2017_past_crqs.json';
import chem1ModelMcqs from '@/data/chemistry/ssc1_model_mcqs.json';
import chem1ModelCrqs from '@/data/chemistry/ssc1_model_crqs.json';
import chem2ModelMcqs from '@/data/chemistry/ssc2_model_mcqs.json';
import chem2ModelCrqs from '@/data/chemistry/ssc2_model_crqs.json';
import chem1Past2025Mcqs from '@/data/chemistry/ssc1_2025_past_mcqs.json';
import chem1Past2025Crqs from '@/data/chemistry/ssc1_2025_past_crqs.json';
import chem1Past2024Mcqs from '@/data/chemistry/ssc1_2024_past_mcqs.json';
import chem1Past2024Crqs from '@/data/chemistry/ssc1_2024_past_crqs.json';
import chem1Past2023Mcqs from '@/data/chemistry/ssc1_2023_past_mcqs.json';
import chem1Past2023Crqs from '@/data/chemistry/ssc1_2023_past_crqs.json';
import chem1Past2022Mcqs from '@/data/chemistry/ssc1_2022_past_mcqs.json';
import chem1Past2021Mcqs from '@/data/chemistry/ssc1_2021_past_mcqs.json';
import chem1Past2019Mcqs from '@/data/chemistry/ssc1_2019_past_mcqs.json';
import chem1Past2019Crqs from '@/data/chemistry/ssc1_2019_past_crqs.json';
import chem1Past2018Mcqs from '@/data/chemistry/ssc1_2018_past_mcqs.json';
import chem1Past2018Crqs from '@/data/chemistry/ssc1_2018_past_crqs.json';
import chem1Past2017Mcqs from '@/data/chemistry/ssc1_2017_past_mcqs.json';
import chem1Past2017Crqs from '@/data/chemistry/ssc1_2017_past_crqs.json';
import chem2Past2025Mcqs from '@/data/chemistry/ssc2_2025_past_mcqs.json';
import chem2Past2025Crqs from '@/data/chemistry/ssc2_2025_past_crqs.json';
import chem2Past2024Mcqs from '@/data/chemistry/ssc2_2024_past_mcqs.json';
import chem2Past2024Crqs from '@/data/chemistry/ssc2_2024_past_crqs.json';
import chem2Past2023Mcqs from '@/data/chemistry/ssc2_2023_past_mcqs.json';
import chem2Past2023Crqs from '@/data/chemistry/ssc2_2023_past_crqs.json';
import mth1ModelMcqs from '@/data/mathematics/ssc1_model_mcqs.json';
import mth1ModelCrqs from '@/data/mathematics/ssc1_model_crqs.json';
import { reviewedMathematicsPapers } from '@/lib/mathematicsPapers';
import { hsscPhysicsPapers } from '@/lib/hsscPhysicsResources';
import { hsscXiAnnualPapers } from '@/lib/hsscXiAnnualPhysics';
import chemistryIXSyllabus from '@/data/chemistry/ssc1_exact_syllabus.json';
import chemistryXSyllabus from '@/data/chemistry/ssc2_exact_syllabus.json';

const chemistryOutcomeCodes = new Map([
  [9, new Set(chemistryIXSyllabus.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => o.code))))],
  [10, new Set(chemistryXSyllabus.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => o.code))))],
]);

export interface QuestionData {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CONSTRUCTED_RESPONSE' | 'EXTENDED_RESPONSE';
  marks: number;
  difficulty?: string;
  isDiagram?: boolean;
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
    better_response_image?: string | null;
    weaker_response_image?: string | null;
    suggestions?: string;
    in_syllabus?: boolean;
    out_of_syllabus?: boolean;
    syllabus_reviewed?: boolean;
    current_syllabus_reviewed?: boolean;
    mapping_scope?: { board: string; grade: number; subject: string };
    current_mapping?: Array<{ code: string; description: string; topic: string; grade?: number }>;
    emarkingExamples?: Array<{ part: string; better: string; weaker: string; solution: string; originalSlo?: string; pdf: string; level?: string; currentSlo?: { code: string; grade: number } }>;
    current_slo?: string | null;
    mapping_review_source_sha256?: string;
    mapping_review_source_url?: string;
    proposed_current_slo?: string | null;
    proposed_current_mapping?: Array<{ code: string; description: string; topic: string }>;
    slo_text?: string;
    isDiagram?: boolean;
    diagramBased?: boolean;
    cognitive_level?: string;
    is_numerical?: boolean;
    slo?: string;
    original_slo_text?: string;
    original_reference_verified?: boolean;
    original_reference_source?: string;
    official_answer?: string;
    official_alternate_answer?: string;
    assessmentSection?: string;
    answer_review_note?: string;
    answer_origin?: string;
    answer_status?: string;
    solved_correct_option?: string | null;
    model_answer_origin?: string;
    official_marking_notes?: string;
    choice_instruction?: string;
    choice_group?: string | null;
    mapping_status?: string;
    mapping_reason?: string;
    syllabus_edition?: string;
    source_sha256?: string;
    diagramUrl?: string;
    secondDiagramUrl?: string;
    pageNumber?: number;
    pageScanUrl?: string;
    slo_details?: {
      description?: string;
      topic_name?: string;
    };
  };
  topics?: Array<{ topic: { name: string; topicNumber?: string | number } }>;
  slos?: Array<{ slo: { code?: string; description: string } }>;
}

export interface PaperData {
  id: string;
  title: string;
  paperCode: string;
  examYear: number;
  examSession?: string;
  examType?: string;
  totalMarks?: number;
  durationMinutes?: number;
  rubricInstruction?: string;
  markScalingNote?: string;
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
  'cs2_model_mcqs.json': cs2ModelMcqs as any[],
  'cs2_model_crqs.json': cs2ModelCrqs as any[],
  'cs1_2025_past_mcqs.json': cs1Past2025Mcqs as any[],
  'cs1_2025_past_crqs.json': cs1Past2025Crqs as any[],
  'cs1_2024_past_mcqs.json': cs1Past2024Mcqs as any[],
  'cs1_2024_past_crqs.json': cs1Past2024Crqs as any[],
  'cs1_2023_past_mcqs.json': cs1Past2023Mcqs as any[],
  'cs1_2023_past_crqs.json': cs1Past2023Crqs as any[],
  'cs1_2022_past_mcqs.json': cs1Past2022Mcqs as any[],
  'cs1_2019_past_mcqs.json': cs1Past2019Mcqs as any[],
  'cs1_2019_past_crqs.json': cs1Past2019Crqs as any[],
  'cs1_2018_past_crqs.json': cs1Past2018Crqs as any[],
  'cs1_2017_past_mcqs.json': cs1Past2017Mcqs as any[],
  'cs1_2017_past_crqs.json': cs1Past2017Crqs as any[],
  'cs2_2025_past_mcqs.json': cs2Past2025Mcqs as any[],
  'cs2_2025_past_crqs.json': cs2Past2025Crqs as any[],
  'cs2_2024_past_mcqs.json': cs2Past2024Mcqs as any[],
  'cs2_2024_past_crqs.json': cs2Past2024Crqs as any[],
  'cs2_2023_past_mcqs.json': cs2Past2023Mcqs as any[],
  'cs2_2023_past_crqs.json': cs2Past2023Crqs as any[],
  'cs2_2022_past_mcqs.json': cs2Past2022Mcqs as any[],
  'cs2_2019_past_mcqs.json': cs2Past2019Mcqs as any[],
  'cs2_2019_past_crqs.json': cs2Past2019Crqs as any[],
  'cs2_2018_past_crqs.json': cs2Past2018Crqs as any[],
  'cs2_2017_past_mcqs.json': cs2Past2017Mcqs as any[],
  'cs2_2017_past_crqs.json': cs2Past2017Crqs as any[],
  'chem1_model_mcqs.json': chem1ModelMcqs as any[],
  'chem1_model_crqs.json': chem1ModelCrqs as any[],
  'chem2_model_mcqs.json': chem2ModelMcqs as any[],
  'chem2_model_crqs.json': chem2ModelCrqs as any[],
  'chem1_2025_past_mcqs.json': chem1Past2025Mcqs as any[],
  'chem1_2025_past_crqs.json': chem1Past2025Crqs as any[],
  'chem1_2024_past_mcqs.json': chem1Past2024Mcqs as any[],
  'chem1_2024_past_crqs.json': chem1Past2024Crqs as any[],
  'chem1_2023_past_mcqs.json': chem1Past2023Mcqs as any[],
  'chem1_2023_past_crqs.json': chem1Past2023Crqs as any[],
  'chem1_2022_past_mcqs.json': chem1Past2022Mcqs as any[],
  'chem1_2021_past_mcqs.json': chem1Past2021Mcqs as any[],
  'chem1_2019_past_mcqs.json': chem1Past2019Mcqs as any[],
  'chem1_2019_past_crqs.json': chem1Past2019Crqs as any[],
  'chem1_2018_past_mcqs.json': chem1Past2018Mcqs as any[],
  'chem1_2018_past_crqs.json': chem1Past2018Crqs as any[],
  'chem1_2017_past_mcqs.json': chem1Past2017Mcqs as any[],
  'chem1_2017_past_crqs.json': chem1Past2017Crqs as any[],
  'chem2_2025_past_mcqs.json': chem2Past2025Mcqs as any[],
  'chem2_2025_past_crqs.json': chem2Past2025Crqs as any[],
  'chem2_2024_past_mcqs.json': chem2Past2024Mcqs as any[],
  'chem2_2024_past_crqs.json': chem2Past2024Crqs as any[],
  'chem2_2023_past_mcqs.json': chem2Past2023Mcqs as any[],
  'chem2_2023_past_crqs.json': chem2Past2023Crqs as any[],
  'mth1_model_mcqs.json': mth1ModelMcqs as any[],
  'mth1_model_crqs.json': mth1ModelCrqs as any[],
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

const STANDARD_PAPER_CACHE = new Map<string, PaperData>();
let uploadedPapersCache: { data: any[]; expiresAt: number } | null = null;

export function getUploadedPapers(): any[] {
  if (!process.env.VITEST && uploadedPapersCache && uploadedPapersCache.expiresAt > Date.now()) {
    return uploadedPapersCache.data;
  }
  try {
    const regPath = path.join(process.cwd(), 'data', 'uploaded_past_papers.json');
    if (fs.existsSync(regPath)) {
      const raw = fs.readFileSync(regPath, 'utf8');
      const records: unknown = JSON.parse(raw);
      if (!Array.isArray(records)) return [];
      const filtered = records.filter(p => p && typeof p.paperCode === 'string' && typeof p.title === 'string' &&
        Number.isInteger(p.examYear) && Number.isInteger(p.academicClass?.level) && typeof p.subject?.name === 'string' &&
        typeof p.fileUrl === 'string' && p.fileUrl.startsWith('/') && !p.fileUrl.startsWith('//') &&
        // A model PDF cannot establish the identity of a differently named annual paper.
        (!(p.examSession || '').toLowerCase().includes('annual') || !/model[-_ ]paper/i.test(p.fileUrl)));
      if (!process.env.VITEST) {
        uploadedPapersCache = { data: filtered, expiresAt: Date.now() + 5000 };
      }
      return filtered;
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
  if (!process.env.VITEST && STANDARD_PAPER_CACHE.has(code)) {
    return STANDARD_PAPER_CACHE.get(code)!;
  }
  const bundle = computeFallbackPaper(code);
  const cover = bundle && (sourceMetadata as Record<string, { sourceUrl: string; totalMarks: number; durationMinutes: number; rubricInstruction?: string; markScalingNote?: string }>)[bundle.paperCode];
  const raw = bundle && cover?.sourceUrl === bundle.fileUrl ? { ...bundle, ...cover } : bundle;
  // Preserve source claims for review, but never publish a nonexistent outcome
  // as a current Chemistry mapping. Old SLO references and answers remain intact.
  const computed = raw?.paperCode.startsWith('CHM-') ? {
    ...raw,
    questions: raw.questions.map(q => {
      const meta = q.sourceRegion;
      const review = chemistryReviewedMappings.get(raw.paperCode + ':' + q.questionNumber);
      if (review) {
        if (createHash('sha256').update(q.questionText).digest('hex') !== review.questionSha256) throw new Error(`Chemistry mapping source changed: ${raw.paperCode}/${q.questionNumber}`);
        const first = review.outcomes[0];
        return { ...q,
          topics: first ? [{ topic: { name: first.topic, topicNumber: first.unitNumber } }] : [],
          slos: review.outcomes.map(o => ({ slo: { code: o.code, description: o.description } })),
          sourceRegion: { ...meta,
            proposed_current_slo: review.previousProposedCode,
            current_slo: first?.code || null, current_mapping: review.outcomes,
            mapping_scope: { board: 'AKU-EB', grade: review.grade, subject: 'Chemistry' },
            mapping_status: review.mappingStatus, mapping_reason: review.reason,
            current_syllabus_reviewed: true, syllabus_reviewed: true,
            in_syllabus: !!first && review.grade === raw.academicClass.level,
            out_of_syllabus: !first || review.grade !== raw.academicClass.level,
            slo_text: first?.description || '',
            mapping_review_source_sha256: chemistryMappingReview.syllabus.sha256,
            mapping_review_source_url: chemistryMappingReview.syllabus.url,
          },
        };
      }
      if (!meta.current_slo || chemistryOutcomeCodes.get(meta.mapping_scope?.grade || raw.academicClass.level)?.has(meta.current_slo)) return q;
      return { ...q, slos: [], sourceRegion: { ...meta,
        proposed_current_slo: meta.current_slo,
        proposed_current_mapping: meta.current_mapping,
        current_slo: null, current_mapping: [],
        current_syllabus_reviewed: false, syllabus_reviewed: false,
        mapping_status: 'PENDING_REVIEW',
        mapping_reason: 'The proposed SLO code does not exist in the current project syllabus. Semantic remapping is required.',
      } };
    }),
  } : raw;
  if (!process.env.VITEST && computed && computed.questions.length > 0) {
    STANDARD_PAPER_CACHE.set(code, computed);
  }
  return computed;
}

type PaperSpec = {
  paperCode: string;
  level: 9 | 10;
  examYear: number;
  examSession: string;
  examType: 'ANNUAL' | 'MODEL_EXAM';
  title: string;
  fileUrl: string;
  totalMarks: number;
  durationMinutes: number;
  subjectName?: string;
  subjectCode?: string;
  mcqKey?: string;
  crqKey?: string;
  practical?: boolean;
};

const CHEMISTRY_PAPERS: PaperSpec[] = [
  {
    paperCode: 'CHM-IX-P1',
    level: 9,
    examYear: 2026,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class IX Model Paper I (MCQ)',
    fileUrl: '/materials/ssc/chemistry/ssc-1/chemistry-model-paper-ix-paper-i.pdf',
    totalMarks: 40,
    durationMinutes: 70,
    mcqKey: 'chem1_model_mcqs.json',
  },
  {
    paperCode: 'CHM-IX-P2',
    level: 9,
    examYear: 2026,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class IX Model Paper II (CRQ & ERQ)',
    fileUrl: '/materials/ssc/chemistry/ssc-1/chemistry-model-paper-ix-paper-ii.pdf',
    totalMarks: 25,
    durationMinutes: 110,
    crqKey: 'chem1_model_crqs.json',
  },
  {
    paperCode: 'CHM-IX-P3',
    level: 9,
    examYear: 2026,
    examSession: 'Model Examination',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class IX Model Paper III (Practical)',
    fileUrl: '/materials/ssc/chemistry/ssc-1/chemistry-practical-model-paper-ix.pdf',
    totalMarks: 10,
    durationMinutes: 60,
    practical: true,
  },
  {
    paperCode: 'CHM-X-P1',
    level: 10,
    examYear: 2027,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class X Model Paper I (MCQ)',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-model-paper-x-paper-i.pdf',
    totalMarks: 40,
    durationMinutes: 70,
    mcqKey: 'chem2_model_mcqs.json',
  },
  {
    paperCode: 'CHM-X-P2',
    level: 10,
    examYear: 2027,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class X Model Paper II (CRQ & ERQ)',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-model-paper-x-paper-ii.pdf',
    totalMarks: 25,
    durationMinutes: 110,
    crqKey: 'chem2_model_crqs.json',
  },
  {
    paperCode: 'CHM-X-P3',
    level: 10,
    examYear: 2027,
    examSession: 'Model Examination',
    examType: 'MODEL_EXAM',
    title: 'Chemistry Class X Model Paper III (Practical)',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-practical-model-paper-x.pdf',
    totalMarks: 10,
    durationMinutes: 60,
    practical: true,
  },
  ...[
    [2025, 40, 50, 25, 100, true],
    [2024, 40, 70, 25, 110, true],
    [2023, 40, 70, 25, 110, true],
    [2022, 50, 100, 0, 0, false],
    [2021, 50, 100, 0, 0, false],
    [2019, 30, 45, 35, 135, true],
    [2018, 25, 35, 40, 145, true],
    [2017, 25, 35, 40, 145, true],
  ].flatMap(([year, p1Marks, p1Minutes, p2Marks, p2Minutes, hasP2]) => {
    const y = year as number;
    const base: PaperSpec = {
      paperCode: `CHM-IX-${y}-P1`,
      level: 9,
      examYear: y,
      examSession: `Annual Examination ${y}`,
      examType: 'ANNUAL',
      title:
        y === 2022 || y === 2021
          ? `Chemistry SSC-I ${y} Annual Examination Paper I (Theory & ATP)`
          : `Chemistry SSC-I ${y} Annual Examination Paper I`,
      fileUrl: `/materials/ssc/chemistry/ssc-1/chemistry-ix-${y}-paper-i.pdf`,
      totalMarks: p1Marks as number,
      durationMinutes: p1Minutes as number,
      mcqKey: `chem1_${y}_past_mcqs.json`,
    };
    if (!hasP2) return [base];
    return [
      base,
      {
        paperCode: `CHM-IX-${y}-P2`,
        level: 9 as const,
        examYear: y,
        examSession: `Annual Examination ${y}`,
        examType: 'ANNUAL' as const,
        title: `Chemistry SSC-I ${y} Annual Examination Paper II`,
        fileUrl: `/materials/ssc/chemistry/ssc-1/chemistry-ix-${y}-paper-ii.pdf`,
        totalMarks: p2Marks as number,
        durationMinutes: p2Minutes as number,
        crqKey: `chem1_${y}_past_crqs.json`,
      },
    ];
  }),
  {
    paperCode: 'CHM-X-2025-P1',
    level: 10,
    examYear: 2025,
    examSession: 'Annual Examination 2025',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2025 Annual Examination Paper I',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2025-paper-i.pdf',
    totalMarks: 40,
    durationMinutes: 70,
    mcqKey: 'chem2_2025_past_mcqs.json',
  },
  {
    paperCode: 'CHM-X-2025-P2',
    level: 10,
    examYear: 2025,
    examSession: 'Annual Examination 2025',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2025 Annual Examination Paper II',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2025-paper-ii.pdf',
    totalMarks: 25,
    durationMinutes: 110,
    crqKey: 'chem2_2025_past_crqs.json',
  },
  {
    paperCode: 'CHM-X-2024-P1',
    level: 10,
    examYear: 2024,
    examSession: 'Annual Examination 2024',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2024 Annual Examination Paper I',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2024-paper-i.pdf',
    totalMarks: 40,
    durationMinutes: 70,
    mcqKey: 'chem2_2024_past_mcqs.json',
  },
  {
    paperCode: 'CHM-X-2024-P2',
    level: 10,
    examYear: 2024,
    examSession: 'Annual Examination 2024',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2024 Annual Examination Paper II',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2024-paper-ii.pdf',
    totalMarks: 25,
    durationMinutes: 110,
    crqKey: 'chem2_2024_past_crqs.json',
  },
  {
    paperCode: 'CHM-X-2023-P1',
    level: 10,
    examYear: 2023,
    examSession: 'Annual Examination 2023',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2023 Annual Examination Paper I',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2023-paper-i.pdf',
    totalMarks: 40,
    durationMinutes: 70,
    mcqKey: 'chem2_2023_past_mcqs.json',
  },
  {
    paperCode: 'CHM-X-2023-P2',
    level: 10,
    examYear: 2023,
    examSession: 'Annual Examination 2023',
    examType: 'ANNUAL',
    title: 'Chemistry SSC-II 2023 Annual Examination Paper II',
    fileUrl: '/materials/ssc/chemistry/ssc-2/chemistry-x-2023-paper-ii.pdf',
    totalMarks: 25,
    durationMinutes: 110,
    crqKey: 'chem2_2023_past_crqs.json',
  },
];

const MATHEMATICS_PAPERS: PaperSpec[] = [
  {
    paperCode: 'MTH-IX-P1',
    level: 9,
    examYear: 2027,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Mathematics Class IX Model Paper I (MCQ)',
    fileUrl: '/materials/ssc/mathematics/ssc-1/mathematics-science-group-model-paper-ix-paper-i.pdf',
    totalMarks: 45,
    durationMinutes: 80,
    subjectName: 'Mathematics',
    subjectCode: 'MTH',
    mcqKey: 'mth1_model_mcqs.json',
  },
  {
    paperCode: 'MTH-IX-P2',
    level: 9,
    examYear: 2027,
    examSession: 'MODEL_PAPER',
    examType: 'MODEL_EXAM',
    title: 'Mathematics Class IX Model Paper II (CRQ & ERQ)',
    fileUrl: '/materials/ssc/mathematics/ssc-1/mathematics-science-group-model-paper-ix-paper-ii.pdf',
    totalMarks: 30,
    durationMinutes: 100,
    subjectName: 'Mathematics',
    subjectCode: 'MTH',
    crqKey: 'mth1_model_crqs.json',
  },
];

function chemistryQuestion(
  spec: PaperSpec,
  item: any,
  isMcq: boolean,
): QuestionData {
  const qNum = String(item.questionNumber ?? item.questionNo ?? '');
  const subjectName = spec.subjectName || 'Chemistry';
  const unitName = item.unitName || item.chapter || `${subjectName} (Class ${spec.level === 9 ? 'IX' : 'X'})`;
  const diagramUrl: string | undefined =
    item.diagramUrl ||
    resolveQuestionDiagram(spec.paperCode, qNum, item) ||
    undefined;
  const sloCode = isMcq
    ? item.current_slo || item.slo || item.currentSlo || ''
    : item.currentSlo || item.current_slo || item.originalSlo || item.slo || '';
  const sloText =
    item.sloText ||
    item.current_mapping?.[0]?.description ||
    '';

  if (isMcq) {
    return {
      id: `${spec.paperCode.toLowerCase()}-q${qNum}`.replace(/[^a-z0-9-]/g, ''),
      questionNumber: qNum,
      questionText: item.stem || item.questionText || '',
      questionType: 'MULTIPLE_CHOICE',
      marks: item.marks || 1,
      difficulty: item.cognitiveLevel || item.cognitive_level || 'Understanding',
      isDiagram: Boolean(diagramUrl || item.isDiagram || item.diagramBased),
      diagramBased: Boolean(diagramUrl || item.diagramBased),
      sourceRegion: {
        choices: item.options || {},
        correct_answer: item.correctOption || item.correctAnswer || 'A',
        explanation: item.explanation || '',
        option_feedback: item.option_feedback || item.optionFeedback || [],
        slo: item.slo || sloCode,
        current_slo: sloCode || null,
        slo_text: sloText,
        cognitive_level: item.cognitiveLevel || item.cognitive_level || 'Understanding',
        in_syllabus: true,
        out_of_syllabus: false,
        syllabus_reviewed: true,
        current_syllabus_reviewed: true,
        mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: spec.level, subject: subjectName },
        current_mapping: item.current_mapping || [],
        isDiagram: Boolean(diagramUrl || item.isDiagram || item.diagramBased),
        diagramBased: Boolean(diagramUrl || item.diagramBased),
        diagramUrl,
        pageNumber: item.pageNumber,
      },
      topics: [{ topic: { name: unitName, topicNumber: item.unitNumber || 1 } }],
      slos: sloCode ? [{ slo: { code: sloCode, description: sloText || unitName } }] : [],
    };
  }

  const section = String(item.section || '');
  const isErq = /ERQ|Extended/i.test(section) || (item.marks || 0) >= 5;
  const suggestions = item.suggestions
    ? Array.isArray(item.suggestions)
      ? item.suggestions.join('\n')
      : item.suggestions
    : '';

  return {
    id: `${spec.paperCode.toLowerCase()}-q${qNum}`.replace(/[^a-z0-9-]/g, ''),
    questionNumber: qNum,
    questionText: item.questionText || item.stem || '',
    questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    marks: item.marks || (isErq ? 6 : 3),
    difficulty: item.cognitiveLevel || 'Understanding',
    isDiagram: Boolean(diagramUrl || item.isDiagram || item.diagramBased),
    diagramBased: Boolean(diagramUrl || item.diagramBased),
    sourceRegion: {
      rubric: item.rubric || [],
      model_answer: item.modelAnswer || item.model_answer || '',
      better_response: item.betterResponse || '',
      weaker_response: item.weakerResponse || '',
      overall_performance: item.overallPerformance || '',
      better_response_image: item.betterResponseImage || null,
      weaker_response_image: item.weakerResponseImage || null,
      suggestions,
      slo: item.originalSlo || item.slo || sloCode,
      current_slo: sloCode || null,
      slo_text: sloText,
      cognitive_level: item.cognitiveLevel || 'Understanding',
      in_syllabus: true,
      out_of_syllabus: false,
      syllabus_reviewed: true,
      current_syllabus_reviewed: true,
      mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: spec.level, subject: subjectName },
      current_mapping: item.current_mapping || [],
      isDiagram: Boolean(diagramUrl || item.isDiagram || item.diagramBased),
      diagramBased: Boolean(diagramUrl || item.diagramBased),
      diagramUrl,
      pageNumber: item.pageNumber,
    },
    topics: [{ topic: { name: unitName, topicNumber: item.unitNumber || 1 } }],
    slos: sloCode ? [{ slo: { code: sloCode, description: sloText || unitName } }] : [],
  };
}

function computeSpecPaper(code: string): PaperData | null {
  const spec = [...CHEMISTRY_PAPERS, ...MATHEMATICS_PAPERS].find((p) => p.paperCode === code);
  if (!spec) return null;
  const subjectName = spec.subjectName || 'Chemistry';
  const subjectCode = spec.subjectCode || 'CHM';
  const questions: QuestionData[] = [];
  if (spec.mcqKey) {
    for (const item of loadJsonFile(spec.mcqKey)) {
      questions.push(chemistryQuestion(spec, item, true));
    }
  }
  if (spec.crqKey) {
    for (const item of loadJsonFile(spec.crqKey)) {
      questions.push(chemistryQuestion(spec, item, false));
    }
  }
  return {
    id: spec.paperCode,
    paperCode: spec.paperCode,
    title: spec.title,
    examYear: spec.examYear,
    examSession: spec.examSession,
    examType: spec.examType,
    totalMarks: spec.totalMarks,
    durationMinutes: spec.durationMinutes,
    fileUrl: spec.fileUrl,
    academicClass: {
      name: spec.level === 9 ? 'Class IX' : 'Class X',
      level: spec.level,
    },
    subject: {
      id: `${subjectCode.toLowerCase()}-${spec.level === 9 ? 'ix' : 'x'}`,
      name: subjectName,
      code: subjectCode,
    },
    questions,
  };
}

function computeFallbackPaper(code: string): PaperData | null {
  const hssc = [...hsscPhysicsPapers, ...hsscXiAnnualPapers].find(paper => paper.paperCode === code);
  if (hssc) return hssc;
  const mathematics = reviewedMathematicsPapers.find(paper => paper.paperCode === code);
  if (mathematics) return mathematics;
  const specPaper = computeSpecPaper(code);
  if (specPaper) return specPaper;

  // Computer Science Class X Model Paper I (MCQ) - 2027 & Onwards
  if (
    code === 'CS-X-P1' ||
    code === 'CSC-X-P1' ||
    code === 'CS-SSC2-P1' ||
    code === 'CS-MODEL-X-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_model_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      return {
        id: `cs-x-model-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: false,
        diagramBased: false,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || item.slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: true,
          out_of_syllabus: false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          isDiagram: false,
          diagramBased: false,
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-model-p1',
      paperCode: 'CS-X-P1',
      title: 'Computer Science Class X Model Paper I (MCQ)',
      examYear: 2027,
      examSession: 'MODEL_PAPER',
      examType: 'MODEL_EXAM',
      totalMarks: 40,
      durationMinutes: 70,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-model-paper-x-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science Class X Model Paper II (CRQ & ERQ) - 2027 & Onwards
  if (
    code === 'CS-X-P2' ||
    code === 'CSC-X-P2' ||
    code === 'CS-SSC2-P2' ||
    code === 'CS-MODEL-X-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_model_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      return {
        id: `cs-x-model-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 6 : 3),
        difficulty: item.cognitiveLevel || 'Application',
        isDiagram: false,
        diagramBased: false,
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || item.slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Application',
          in_syllabus: true,
          out_of_syllabus: false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          isDiagram: false,
          diagramBased: false,
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-model-p2',
      paperCode: 'CS-X-P2',
      title: 'Computer Science Class X Model Paper II (CRQ & ERQ)',
      examYear: 2027,
      examSession: 'MODEL_PAPER',
      examType: 'MODEL_EXAM',
      totalMarks: 25,
      durationMinutes: 110,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-model-paper-x-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2017 Annual Examination Paper I (25 MCQs)
  if (
    code === 'CS-X-2017-P1' ||
    code === 'CSC-X-2017-P1' ||
    code === 'CS-SSC2-2017-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2017_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2017-P1', qNum, item);
      return {
        id: `cs-x-2017-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2017-key',
          ...(item.answer_review_note ? { answer_review_note: item.answer_review_note } : {}),
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2017-p1',
      paperCode: 'CS-X-2017-P1',
      title: 'Computer Science SSC-II 2017 Annual Examination Paper I (MCQ)',
      examYear: 2017,
      examSession: 'ANNUAL_APRIL_MAY',
      examType: 'ANNUAL',
      totalMarks: 25,
      durationMinutes: 35,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2017-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2017 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2017-P2' ||
    code === 'CSC-X-2017-P2' ||
    code === 'CS-SSC2-2017-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2017_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2017-P2', qNum, item);
      return {
        id: `cs-x-2017-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 8 : 4),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2017-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2017-p2',
      paperCode: 'CS-X-2017-P2',
      title: 'Computer Science SSC-II 2017 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2017,
      examSession: 'ANNUAL_APRIL_MAY',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 145,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2017-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2018 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2018-P2' ||
    code === 'CSC-X-2018-P2' ||
    code === 'CS-SSC2-2018-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2018_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2018-P2', qNum, item);
      return {
        id: `cs-x-2018-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 8 : 4),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2018-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2018-p2',
      paperCode: 'CS-X-2018-P2',
      title: 'Computer Science SSC-II 2018 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2018,
      examSession: 'ANNUAL_APRIL_MAY',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 145,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2018-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2019 Annual Examination Paper I (25 MCQs)
  if (
    code === 'CS-X-2019-P1' ||
    code === 'CSC-X-2019-P1' ||
    code === 'CS-SSC2-2019-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2019_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2019-P1', qNum, item);
      return {
        id: `cs-x-2019-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2019-key',
          ...(item.answer_review_note ? { answer_review_note: item.answer_review_note } : {}),
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2019-p1',
      paperCode: 'CS-X-2019-P1',
      title: 'Computer Science SSC-II 2019 Annual Examination Paper I (MCQ)',
      examYear: 2019,
      examSession: 'ANNUAL_APRIL_MAY',
      examType: 'ANNUAL',
      totalMarks: 25,
      durationMinutes: 40,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2019-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2019 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2019-P2' ||
    code === 'CSC-X-2019-P2' ||
    code === 'CS-SSC2-2019-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2019_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2019-P2', qNum, item);
      return {
        id: `cs-x-2019-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 8 : 4),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2019-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2019-p2',
      paperCode: 'CS-X-2019-P2',
      title: 'Computer Science SSC-II 2019 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2019,
      examSession: 'ANNUAL_APRIL_MAY',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 140,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2019-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2022 Annual Examination Paper I (50 MCQs: 40 Theory + 10 ATP)
  if (
    code === 'CS-X-2022-P1' ||
    code === 'CSC-X-2022-P1' ||
    code === 'CS-SSC2-2022-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2022_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2022-P1', qNum, item);
      return {
        id: `cs-x-2022-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2022-key',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2022-p1',
      paperCode: 'CS-X-2022-P1',
      title: 'Computer Science SSC-II 2022 Annual Examination Paper I (40 Theory + 10 ATP MCQs)',
      examYear: 2022,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 50,
      durationMinutes: 100,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2022-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2023 Annual Examination Paper I (40 MCQs)
  if (
    code === 'CS-X-2023-P1' ||
    code === 'CSC-X-2023-P1' ||
    code === 'CS-SSC2-2023-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2023_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2023-P1', qNum, item);
      return {
        id: `cs-x-2023-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2023-key',
          ...(item.answer_review_note ? { answer_review_note: item.answer_review_note } : {}),
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2023-p1',
      paperCode: 'CS-X-2023-P1',
      title: 'Computer Science SSC-II 2023 Annual Examination Paper I (MCQ)',
      examYear: 2023,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 70,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2023-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2023 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2023-P2' ||
    code === 'CSC-X-2023-P2' ||
    code === 'CS-SSC2-2023-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2023_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2023-P2', qNum, item);
      return {
        id: `cs-x-2023-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 6 : 3),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2023-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2023-p2',
      paperCode: 'CS-X-2023-P2',
      title: 'Computer Science SSC-II 2023 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2023,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 25,
      durationMinutes: 110,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2023-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2024 Annual Examination Paper I (40 MCQs)
  if (
    code === 'CS-X-2024-P1' ||
    code === 'CSC-X-2024-P1' ||
    code === 'CS-SSC2-2024-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2024_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2024-P1', qNum, item);
      return {
        id: `cs-x-2024-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2024-key',
          ...(item.answer_review_note ? { answer_review_note: item.answer_review_note } : {}),
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2024-p1',
      paperCode: 'CS-X-2024-P1',
      title: 'Computer Science SSC-II 2024 Annual Examination Paper I (MCQ)',
      examYear: 2024,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 70,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2024-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2024 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2024-P2' ||
    code === 'CSC-X-2024-P2' ||
    code === 'CS-SSC2-2024-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2024_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2024-P2', qNum, item);
      return {
        id: `cs-x-2024-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 6 : 3),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2024-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2024-p2',
      paperCode: 'CS-X-2024-P2',
      title: 'Computer Science SSC-II 2024 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2024,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 25,
      durationMinutes: 110,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2024-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2025 Annual Examination Paper I (40 MCQs)
  if (
    code === 'CS-X-2025-P1' ||
    code === 'CSC-X-2025-P1' ||
    code === 'CS-SSC2-2025-P1'
  ) {
    const rawMcqs = loadJsonFile('cs2_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2025-P1', qNum, item);
      return {
        id: `cs-x-2025-p1-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem || item.questionText || '',
        questionType: 'MULTIPLE_CHOICE',
        marks: 1,
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || item.correctAnswer || 'A',
          explanation: item.explanation || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: Array.isArray(item.current_mapping)
            ? item.current_mapping
            : item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2025-key',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2025-p1',
      paperCode: 'CS-X-2025-P1',
      title: 'Computer Science SSC-II 2025 Annual Examination Paper I (MCQ)',
      examYear: 2025,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 40,
      durationMinutes: 70,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2025-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-II 2025 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-X-2025-P2' ||
    code === 'CSC-X-2025-P2' ||
    code === 'CS-SSC2-2025-P2'
  ) {
    const rawCrqs = loadJsonFile('cs2_2025_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any) => {
      const qNum = String(item.questionNumber);
      const isErq = item.questionType === 'ERQ';
      const topicName = item.unitName || item.chapter || 'Computer Science (Class X)';
      const diagramUrl = resolveQuestionDiagram('CS-X-2025-P2', qNum, item);
      return {
        id: `cs-x-2025-p2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.questionText || '',
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || (isErq ? 6 : 3),
        difficulty: item.cognitiveLevel || 'Understanding',
        isDiagram: Boolean(item.diagramBased || diagramUrl),
        diagramBased: Boolean(item.diagramBased || diagramUrl),
        sourceRegion: {
          correct_answer: item.modelAnswer || '',
          model_answer: item.modelAnswer || '',
          explanation: item.markingScheme || '',
          slo: item.slo || '',
          current_slo: item.current_slo || null,
          slo_text: item.sloText || '',
          original_slo_text: item.originalSloText || '',
          cognitive_level: item.cognitiveLevel || 'Understanding',
          in_syllabus: item.in_syllabus !== false,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Computer Science' },
          current_mapping: item.current_slo
            ? [{ code: item.current_slo, description: item.sloText || '', topic: topicName }]
            : [],
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-x-2025-emarking',
          overall_performance: item.overallPerformance || '',
          better_response: item.better_response || '',
          weaker_response: item.weaker_response || '',
          better_response_image: item.better_response_image || null,
          weaker_response_image: item.weaker_response_image || null,
          suggestions: item.suggestions || '',
          isDiagram: Boolean(item.diagramBased || diagramUrl),
          diagramBased: Boolean(item.diagramBased || diagramUrl),
          ...(diagramUrl ? { diagramUrl } : {}),
        },
        topics: [{ topic: { name: topicName, topicNumber: item.unitNumber || 10 } }],
        slos: (item.current_slo || item.slo) ? [{ slo: { code: item.current_slo || item.slo, description: item.sloText || topicName } }] : [],
      };
    });

    return {
      id: 'fallback-cs-x-2025-p2',
      paperCode: 'CS-X-2025-P2',
      title: 'Computer Science SSC-II 2025 Annual Examination Paper II (CRQ & ERQ)',
      examYear: 2025,
      examSession: 'ANNUAL_MAY_JUNE',
      examType: 'ANNUAL',
      totalMarks: 25,
      durationMinutes: 110,
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2025-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: 'computer-science-x', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2017 Annual Examination Paper I (25 MCQs)
  if (
    code === 'CS-IX-2017-P1' ||
    code === 'CSC-IX-2017-P1' ||
    (code.startsWith('CS') && code.includes('2017') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2017_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2017-p1-q${qNum}`,
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
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2017-key',
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
      id: 'CS-IX-2017-P1',
      title: 'Computer Science SSC-I 2017 Annual Examination Paper I (MCQ)',
      paperCode: 'CS-IX-2017-P1',
      examYear: 2017,
      examSession: 'Annual Examination 2017',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2017-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2017 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2017-P2' ||
    code === 'CSC-IX-2017-P2' ||
    (code.startsWith('CS') && code.includes('2017') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2017_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 7;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2017-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 4,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2017-emarking',
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
      id: 'CS-IX-2017-P2',
      title: 'Computer Science SSC-I 2017 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2017-P2',
      examYear: 2017,
      examSession: 'Annual Examination 2017',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2017-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2018 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2018-P2' ||
    code === 'CSC-IX-2018-P2' ||
    (code.startsWith('CS') && code.includes('2018') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2018_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 7;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2018-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 4,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2018-emarking',
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
      id: 'CS-IX-2018-P2',
      title: 'Computer Science SSC-I 2018 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2018-P2',
      examYear: 2018,
      examSession: 'Annual Examination 2018',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2018-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2019 Annual Examination Paper I (25 MCQs)
  if (
    code === 'CS-IX-2019-P1' ||
    code === 'CSC-IX-2019-P1' ||
    (code.startsWith('CS') && code.includes('2019') && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('cs1_2019_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || undefined;
      return {
        id: `cs-ix-2019-p1-q${qNum}`,
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
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: effectiveSlo,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2019-key',
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
      id: 'CS-IX-2019-P1',
      title: 'Computer Science SSC-I 2019 Annual Examination Paper I (MCQ)',
      paperCode: 'CS-IX-2019-P1',
      examYear: 2019,
      examSession: 'Annual Examination 2019',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2019-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

  // Computer Science SSC-I 2019 Annual Examination Paper II (CRQ & ERQ)
  if (
    code === 'CS-IX-2019-P2' ||
    code === 'CSC-IX-2019-P2' ||
    (code.startsWith('CS') && code.includes('2019') && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('cs1_2019_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `Q.${idx + 1}`;
      const isErq = (item.marks || 2) >= 7;
      const topicName = item.unitName || item.chapter || 'Computer Science (Class IX)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '1';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      return {
        id: `cs-ix-2019-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 4,
        difficulty: item.cognitiveLevel || 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          better_response: item.betterResponse || undefined,
          weaker_response: item.weakerResponse || undefined,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: Boolean(item.out_of_syllabus),
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
          mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Computer Science' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          slo: item.slo || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/computer-science-ix-2019-emarking',
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
      id: 'CS-IX-2019-P2',
      title: 'Computer Science SSC-I 2019 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'CS-IX-2019-P2',
      examYear: 2019,
      examSession: 'Annual Examination 2019',
      examType: 'ANNUAL',
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2019-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
      questions,
    };
  }

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
          explanation: item.explanation || '',
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
  if (
    code === 'PHY-X-2025-P1' ||
    (code.includes('2025') && !code.includes('IX') && (code.includes('X') || code.includes('10')) && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('ssc2_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      const topicName = item.unitName || item.chapter || 'SSC-II Physics (Class X)';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
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
          explanation: item.explanation || '',
          option_feedback: item.option_feedback || undefined,
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: item.out_of_syllabus ? false : true,
          out_of_syllabus: item.out_of_syllabus || false,
          syllabus_reviewed: true,
          current_syllabus_reviewed: true,
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
  if (
    code === 'PHY-X-2025-P2' ||
    (code.includes('2025') && !code.includes('IX') && (code.includes('X') || code.includes('10')) && (code.includes('P2') || code.includes('PAPER-2') || code.includes('PAPER-II')))
  ) {
    const rawCrqs = loadJsonFile('ssc2_2025_past_crqs.json');
    const questions: QuestionData[] = rawCrqs.map((item: any, idx: number) => {
      const qNum = item.questionNumber || `${idx + 1}`;
      const isErq = item.questionType === 'EXTENDED_RESPONSE' || (item.marks || 3) >= 4;
      const topicName = item.unitName || item.chapter || 'SSC-II Physics Theory';
      const topicNum = item.unitNumber ? String(item.unitNumber) : '11';
      const mappedSloDesc = item.current_mapping?.[0]?.description || item.originalSloText || item.stem;
      const effectiveSlo = item.current_slo || item.slo;
      return {
        id: `phy-x-2025-p2-q${idx + 1}`,
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
          mapping_scope: item.mapping_scope || { board: 'AKU-EB', grade: 10, subject: 'Physics' },
          current_mapping: item.current_mapping || [],
          current_slo: item.current_slo || undefined,
          diagramUrl: item.diagramUrl || undefined,
          pageNumber: item.pageNumber || undefined,
          pageScanUrl: item.pageScanUrl || undefined,
          slo: item.slo || undefined,
          original_slo_text: item.originalSloText || undefined,
          original_reference_verified: true,
          original_reference_source: '/resources/physics-x-2025-emarking',
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
          option_feedback: item.option_feedback || undefined,
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
          option_feedback: item.option_feedback || undefined,
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
    ...[...reviewedMathematicsPapers, ...hsscPhysicsPapers, ...hsscXiAnnualPapers].map(paper => ({
      id: paper.id, paperCode: paper.paperCode, title: paper.title,
      examSession: paper.examSession!, examYear: paper.examYear,
      fileUrl: paper.fileUrl!, academicClass: paper.academicClass,
      subject: { name: paper.subject.name }, _count: { questions: paper.questions.length },
    })),
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
    },
    {
      id: 'CS-IX-2019-P1',
      paperCode: 'CS-IX-2019-P1',
      title: 'Computer Science SSC-I 2019 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2019,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2019-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 25 }
    },
    {
      id: 'CS-IX-2019-P2',
      paperCode: 'CS-IX-2019-P2',
      title: 'Computer Science SSC-I 2019 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2019,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2019-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 7 }
    },
    {
      id: 'CS-IX-2018-P2',
      paperCode: 'CS-IX-2018-P2',
      title: 'Computer Science SSC-I 2018 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2018,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2018-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 7 }
    },
    {
      id: 'CS-IX-2017-P1',
      paperCode: 'CS-IX-2017-P1',
      title: 'Computer Science SSC-I 2017 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2017,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2017-paper-i.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 25 }
    },
    {
      id: 'CS-IX-2017-P2',
      paperCode: 'CS-IX-2017-P2',
      title: 'Computer Science SSC-I 2017 Annual Examination Paper II',
      examSession: 'Annual Examination',
      examYear: 2017,
      fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2017-paper-ii.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Computer Science' },
      _count: { questions: 7 }
    },
    {
      id: 'fallback-cs-x-2025-p1',
      paperCode: 'CS-X-2025-P1',
      title: 'Computer Science SSC-II 2025 Annual Examination Paper I',
      examYear: 2025,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2025-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 },
    },
    {
      id: 'fallback-cs-x-2025-p2',
      paperCode: 'CS-X-2025-P2',
      title: 'Computer Science SSC-II 2025 Annual Examination Paper II',
      examYear: 2025,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2025-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 },
    },
    {
      id: 'fallback-cs-x-2024-p1',
      paperCode: 'CS-X-2024-P1',
      title: 'Computer Science SSC-II 2024 Annual Examination Paper I',
      examYear: 2024,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2024-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 },
    },
    {
      id: 'fallback-cs-x-2024-p2',
      paperCode: 'CS-X-2024-P2',
      title: 'Computer Science SSC-II 2024 Annual Examination Paper II',
      examYear: 2024,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2024-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 },
    },
    {
      id: 'fallback-cs-x-2023-p1',
      paperCode: 'CS-X-2023-P1',
      title: 'Computer Science SSC-II 2023 Annual Examination Paper I',
      examYear: 2023,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2023-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 },
    },
    {
      id: 'fallback-cs-x-2023-p2',
      paperCode: 'CS-X-2023-P2',
      title: 'Computer Science SSC-II 2023 Annual Examination Paper II',
      examYear: 2023,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2023-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 6 },
    },
    {
      id: 'fallback-cs-x-2022-p1',
      paperCode: 'CS-X-2022-P1',
      title: 'Computer Science SSC-II 2022 Annual Examination Paper I (Theory + ATP)',
      examYear: 2022,
      examSession: 'ANNUAL_MAY_JUNE',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2022-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 50 },
    },
    {
      id: 'fallback-cs-x-2019-p1',
      paperCode: 'CS-X-2019-P1',
      title: 'Computer Science SSC-II 2019 Annual Examination Paper I',
      examYear: 2019,
      examSession: 'ANNUAL_APRIL_MAY',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2019-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 25 },
    },
    {
      id: 'fallback-cs-x-2019-p2',
      paperCode: 'CS-X-2019-P2',
      title: 'Computer Science SSC-II 2019 Annual Examination Paper II',
      examYear: 2019,
      examSession: 'ANNUAL_APRIL_MAY',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2019-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 8 },
    },
    {
      id: 'fallback-cs-x-2018-p2',
      paperCode: 'CS-X-2018-P2',
      title: 'Computer Science SSC-II 2018 Annual Examination Paper II',
      examYear: 2018,
      examSession: 'ANNUAL_APRIL_MAY',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2018-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 8 },
    },
    {
      id: 'fallback-cs-x-2017-p1',
      paperCode: 'CS-X-2017-P1',
      title: 'Computer Science SSC-II 2017 Annual Examination Paper I',
      examYear: 2017,
      examSession: 'ANNUAL_APRIL_MAY',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2017-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 25 },
    },
    {
      id: 'fallback-cs-x-2017-p2',
      paperCode: 'CS-X-2017-P2',
      title: 'Computer Science SSC-II 2017 Annual Examination Paper II',
      examYear: 2017,
      examSession: 'ANNUAL_APRIL_MAY',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-x-2017-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 8 },
    },
    {
      id: 'fallback-cs-x-model-p1',
      paperCode: 'CS-X-P1',
      title: 'Computer Science Class X Model Paper I (MCQ)',
      examYear: 2027,
      examSession: 'MODEL_PAPER',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-model-paper-x-paper-i.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 40 },
    },
    {
      id: 'fallback-cs-x-model-p2',
      paperCode: 'CS-X-P2',
      title: 'Computer Science Class X Model Paper II (CRQ & ERQ)',
      examYear: 2027,
      examSession: 'MODEL_PAPER',
      fileUrl: '/materials/ssc/computer-science/ssc-2/computer-science-model-paper-x-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Computer Science' },
      _count: { questions: 7 },
    },
    ...CHEMISTRY_PAPERS.map((p) => ({
      id: p.paperCode,
      paperCode: p.paperCode,
      title: p.title,
      examSession: p.examSession,
      examYear: p.examYear,
      fileUrl: p.fileUrl,
      academicClass: {
        name: p.level === 9 ? 'Class IX' : 'Class X',
        level: p.level,
      },
      subject: { name: p.subjectName || 'Chemistry' },
      _count: { questions: 0 },
    })),
    ...MATHEMATICS_PAPERS.map((p) => ({
      id: p.paperCode,
      paperCode: p.paperCode,
      title: p.title,
      examSession: p.examSession,
      examYear: p.examYear,
      fileUrl: p.fileUrl,
      academicClass: {
        name: p.level === 9 ? 'Class IX' : 'Class X',
        level: p.level,
      },
      subject: { name: p.subjectName || 'Mathematics' },
      _count: { questions: 0 },
    })),
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
