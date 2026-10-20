'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { answerPayloadSchema } from '@/lib/validations/assessment';
import { cacheExam, readExam, removeExam, CachedExam, AnswerPayload } from '@/lib/exam-cache';

const attemptSchema = z.object({ id: z.string(), studentId: z.string(), quizId: z.string(), quizTitle: z.string(), tabSwitchCount: z.number().default(0), deadline: z.string(), status: z.string(),
  settings: z.object({ tabMonitoringEnabled: z.boolean() }),
  questions: z.array(z.object({ id: z.string(), orderIndex: z.number(), marks: z.number(), questionType: z.string(), stemText: z.string(), options: z.array(z.object({ id: z.string().optional(), text: z.string() })), diagramUrl: z.string().optional(), matchingLeft: z.array(z.string()).optional(), matchingRight: z.array(z.string()).optional() })),
  answers: z.record(z.string(), z.object({ payload: answerPayloadSchema, version: z.number() })) });
class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
async function request(url: string, body: unknown): Promise<unknown> {
  for(let attempt=0;attempt<4;attempt++) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const data: unknown = await response.json();
  if([429,503].includes(response.status) && attempt<3) {
    const retryAfter=Number(response.headers.get('Retry-After'));
    await new Promise(resolve=>setTimeout(resolve,Math.min(retryAfter>0?retryAfter*1000:750*2**attempt,5000)+Math.random()*1000));
    continue;
  }
  if (!response.ok) { const parsed = z.object({ error: z.union([z.string(), z.object({ message: z.string() })]) }).safeParse(data);
    throw new RequestError(response.status, parsed.success ? typeof parsed.data.error === 'string' ? parsed.data.error : parsed.data.error.message : 'Request failed.'); }
  return data;
  }
  throw new RequestError(503,'The assessment service is busy. Your answers remain on this device; retry shortly.');
}
export function useSecureExam({ isOpen, paperCode, practiceDurationMin, practiceUntimed }: { isOpen: boolean; paperCode: string; practiceDurationMin?: number; practiceUntimed?: boolean }) {
  const router = useRouter(), [exam, setExam] = useState<CachedExam | null>(null), current = useRef<CachedExam | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [remaining, setRemaining] = useState(0), [saving, setSaving] = useState(false), [auth, setAuth] = useState(false), [reload, setReload] = useState(0);
  const syncing = useRef<Promise<void> | null>(null), finishing = useRef(false), writes = useRef<Promise<unknown>>(Promise.resolve());
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [submitted, setSubmitted] = useState<{ quizId: string; attemptId: string } | null>(null);
  const cacheKey = useRef('');
  const lastSubmitAttempt = useRef(0);
  const key = paperCode;
  const persist = useCallback((value: CachedExam) => {
    current.current = value; setExam(value);
    writes.current = writes.current.catch(() => undefined).then(() => cacheExam(cacheKey.current || ('exam:' + value.studentId + ':' + key), value));
    void writes.current.catch(() => setError('Local storage is unavailable. Keep this page open until answers are saved online.'));
  }, [key]);
  const flush = useCallback(async () => {
    if (syncing.current) return syncing.current;
    const work = async () => {
      const active = current.current; if (!active) return;
      setSaving(true);
      try {
        for (const question of active.questions) {
          const latest = current.current, answer = latest?.answers[question.id];
          if (!latest || !answer?.dirty) continue;
          const data = z.object({ version: z.number() }).parse(await request('/api/quizzes/' + encodeURIComponent(latest.quizId) + '/attempt/answer', { attemptId: latest.id, questionId: question.id, version: answer.version, answerPayload: answer.payload }));
          const now = current.current;
          if (now?.id === latest.id) {
            const next = now.answers[question.id];
            persist({ ...now, answers: { ...now.answers, [question.id]: { ...next, version: data.version, dirty: next.revision !== answer.revision } } });
          }
        }
        setError('');
      } finally { setSaving(false); }
    };
    syncing.current = work().finally(() => { syncing.current = null; });
    return syncing.current;
  }, [persist]);
  useEffect(() => {
    if (!isOpen || !paperCode) return;
    let cancelled = false;
    current.current = null; setExam(null); setError(''); setSubmitted(null); finishing.current = false;
    void (async () => {
      let owner = sessionStorage.getItem('exam-user') || '';
      try { const response = await fetch('/api/auth/me', { signal: AbortSignal.timeout(10000) }); const identity = await response.json(); if (!identity.user) { setAuth(true); setError('Please sign in to resume this assessment.'); return; } owner = identity.user.id; sessionStorage.setItem('exam-user', owner); } catch { if (!owner) { setError('Reconnect and sign in to recover your assessment.'); return; } }
      cacheKey.current = 'exam:' + owner + ':' + paperCode;
      const cached = await readExam(cacheKey.current).catch(() => undefined);
      try {
        const data = z.object({ attempt: attemptSchema }).parse(await request('/api/quizzes/' + encodeURIComponent(paperCode) + '/attempt', { practiceDurationMin, practiceUntimed })).attempt;
        if (cancelled) return;
        if (data.status !== 'IN_PROGRESS') { router.push('/quizzes/' + data.quizId + '/results?attemptId=' + data.id); return; }
        const answers = Object.fromEntries(Object.entries(data.answers).map(([id, a]) => [id, { ...a, revision: 0, dirty: false }]));
        if (cached?.id === data.id && cached.studentId === data.studentId) for (const [id, a] of Object.entries(cached.answers)) {
          if (a.dirty && (!answers[id] || answers[id].version === a.version)) answers[id] = a;
          else if (a.dirty && JSON.stringify(answers[id]?.payload) !== JSON.stringify(a.payload)) setNotice('A newer answer was saved from another tab. The server version was restored.');
        }
        setTabSwitchCount(data.tabSwitchCount);
        persist({ ...data, answers });
      } catch (failure) {
        if (cancelled) return;
        if (failure instanceof RequestError) { setError(failure.message); if (failure.status === 401) setAuth(true); }
        else if (cached) { current.current = cached; setExam(cached); setNotice('Offline: your answers are stored on this device and will retry when connected.'); }
        else setError('Cannot load the assessment. Reconnect and retry.');
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, paperCode, key, reload, persist, router, practiceDurationMin, practiceUntimed]);
  const submit = useCallback(async (expired = false) => {
    if (finishing.current || !current.current || (expired && Date.now() - lastSubmitAttempt.current < 10000)) return;
    lastSubmitAttempt.current = Date.now();
    finishing.current = true;
    try {
      if (!expired) {
        // Keep flushing edits made while a prior save was in flight.
        for (let pass = 0; pass < 10 && Object.values(current.current.answers).some(a => a.dirty); pass++) await flush();
        if (Object.values(current.current.answers).some(a => a.dirty)) throw new Error('Wait for your latest answers to save, then retry submission.');
      }
      const active = current.current;
      await request('/api/quizzes/' + encodeURIComponent(active.quizId) + '/attempt/submit', { attemptId: active.id });
      await writes.current.catch(() => undefined); await removeExam(cacheKey.current).catch(() => undefined);
      setSubmitted({ quizId: active.quizId, attemptId: active.id });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Submission failed. Reconnect and retry.'); finishing.current = false; }
  }, [flush, key, router]);
  useEffect(() => {
    if (!isOpen || !exam || submitted) return;
    const sync = () => { if (navigator.onLine && Date.now() < Date.parse(exam.deadline)) void flush().catch(failure => setError(failure instanceof Error ? failure.message : 'Answers are pending synchronization.')); };
    const tick = () => { const seconds = Math.max(0, Math.ceil((Date.parse(exam.deadline) - Date.now()) / 1000)); setRemaining(seconds); if (!seconds) void submit(true); };
    tick(); sync(); const timer = setInterval(tick, 1000), retries = setInterval(sync, 5000);
    window.addEventListener('online', sync);
    const unload = (event: BeforeUnloadEvent) => { if (Object.values(current.current?.answers || {}).some(a => a.dirty)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    const visibility = () => { if (document.hidden && exam.settings.tabMonitoringEnabled) void request('/api/quizzes/' + exam.quizId + '/attempt/event', { attemptId: exam.id, eventType: 'TAB_HIDDEN', eventId: crypto.randomUUID() }).then(data => { const event = z.object({ tabSwitchCount: z.number().optional(), warningThreshold: z.number().optional() }).parse(data); if (event.tabSwitchCount !== undefined) setTabSwitchCount(event.tabSwitchCount); if ((event.tabSwitchCount ?? 0) >= (event.warningThreshold ?? 3)) setNotice('Visibility changes have reached the teacher’s review threshold. These are activity records, not proof of cheating.'); }).catch(() => undefined); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); clearInterval(retries); window.removeEventListener('online', sync); window.removeEventListener('beforeunload', unload); document.removeEventListener('visibilitychange', visibility); };
  }, [exam?.id, exam?.deadline, isOpen, flush, submit, submitted]);
  useEffect(() => { const signedOut = (event: StorageEvent) => { if (event.key === 'exam-logout') { sessionStorage.removeItem('exam-user'); current.current = null; setExam(null); setAuth(true); setError('You have signed out. Sign in to resume.'); } }; window.addEventListener('storage', signedOut); return () => window.removeEventListener('storage', signedOut); }, []);
  function answer(questionIndex: number, payload: AnswerPayload) {
    const active = current.current, question = active?.questions[questionIndex];
    if (!active || !question || remaining <= 0 || finishing.current) return;
    const previous = active.answers[question.id];
    persist({ ...active, answers: { ...active.answers, [question.id]: { payload, version: previous?.version ?? 0, revision: (previous?.revision ?? 0) + 1, dirty: true } } });
    void flush().catch(failure => setError(failure instanceof Error ? failure.message : 'Your answer is stored locally and will retry.'));
  }
  const pending = Object.values(exam?.answers || {}).filter(a => a.dirty).length;
  return { exam, error, notice, tabSwitchCount, remaining, saving, auth, pending, submitted, answer, submit, reload: () => setReload(v => v + 1), closeAuth: () => setAuth(false) };
}
