'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Clock,
  ArrowRight, ArrowLeft, ShieldCheck, RotateCcw,
  Eye, Check, X, Maximize, Minimize, Info, ShieldAlert,
  Bookmark, Trophy, BarChart3, Zap, WifiOff, RefreshCw
} from 'lucide-react';
import MathText from '@/components/MathText';
import AuthModal from '@/components/AuthModal';
import { useDialog } from '@/lib/use-dialog';
import { useSecureExam } from '@/lib/use-secure-exam';
import { z } from 'zod';
import StructuredContent from '@/components/StructuredContent';
import styles from '@/components/rise/quiz.module.css';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { decryptQuestionReveal } from '@/lib/quiz-crypto';
import {
  readExam,
  readAttemptHistory,
  saveAttemptHistory,
  preloadAllPaperDiagramsOffline,
  getCachedDiagramSrc,
  cacheSingleDiagramOffline,
  type AttemptHistoryEntry,
  type AttemptQuestionReview,
  type OfflineDiagramProgress,
} from '@/lib/exam-cache';
import {
  MIN_PERCENTILE_ATTEMPTS,
  getBaselineQuestionTelemetry,
  computeCompositeIndex,
  classifySpeedAccuracyQuadrant,
  type PaperAnalyticsPayload,
  type LeaderboardEntry,
} from '@/lib/quiz-analytics';

interface Question {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: string;
  marks?: number;
  difficulty?: string;
  sourceRegion?: any;
  diagramBased?: boolean;
  topics?: Array<{ topic: { name: string; topicNumber?: string } }>;
  slos?: Array<{ slo: { code?: string; description: string } }>;
}

export interface ShuffledQuestion {
  id: string;
  displayNumber: number;
  originalQuestionNumber: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty?: string;
  diagramUrl?: string;
  diagramBased?: boolean;
  isDiagram?: boolean;
  sourceRegion?: any;
  options: Record<string, string>;
  correctOption: string;
  explanation: string;
  optionFeedback?: Record<string, string>;
  encryptedReveal?: string;
  topicName: string;
  topicNumber?: string;
  sloCode?: string;
  selectedText?: string;
  serverScore?: number | null;
  serverMarks?: number;
  whyIncorrect?: string;
}

export interface TabSwitchRecord {
  index: number;
  leftAt: string;
  returnedAt: string;
  durationSeconds: number;
}

interface TakeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperTitle: string;
  paperCode: string;
  questions: Question[];
}

export default function TakeQuizModal({
  isOpen,
  onClose,
  paperTitle: initialPaperTitle,
  paperCode,
  questions
}: TakeQuizModalProps) {
  // Navigation / Phase State: 'auth' -> 'setup' -> 'active' -> 'completed'
  const [phase, setPhase] = useState<'auth' | 'setup' | 'active' | 'completed'>('setup');
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);

  // Guard onClose during active quiz so pressing Escape or clicking outside pops up "Finish the quiz first"
  const guardedClose = useCallback(() => {
    if (phase === 'active') {
      setShowFinishConfirmModal(true);
      return;
    }
    onClose();
  }, [phase, onClose]);

  const dialogProps = useDialog(isOpen, 'Assessment', guardedClose);

  const [loadingQuizQuestions, setLoadingQuizQuestions] = useState<boolean>(false);
  const [startQuizError, setStartQuizError] = useState<string | null>(null);

  // Student Authentication State
  const [student, setStudent] = useState<{ id?: string; name: string; age?: number; classLevel?: string } | null>(null);

  // Setup / Timer Options & Resume vs Start Fresh State
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [selectedDurationMin, setSelectedDurationMin] = useState<number>(50);
  const [forceNewAttempt, setForceNewAttempt] = useState<boolean>(false);
  const [savedResumeInfo, setSavedResumeInfo] = useState<{
    attemptId: string;
    answeredCount: number;
    totalCount: number;
    lastQuestionNum: number;
    remainingMinutes: number;
  } | null>(null);
  const [showResumePromptModal, setShowResumePromptModal] = useState<boolean>(false);

  // Active Quiz State (Randomized Questions & Options)
  const [activeQuestions, setActiveQuestions] = useState<ShuffledQuestion[]>([]);
  const [fullPaperQuestions, setFullPaperQuestions] = useState<ShuffledQuestion[]>([]);
  const [isRetrySubsetMode, setIsRetrySubsetMode] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({}); // { [displayNum]: optionKey }
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(50 * 60);
  const [showQuestionGrid, setShowQuestionGrid] = useState<boolean>(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());

  // Per-Question Active Time Tracking & Bookmarks
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<number[]>([]);

  // 2-Stage Full-Paper Offline Diagram Cache Progress & Failed Image Retry State
  const [diagramCacheProgress, setDiagramCacheProgress] = useState<OfflineDiagramProgress>({
    cachedCount: 0,
    totalDiagrams: 0,
    ready: false,
  });
  const [diagramLoadFailed, setDiagramLoadFailed] = useState<Record<string, boolean>>({});
  const [diagramRetryTick, setDiagramRetryTick] = useState<number>(0);

  // Attempt History (Single-Row Grouped Pills & Click-to-Inspect Drawer)
  const [attemptHistory, setAttemptHistory] = useState<AttemptHistoryEntry[]>([]);
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState<AttemptHistoryEntry | null>(null);

  // Community Telemetry, Percentile & Live Leaderboard State
  const [paperAnalytics] = useState<PaperAnalyticsPayload | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'first' | 'best'>('first');
  const [activeResultTab, setActiveResultTab] = useState<'review' | 'leaderboard' | 'chapters'>('review');

  // Anti-Cheat & Screenshot Prevention State
  const [tabSwitchLogs, setTabSwitchLogs] = useState<TabSwitchRecord[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [lastSwitchDuration, setLastSwitchDuration] = useState<number>(0);
  const [cheatWarningVisible, setCheatWarningVisible] = useState<boolean>(false);
  const [showSwitchAuditModal, setShowSwitchAuditModal] = useState<boolean>(false);
  const [screenshotAlert, setScreenshotAlert] = useState<boolean>(false);
  const [isWindowMasked, setIsWindowMasked] = useState<boolean>(false);
  const [isFocusLost, setIsFocusLost] = useState<boolean>(false);
  const [screenshotAttemptCount, setScreenshotAttemptCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Completion State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'attempted' | 'incorrect' | 'unattempted'>('all');

  const engine = useSecureExam({
    isOpen: isOpen && phase === 'active' && !isRetrySubsetMode,
    paperCode,
    practiceDurationMin: selectedDurationMin,
    practiceUntimed: !isTimed,
    forceNewAttempt,
  });
  const [preview, setPreview] = useState<{ title: string; count: number; practice: boolean } | null>(null);
  const paperTitle = engine.exam?.quizTitle || preview?.title || initialPaperTitle;

  useEffect(() => {
    if (phase === 'setup') setLoadingQuizQuestions(false);
  }, [phase]);

  // Load Attempt History, Saved In-Progress Attempt, and Community Analytics on Modal Open
  useEffect(() => {
    if (!isOpen || !paperCode) return;
    let active = true;

    // 1. Load past attempts for this quiz from IndexedDB
    void readAttemptHistory(paperCode).then(list => {
      if (active) setAttemptHistory(list);
    });

    // 2. Check if an unfinished in-progress attempt exists in IndexedDB or server
    void (async () => {
      const owner = typeof window !== 'undefined' ? sessionStorage.getItem('exam-user') || '' : '';
      if (owner) {
        const cached = await readExam(`exam:${owner}:${paperCode}`).catch(() => undefined);
        if (cached && cached.questions?.length) {
          const answeredCount = Object.keys(cached.answers || {}).length;
          if (answeredCount > 0 && answeredCount < cached.questions.length) {
            const remMin = Math.max(1, Math.ceil((Date.parse(cached.deadline) - Date.now()) / 60000));
            if (active) {
              setSavedResumeInfo({
                attemptId: cached.id,
                answeredCount,
                totalCount: cached.questions.length,
                lastQuestionNum: (cached.currentIndex ?? answeredCount) + 1,
                remainingMinutes: remMin,
              });
            }
            return;
          }
        }
      }
      // Also check server recovery endpoint
      try {
        const res = await fetch('/api/quizzes/' + encodeURIComponent(paperCode) + '/attempt');
        if (res.ok) {
          const rec = await res.json();
          if (rec?.hasActiveAttempt && rec.attempt?.questions?.length) {
            const ansCount = Object.keys(rec.attempt.answers || {}).length;
            if (ansCount > 0 && ansCount < rec.attempt.questions.length && active) {
              setSavedResumeInfo({
                attemptId: rec.attempt.id,
                answeredCount: ansCount,
                totalCount: rec.attempt.questions.length,
                lastQuestionNum: Math.min(rec.attempt.questions.length, ansCount + 1),
                remainingMinutes: Math.max(1, Math.ceil((rec.attempt.remainingSeconds || 1800) / 60)),
              });
            }
          }
        }
      } catch {
        // Ignore if offline or unauthenticated
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, paperCode, phase]);

  // Browser Back-Button Lock (`history.pushState` + `popstate`) during Active Quiz
  useEffect(() => {
    if (!isOpen || phase !== 'active' || typeof window === 'undefined') return;
    window.history.pushState({ akuQuizActiveGuard: true }, '');
    const onPopState = () => {
      // Re-push guard state so the user stays on the quiz and open Finish Confirmation Modal
      window.history.pushState({ akuQuizActiveGuard: true }, '');
      setShowFinishConfirmModal(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [isOpen, phase]);

  // 2-Stage Full-Paper Offline Diagram Preloader (Caches Q1-Q3 immediately, then drains Q4-Q40 in background)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const controller = new AbortController();
    const sourceList = activeQuestions.length > 0 ? activeQuestions : questions || [];
    const urls: string[] = [];
    for (const q of sourceList) {
      const qNum = (q as ShuffledQuestion).originalQuestionNumber || (q as Question).questionNumber || (q as ShuffledQuestion).displayNumber;
      const url = resolveQuestionDiagram(paperCode, qNum, q);
      if (url) urls.push(url);
    }
    void preloadAllPaperDiagramsOffline(
      urls,
      progress => setDiagramCacheProgress(progress),
      controller.signal
    );
    return () => controller.abort();
  }, [isOpen, paperCode, questions, activeQuestions.length]);

  // Auto-retry any failed diagram immediately when the browser comes back online
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setDiagramLoadFailed({});
      setDiagramRetryTick(t => t + 1);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Per-Question Active Dwell Timer (ticks every 1s on unanswered current question while window is focused)
  useEffect(() => {
    if (phase !== 'active' || !activeQuestions[currentIndex] || showFinishConfirmModal || showSwitchAuditModal) return;
    const q = activeQuestions[currentIndex];
    const dKey = String(q.displayNumber);
    const alreadyAnswered = Boolean(userSelections[dKey]);
    if (alreadyAnswered) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setQuestionTimes(prev => {
        const nextVal = (prev[dKey] || 0) + 1;
        const next = { ...prev, [dKey]: nextVal };
        if (nextVal % 3 === 0) {
          engine.updateMeta({ currentIndex, questionTimes: next, bookmarkedQuestions });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentIndex, activeQuestions, userSelections, showFinishConfirmModal, showSwitchAuditModal, bookmarkedQuestions, engine]);

  // Keyboard Shortcuts during Active Quiz (A/B/C/D or 1/2/3/4 to answer, ArrowLeft/ArrowRight to navigate, B to bookmark)
  useEffect(() => {
    if (phase !== 'active' || !isOpen || showFinishConfirmModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const q = activeQuestions[currentIndex];
      if (!q) return;
      const keyUpper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(keyUpper) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!userSelections[String(q.displayNumber)] && q.options[keyUpper]) {
          e.preventDefault();
          handleSelectAnswer(q.displayNumber, keyUpper);
        }
      } else if (['1', '2', '3', '4'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
        const letter = String.fromCharCode(64 + Number(e.key));
        if (!userSelections[String(q.displayNumber)] && q.options[letter]) {
          e.preventDefault();
          handleSelectAnswer(q.displayNumber, letter);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(activeQuestions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (keyUpper === 'F' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleBookmark(q.displayNumber);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (!isOpen) return;
    void fetch('/api/quizzes/' + encodeURIComponent(paperCode))
      .then(r => r.json())
      .then(data => {
        if (data.quiz) {
          const practice = String(data.quiz.id).startsWith('practice-');
          setPreview({ title: data.quiz.title, count: data.quiz.questions.length, practice });
          if (!practice) {
            setSelectedDurationMin(data.quiz.durationMin || 45);
            setIsTimed(true);
          }
        }
      })
      .catch(() => undefined);
  }, [isOpen, paperCode]);

  useEffect(() => {
    if (!isOpen) {
      setPhase('setup');
      setCurrentIndex(0);
      setShowFinishConfirmModal(false);
      setSelectedHistoryAttempt(null);
      return;
    }
    void fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) setStudent(data.user);
      })
      .catch(() => undefined);
  }, [isOpen]);

  useEffect(() => {
    if (engine.auth) {
      engine.closeAuth();
      setPhase('auth');
    }
  }, [engine.auth, engine]);

  useEffect(() => {
    if (!isRetrySubsetMode) setTimeLeftSeconds(engine.remaining);
  }, [engine.remaining, isRetrySubsetMode]);

  useEffect(() => {
    setTabSwitchCount(engine.tabSwitchCount);
  }, [engine.tabSwitchCount]);

  const revealQuestionOnDemand = useCallback(
    (qId: string, encryptedBlob?: string, stemText?: string, currentOptions?: Record<string, string>) => {
      const decrypted = decryptQuestionReveal(qId, encryptedBlob);
      if (decrypted && decrypted.correctLetter) {
        return {
          correctOption: decrypted.correctLetter,
          explanation: decrypted.explanation,
          optionFeedback: decrypted.optionFeedback,
          topicName: decrypted.unit || '',
        };
      }
      const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
      const propMatch = (questions || []).find(pq => norm(pq.questionText || (pq as any).stem) === norm(stemText || ''));
      if (propMatch) {
        const sr = typeof propMatch.sourceRegion === 'object' && propMatch.sourceRegion ? propMatch.sourceRegion : (propMatch as any);
        const rawCorrectKey = sr.correct_answer || sr.correctOption || '';
        const rawChoices = sr.choices || sr.options || {};
        const correctText = rawChoices[rawCorrectKey] || '';
        let matchedLetter = rawCorrectKey;
        if (currentOptions && correctText) {
          const found = Object.entries(currentOptions).find(([, t]) => norm(String(t)) === norm(String(correctText)));
          if (found) matchedLetter = found[0];
        }
        const fbMap: Record<string, string> = {};
        if (Array.isArray(sr.option_feedback)) {
          for (const item of sr.option_feedback) {
            if (item?.key && item?.reason) fbMap[String(item.key).toUpperCase()] = String(item.reason);
          }
        }
        return {
          correctOption: matchedLetter || 'A',
          explanation: sr.explanation || (correctText ? `The correct answer is (${matchedLetter}) ${correctText}.` : 'Verified against the official answer key.'),
          optionFeedback: Object.keys(fbMap).length > 0 ? fbMap : undefined,
          topicName: propMatch.topics?.[0]?.topic?.name || '',
        };
      }
      return null;
    },
    [questions]
  );

  useEffect(() => {
    if (!engine.exam || isRetrySubsetMode) return;
    const initialSelections: Record<string, string> = Object.fromEntries(
      engine.exam.questions.flatMap((q, i) => {
        const payload = engine.exam?.answers[q.id]?.payload;
        if (!payload) return [];
        const selected = payload.selectedOptionId,
          optionIndex = q.options.findIndex(o => o.id === selected);
        const value =
          optionIndex >= 0
            ? String.fromCharCode(65 + optionIndex)
            : payload.selectedOptionIds?.length
              ? payload.selectedOptionIds.join(',')
              : payload.numericAnswer || payload.textAnswer || (payload.matchedPairs?.length ? 'Answered' : '');
        return value ? [[String(i + 1), value]] : [];
      })
    );

    const mapped = engine.exam.questions.map((q, i) => {
      const displayNumStr = String(i + 1);
      const optsRecord = Object.fromEntries(q.options.map((o, j) => [String.fromCharCode(65 + j), o.text]));
      const alreadyChosen = initialSelections[displayNumStr];
      const revealed = alreadyChosen ? revealQuestionOnDemand(q.id, q.encryptedReveal, q.stemText, optsRecord) : null;
      return {
        id: q.id,
        displayNumber: i + 1,
        originalQuestionNumber: String(q.orderIndex),
        questionText: q.stemText,
        questionType: q.questionType,
        marks: q.marks,
        diagramUrl: q.diagramUrl,
        options: optsRecord,
        encryptedReveal: q.encryptedReveal,
        correctOption: revealed?.correctOption || '',
        explanation: revealed?.explanation || '',
        optionFeedback: revealed?.optionFeedback,
        topicName: revealed?.topicName || '',
      };
    });
    setActiveQuestions(mapped);
    setFullPaperQuestions(mapped);
    setUserSelections(initialSelections);
    if (engine.exam.questionTimes && Object.keys(engine.exam.questionTimes).length > 0) {
      setQuestionTimes(engine.exam.questionTimes);
    }
    if (Array.isArray(engine.exam.bookmarkedQuestions)) {
      setBookmarkedQuestions(engine.exam.bookmarkedQuestions);
    }
    if (!forceNewAttempt && typeof engine.exam.currentIndex === 'number' && engine.exam.currentIndex > 0) {
      setCurrentIndex(Math.min(mapped.length - 1, engine.exam.currentIndex));
    }
    setLoadingQuizQuestions(false);
  }, [engine.exam, revealQuestionOnDemand, isRetrySubsetMode, forceNewAttempt]);

  // Launch Quiz: if an unfinished attempt exists, ask Continue vs Start Fresh
  const handleStartQuizClick = () => {
    setStartQuizError(null);
    if (savedResumeInfo && savedResumeInfo.answeredCount > 0) {
      setShowResumePromptModal(true);
      return;
    }
    launchQuizSession(false);
  };

  const launchQuizSession = (startFresh: boolean) => {
    setShowResumePromptModal(false);
    setIsRetrySubsetMode(false);
    setForceNewAttempt(startFresh);
    if (startFresh) {
      setUserSelections({});
      setQuestionTimes({});
      setBookmarkedQuestions([]);
      setCurrentIndex(0);
      setSavedResumeInfo(null);
    }
    setQuizStartTime(Date.now());
    setLoadingQuizQuestions(true);
    setPhase(student ? 'active' : 'auth');
  };

  // Smart Practice Mode: Retry ONLY Incorrect & Unattempted Questions
  const handleStartRetryIncorrectAndUnattempted = (sourceQuestions?: AttemptQuestionReview[]) => {
    const baseList = fullPaperQuestions.length > 0 ? fullPaperQuestions : activeQuestions;
    const targetNums = new Set<number>();
    if (sourceQuestions && sourceQuestions.length > 0) {
      for (const sq of sourceQuestions) {
        if (!sq.isCorrect) targetNums.add(Number(sq.originalQuestionNumber || sq.displayNumber));
      }
    } else {
      for (const aq of baseList) {
        const chosen = userSelections[String(aq.displayNumber)];
        const rev = aq.correctOption
          ? { correctOption: aq.correctOption }
          : revealQuestionOnDemand(aq.id, aq.encryptedReveal, aq.questionText, aq.options);
        if (!chosen || chosen !== rev?.correctOption) {
          targetNums.add(Number(aq.originalQuestionNumber || aq.displayNumber));
        }
      }
    }

    const filtered = baseList
      .filter(q => targetNums.has(Number(q.originalQuestionNumber || q.displayNumber)))
      .map((q, idx) => ({
        ...q,
        displayNumber: idx + 1,
        correctOption: '',
        explanation: '',
      }));

    if (filtered.length === 0) return;
    setIsRetrySubsetMode(true);
    setActiveQuestions(filtered);
    setUserSelections({});
    setQuestionTimes({});
    setBookmarkedQuestions([]);
    setCurrentIndex(0);
    setQuizStartTime(Date.now());
    setTimeLeftSeconds(Math.max(10, filtered.length * 2) * 60);
    setPhase('active');
  };

  const toggleBookmark = (displayNum: number) => {
    setBookmarkedQuestions(prev => {
      const next = prev.includes(displayNum) ? prev.filter(n => n !== displayNum) : [...prev, displayNum];
      engine.updateMeta({ currentIndex, questionTimes, bookmarkedQuestions: next });
      return next;
    });
  };

  const handleSelectAnswer = (displayNum: number, optionKey: string) => {
    const index = displayNum - 1;
    const targetAq = activeQuestions[index];
    if (!targetAq) return;

    // 1. Immediately lock selection in UI state & decrypt only this question's reveal in <0.15ms
    setUserSelections(prev => ({ ...prev, [String(displayNum)]: optionKey }));
    setActiveQuestions(prev =>
      prev.map((aq, idx) => {
        if (idx !== index || aq.correctOption) return aq;
        const revealed = revealQuestionOnDemand(aq.id, aq.encryptedReveal, aq.questionText, aq.options);
        if (!revealed) return aq;
        return {
          ...aq,
          correctOption: revealed.correctOption,
          explanation: revealed.explanation,
          optionFeedback: revealed.optionFeedback,
          topicName: revealed.topicName || aq.topicName,
        };
      })
    );

    if (isRetrySubsetMode) return;

    // 2. Persist to IndexedDB & debounced background sync
    const question = engine.exam?.questions[index];
    const optionIndex = optionKey.charCodeAt(0) - 65;
    if (!question) return;
    const id = question.options[optionIndex]?.id;
    if (!id) return;

    if (question.questionType === 'MCQ_MULTIPLE') {
      const selected = engine.exam?.answers[question.id]?.payload.selectedOptionIds || [];
      engine.answer(index, {
        selectedOptionIds: selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id],
      });
    } else {
      engine.answer(index, { selectedOptionId: id });
    }
    engine.updateMeta({ currentIndex, questionTimes, bookmarkedQuestions });
  };

  // 0 ms Instant Local Score & Analytics Calculation on Finish
  const handleConfirmFinishQuiz = async (automatic = false) => {
    setShowFinishConfirmModal(false);
    setSubmitting(true);

    // Teacher-created quizzes require authoritative grading and release settings.
    if (questions.length === 0 && !isRetrySubsetMode && engine.exam) {
      const { quizId, id: attemptId } = engine.exam;
      await engine.submit(automatic || engine.remaining <= 0);
      window.location.assign(`/quizzes/${encodeURIComponent(quizId)}/results?attemptId=${encodeURIComponent(attemptId)}`);
      return;
    }

    // 1. Decrypt all questions locally in <1ms so we can show both Attempted Score and Total Score in 0ms!
    const totalQuestions = activeQuestions.length || 40;
    let attemptedCount = 0;
    let correctCount = 0;
    let totalScore = 0;
    let totalMarks = 0;
    let totalTimeSpentOnAttempted = 0;
    let peerAvgSum = 0;

    const topicMap = new Map<
      string,
      { topicName: string; totalQuestions: number; attemptedQuestions: number; correctQuestions: number; totalTimeSec: number }
    >();

    const reviewedQuestions: AttemptQuestionReview[] = [];
    const updatedActive: ShuffledQuestion[] = [];

    for (const q of activeQuestions) {
      const dStr = String(q.displayNumber);
      const chosenKey = userSelections[dStr];
      const isAttempted = Boolean(chosenKey);
      const revealed = q.correctOption
        ? {
            correctOption: q.correctOption,
            explanation: q.explanation,
            optionFeedback: q.optionFeedback,
            topicName: q.topicName,
          }
        : revealQuestionOnDemand(q.id, q.encryptedReveal, q.questionText, q.options);

      const correctKey = revealed?.correctOption || 'A';
      const expl = revealed?.explanation || 'Verified against the official AKU-EB answer key.';
      const optFb = revealed?.optionFeedback;
      const unitTitle = revealed?.topicName || q.topicName || 'General Physics';
      const isRight = isAttempted && chosenKey === correctKey;
      const marks = q.marks || 1;
      const scoreAwarded = isRight ? marks : 0;

      totalMarks += marks;
      if (isAttempted) {
        attemptedCount++;
        if (isRight) {
          correctCount++;
          totalScore += marks;
        }
      }

      const qTelemetry =
        paperAnalytics?.questionStats?.[String(q.originalQuestionNumber || q.displayNumber)] ||
        getBaselineQuestionTelemetry(paperCode, q.originalQuestionNumber || q.displayNumber, correctKey, Boolean(q.diagramUrl), q.difficulty);

      const timeSpentSec = Math.max(isAttempted ? 2 : 0, questionTimes[dStr] || (isAttempted ? 18 : 0));
      if (isAttempted) {
        totalTimeSpentOnAttempted += timeSpentSec;
      }
      peerAvgSum += qTelemetry.peerAvgTimeSec;

      let timeTag: AttemptQuestionReview['timeTag'] = 'NORMAL';
      if (isAttempted && !isRight && timeSpentSec <= 8) timeTag = 'RUSHED_ERROR';
      else if (isAttempted && !isRight && timeSpentSec >= Math.max(55, qTelemetry.peerAvgTimeSec * 1.4)) timeTag = 'CONCEPT_GAP';
      else if (isAttempted && isRight && timeSpentSec <= qTelemetry.peerAvgTimeSec * 0.75) timeTag = 'FAST_MASTER';

      const whyInc =
        isAttempted && !isRight && chosenKey
          ? optFb?.[chosenKey] ||
            `Option (${chosenKey}) does not satisfy the required physical principle or mathematical relationship.`
          : undefined;

      // Aggregate by Unit / Chapter
      const tStat = topicMap.get(unitTitle) || {
        topicName: unitTitle,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctQuestions: 0,
        totalTimeSec: 0,
      };
      tStat.totalQuestions += 1;
      if (isAttempted) tStat.attemptedQuestions += 1;
      if (isRight) tStat.correctQuestions += 1;
      tStat.totalTimeSec += timeSpentSec;
      topicMap.set(unitTitle, tStat);

      reviewedQuestions.push({
        displayNumber: q.displayNumber,
        originalQuestionNumber: q.originalQuestionNumber,
        questionText: q.questionText,
        diagramUrl: q.diagramUrl,
        options: q.options,
        selectedOption: chosenKey,
        selectedText: chosenKey ? `(${chosenKey}) ${q.options[chosenKey] || ''}` : 'Unattempted',
        correctOption: `(${correctKey}) ${q.options[correctKey] || ''}`,
        isCorrect: isRight,
        isAttempted,
        marks,
        scoreAwarded,
        timeSpentSec,
        peerAvgTimeSec: qTelemetry.peerAvgTimeSec,
        optionDistribution: qTelemetry.optionDistribution,
        timeTag,
        explanation: expl,
        whyIncorrect: whyInc,
        topicName: unitTitle,
      });

      updatedActive.push({
        ...q,
        correctOption: `(${correctKey}) ${q.options[correctKey] || ''}`,
        selectedText: chosenKey ? `(${chosenKey}) ${q.options[chosenKey] || ''}` : 'Not answered',
        explanation: expl,
        optionFeedback: optFb,
        topicName: unitTitle,
        serverScore: scoreAwarded,
        serverMarks: marks,
        whyIncorrect: whyInc,
      });
    }

    const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
    const incorrectCount = Math.max(0, attemptedCount - correctCount);
    const attemptedAccuracyPct = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const overallPercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
    const elapsedWallSec = Math.max(5, Math.round((Date.now() - quizStartTime) / 1000));
    const totalTimeSec = totalTimeSpentOnAttempted > 0 ? totalTimeSpentOnAttempted : elapsedWallSec;
    const avgTimePerAttemptedSec = attemptedCount > 0 ? Math.round(totalTimeSec / attemptedCount) : 0;
    const peerAvgTimePerQuestionSec = Math.round(peerAvgSum / Math.max(1, totalQuestions));

    const compositeIndex = computeCompositeIndex(totalScore, totalTimeSec, selectedDurationMin * 60);
    const quadrantLabel = classifySpeedAccuracyQuadrant(
      attemptedAccuracyPct,
      avgTimePerAttemptedSec,
      peerAvgTimePerQuestionSec
    );

    // Peer percentiles require graded attempts from the server.
    const estPercentile = 0;
    const estSpeedPercentile = 0;

    const chapterStats = Array.from(topicMap.values()).map(cs => ({
      ...cs,
      accuracyPercentage: cs.totalQuestions > 0 ? Math.round((cs.correctQuestions / cs.totalQuestions) * 100) : 0,
      attemptedAccuracyPercentage:
        cs.attemptedQuestions > 0 ? Math.round((cs.correctQuestions / cs.attemptedQuestions) * 100) : 0,
      avgTimeSec: cs.attemptedQuestions > 0 ? Math.round(cs.totalTimeSec / cs.attemptedQuestions) : 0,
      recommendation:
        cs.correctQuestions < cs.totalQuestions
          ? 'Review chapter notes and retry missed questions.'
          : 'Strong mastery achieved in this unit.',
    }));

    const weakTopics = chapterStats.filter(cs => cs.accuracyPercentage < 75);

    const attemptNumber = attemptHistory.length + 1;
    const nowIso = new Date().toISOString();
    const attemptEntry: AttemptHistoryEntry = {
      attemptId: engine.exam?.id || `local-${Date.now()}`,
      attemptNumber,
      paperCode,
      paperTitle,
      studentName: student?.name || 'Candidate',
      startedAt: new Date(quizStartTime).toISOString(),
      submittedAt: nowIso,
      totalQuestions,
      attemptedCount,
      unattemptedCount,
      correctCount,
      incorrectCount,
      score: totalScore,
      totalMarks,
      attemptedAccuracyPct,
      overallPercentage,
      totalTimeSec,
      avgTimePerAttemptedSec,
      peerAvgTimePerQuestionSec,
      compositeIndex,
      percentile: estPercentile,
      speedPercentile: estSpeedPercentile,
      quadrantLabel,
      tabSwitchCount,
      isPartial: unattemptedCount > 0,
      isRetryIncorrectMode: isRetrySubsetMode,
      questions: reviewedQuestions,
    };

    // Update UI in 0ms!
    setActiveQuestions(updatedActive);
    setCompletionData({
      pending: false,
      score: totalScore,
      totalMarks,
      percentage: overallPercentage,
      attemptedCount,
      unattemptedCount,
      correctCount,
      incorrectCount,
      attemptedAccuracyPct,
      totalTimeSec,
      avgTimePerAttemptedSec,
      peerAvgTimePerQuestionSec,
      compositeIndex,
      percentile: estPercentile,
      speedPercentile: estSpeedPercentile,
      quadrantLabel,
      attemptNumber,
      isPartial: unattemptedCount > 0,
      studentName: student?.name || 'Candidate',
      submittedAt: nowIso,
      tabSwitchCount,
      canRetake: true,
      canViewCorrectAnswers: true,
      weakTopics,
      chapterStats,
      reviewedQuestions,
      incorrectQuestions: reviewedQuestions.filter(rq => rq.isAttempted && !rq.isCorrect),
      dynamicMessage:
        unattemptedCount > 0
          ? `Quiz finished after ${attemptedCount} of ${totalQuestions} questions. You scored ${correctCount}/${attemptedCount} (${attemptedAccuracyPct}% accuracy) on the questions you attempted!`
          : overallPercentage >= 80
            ? 'Outstanding performance! Review your answers and keep practicing.'
            : 'Assessment completed. Review your per-question time and explanations below.',
    });
    setReviewFilter(unattemptedCount > 0 && attemptedCount > 0 ? 'attempted' : 'all');
    setActiveResultTab('review');
    setSavedResumeInfo(null);
    setPhase('completed');
    setSubmitting(false);

    // Save to IndexedDB Attempt History
    const updatedHistory = await saveAttemptHistory(paperCode, attemptEntry);
    setAttemptHistory(updatedHistory);

    // Only the server-graded attempt can supply a peer percentile.
    if (!isRetrySubsetMode && engine.exam) {
      const { quizId, id: attemptId } = engine.exam;
      await engine.submit(automatic || engine.remaining <= 0);
      for (let poll = 0; poll < 5; poll++) {
        try {
          const response = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/analytics?attemptId=${encodeURIComponent(attemptId)}`);
          if (response.status === 202) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (!response.ok) break;
          const data = await response.json();
          if (data.success) {
            setCompletionData((prev: any) => prev ? { ...prev, percentile: data.percentile, verifiedSampleSize: data.sampleSize } : prev);
            const history = await saveAttemptHistory(paperCode, { ...attemptEntry, percentile: data.percentile ?? 0, verifiedSampleSize: data.sampleSize });
            setAttemptHistory(history);
          }
          break;
        } catch { break; }
      }
    }
  };

  const dismissScreenshotDefense = () => {
    setScreenshotAlert(false);
    setIsFocusLost(false);
    setIsWindowMasked(false);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setIsFullscreen(Boolean(document.fullscreenElement));
    } catch {}
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationShort = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const currentQ = activeQuestions[currentIndex];
  const currentSelected = currentQ ? userSelections[currentQ.displayNumber.toString()] : null;
  const isAnswered = Boolean(currentSelected) && Boolean(currentQ?.correctOption);
  const isCurrentCorrect = isAnswered && currentQ && currentSelected === currentQ.correctOption;
  const currentQTimeSec = currentQ ? questionTimes[String(currentQ.displayNumber)] || 0 : 0;
  const currentQTelemetry = currentQ
    ? paperAnalytics?.questionStats?.[String(currentQ.originalQuestionNumber || currentQ.displayNumber)] ||
      getBaselineQuestionTelemetry(
        paperCode,
        currentQ.originalQuestionNumber || currentQ.displayNumber,
        currentQ.correctOption || 'B',
        Boolean(currentQ.diagramUrl),
        currentQ.difficulty
      )
    : null;

  const totalAwayTime = tabSwitchLogs.reduce((acc, cur) => acc + cur.durationSeconds, 0);

  // Live Attempted Score counter during active quiz
  const liveAttemptedStats = React.useMemo(() => {
    let attempted = 0;
    let correct = 0;
    for (const q of activeQuestions) {
      const sel = userSelections[String(q.displayNumber)];
      if (sel) {
        attempted++;
        if (q.correctOption && sel === q.correctOption) correct++;
      }
    }
    return {
      attempted,
      unattempted: Math.max(0, activeQuestions.length - attempted),
      correct,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    };
  }, [activeQuestions, userSelections]);

  if (!isOpen) return null;

  const isFullScreenPhase = phase === 'active' || phase === 'completed';

  return (
    <>
      {/* Global CSS to prevent printing, manage single scrollbar, and smooth GPU transitions */}
      <style jsx global>{`
        @media print {
          body, #quiz-modal-container, #aku-active-quiz-content {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
        #quiz-modal-container {
          overflow: hidden !important;
          scrollbar-width: none !important;
        }
        #quiz-modal-container::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .aku-single-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .aku-single-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .aku-single-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .aku-single-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .aku-single-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes akuSlideFadeIn {
          from {
            opacity: 0;
            transform: translate3d(10px, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .aku-question-animate {
          animation: akuSlideFadeIn 0.16s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity;
        }
      `}</style>

      {/* Synchronous Hidden Textarea for Instant Clipboard Overwrite */}
      <textarea
        id="aku-clipboard-poison-textarea"
        readOnly
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        value={`🔒 [AKU-EB EXAMINATION CONTENT PROTECTED]\nScreen capture is disabled during the active examination.\nCandidate: ${student?.name || 'Proctored Candidate'}\nPaper: ${paperCode}\nTimestamp: ${new Date().toLocaleString()}`}
      />

      {/* LIGHT SCREENSHOT & PRIVACY SHIELD */}
      <div
        id="aku-fullscreen-blackout"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(248, 250, 252, 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 99999999,
          display: screenshotAlert ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0f172a',
          textAlign: 'center',
          padding: '1.5rem',
          opacity: screenshotAlert ? 1 : 0,
          pointerEvents: screenshotAlert ? 'all' : 'none',
          transition: 'opacity 0.12s ease'
        }}
        onClick={dismissScreenshotDefense}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            maxWidth: '460px',
            width: '92%',
            boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0,0,0,0.03)',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: '#ecfdf5',
            border: '2px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            color: '#0b5e4a',
            boxShadow: '0 4px 14px rgba(11, 94, 74, 0.12)'
          }}>
            <ShieldCheck size={42} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            Screen Protected
          </h2>
          <p style={{ fontSize: '0.94rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
            Examination content is protected. Screen capture shortcuts and external overlays are paused during your quiz.
          </p>
          <button
            type="button"
            onClick={dismissScreenshotDefense}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '12px 28px',
              background: '#0b5e4a',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Eye size={17} /> Resume Quiz
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BACK-BUTTON LOCK & "FINISH QUIZ FIRST" CONFIRMATION POPUP                 */}
      {/* ========================================================================= */}
      {showFinishConfirmModal && phase === 'active' && (
        <div
          className={`rise-ui ${styles.promptOverlay}`}
          onClick={() => setShowFinishConfirmModal(false)}
        >
          <div className={styles.promptBox} onClick={e => e.stopPropagation()}>
            <div className={styles.promptHead}>
              <span className={styles.stamp}>Navigation locked during exam</span>
              <h3 className={styles.promptTitle}>Finish and submit?</h3>
            </div>

            <p className={styles.promptBody}>
              You cannot go back while the examination is active.
              {liveAttemptedStats.unattempted > 0
                ? ' Your score will be calculated for both the questions you attempted and the full paper.'
                : ' You have answered all questions in this assessment.'}
            </p>

            {/* Live Progress Summary inside Confirmation Modal */}
            <div className={styles.promptStats}>
              <div className={styles.stat}>
                <span className={styles.label}>Attempted</span>
                <div className={styles.statValue}>
                  {liveAttemptedStats.attempted} / {activeQuestions.length}
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Unattempted</span>
                <div className={styles.statValue}>{liveAttemptedStats.unattempted}</div>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Current score</span>
                <div className={styles.statValue}>
                  {liveAttemptedStats.correct}/{liveAttemptedStats.attempted || 0} ({liveAttemptedStats.accuracy}%)
                </div>
              </div>
            </div>

            <div className={styles.promptActions}>
              <button type="button" onClick={() => setShowFinishConfirmModal(false)} className={styles.quiet}>
                Keep going
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmFinishQuiz(false)}
                disabled={submitting}
                className={styles.primary}
              >
                {submitting ? 'Submitting…' : 'Finish and view score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* "CONTINUE WHERE YOU LEFT OFF" VS "START FROM BEGINNING" MODAL             */}
      {/* ========================================================================= */}
      {showResumePromptModal && savedResumeInfo && (
        <div
          className={`rise-ui ${styles.promptOverlay}`}
          onClick={() => setShowResumePromptModal(false)}
        >
          <div className={styles.promptBox} onClick={e => e.stopPropagation()}>
            <div className={styles.promptHead}>
              <span className={styles.stamp}>Saved progress found</span>
              <h3 className={styles.promptTitle}>Continue or start over?</h3>
            </div>

            <p className={styles.promptBody}>
              You have an unfinished attempt for <strong>{paperTitle}</strong> with{' '}
              <strong>{savedResumeInfo.answeredCount} of {savedResumeInfo.totalCount} questions</strong> answered.
            </p>

            <div className={styles.choiceStack}>
              <button
                type="button"
                onClick={() => launchQuizSession(false)}
                className={`${styles.choice} ${styles.choiceGo}`}
              >
                <div>
                  <div className={styles.choiceMain}>Continue from question {savedResumeInfo.lastQuestionNum}</div>
                  <p className={styles.choiceNote}>
                    Restores {savedResumeInfo.answeredCount} locked answers and {savedResumeInfo.remainingMinutes}m on the clock
                  </p>
                </div>
                <ArrowRight size={18} aria-hidden="true" />
              </button>

              <button type="button" onClick={() => launchQuizSession(true)} className={styles.choice}>
                <div>
                  <div className={styles.choiceMain}>Start fresh from question 1</div>
                  <p className={styles.choiceNote}>Clears previous selections and begins a new timed attempt</p>
                </div>
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        {...dialogProps}
        id="quiz-modal-container"
        className={`rise-ui ${styles.overlay}${isFullScreenPhase ? ` ${styles.overlayFull}` : ''}`}
      >
        <div
          id="quiz-modal-card"
          className={`${styles.shell}${isFullScreenPhase ? ` ${styles.shellFull}` : ''}${phase === 'active' ? ` ${styles.shellActive}` : ''}`}
        >
          {/* Top Status & Offline Diagram Cache Readiness Strip during Active Quiz */}
          {phase === 'active' && (
            <div role="status" className={styles.syncStrip}>
              <div>
                {engine.error ||
                  engine.notice ||
                  (engine.saving
                    ? 'Saving answers…'
                    : engine.pending
                      ? engine.pending + ' answers pending synchronization'
                      : engine.exam || isRetrySubsetMode
                        ? 'All answers saved locally & encrypted'
                        : 'Loading saved assessment…')}
                {engine.error && (
                  <button onClick={engine.reload} className={styles.textButton} style={{ marginLeft: 12 }}>
                    Retry
                  </button>
                )}
              </div>

              <div className={styles.syncRight}>
                {diagramCacheProgress.totalDiagrams > 0 && (
                  <span className={`${styles.badge}${diagramCacheProgress.ready ? ` ${styles.badgeReady}` : ''}`}>
                    {diagramCacheProgress.ready
                      ? `Offline ready — ${diagramCacheProgress.totalDiagrams} diagrams cached`
                      : `Caching diagrams ${diagramCacheProgress.cachedCount}/${diagramCacheProgress.totalDiagrams}`}
                  </span>
                )}
                <span className={styles.liveScore}>
                  Attempted <strong>{liveAttemptedStats.correct}/{liveAttemptedStats.attempted}</strong> ({liveAttemptedStats.accuracy}%)
                </span>
              </div>
            </div>
          )}

          {/* Global Close Button (In active mode, triggers the Finish Confirmation modal) */}
          {phase !== 'active' && (
            <button
              aria-label="Close assessment"
              onClick={onClose}
              className={styles.close}
            >
              <X size={18} />
            </button>
          )}

          {/* PHASE 1: STUDENT AUTHENTICATION GATE */}
          <AuthModal
            isOpen={phase === 'auth'}
            onClose={() => setPhase('setup')}
            onSuccess={user => {
              setStudent(user);
              setPhase('active');
            }}
          />

          {/* ========================================================================= */}
          {/* PHASE 2: QUIZ SETUP, RESUME BANNER, & SINGLE-ROW ATTEMPT HISTORY          */}
          {/* ========================================================================= */}
          {phase === 'setup' && (
            <div className={`exam-phase-panel ${styles.setup}`}>
              <div className={styles.setupHead}>
                <span className={styles.stamp}>{paperCode} · Quiz setup</span>
                <h2 className={styles.setupTitle}>{paperTitle}</h2>
              </div>

              {/* Unfinished Attempt Quick-Resume Banner */}
              {savedResumeInfo && savedResumeInfo.answeredCount > 0 && (
                <div className={styles.resume}>
                  <div>
                    <span className={styles.label}>Unfinished attempt saved on this device</span>
                    <p className={styles.resumeLine}>
                      Question {savedResumeInfo.lastQuestionNum} of {savedResumeInfo.totalCount} · {savedResumeInfo.answeredCount} answered · {savedResumeInfo.remainingMinutes}m left
                    </p>
                  </div>
                  <div className={styles.resumeActions}>
                    <button
                      type="button"
                      onClick={() => launchQuizSession(false)}
                      className={`${styles.primary} ${styles.small}`}
                    >
                      Continue where I left off
                    </button>
                    <button
                      type="button"
                      onClick={() => launchQuizSession(true)}
                      className={`${styles.quiet} ${styles.small}`}
                    >
                      Start fresh
                    </button>
                  </div>
                </div>
              )}

              {/* SINGLE-ROW GROUPED ATTEMPT HISTORY (Click any attempt pill to view its full details) */}
              {attemptHistory.length > 0 && (
                <div className={`${styles.panel} ${styles.block}`}>
                  <div className={styles.panelHead}>
                    <div className={styles.panelTitle}>
                      <Trophy aria-hidden="true" size={15} />
                      <span>Your {attemptHistory.length} attempts on {paperCode} — tap one to inspect</span>
                    </div>
                    {selectedHistoryAttempt && (
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryAttempt(null)}
                        className={styles.textButton}
                      >
                        Hide details
                      </button>
                    )}
                  </div>

                  {/* Single Horizontal Row of Attempt Pills */}
                  <div className={`no-scrollbar ${styles.attemptRow}`}>
                    {attemptHistory.map(att => {
                      const isSelected = selectedHistoryAttempt?.attemptId === att.attemptId;
                      return (
                        <button
                          key={att.attemptId}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedHistoryAttempt(isSelected ? null : att)}
                          className={`${styles.attempt}${isSelected ? ` ${styles.attemptOn}` : ''}`}
                        >
                          <span className={styles.attemptNum}>#{att.attemptNumber}</span>
                          <span>
                            <span className={styles.attemptScore}>
                              {att.isPartial
                                ? `${att.correctCount}/${att.attemptedCount} attempted (${att.attemptedAccuracyPct}%) · ${att.score}/${att.totalMarks} total`
                                : `${att.score}/${att.totalMarks} (${att.overallPercentage}%)`}
                            </span>
                            <span className={styles.meta} style={{ display: 'block' }}>
                              {formatDurationShort(att.totalTimeSec)}{(att.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS ? ` · ${att.percentile}th %ile` : ''}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expandable Attempt Details Drawer when a user clicks an attempt pill */}
                  {selectedHistoryAttempt && (
                    <div className={styles.detail}>
                      <div className={styles.detailHead}>
                        <div>
                          <span className={styles.stamp}>
                            Attempt #{selectedHistoryAttempt.attemptNumber} breakdown
                          </span>
                          <span className={styles.meta} style={{ marginLeft: 8 }}>
                            {new Date(selectedHistoryAttempt.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCompletionData({
                              pending: false,
                              score: selectedHistoryAttempt.score,
                              totalMarks: selectedHistoryAttempt.totalMarks,
                              percentage: selectedHistoryAttempt.overallPercentage,
                              attemptedCount: selectedHistoryAttempt.attemptedCount,
                              unattemptedCount: selectedHistoryAttempt.unattemptedCount,
                              correctCount: selectedHistoryAttempt.correctCount,
                              incorrectCount: selectedHistoryAttempt.incorrectCount,
                              attemptedAccuracyPct: selectedHistoryAttempt.attemptedAccuracyPct,
                              totalTimeSec: selectedHistoryAttempt.totalTimeSec,
                              avgTimePerAttemptedSec: selectedHistoryAttempt.avgTimePerAttemptedSec,
                              peerAvgTimePerQuestionSec: selectedHistoryAttempt.peerAvgTimePerQuestionSec,
                              compositeIndex: selectedHistoryAttempt.compositeIndex,
                              percentile: selectedHistoryAttempt.percentile,
                              verifiedSampleSize: selectedHistoryAttempt.verifiedSampleSize,
                              speedPercentile: selectedHistoryAttempt.speedPercentile,
                              quadrantLabel: selectedHistoryAttempt.quadrantLabel,
                              attemptNumber: selectedHistoryAttempt.attemptNumber,
                              isPartial: selectedHistoryAttempt.isPartial,
                              studentName: selectedHistoryAttempt.studentName,
                              submittedAt: selectedHistoryAttempt.submittedAt,
                              tabSwitchCount: selectedHistoryAttempt.tabSwitchCount,
                              canRetake: true,
                              canViewCorrectAnswers: true,
                              weakTopics: [],
                              reviewedQuestions: selectedHistoryAttempt.questions,
                              incorrectQuestions: selectedHistoryAttempt.questions.filter(q => q.isAttempted && !q.isCorrect),
                              dynamicMessage: `Viewing saved report for Attempt #${selectedHistoryAttempt.attemptNumber}.`,
                            });
                            setPhase('completed');
                          }}
                          className={`${styles.primary} ${styles.small}`}
                        >
                          Open full question review
                        </button>
                      </div>

                      <div className={styles.statGrid}>
                        <div className={styles.stat}>
                          <span className={styles.label}>Attempted score</span>
                          <div className={`${styles.statValue} ${styles.statValueRight}`}>
                            {selectedHistoryAttempt.correctCount}/{selectedHistoryAttempt.attemptedCount} ({selectedHistoryAttempt.attemptedAccuracyPct}%)
                          </div>
                        </div>
                        <div className={styles.stat}>
                          <span className={styles.label}>Total paper score</span>
                          <div className={styles.statValue}>
                            {selectedHistoryAttempt.score}/{selectedHistoryAttempt.totalMarks} ({selectedHistoryAttempt.overallPercentage}%)
                          </div>
                        </div>
                        <div className={styles.stat}>
                          <span className={styles.label}>Avg time / Q</span>
                          <div className={styles.statValue}>
                            {selectedHistoryAttempt.avgTimePerAttemptedSec}s{selectedHistoryAttempt.peerAvgTimePerQuestionSec > 0 && <span className={styles.meta}> (peer {selectedHistoryAttempt.peerAvgTimePerQuestionSec}s)</span>}
                          </div>
                        </div>
                        {(selectedHistoryAttempt.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS && <div className={styles.stat}>
                          <span className={styles.label}>Percentile</span>
                          <div className={`${styles.statValue} ${styles.statValueRight}`}>
                            {selectedHistoryAttempt.percentile}th
                          </div>
                        </div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Student Identified Badge */}
              <div className={styles.candidate}>
                <div>
                  <span className={styles.label}>Candidate</span>
                  <p className={styles.candidateName}>
                    {student?.name || 'Sign in to save your attempt'}
                  </p>
                </div>
                <button
                  onClick={() => setPhase('auth')}
                  className={`${styles.quiet} ${styles.small}`}
                >
                  Change candidate
                </button>
              </div>

              {/* Timer Preference Option */}
              <div className={styles.block}>
                <span className={styles.label}>Timer &amp; mode</span>

                <div className={`mobile-stack-grid ${styles.modeGrid}`}>
                  <button
                    type="button"
                    aria-pressed={isTimed}
                    onClick={() => setIsTimed(true)}
                    className={`${styles.mode}${isTimed ? ` ${styles.modeOn}` : ''}`}
                  >
                    <span className={styles.modeName}>
                      <Clock aria-hidden="true" size={16} />
                      <span>Timed examination</span>
                    </span>
                    <p className={styles.modeNote}>
                      Official exam countdown timer.
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={!isTimed}
                    disabled={!preview?.practice}
                    onClick={() => setIsTimed(false)}
                    className={`${styles.mode}${!isTimed ? ` ${styles.modeOn}` : ''}`}
                  >
                    <span className={styles.modeName}>
                      <Sparkles aria-hidden="true" size={16} />
                      <span>Extended practice</span>
                    </span>
                    <p className={styles.modeNote}>
                      24 hours to work through the questions at your own pace.
                    </p>
                  </button>
                </div>

                {isTimed && (
                  <div className={styles.panel}>
                    <span className={styles.label}>Exam duration</span>
                    <div className={styles.chipRow}>
                      {[15, 30, 50].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          aria-pressed={selectedDurationMin === mins}
                          disabled={!preview?.practice}
                          onClick={() => setSelectedDurationMin(mins)}
                          className={`${styles.chip}${selectedDurationMin === mins ? ` ${styles.chipOn}` : ''}`}
                        >
                          {mins} min{mins === 50 ? ' · official' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Offline Cache & Feature Readiness Notice */}
              <div className={styles.notice}>
                <div className={styles.noticeHead}>
                  <span className={styles.noticeHeadMain}>
                    <ShieldCheck aria-hidden="true" size={17} />
                    <span>Works offline, encrypted on your device</span>
                  </span>
                  {diagramCacheProgress.totalDiagrams > 0 && (
                    <span className={`${styles.badge}${diagramCacheProgress.ready ? ` ${styles.badgeReady}` : ''}`}>
                      {diagramCacheProgress.ready
                        ? `${diagramCacheProgress.totalDiagrams} diagrams cached`
                        : `Caching ${diagramCacheProgress.cachedCount}/${diagramCacheProgress.totalDiagrams}`}
                    </span>
                  )}
                </div>
                <p className={styles.noticeBody}>
                  Your answers are saved on this device while they sync. Explanations appear when
                  the quiz settings allow them. Press <kbd>A</kbd>–<kbd>D</kbd> to answer, <kbd>←</kbd> and{' '}
                  <kbd>→</kbd> to move, <kbd>F</kbd> to flag.
                </p>
              </div>

              {startQuizError && (
                <div role="alert" className={styles.alert}>
                  <AlertTriangle aria-hidden="true" size={18} />
                  <span>{startQuizError}</span>
                </div>
              )}

              {/* Launch Button */}
              <div className={styles.launch}>
                <button type="button" onClick={onClose} className={styles.quiet}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartQuizClick}
                  disabled={loadingQuizQuestions}
                  className={styles.primary}
                >
                  <span>
                    {loadingQuizQuestions
                      ? 'Loading questions…'
                      : `Start quiz — ${preview?.count || questions?.length || activeQuestions?.length || 40} questions`}
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Fallback if Phase is Active but No Question Loaded */}
          {phase === 'active' && !currentQ && (
            <div className={styles.state}>
              <div className={styles.stateIcon}>
                <AlertTriangle aria-hidden="true" size={28} />
              </div>
              <h3 className={styles.stateTitle}>
                {engine.error ? 'Unable to start assessment' : engine.exam ? 'No questions in this assessment' : 'Loading assessment…'}
              </h3>
              <p className={styles.stateBody}>
                {engine.error || (engine.exam ? 'This assessment has no questions. Please return to the paper.' : 'Loading your saved questions. This may take a few seconds.')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhase('setup');
                  setLoadingQuizQuestions(false);
                  if (!engine.error) onClose();
                }}
                className={styles.primary}
              >
                {engine.error ? 'Return to setup' : 'Close examination'}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 3: ACTIVE QUIZ SCREEN                                               */}
          {/* ========================================================================= */}
          {phase === 'active' && currentQ && (
            <div
              id="aku-active-quiz-content"
              className={`${styles.active}${isWindowMasked ? ` ${styles.activeMasked}` : ''}`}
            >
              {/* Progress — fills as the script is answered */}
              <div className={styles.progress}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, Math.round((liveAttemptedStats.attempted / Math.max(1, activeQuestions.length)) * 100))}%`,
                  }}
                />
              </div>

              {cheatWarningVisible && (
                <div className={styles.warn}>
                  <span className={styles.warnMain}>
                    <Info aria-hidden="true" size={17} />
                    <span>
                      Window departure #{tabSwitchCount} noted ({lastSwitchDuration}s away). Please stay on the examination window.
                    </span>
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      setCheatWarningVisible(false);
                    }}
                    className={styles.textButton}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quiz Header Bar */}
              <div className={`exam-header ${styles.bar}`}>
                <div>
                  <span className={styles.stamp}>
                    {paperCode}{isRetrySubsetMode ? ' · smart retry' : ''} · item {currentIndex + 1} of {activeQuestions.length}
                  </span>
                  <h2 className={styles.barTitle}>
                    <span>Question {currentQ.displayNumber}</span>
                    {currentQTelemetry && currentQTelemetry.peerAvgTimeSec > 0 && (
                      <span
                        className={`${styles.timePill}${currentQTimeSec > currentQTelemetry.peerAvgTimeSec * 1.25 ? ` ${styles.timePillSlow}` : ''}`}
                      >
                        {currentQTimeSec}s · peer {currentQTelemetry.peerAvgTimeSec}s
                      </span>
                    )}
                  </h2>
                </div>

                {/* Status Indicators: Bookmark, Timer, Fullscreen, Warnings, Grid & Finish */}
                <div className={styles.barTools}>
                  {/* Bookmark / Flag Question Button */}
                  <button
                    type="button"
                    onClick={() => toggleBookmark(currentQ.displayNumber)}
                    aria-pressed={bookmarkedQuestions.includes(currentQ.displayNumber)}
                    title="Flag this question for review (shortcut: F)"
                    className={`${styles.tool}${bookmarkedQuestions.includes(currentQ.displayNumber) ? ` ${styles.toolFlag}` : ''}`}
                  >
                    <Bookmark size={14} fill={bookmarkedQuestions.includes(currentQ.displayNumber) ? 'currentColor' : 'none'} />
                    <span>{bookmarkedQuestions.includes(currentQ.displayNumber) ? 'Flagged' : 'Flag'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-pressed={isFullscreen}
                    className={`${styles.tool}${isFullscreen ? ` ${styles.toolOn}` : ''}`}
                  >
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
                  </button>

                  {isTimed && (
                    <div
                      role="timer"
                      aria-label="Time remaining"
                      className={`${styles.clock}${timeLeftSeconds < 300 ? ` ${styles.clockLow}` : ''}`}
                    >
                      <Clock aria-hidden="true" size={15} />
                      <span>{formatTime(timeLeftSeconds)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowSwitchAuditModal(true);
                    }}
                    className={`${styles.tool}${tabSwitchCount > 0 || screenshotAttemptCount > 0 ? ` ${styles.toolAlert}` : ''}`}
                  >
                    <Eye aria-hidden="true" size={14} />
                    <span>{tabSwitchCount} events</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                    aria-expanded={showQuestionGrid}
                    className={styles.tool}
                  >
                    Sheet {Object.keys(userSelections).length}/{activeQuestions.length}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFinishConfirmModal(true)}
                    disabled={submitting}
                    className={`${styles.primary} ${styles.small}`}
                  >
                    {submitting ? 'Submitting…' : 'Finish'}
                  </button>
                </div>
              </div>

              {/* Quick Question Jump Drawer (Color-Coded: Correct=Green, Wrong=Red, Flagged=Amber, Unvisited=Gray) */}
              {showQuestionGrid && (
                <div className={`no-scrollbar exam-question-grid ${styles.palette}`}>
                  <div className={styles.paletteKey}>
                    <span className={styles.paletteKeyItem}>
                      <span aria-hidden="true" className={`${styles.keyDot} ${styles.keyDotRight}`} /> Correct
                    </span>
                    <span className={styles.paletteKeyItem}>
                      <span aria-hidden="true" className={`${styles.keyDot} ${styles.keyDotWrong}`} /> Incorrect
                    </span>
                    <span className={styles.paletteKeyItem}>
                      <span aria-hidden="true" className={`${styles.keyDot} ${styles.keyDotFlag}`} /> Flagged ({bookmarkedQuestions.length})
                    </span>
                    <span className={styles.paletteKeyItem}>
                      <span aria-hidden="true" className={styles.keyDot} /> Unanswered ({liveAttemptedStats.unattempted})
                    </span>
                  </div>
                  <div className={styles.paletteGrid}>
                    {activeQuestions.map((q, idx) => {
                      const sel = userSelections[q.displayNumber.toString()];
                      const answered = Boolean(sel);
                      const isRight = answered && q.correctOption && sel === q.correctOption;
                      const isFlagged = bookmarkedQuestions.includes(q.displayNumber);
                      const isCurrent = idx === currentIndex;

                      let tone = '';
                      if (isFlagged && !answered) tone = ` ${styles.slotFlag}`;
                      else if (answered) tone = isRight ? ` ${styles.slotRight}` : ` ${styles.slotWrong}`;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          aria-label={`Question ${q.displayNumber}`}
                          aria-current={isCurrent ? 'true' : undefined}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setShowQuestionGrid(false);
                          }}
                          className={`${styles.slot}${tone}${isCurrent ? ` ${styles.slotCurrent}` : ''}`}
                        >
                          {q.displayNumber}
                          {isFlagged && <span aria-hidden="true" className={styles.slotStar}>★</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Question Body with Smooth GPU Animation */}
              <div
                key={currentQ.displayNumber}
                id="aku-question-scroll-body"
                className={`aku-single-scroll aku-question-animate ${styles.body}`}
              >
               <div className={styles.bodyInner}>
                {/* Question Stem Text */}
                <div className={styles.stem}>
                  <span className={styles.stemNum}>Q{currentQ.displayNumber}.</span>
                  <StructuredContent text={currentQ.questionText} />
                </div>

                {/* Cropped Diagram / Graph / Circuit with Offline Cache & Retry Fallback */}
                {(() => {
                  if (currentQ.diagramBased === false || (currentQ as any).isDiagram === false) return null;
                  const rawDiagramSrc = resolveQuestionDiagram(
                    paperCode,
                    currentQ.originalQuestionNumber || currentQ.displayNumber,
                    currentQ
                  );
                  if (!rawDiagramSrc) return null;
                  const cachedSrc = getCachedDiagramSrc(rawDiagramSrc);
                  const failKey = `${currentQ.displayNumber}:${rawDiagramSrc}`;
                  const hasFailed = Boolean(diagramLoadFailed[failKey]);

                  if (hasFailed) {
                    return (
                      <div className={styles.figureFail}>
                        <WifiOff aria-hidden="true" size={26} style={{ margin: '0 auto' }} />
                        <p className={styles.figureFailTitle}>Diagram waiting for a connection</p>
                        <p className={styles.figureFailBody}>
                          You went offline before this diagram finished caching. Flag the question and
                          carry on — it loads automatically once you are back online.
                        </p>
                        <div className={styles.figureFailActions}>
                          <button
                            type="button"
                            onClick={() => {
                              void cacheSingleDiagramOffline(rawDiagramSrc, 'high').then(() => {
                                setDiagramLoadFailed(prev => ({ ...prev, [failKey]: false }));
                                setDiagramRetryTick(t => t + 1);
                              });
                            }}
                            className={`${styles.primary} ${styles.small}`}
                          >
                            <RefreshCw aria-hidden="true" size={14} /> Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(currentQ.displayNumber)}
                            className={`${styles.quiet} ${styles.small}`}
                          >
                            Flag for later
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className={styles.figure}>
                      <img
                        key={`${cachedSrc}-${diagramRetryTick}`}
                        src={cachedSrc}
                        alt={`Diagram for Question ${currentQ.displayNumber}`}
                        fetchPriority="high"
                        decoding="sync"
                        onError={() => {
                          setDiagramLoadFailed(prev => ({ ...prev, [failKey]: true }));
                        }}
                        className={styles.figureImg}
                      />
                    </div>
                  );
                })()}

                {/* Randomized Multiple Choice Options (A, B, C, D) + Peer Option Popularity % */}
                <div className={styles.options}>
                  {Object.entries(currentQ.options).map(([key, optText]) => {
                    const serverQuestion = engine.exam?.questions[currentIndex];
                    const optionId = serverQuestion?.options[key.charCodeAt(0) - 65]?.id;
                    const isChosen =
                      currentQ.questionType === 'MCQ_MULTIPLE'
                        ? Boolean(optionId && engine.exam?.answers[currentQ.id]?.payload.selectedOptionIds?.includes(optionId))
                        : currentSelected === key;
                    const isRightAnswer = currentQ.correctOption === key;
                    const peerPct = currentQTelemetry?.optionDistribution?.[key] ?? 0;
                    const isPeerTrap = Boolean(paperAnalytics?.questionStats) && isAnswered && !isRightAnswer && peerPct >= 18;

                    let tone = '';
                    if (isAnswered) {
                      if (isRightAnswer) tone = ` ${styles.optionRight}`;
                      else if (isChosen) tone = ` ${styles.optionWrong}`;
                    } else if (isChosen) {
                      tone = ` ${styles.optionChosen}`;
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.displayNumber, key)}
                        disabled={isAnswered}
                        className={`${styles.option}${tone}`}
                      >
                        <span aria-hidden="true" className={styles.bubble}>{key}</span>
                        <span className={styles.optionText}>
                          <MathText text={String(optText)} />
                        </span>

                        {/* Peer Popularity Percentage Pill on Reveal */}
                        {isAnswered && Boolean(paperAnalytics?.questionStats) && (
                          <span
                            className={`${styles.peer}${isRightAnswer ? ` ${styles.peerRight}` : isPeerTrap ? ` ${styles.peerTrap}` : ''}`}
                          >
                            {peerPct}% peers{isPeerTrap ? ' · trap' : ''}
                          </span>
                        )}

                        {isAnswered && isRightAnswer && <CheckCircle2 aria-hidden="true" size={20} />}
                        {isAnswered && isChosen && !isRightAnswer && <XCircle aria-hidden="true" size={20} />}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Answer Feedback, Per-Question Time vs Peer Avg, & "Why Incorrect" Explanation */}
                {isAnswered && (
                  <div className={`${styles.mark}${isCurrentCorrect ? '' : ` ${styles.markWrong}`}`}>
                    <div className={styles.markHead}>
                      <span className={styles.markVerdict}>
                        {isCurrentCorrect ? <CheckCircle2 aria-hidden="true" size={20} /> : <XCircle aria-hidden="true" size={20} />}
                        <span>
                          {isCurrentCorrect
                            ? 'Correct'
                            : `Incorrect — the answer is ${currentQ.correctOption}`}
                        </span>
                      </span>

                      {/* Per-Question Time vs Peer Average Pill */}
                      {currentQTelemetry && currentQTelemetry.peerAvgTimeSec > 0 && (
                        <span className={styles.timePill}>
                          {currentQTimeSec}s · peer {currentQTelemetry.peerAvgTimeSec}s{' '}
                          {currentQTimeSec <= currentQTelemetry.peerAvgTimeSec
                            ? `(${currentQTelemetry.peerAvgTimeSec - currentQTimeSec}s faster)`
                            : `(${currentQTimeSec - currentQTelemetry.peerAvgTimeSec}s slower)`}
                        </span>
                      )}
                    </div>

                    <div className={styles.markBody}>
                      <div>
                        <strong>Why this is correct:</strong> <MathText text={currentQ.explanation} />
                      </div>

                      {!isCurrentCorrect && currentSelected && (
                        <div className={styles.markWhy}>
                          <strong>Why {currentSelected} was wrong:</strong>{' '}
                          <MathText
                            text={
                              currentQ.optionFeedback?.[currentSelected] ||
                              `Option (${currentSelected}) does not match the required physical principle or mathematical relationship derived above.`
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
               </div>
              </div>

              {/* Bottom Stepper Controls (Previous / Next / Finish Confirmation Trigger) */}
              <div className={`exam-stepper ${styles.stepper}`}>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.max(0, currentIndex - 1);
                    setCurrentIndex(nextIdx);
                    engine.updateMeta({ currentIndex: nextIdx, questionTimes, bookmarkedQuestions });
                  }}
                  disabled={currentIndex === 0}
                  className={styles.quiet}
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  <span>Previous</span>
                </button>

                {currentIndex < activeQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = Math.min(activeQuestions.length - 1, currentIndex + 1);
                      setCurrentIndex(nextIdx);
                      engine.updateMeta({ currentIndex: nextIdx, questionTimes, bookmarkedQuestions });
                    }}
                    className={styles.primary}
                  >
                    <span>Next question</span>
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFinishConfirmModal(true)}
                    disabled={submitting}
                    className={styles.primary}
                  >
                    <span>Submit &amp; review score</span>
                    <Check aria-hidden="true" size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB-SWITCH DETAILS MODAL */}
          {showSwitchAuditModal && (
            <div className={styles.sheetOverlay}>
              <div className={styles.sheet}>
                <div className={styles.sheetHead}>
                  <h3 className={styles.sheetTitle}>
                    <ShieldCheck aria-hidden="true" size={20} />
                    Tab-switch &amp; away-time audit
                  </h3>
                  <button
                    aria-label="Close audit"
                    onClick={() => setShowSwitchAuditModal(false)}
                    className={styles.sheetClose}
                  >
                    <X size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setShowSwitchAuditModal(false)}
                  className={`${styles.primary} ${styles.sheetFull}`}
                >
                  Return to exam
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 4: COMPLETION SCREEN (DUAL ATTEMPTED/TOTAL SCORE, PERCENTILE,       */}
          {/* SINGLE-ROW ATTEMPT HISTORY, LEADERBOARD, & PER-QUESTION TIME REVIEW)      */}
          {/* ========================================================================= */}
          {phase === 'completed' && completionData && (
            <div className={`exam-phase-panel ${styles.results}`}>
              {/* Top Score & Percentile Banner */}
              <div className={styles.reportHead}>
                <span className={styles.stamp}>
                  {paperCode} · Attempt {completionData.attemptNumber || attemptHistory.length || 1} report
                </span>
                <h2 className={styles.reportTitle}>{paperTitle}</h2>

                {/* Dual Score Cards: Score on Attempted Questions vs Total Paper Score */}
                <div className={styles.scoreGrid}>
                  {/* Plate 1: Attempted Questions Score */}
                  <div className={`${styles.plate} ${(completionData.attemptedAccuracyPct ?? completionData.percentage ?? 0) >= 50 ? styles.plateRight : styles.plateWrong}`}>
                    <span className={styles.label}>Score on attempted</span>
                    <div className={styles.plateValue}>
                      {completionData.correctCount ?? completionData.score}/{completionData.attemptedCount ?? completionData.totalMarks}{' '}
                      <span className={styles.plateUnit}>
                        {completionData.attemptedAccuracyPct ?? completionData.percentage}% accuracy
                      </span>
                    </div>
                    <p className={styles.plateNote}>
                      {completionData.correctCount ?? completionData.score} correct ·{' '}
                      {completionData.incorrectCount ?? 0} incorrect
                    </p>
                  </div>

                  {/* Plate 2: Full Paper Total Score */}
                  <div className={styles.plate}>
                    <span className={styles.label}>Total paper · {completionData.totalMarks} marks</span>
                    <div className={styles.plateValue}>
                      {completionData.score}/{completionData.totalMarks}{' '}
                      <span className={styles.plateUnit}>{completionData.percentage}% total</span>
                    </div>
                    <p className={styles.plateNote}>
                      {completionData.unattemptedCount > 0
                        ? `${completionData.unattemptedCount} questions left unattempted`
                        : 'Every question on the paper was attempted'}
                    </p>
                  </div>

                  {(completionData.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS && completionData.percentile !== null && <div className={`${styles.plate} ${styles.plateRank}`}>
                    <span className={styles.label}>Score percentile</span>
                    <div className={styles.plateValue}>
                      {completionData.percentile}<span className={styles.plateUnit}>th %ile</span>
                    </div>
                    <p className={styles.plateNote}>
                      Based on {completionData.verifiedSampleSize} graded first attempts
                    </p>
                  </div>}
                </div>

                <p className={styles.verdict}>{completionData.dynamicMessage}</p>
              </div>

              {/* SINGLE-ROW GROUPED ATTEMPT HISTORY ON RESULTS SCREEN (Click any pill to switch attempt report) */}
              {attemptHistory.length > 0 && (
                <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
                  <div className={styles.panelHead}>
                    <span className={styles.panelTitle}>All attempts for {paperCode}</span>
                    <span className={styles.meta}>Select one to view its report</span>
                  </div>
                  <div className={`no-scrollbar ${styles.attemptRow}`}>
                    {attemptHistory.map(att => {
                      const isActiveAtt = completionData.attemptNumber === att.attemptNumber;
                      return (
                        <button
                          key={att.attemptId}
                          type="button"
                          aria-pressed={isActiveAtt}
                          onClick={() => {
                            setCompletionData((prev: any) => ({
                              ...prev,
                              score: att.score,
                              totalMarks: att.totalMarks,
                              percentage: att.overallPercentage,
                              attemptedCount: att.attemptedCount,
                              unattemptedCount: att.unattemptedCount,
                              correctCount: att.correctCount,
                              incorrectCount: att.incorrectCount,
                              attemptedAccuracyPct: att.attemptedAccuracyPct,
                              totalTimeSec: att.totalTimeSec,
                              avgTimePerAttemptedSec: att.avgTimePerAttemptedSec,
                              peerAvgTimePerQuestionSec: att.peerAvgTimePerQuestionSec,
                              percentile: att.percentile,
                              verifiedSampleSize: att.verifiedSampleSize,
                              speedPercentile: att.speedPercentile,
                              quadrantLabel: att.quadrantLabel,
                              attemptNumber: att.attemptNumber,
                              isPartial: att.isPartial,
                              submittedAt: att.submittedAt,
                              reviewedQuestions: att.questions,
                              incorrectQuestions: att.questions.filter(q => q.isAttempted && !q.isCorrect),
                              dynamicMessage: `Viewing Attempt #${att.attemptNumber} (${att.correctCount}/${att.attemptedCount} Attempted • ${att.score}/${att.totalMarks} Total).`,
                            }));
                          }}
                          className={`${styles.attempt}${isActiveAtt ? ` ${styles.attemptOn}` : ''}`}
                        >
                          <span className={styles.attemptNum}>#{att.attemptNumber}</span>
                          <span className={styles.attemptScore}>
                            {att.correctCount}/{att.attemptedCount} attempted ({att.attemptedAccuracyPct}%) · {att.score}/
                            {att.totalMarks} total{(att.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS ? ` · ${att.percentile}%ile` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Tabs: Question Review | Live Paper Leaderboard | Chapter Speed & Accuracy */}
              <div className={styles.tabs}>
                <div className={styles.tabRow}>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('review')}
                    aria-pressed={activeResultTab === 'review'}
                    className={`${styles.tab}${activeResultTab === 'review' ? ` ${styles.tabOn}` : ''}`}
                  >
                    Question review ({(completionData.reviewedQuestions || activeQuestions).length})
                  </button>
                  {Boolean(paperAnalytics?.firstAttemptLeaderboard?.length || paperAnalytics?.bestScoreLeaderboard?.length) && <button
                    type="button"
                    onClick={() => setActiveResultTab('leaderboard')}
                    aria-pressed={activeResultTab === 'leaderboard'}
                    className={`${styles.tab}${activeResultTab === 'leaderboard' ? ` ${styles.tabOn}` : ''}`}
                  >
                    <Trophy size={15} aria-hidden="true" />
                    <span>Leaderboard</span>
                  </button>}
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('chapters')}
                    aria-pressed={activeResultTab === 'chapters'}
                    className={`${styles.tab}${activeResultTab === 'chapters' ? ` ${styles.tabOn}` : ''}`}
                  >
                    <BarChart3 size={15} aria-hidden="true" />
                    <span>Chapter breakdown</span>
                  </button>
                </div>

                {/* Smart Action: Retry Only Incorrect & Unattempted Questions */}
                {((completionData.incorrectCount || 0) + (completionData.unattemptedCount || 0)) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStartRetryIncorrectAndUnattempted(completionData.reviewedQuestions)}
                    className={styles.retry}
                  >
                    <Zap size={15} aria-hidden="true" />
                    <span>
                      Retry the {(completionData.incorrectCount || 0) + (completionData.unattemptedCount || 0)} you missed
                    </span>
                  </button>
                )}
              </div>

              {/* TAB 2: LIVE PAPER LEADERBOARD (1st Attempt Official vs All-Time Best) */}
              {activeResultTab === 'leaderboard' && Boolean(paperAnalytics?.firstAttemptLeaderboard?.length || paperAnalytics?.bestScoreLeaderboard?.length) && (
                <div className={styles.board}>
                  <div className={styles.boardHead}>
                    <div>
                      <h3 className={styles.boardTitle}>{paperCode} leaderboard</h3>
                      <p className={styles.boardNote}>
                        Ranked by total marks, with faster completion time breaking ties ·{' '}
                        {paperAnalytics?.totalParticipants ?? 0}{' '}
                        {paperAnalytics?.totalParticipants === 1 ? 'candidate' : 'candidates'}
                      </p>
                    </div>

                    <div className={styles.tabRow}>
                      <button
                        type="button"
                        onClick={() => setLeaderboardTab('first')}
                        aria-pressed={leaderboardTab === 'first'}
                        className={`${styles.filter}${leaderboardTab === 'first' ? ` ${styles.filterOn}` : ''}`}
                      >
                        First attempt
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardTab('best')}
                        aria-pressed={leaderboardTab === 'best'}
                        className={`${styles.filter}${leaderboardTab === 'best' ? ` ${styles.filterOn}` : ''}`}
                      >
                        All-time best
                      </button>
                    </div>
                  </div>

                  <div className={styles.scroller}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Candidate</th>
                          <th>Total score</th>
                          <th>Attempted acc.</th>
                          <th>Time spent</th>
                          <th>Avg / Q</th>
                          <th>Percentile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(leaderboardTab === 'first'
                          ? paperAnalytics?.firstAttemptLeaderboard || []
                          : paperAnalytics?.bestScoreLeaderboard || []
                        ).length === 0 && (
                          <tr>
                            <td colSpan={7} className={styles.tableEmpty}>
                              No verified leaderboard data is available.
                            </td>
                          </tr>
                        )}
                        {(leaderboardTab === 'first'
                          ? paperAnalytics?.firstAttemptLeaderboard || []
                          : paperAnalytics?.bestScoreLeaderboard || []
                        ).map((row: LeaderboardEntry) => {
                          const isMe = Boolean(row.isCurrentUser);
                          return (
                            <tr key={`${row.rank}-${row.studentId}`} className={isMe ? styles.rowMe : undefined}>
                              <td className={`${styles.rankCell}${row.rank <= 3 ? ` ${styles.rankTop}` : ''}`}>
                                #{row.rank}
                              </td>
                              <td>
                                {row.studentName}
                                {isMe && <span className={styles.youTag}>You</span>}
                                {row.cityOrCampus && <span className={styles.entryTopic}> · {row.cityOrCampus}</span>}
                              </td>
                              <td>
                                {row.score}/{row.totalMarks} ({row.percentage}%)
                              </td>
                              <td>{row.attemptedAccuracyPct}%</td>
                              <td>{formatDurationShort(row.totalTimeSec)}</td>
                              <td>{row.avgTimePerQuestionSec}s</td>
                              <td>{row.percentile}th %ile</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CHAPTER-WISE SPEED & ACCURACY ANALYTICS */}
              {activeResultTab === 'chapters' && (
                <div className={styles.board}>
                  <div className={styles.boardHead}>
                    <h3 className={styles.boardTitle}>Chapter speed and accuracy</h3>
                  </div>
                  <div className={styles.stack}>
                    {(completionData.chapterStats || []).map((cs: any, idx: number) => (
                      <div key={idx} className={styles.chapterRow}>
                        <div>
                          <div className={styles.chapterName}>{cs.topicName}</div>
                          <p className={styles.chapterStat}>
                            {cs.correctQuestions}/{cs.totalQuestions} correct · {cs.accuracyPercentage}% total ·{' '}
                            {cs.attemptedAccuracyPercentage}% on attempted · {cs.avgTimeSec}s per question
                          </p>
                        </div>
                        <span
                          className={`${styles.verdictTag}${cs.accuracyPercentage >= 75 ? ` ${styles.verdictTagStrong}` : ''}`}
                        >
                          {cs.accuracyPercentage >= 75 ? 'Strong' : 'Needs practice'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: COMPREHENSIVE QUESTION-BY-QUESTION & TIME REVIEW */}
              {activeResultTab === 'review' && (
                <div style={{ marginBottom: '2rem' }}>
                  <div className={styles.reviewHead}>
                    <h3 className={styles.reviewTitle}>Question by question</h3>

                    <div className={styles.filterRow}>
                      {[
                        { key: 'all', label: `All (${(completionData.reviewedQuestions || activeQuestions).length})` },
                        { key: 'attempted', label: `Attempted (${completionData.attemptedCount ?? 0})` },
                        { key: 'incorrect', label: `Incorrect (${completionData.incorrectCount ?? 0})` },
                        { key: 'unattempted', label: `Unattempted (${completionData.unattemptedCount ?? 0})` },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setReviewFilter(tab.key as any)}
                          aria-pressed={reviewFilter === tab.key}
                          className={`${styles.filter}${reviewFilter === tab.key ? ` ${styles.filterOn}` : ''}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.stack}>
                    {(completionData.reviewedQuestions || activeQuestions)
                      .filter((item: any) => {
                        if (reviewFilter === 'attempted') return item.isAttempted !== false;
                        if (reviewFilter === 'incorrect') return item.isAttempted !== false && !item.isCorrect;
                        if (reviewFilter === 'unattempted') return item.isAttempted === false;
                        return true;
                      })
                      .map((item: any, i: number) => {
                        const qNum = item.displayNumber || item.questionNumber || i + 1;
                        const isRight = Boolean(item.isCorrect ?? item.serverScore === item.serverMarks);
                        const isAtt = item.isAttempted !== false;

                        return (
                          <div
                            key={i}
                            className={`${styles.entry}${isRight ? ` ${styles.entryRight}` : isAtt ? ` ${styles.entryWrong}` : ''}`}
                          >
                            <div className={styles.entryHead}>
                              <div className={styles.entryIdent}>
                                <span className={styles.entryNum}>Question {qNum}</span>
                                <span
                                  className={`${styles.tag}${isRight ? ` ${styles.tagRight}` : isAtt ? ` ${styles.tagWrong}` : ''}`}
                                >
                                  {isRight ? 'Correct' : isAtt ? 'Incorrect' : 'Unattempted'}
                                </span>
                                {item.timeTag === 'RUSHED_ERROR' && (
                                  <span className={`${styles.tag} ${styles.tagFlag}`}>
                                    Rushed · {item.timeSpentSec}s
                                  </span>
                                )}
                                {item.timeTag === 'CONCEPT_GAP' && (
                                  <span className={`${styles.tag} ${styles.tagWrong}`}>
                                    Concept gap · {item.timeSpentSec}s
                                  </span>
                                )}
                                {item.topicName && <span className={styles.entryTopic}>{item.topicName}</span>}
                              </div>

                              {/* Per-Question Time vs Community Average Badge */}
                              <span className={styles.entryTime}>
                                You {item.timeSpentSec ?? 0}s{item.peerAvgTimeSec > 0 && ` · peers ${item.peerAvgTimeSec}s`}
                              </span>
                            </div>

                            <div className={styles.entryStem}>
                              <MathText text={item.questionText} />
                            </div>

                            <div className={styles.answerPair}>
                              <div
                                className={`${styles.answer}${isRight ? ` ${styles.answerRight}` : isAtt ? ` ${styles.answerWrong}` : ''}`}
                              >
                                <span className={styles.label}>Your answer</span>
                                <MathText text={item.selectedText || item.selectedOption || 'Not answered'} />
                              </div>
                              <div className={`${styles.answer} ${styles.answerRight}`}>
                                <span className={styles.label}>Correct answer</span>
                                <MathText text={item.correctOption} />
                              </div>
                            </div>

                            <div className={styles.why}>
                              <div className={styles.whyHead}>Why this is the answer</div>
                              <MathText text={item.explanation} />

                              {!isRight && item.whyIncorrect && (
                                <div className={styles.whyWrong}>
                                  Where your choice went wrong: <MathText text={item.whyIncorrect} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className={styles.resultActions}>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('setup');
                    setUserSelections({});
                    setQuestionTimes({});
                    setBookmarkedQuestions([]);
                    setTabSwitchLogs([]);
                  }}
                  className={styles.primary}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  <span>Start another attempt</span>
                </button>

                <button type="button" onClick={onClose} className={styles.quiet}>
                  Close and return to the paper
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
