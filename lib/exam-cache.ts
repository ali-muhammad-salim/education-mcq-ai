import type { answerPayloadSchema } from '@/lib/validations/assessment';
import type { z } from 'zod';

export type AnswerPayload = z.infer<typeof answerPayloadSchema>;

export interface CachedAnswer {
  payload: AnswerPayload;
  version: number;
  revision: number;
  dirty: boolean;
}

export interface StudentQuestion {
  id: string;
  orderIndex: number;
  marks: number;
  questionType: string;
  stemText: string;
  options: { id?: string; text: string }[];
  diagramUrl?: string;
  matchingLeft?: string[];
  matchingRight?: string[];
  encryptedReveal?: string;
}

export interface CachedExam {
  tabSwitchCount?: number;
  id: string;
  quizId: string;
  quizTitle: string;
  deadline: string;
  studentId: string;
  questions: StudentQuestion[];
  answers: Record<string, CachedAnswer>;
  settings: { tabMonitoringEnabled: boolean };
  currentIndex?: number;
  questionTimes?: Record<string, number>;
  bookmarkedQuestions?: number[];
  startedAtMs?: number;
}

export interface AttemptQuestionReview {
  displayNumber: number;
  originalQuestionNumber: string;
  questionText: string;
  diagramUrl?: string;
  options: Record<string, string>;
  selectedOption?: string;
  selectedText?: string;
  correctOption: string;
  isCorrect: boolean;
  isAttempted: boolean;
  marks: number;
  scoreAwarded: number;
  timeSpentSec: number;
  peerAvgTimeSec: number;
  optionDistribution?: Record<string, number>;
  timeTag?: 'RUSHED_ERROR' | 'CONCEPT_GAP' | 'FAST_MASTER' | 'NORMAL';
  explanation: string;
  whyIncorrect?: string;
  topicName?: string;
}

export interface AttemptHistoryEntry {
  attemptId: string;
  attemptNumber: number;
  paperCode: string;
  paperTitle: string;
  studentName: string;
  startedAt: string;
  submittedAt: string;
  totalQuestions: number;
  attemptedCount: number;
  unattemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  totalMarks: number;
  attemptedAccuracyPct: number;
  overallPercentage: number;
  totalTimeSec: number;
  avgTimePerAttemptedSec: number;
  peerAvgTimePerQuestionSec: number;
  compositeIndex: number;
  percentile: number;
  verifiedSampleSize?: number;
  speedPercentile: number;
  quadrantLabel: string;
  tabSwitchCount: number;
  isPartial: boolean;
  isRetryIncorrectMode?: boolean;
  questions: AttemptQuestionReview[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('riselearner-exams', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('attempts')) {
        request.result.createObjectStore('attempts');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function operation<T>(
  key: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('attempts', mode);
    const request = action(transaction.objectStore('attempts'));
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export function cacheExam(key: string, exam: CachedExam) {
  return operation(key, 'readwrite', store => store.put(exam, key));
}

export function readExam(key: string): Promise<CachedExam | undefined> {
  return operation(key, 'readonly', store => store.get(key));
}

export function removeExam(key: string) {
  return operation(key, 'readwrite', store => store.delete(key));
}

export async function saveAttemptHistory(paperCode: string, entry: AttemptHistoryEntry): Promise<AttemptHistoryEntry[]> {
  if (typeof indexedDB === 'undefined') return [entry];
  const normCode = (paperCode || 'DEFAULT').toUpperCase();
  const key = `history:${normCode}`;
  try {
    const existing = (await operation<AttemptHistoryEntry[] | undefined>(key, 'readonly', store => store.get(key))) || [];
    const filtered = existing.filter(item => item.attemptId !== entry.attemptId);
    const nextEntry: AttemptHistoryEntry = {
      ...entry,
      attemptNumber: entry.attemptNumber || filtered.length + 1,
    };
    const updated = [...filtered, nextEntry].slice(-25); // Keep up to 25 attempts per quiz
    await operation(key, 'readwrite', store => store.put(updated, key));
    return updated;
  } catch {
    return [entry];
  }
}

export async function readAttemptHistory(paperCode: string): Promise<AttemptHistoryEntry[]> {
  if (typeof indexedDB === 'undefined') return [];
  const normCode = (paperCode || 'DEFAULT').toUpperCase();
  const key = `history:${normCode}`;
  try {
    const list = await operation<AttemptHistoryEntry[] | undefined>(key, 'readonly', store => store.get(key));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function clearExamCache() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('exam-user');
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('builder-draft:')) sessionStorage.removeItem(key);
    }
    localStorage.setItem('exam-logout', String(Date.now()));
  }
  return operation('all', 'readwrite', store => store.clear());
}

// ============================================================================
// TIER 1 & TIER 3 DIAGRAM CACHE ENGINE (2-Stage Priority Full-Paper Offline Cache)
// ============================================================================
const DIAGRAM_CACHE_NAME = 'aku-exam-diagrams-v1';
const memoryDiagramBlobUrls = new Map<string, string>();
const inFlightDiagramFetches = new Map<string, Promise<string>>();

export function getCachedDiagramSrc(originalUrl?: string): string | undefined {
  if (!originalUrl) return undefined;
  return memoryDiagramBlobUrls.get(originalUrl) || originalUrl;
}

export async function cacheSingleDiagramOffline(url: string, priority: 'high' | 'low' = 'low'): Promise<string> {
  if (!url || typeof window === 'undefined') return url;
  const memHit = memoryDiagramBlobUrls.get(url);
  if (memHit) return memHit;

  const existingFlight = inFlightDiagramFetches.get(url);
  if (existingFlight) return existingFlight;

  const job = (async () => {
    try {
      // 1. Check Service Worker / Browser Cache Storage API first
      if ('caches' in window) {
        const cache = await window.caches.open(DIAGRAM_CACHE_NAME);
        let response = await cache.match(url);
        if (!response) {
          response = await fetch(url, {
            cache: 'force-cache',
            priority: priority === 'high' ? 'high' : 'low',
          } as RequestInit);
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        }
        if (response && response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryDiagramBlobUrls.set(url, blobUrl);
          return blobUrl;
        }
      }

      // 2. Fallback to standard Image preloader if Cache Storage is unavailable
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.decoding = priority === 'high' ? 'sync' : 'async';
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
      });
      memoryDiagramBlobUrls.set(url, url);
      return url;
    } catch {
      return url;
    } finally {
      inFlightDiagramFetches.delete(url);
    }
  })();

  inFlightDiagramFetches.set(url, job);
  return job;
}

export interface OfflineDiagramProgress {
  cachedCount: number;
  totalDiagrams: number;
  ready: boolean;
}

/**
 * Two-Stage Full-Paper Offline Diagram Preloader:
 * - Stage 1 (Immediate, 0-150ms): Preloads the first 3 diagram URLs with high priority so Q1 never waits.
 * - Stage 2 (Background Concurrency=2 Drain, 150ms-3s): Downloads all remaining diagrams in the 40-question paper
 *   into Browser Cache Storage + Memory Blob URLs so even if the user loses Wi-Fi on Q2, Q3-Q40 diagrams work 100% offline.
 */
export async function preloadAllPaperDiagramsOffline(
  diagramUrls: string[],
  onProgress?: (progress: OfflineDiagramProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  if (typeof window === 'undefined') return;
  const uniqueUrls = Array.from(new Set(diagramUrls.filter(Boolean)));
  const totalDiagrams = uniqueUrls.length;
  if (totalDiagrams === 0) {
    onProgress?.({ cachedCount: 0, totalDiagrams: 0, ready: true });
    return;
  }

  let cachedCount = uniqueUrls.filter(u => memoryDiagramBlobUrls.has(u)).length;
  onProgress?.({ cachedCount, totalDiagrams, ready: cachedCount >= totalDiagrams });
  if (cachedCount >= totalDiagrams) return;

  // Stage 1: High-priority first 3 diagrams
  const stage1Urls = uniqueUrls.slice(0, 3);
  for (const url of stage1Urls) {
    if (signal?.aborted) return;
    const hadBefore = memoryDiagramBlobUrls.has(url);
    await cacheSingleDiagramOffline(url, 'high');
    if (!hadBefore && memoryDiagramBlobUrls.has(url)) {
      cachedCount++;
      onProgress?.({ cachedCount, totalDiagrams, ready: cachedCount >= totalDiagrams });
    }
  }

  // Stage 2: Concurrency-2 background drain for all remaining diagrams (Q4..Q40)
  const stage2Urls = uniqueUrls.slice(3);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(2, stage2Urls.length) }, async () => {
    while (cursor < stage2Urls.length) {
      if (signal?.aborted) return;
      const url = stage2Urls[cursor++];
      const hadBefore = memoryDiagramBlobUrls.has(url);
      await cacheSingleDiagramOffline(url, 'low');
      if (!hadBefore) {
        cachedCount = Math.min(totalDiagrams, cachedCount + 1);
        onProgress?.({ cachedCount, totalDiagrams, ready: cachedCount >= totalDiagrams });
      }
    }
  });

  await Promise.all(workers);
  onProgress?.({ cachedCount: totalDiagrams, totalDiagrams, ready: true });
}
