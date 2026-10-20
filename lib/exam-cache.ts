import type { answerPayloadSchema } from '@/lib/validations/assessment';
import type { z } from 'zod';
export type AnswerPayload = z.infer<typeof answerPayloadSchema>;
export interface CachedAnswer { payload: AnswerPayload; version: number; revision: number; dirty: boolean }
export interface StudentQuestion {
  id: string; orderIndex: number; marks: number; questionType: string; stemText: string;
  options: { id?: string; text: string }[]; diagramUrl?: string; matchingLeft?: string[]; matchingRight?: string[];
}
export interface CachedExam {
  tabSwitchCount?: number; id: string; quizId: string; quizTitle: string; deadline: string; studentId: string;
  questions: StudentQuestion[]; answers: Record<string, CachedAnswer>; settings: { tabMonitoringEnabled: boolean };
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('riselearner-exams', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('attempts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function operation<T>(key: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('attempts', mode), request = action(transaction.objectStore('attempts'));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}
export function cacheExam(key: string, exam: CachedExam) { return operation(key, 'readwrite', store => store.put(exam, key)); }
export function readExam(key: string): Promise<CachedExam | undefined> { return operation(key, 'readonly', store => store.get(key)); }
export function removeExam(key: string) { return operation(key, 'readwrite', store => store.delete(key)); }
export function clearExamCache() { if (typeof window !== 'undefined') { sessionStorage.removeItem('exam-user'); for (const key of Object.keys(sessionStorage)) if (key.startsWith('builder-draft:')) sessionStorage.removeItem(key); localStorage.setItem('exam-logout', String(Date.now())); } return operation('all', 'readwrite', store => store.clear()); }
