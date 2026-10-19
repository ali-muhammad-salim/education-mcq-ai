import fs from 'fs';
import path from 'path';

import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc1ModelCrqs from '@/data/physics/ssc1_model_crqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';
import ssc2ModelCrqs from '@/data/physics/ssc2_model_crqs.json';

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
  'ssc2_model_crqs.json': ssc2ModelCrqs as any[]
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

/**
 * Returns canonical PaperData and its questions for Model Papers & Past Papers
 */
export function getFallbackPaper(paperCodeOrId: string): PaperData | null {
  const code = (paperCodeOrId || '').toUpperCase().trim();

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
          in_syllabus: true,
          slo: `1.${qNum}`,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics (Class IX)'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics', topicNumber: '1' } }],
        slos: [{ slo: { code: `1.${qNum}`, description: item.stem } }]
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
          in_syllabus: true,
          slo: `2.${idx + 1}`,
          slo_details: {
            description: item.stem,
            topic_name: 'SSC-I Physics Theory'
          }
        },
        topics: [{ topic: { name: 'SSC-I Physics Theory', topicNumber: '2' } }],
        slos: [{ slo: { code: `2.${idx + 1}`, description: item.stem } }]
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
          in_syllabus: true,
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
          in_syllabus: true,
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

  // 2025 Annual Past Paper 1 (Class IX)
  if (code.includes('2025') && (code.includes('IX') || code.includes('9')) && code.includes('P1')) {
    const p1 = getFallbackPaper('PHY-IX-P1');
    if (p1) {
      return {
        ...p1,
        id: 'PHY-IX-2025-P1',
        title: 'Physics SSC-I Examination 2025 Paper I (MCQ)',
        paperCode: 'PHY-IX-2025-P1',
        examYear: 2025,
        examSession: 'Annual Examination 2025',
        examType: 'ANNUAL'
      };
    }
  }

  // 2025 Annual Past Paper 2 (Class IX)
  if (code.includes('2025') && (code.includes('IX') || code.includes('9')) && code.includes('P2')) {
    const p2 = getFallbackPaper('PHY-IX-P2');
    if (p2) {
      return {
        ...p2,
        id: 'PHY-IX-2025-P2',
        title: 'Physics SSC-I Examination 2025 Paper II (CRQ & ERQ)',
        paperCode: 'PHY-IX-2025-P2',
        examYear: 2025,
        examSession: 'Annual Examination 2025',
        examType: 'ANNUAL'
      };
    }
  }

  // 2025 Annual Past Paper 1 (Class X)
  if (code.includes('2025') && (code.includes('X') || code.includes('10')) && code.includes('P1')) {
    const p1 = getFallbackPaper('PHY-X-P1');
    if (p1) {
      return {
        ...p1,
        id: 'PHY-X-2025-P1',
        title: 'Physics SSC-II Examination 2025 Paper I (MCQ)',
        paperCode: 'PHY-X-2025-P1',
        examYear: 2025,
        examSession: 'Annual Examination 2025',
        examType: 'ANNUAL'
      };
    }
  }

  // 2025 Annual Past Paper 2 (Class X)
  if (code.includes('2025') && (code.includes('X') || code.includes('10')) && code.includes('P2')) {
    const p2 = getFallbackPaper('PHY-X-P2');
    if (p2) {
      return {
        ...p2,
        id: 'PHY-X-2025-P2',
        title: 'Physics SSC-II Examination 2025 Paper II (CRQ & ERQ)',
        paperCode: 'PHY-X-2025-P2',
        examYear: 2025,
        examSession: 'Annual Examination 2025',
        examType: 'ANNUAL'
      };
    }
  }

  // Fallback default: Return Class IX Model Paper I
  return getFallbackPaper('PHY-IX-P1');
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
  return [
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
    // 2025 Annual Papers
    {
      id: 'PHY-IX-2025-P1',
      paperCode: 'PHY-IX-2025-P1',
      title: 'Physics SSC-I 2025 Annual Examination Paper I',
      examSession: 'Annual Examination',
      examYear: 2025,
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf',
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
      fileUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf',
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
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf',
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
      fileUrl: '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf',
      academicClass: { name: 'Class X', level: 10 },
      subject: { name: 'Physics' },
      _count: { questions: 9 }
    }
  ];
}
