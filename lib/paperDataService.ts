import fs from 'fs';
import path from 'path';

import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc1ModelCrqs from '@/data/physics/ssc1_model_crqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';
import ssc2ModelCrqs from '@/data/physics/ssc2_model_crqs.json';
import ssc1Past2025Mcqs from '@/data/physics/ssc1_2025_past_mcqs.json';
import ssc1Past2025Crqs from '@/data/physics/ssc1_2025_past_crqs.json';
import physicsChap12Mcqs from '@/data/physics/physics_chap1_2_past_mcqs.json';

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
    rubric?: Array<{ marks: number; description: string }>;
    model_answer?: string;
    in_syllabus?: boolean;
    cognitive_level?: string;
    is_numerical?: boolean;
    slo?: string;
    diagramUrl?: string;
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
  'physics_chap1_2_past_mcqs.json': physicsChap12Mcqs as any[],
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
  if (code.includes('2024') || code.startsWith('PHY-X-2025')) {
    const uploaded = findUploadedPaper(code);
    return uploaded ? uploadedPaper(uploaded) : null;
  }

  // 0. Class IX Physics Chapters 1 & 2 Past Papers (2014-2024 Past MCQs)
  if (
    code === 'PHY-IX-CHAP1-2' ||
    code === 'PHYSICS-CHAP-1-AND-2-PAST-PAPERS' ||
    code === 'SAMPLE-QUIZ-PHY-CHAP-1-2' ||
    code.includes('CHAP1-2') ||
    (code.includes('CHAP') && (code.includes('1') && code.includes('2')))
  ) {
    const rawMcqs = loadJsonFile('physics_chap1_2_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
      return {
        id: `phy-ix-chap1-2-q${qNum}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: 'MULTIPLE_CHOICE',
        marks: item.marks || 1,
        difficulty: item.cognitiveLevel ? item.cognitiveLevel.charAt(0) : 'U',
        diagramBased: !!item.isDiagram,
        sourceRegion: {
          choices: item.options || {},
          correct_answer: item.correctOption || 'A',
          explanation: item.explanation || 'Official AKU-EB examination answer key and derivation.',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: false,
          diagramUrl: item.diagramUrl,
          slo: item.slo || undefined,
          slo_details: {
            description: item.stem,
            topic_name: item.chapter || 'SSC-I Physics (Class IX)'
          }
        },
        topics: [{ topic: { name: item.chapter || 'SSC-I Physics', topicNumber: '1' } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: item.stem } }] : []
      };
    });

    return {
      id: 'PHY-IX-CHAP1-2',
      title: 'Physics SSC-I Chapters 1 & 2 Past Papers (2014–2024 MCQs)',
      paperCode: 'PHY-IX-CHAP1-2',
      examYear: 2024,
      examSession: 'Past Papers 2014–2024 Archive',
      examType: 'ANNUAL',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'physics-ix', name: 'Physics', code: 'PHY' },
      questions
    };
  }

  // 1. 2025 Annual Past Paper 1 (Class IX) - Authentic Board MCQs
  if (
    code === 'PHY-IX-2025-P1' ||
    (code.includes('2025') && (code.includes('IX') || code.includes('9')) && (code.includes('P1') || code.includes('PAPER-1') || code.includes('PAPER-I')))
  ) {
    const rawMcqs = loadJsonFile('ssc1_2025_past_mcqs.json');
    const questions: QuestionData[] = rawMcqs.map((item: any, idx: number) => {
      const qNum = (item.questionNumber || idx + 1).toString();
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
          correct_answer: item.correctOption || 'A',
          explanation: item.explanation || 'Official AKU-EB examination answer key.',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: false,
          diagramUrl: item.diagramUrl,
          slo: item.slo || undefined,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics (Class IX)'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics', topicNumber: '1' } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: item.stem } }] : []
      };
    });

    return {
      id: 'PHY-IX-2025-P1',
      title: 'Physics SSC-I 2025 Annual Examination Paper I (MCQ)',
      paperCode: 'PHY-IX-2025-P1',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/uploads/past_paper_auto_1791881747833_Physics-IX-Paper-I-2025.pdf',
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
          in_syllabus: false,
          diagramUrl: item.diagramUrl,
          slo: item.slo || undefined,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics Theory'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics Theory', topicNumber: '2' } }],
        slos: item.slo ? [{ slo: { code: item.slo, description: item.stem } }] : []
      };
    });

    return {
      id: 'PHY-IX-2025-P2',
      title: 'Physics SSC-I 2025 Annual Examination Paper II (CRQ & ERQ)',
      paperCode: 'PHY-IX-2025-P2',
      examYear: 2025,
      examSession: 'Annual Examination 2025',
      examType: 'ANNUAL',
      fileUrl: '/uploads/past_paper_Class_IX_1791885389646_Physics-IX-Paper-II-2025.pdf',
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
          correct_answer: item.correctOption || 'A',
          explanation: item.explanation || '',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: false,
          slo: undefined,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics (Class IX)'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics', topicNumber: '1' } }],
        slos: []
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
      return {
        id: `phy-ix-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: 'A',
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          in_syllabus: false,
          slo: undefined,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics Theory'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics Theory', topicNumber: '2' } }],
        slos: []
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
          correct_answer: item.correctOption || 'A',
          explanation: item.explanation || '',
          cognitive_level: item.cognitiveLevel,
          is_numerical: item.isNumerical,
          in_syllabus: false,
          slo: `10.${qNum}`,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-II Physics (Class X)'
          }
        },
        topics: [{ topic: { name: 'SSC-II Physics', topicNumber: '10' } }],
        slos: [{ slo: { code: `10.${qNum}`, description: item.stem } }]
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
      return {
        id: `phy-x-p2-q${idx + 1}`,
        questionNumber: qNum,
        questionText: item.stem,
        questionType: isErq ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
        marks: item.marks || 2,
        difficulty: 'A',
        sourceRegion: {
          rubric: item.rubric || [],
          model_answer: item.modelAnswer || '',
          explanation: item.modelAnswer || '',
          in_syllabus: false,
          slo: `10.${idx + 1}`,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-II Physics Theory'
          }
        },
        topics: [{ topic: { name: 'SSC-II Physics Theory', topicNumber: '10' } }],
        slos: [{ slo: { code: `10.${idx + 1}`, description: item.stem } }]
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
      _count: { questions: 9 }
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
      _count: { questions: 9 }
    },
    // 2025 Annual Examination Papers (Genuine verified board papers)
    {
      id: 'PHY-IX-2025-P1',
      paperCode: 'PHY-IX-2025-P1',
      title: 'Physics SSC-I 2025 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/uploads/past_paper_auto_1791881747833_Physics-IX-Paper-I-2025.pdf',
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
      fileUrl: '/uploads/past_paper_Class_IX_1791885389646_Physics-IX-Paper-II-2025.pdf',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 11 }
    },
    // Past Papers Compilation: Chapters 1 & 2 (2014-2024)
    {
      id: 'PHY-IX-CHAP1-2',
      paperCode: 'PHY-IX-CHAP1-2',
      title: 'Physics SSC-I Chapters 1 & 2 Past Papers (2014–2024 MCQs)',
      examSession: 'Past Papers 2014–2024 Archive',
      examYear: 2024,
      fileUrl: '',
      academicClass: { name: 'Class IX', level: 9 },
      subject: { name: 'Physics' },
      _count: { questions: 49 }
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
