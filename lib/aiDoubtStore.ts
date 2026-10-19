import fs from 'fs';
import path from 'path';

export interface AIDoubtItem {
  id: string;
  stemText: string;
  subject: string;
  classLevel: string | number;
  chapter?: string;
  difficulty?: string;
  options: { text: string; isCorrect: boolean }[];
  stage1Answer: string;
  stage2Answer: string;
  doubtReason: string;
  confidenceScore: number; // 0.0 to 1.0 (e.g. 0.78)
  suggestedCorrection?: string;
  provenance: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DISMISSED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// In-memory cache
let memoryDoubts: AIDoubtItem[] = [];
let hasLoadedFromFile = false;

const getStorageFilePath = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  return path.join(dir, 'ai_doubt_queue.json');
};

function loadDoubtsFromFile(): void {
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryDoubts = parsed;
      }
    }
  } catch (e: any) {
    console.warn('Could not read ai_doubt_queue.json:', e.message);
  }
  hasLoadedFromFile = true;
}

function persistDoubtsToFile(): void {
  try {
    const filePath = getStorageFilePath();
    fs.writeFileSync(filePath, JSON.stringify(memoryDoubts, null, 2), 'utf8');
  } catch (e: any) {
    console.warn('Could not write ai_doubt_queue.json:', e.message);
  }
}

export function getDoubtQueue(): AIDoubtItem[] {
  if (!hasLoadedFromFile) {
    loadDoubtsFromFile();
  }
  return [...memoryDoubts];
}

export function getPendingDoubtCount(): number {
  const queue = getDoubtQueue();
  return queue.filter(d => d.status === 'PENDING_REVIEW').length;
}

export function addDoubtItem(item: Omit<AIDoubtItem, 'id' | 'createdAt' | 'status'> & { id?: string }): AIDoubtItem {
  if (!hasLoadedFromFile) {
    loadDoubtsFromFile();
  }

  const completeItem: AIDoubtItem = {
    id: item.id || `doubt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    stemText: item.stemText,
    subject: item.subject || 'General',
    classLevel: item.classLevel || 'Class IX',
    chapter: item.chapter || 'Curriculum',
    difficulty: item.difficulty || 'Medium',
    options: item.options || [],
    stage1Answer: item.stage1Answer || 'Unknown',
    stage2Answer: item.stage2Answer || 'Discrepancy',
    doubtReason: item.doubtReason || 'Potential ambiguity in answer key or distractors.',
    confidenceScore: typeof item.confidenceScore === 'number' ? item.confidenceScore : 0.75,
    suggestedCorrection: item.suggestedCorrection,
    provenance: item.provenance || 'AI_DOUBLE_CHECK',
    status: 'PENDING_REVIEW',
    createdAt: new Date().toISOString()
  };

  // Avoid duplicates if identical stem
  const existingIdx = memoryDoubts.findIndex(d => d.stemText.trim().toLowerCase() === completeItem.stemText.trim().toLowerCase());
  if (existingIdx >= 0) {
    memoryDoubts[existingIdx] = completeItem;
  } else {
    memoryDoubts.unshift(completeItem);
  }

  if (memoryDoubts.length > 300) {
    memoryDoubts = memoryDoubts.slice(0, 300);
  }

  persistDoubtsToFile();
  return completeItem;
}

export function resolveDoubtItem(
  id: string,
  resolution: 'APPROVED' | 'DISMISSED',
  reviewerName: string = 'Teacher Admin',
  correctedAnswer?: string
): AIDoubtItem | null {
  if (!hasLoadedFromFile) {
    loadDoubtsFromFile();
  }

  const item = memoryDoubts.find(d => d.id === id);
  if (!item) return null;

  item.status = resolution;
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = reviewerName;

  if (correctedAnswer && item.options && item.options.length > 0) {
    item.options = item.options.map(opt => ({
      ...opt,
      isCorrect: opt.text.trim().toLowerCase() === correctedAnswer.trim().toLowerCase()
    }));
  }

  persistDoubtsToFile();
  return item;
}
