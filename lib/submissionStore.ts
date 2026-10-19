import fs from 'fs';
import path from 'path';

export interface StoredAttempt {
  id: string;
  quizId?: string;
  paperCode: string;
  paperTitle: string;
  studentId?: string;
  studentName: string;
  studentAge?: number;
  studentClass?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTakenSeconds: number;
  tabSwitchCount: number;
  tabSwitchLogs: any[];
  totalAwayTimeSeconds: number;
  screenshotAttempts: number;
  answers: any[];
  weakTopics: any[];
  incorrectQuestions: any[];
  dynamicMessage: string;
  messageTone: string;
  submittedAt: string;
  isAutoSubmitted?: boolean;
}

// In-memory cache
const memoryAttempts: StoredAttempt[] = [];

// Fallback file storage in temporary directory or local data directory
const getStorageFilePath = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  return path.join(dir, 'recent_submissions.json');
};

export function saveSubmissionToStore(attempt: StoredAttempt): StoredAttempt {
  // Prepend to memory cache (keep latest 200)
  memoryAttempts.unshift(attempt);
  if (memoryAttempts.length > 200) {
    memoryAttempts.pop();
  }

  // Also try to persist to file if possible
  try {
    const filePath = getStorageFilePath();
    let current: StoredAttempt[] = [];
    if (fs.existsSync(filePath)) {
      try {
        current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {}
    }
    current.unshift(attempt);
    if (current.length > 200) current = current.slice(0, 200);
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    // Edge/serverless readonly filesystem warning ignored
  }

  return attempt;
}

export function getSubmissionsFromStore(paperCodeOrTitle?: string): StoredAttempt[] {
  let fileAttempts: StoredAttempt[] = [];
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      fileAttempts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {}

  // Merge unique by ID
  const map = new Map<string, StoredAttempt>();
  memoryAttempts.forEach(a => map.set(a.id, a));
  fileAttempts.forEach(a => {
    if (!map.has(a.id)) map.set(a.id, a);
  });

  const list = Array.from(map.values()).sort((a, b) => 
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  if (!paperCodeOrTitle) return list;

  const query = paperCodeOrTitle.toLowerCase();
  return list.filter(a => 
    a.paperCode.toLowerCase().includes(query) || 
    a.paperTitle.toLowerCase().includes(query)
  );
}

export interface StoredQuiz {

  id: string;
  code: string;
  title: string;
  description?: string;
  boardId?: string;
  classLevel?: number | string;
  subject?: string;
  totalMarks: number;
  durationMin: number;
  status: string;
  visibility: string;
  teacherName?: string;
  settings?: any;
  questions: any[];
  createdAt: string;
}

// In-memory quizzes cache
const memoryQuizzes: StoredQuiz[] = [];

const getQuizzesFilePath = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  return path.join(dir, 'custom_quizzes.json');
};

export function saveQuizToStore(quiz: StoredQuiz): StoredQuiz {
  const existingIdx = memoryQuizzes.findIndex(q => q.id === quiz.id || q.code === quiz.code);
  if (existingIdx >= 0) {
    memoryQuizzes[existingIdx] = quiz;
  } else {
    memoryQuizzes.unshift(quiz);
  }

  try {
    const filePath = getQuizzesFilePath();
    let current: StoredQuiz[] = [];
    if (fs.existsSync(filePath)) {
      try {
        current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {}
    }
    const fileIdx = current.findIndex(q => q.id === quiz.id || q.code === quiz.code);
    if (fileIdx >= 0) {
      current[fileIdx] = quiz;
    } else {
      current.unshift(quiz);
    }
    if (current.length > 200) current = current.slice(0, 200);
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {}

  return quiz;
}

export function getQuizFromStore(idOrCode: string): StoredQuiz | null {
  const norm = idOrCode.trim().toUpperCase();

  // Check memory
  const foundMem = memoryQuizzes.find(q => 
    q.id.toUpperCase() === norm || (q.code && q.code.toUpperCase() === norm)
  );
  if (foundMem) return foundMem;

  // Check file
  try {
    const filePath = getQuizzesFilePath();
    if (fs.existsSync(filePath)) {
      const fileQuizzes: StoredQuiz[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const foundFile = fileQuizzes.find(q => 
        q.id.toUpperCase() === norm || (q.code && q.code.toUpperCase() === norm)
      );
      if (foundFile) {
        memoryQuizzes.unshift(foundFile);
        return foundFile;
      }
    }
  } catch (err) {}

  return null;
}

export function getAllQuizzesFromStore(): StoredQuiz[] {
  let fileQuizzes: StoredQuiz[] = [];
  try {
    const filePath = getQuizzesFilePath();
    if (fs.existsSync(filePath)) {
      fileQuizzes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {}

  const map = new Map<string, StoredQuiz>();
  memoryQuizzes.forEach(q => map.set(q.id, q));
  fileQuizzes.forEach(q => {
    if (!map.has(q.id)) map.set(q.id, q);
  });

  return Array.from(map.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

