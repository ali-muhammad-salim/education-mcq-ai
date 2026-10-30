'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Clock,
  ArrowRight, ArrowLeft, ShieldCheck, Award, RotateCcw,
  Eye, Check, X, Maximize, Minimize, Info, ShieldAlert,
  Bookmark, Trophy, BarChart3, Zap, WifiOff, RefreshCw, Play
} from 'lucide-react';
import MathText from '@/components/MathText';
import AuthModal from '@/components/AuthModal';
import { useDialog } from '@/lib/use-dialog';
import { useSecureExam } from '@/lib/use-secure-exam';
import { z } from 'zod';
import StructuredContent from '@/components/StructuredContent';
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

    // Teacher-created quizzes have no public answer key. Use the authoritative
    // result endpoint, which applies the teacher's score and answer-release rules.
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

    // A percentile needs actual peer attempts; a score cannot establish one.
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

    // Only the graded server attempt can supply a peer percentile. Never post a client score.
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowFinishConfirmModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '1.85rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              border: '1.5px solid #e2e8f0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                  Navigation Locked During Exam
                </div>
                <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Finish the Quiz First?
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.55, margin: '0 0 1.1rem 0' }}>
              You cannot go back while the examination is active. Are you sure you want to finish and submit the quiz now?
              {liveAttemptedStats.unattempted > 0
                ? ' Your score will be calculated for both the questions you attempted and the full paper.'
                : ' You have answered all questions in this assessment.'}
            </p>

            {/* Live Progress Summary inside Confirmation Modal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.6rem',
              marginBottom: '1.35rem',
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Attempted</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b5e4a' }}>
                  {liveAttemptedStats.attempted} / {activeQuestions.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Unattempted</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: liveAttemptedStats.unattempted > 0 ? '#d97706' : '#059669' }}>
                  {liveAttemptedStats.unattempted}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Current Score</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {liveAttemptedStats.correct}/{liveAttemptedStats.attempted || 0} ({liveAttemptedStats.accuracy}%)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowFinishConfirmModal(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmFinishQuiz(false)}
                disabled={submitting}
                style={{
                  flex: 1.25,
                  background: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(11, 94, 74, 0.25)'
                }}
              >
                {submitting ? 'Submitting...' : 'Yes, Finish & View Score'}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowResumePromptModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '1.85rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              border: '1.5px solid #e2e8f0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                color: '#0b5e4a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Play size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a', textTransform: 'uppercase' }}>
                  Saved Progress Found
                </div>
                <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Continue or Start from Beginning?
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
              You have an unfinished attempt for <strong>{paperTitle}</strong> with{' '}
              <strong>{savedResumeInfo.answeredCount} of {savedResumeInfo.totalCount} questions</strong> answered. How would you like to proceed?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => launchQuizSession(false)}
                style={{
                  background: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  boxShadow: '0 4px 14px rgba(11, 94, 74, 0.22)'
                }}
              >
                <div>
                  <div>Continue Where You Left Off (Question {savedResumeInfo.lastQuestionNum})</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, opacity: 0.9, marginTop: '2px' }}>
                    Restores your {savedResumeInfo.answeredCount} locked answers & remaining timer ({savedResumeInfo.remainingMinutes}m left)
                  </div>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => launchQuizSession(true)}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left'
                }}
              >
                <div>
                  <div>Start Fresh from Beginning (Question 1)</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>
                    Resets previous selections and begins a brand-new timed attempt
                  </div>
                </div>
                <RotateCcw size={17} color="#475569" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        {...dialogProps}
        id="quiz-modal-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: phase === 'active' || phase === 'completed' ? 0 : '1rem',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'auto',
          WebkitUserSelect: 'auto',
          overflow: 'hidden'
        }}
      >
        <div
          id="quiz-modal-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--text-color, #1e293b)',
            borderRadius: phase === 'active' || phase === 'completed' ? '0px' : '20px',
            maxWidth: phase === 'active' || phase === 'completed' ? '100vw' : '680px',
            width: phase === 'active' || phase === 'completed' ? '100vw' : '100%',
            height: phase === 'active' || phase === 'completed' ? '100dvh' : 'auto',
            maxHeight: phase === 'active' || phase === 'completed' ? '100dvh' : '94dvh',
            overflowY: phase === 'active' ? 'hidden' : 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top Status & Offline Diagram Cache Readiness Strip during Active Quiz */}
          {phase === 'active' && (
            <div
              role="status"
              style={{
                padding: '6px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
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
                  <button onClick={engine.reload} style={{ marginLeft: 12, fontWeight: 700, color: '#0b5e4a', cursor: 'pointer', border: 'none', background: 'transparent' }}>
                    Retry
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {diagramCacheProgress.totalDiagrams > 0 && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: diagramCacheProgress.ready ? '#059669' : '#d97706',
                    background: diagramCacheProgress.ready ? '#ecfdf5' : '#fffbeb',
                    border: `1px solid ${diagramCacheProgress.ready ? '#a7f3d0' : '#fde68a'}`,
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    {diagramCacheProgress.ready
                      ? `✅ Offline Ready (${diagramCacheProgress.totalDiagrams}/${diagramCacheProgress.totalDiagrams} Diagrams Cached)`
                      : `⏳ Caching diagrams for offline use (${diagramCacheProgress.cachedCount}/${diagramCacheProgress.totalDiagrams})…`}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Attempted Score: <strong style={{ color: '#0b5e4a' }}>{liveAttemptedStats.correct}/{liveAttemptedStats.attempted}</strong> ({liveAttemptedStats.accuracy}%)
                </span>
              </div>
            </div>
          )}

          {/* Global Close Button (In active mode, triggers the Finish Confirmation modal) */}
          {phase !== 'active' && (
            <button
              aria-label="Close assessment"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                zIndex: 10
              }}
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
            <div className="exam-phase-panel" style={{ padding: '2.25rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.15rem' }}>
                <div style={{ background: '#0b5e4a', color: '#ffffff', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                  <Award size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0b5e4a', background: '#e8f5f1', padding: '2px 8px', borderRadius: '4px' }}>
                    {paperCode}
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                    {paperTitle} — Quiz Setup
                  </h2>
                </div>
              </div>

              {/* Unfinished Attempt Quick-Resume Banner */}
              {savedResumeInfo && savedResumeInfo.answeredCount > 0 && (
                <div style={{
                  background: '#ecfdf5',
                  border: '1.5px solid #6ee7b7',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                      Unfinished Attempt Saved on Device
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#064e3b', marginTop: '2px' }}>
                      Question {savedResumeInfo.lastQuestionNum} of {savedResumeInfo.totalCount} • {savedResumeInfo.answeredCount} Answered • {savedResumeInfo.remainingMinutes}m left
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => launchQuizSession(false)}
                      style={{
                        background: '#0b5e4a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Continue Where Left Off
                    </button>
                    <button
                      type="button"
                      onClick={() => launchQuizSession(true)}
                      style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Start Fresh
                    </button>
                  </div>
                </div>
              )}

              {/* SINGLE-ROW GROUPED ATTEMPT HISTORY (Click any attempt pill to view its full details) */}
              {attemptHistory.length > 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.95rem 1.15rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Trophy size={15} color="#0b5e4a" />
                      <span>Your Attempts on {paperCode} ({attemptHistory.length} in 1 Row — Click Any to Inspect)</span>
                    </div>
                    {selectedHistoryAttempt && (
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryAttempt(null)}
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Hide Details ✕
                      </button>
                    )}
                  </div>

                  {/* Single Horizontal Row of Attempt Pills */}
                  <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {attemptHistory.map(att => {
                      const isSelected = selectedHistoryAttempt?.attemptId === att.attemptId;
                      return (
                        <button
                          key={att.attemptId}
                          type="button"
                          onClick={() => setSelectedHistoryAttempt(isSelected ? null : att)}
                          style={{
                            flexShrink: 0,
                            padding: '7px 12px',
                            borderRadius: '9px',
                            border: isSelected ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            color: '#0f172a',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <span style={{
                            background: '#0b5e4a',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '5px'
                          }}>
                            #{att.attemptNumber}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                              {att.isPartial
                                ? `${att.correctCount}/${att.attemptedCount} Attempted (${att.attemptedAccuracyPct}%) • ${att.score}/${att.totalMarks} Total`
                                : `${att.score}/${att.totalMarks} (${att.overallPercentage}%)`}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                              ⏱ {formatDurationShort(att.totalTimeSec)}{(att.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS ? ` • ${att.percentile}th %ile` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expandable Attempt Details Drawer when a user clicks an attempt pill */}
                  {selectedHistoryAttempt && (
                    <div style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0b5e4a', fontSize: '0.88rem' }}>
                            Attempt #{selectedHistoryAttempt.attemptNumber} Breakdown
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '8px' }}>
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
                          style={{
                            background: '#0b5e4a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Open Full Question Review →
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Attempted Score</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0b5e4a' }}>
                            {selectedHistoryAttempt.correctCount}/{selectedHistoryAttempt.attemptedCount} ({selectedHistoryAttempt.attemptedAccuracyPct}%)
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Paper Score</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            {selectedHistoryAttempt.score}/{selectedHistoryAttempt.totalMarks} ({selectedHistoryAttempt.overallPercentage}%)
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Avg Time / Q</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            {selectedHistoryAttempt.avgTimePerAttemptedSec}s{selectedHistoryAttempt.peerAvgTimePerQuestionSec > 0 ? ` (Peer ${selectedHistoryAttempt.peerAvgTimePerQuestionSec}s)` : ''}
                          </div>
                        </div>
                        {(selectedHistoryAttempt.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS && <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Percentile</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>
                            {selectedHistoryAttempt.percentile}th %ile
                          </div>
                        </div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Student Identified Badge */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Candidate Logged In:</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                    {student?.name || 'Sign in to save your attempt'}
                  </div>
                </div>
                <button
                  onClick={() => setPhase('auth')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Change Candidate
                </button>
              </div>

              {/* Timer Preference Option */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.6rem' }}>
                  1. Examination Timer & Mode
                </label>

                <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsTimed(true)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: isTimed ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                      background: isTimed ? '#ecfdf5' : '#ffffff',
                      color: isTimed ? '#0b5e4a' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                      <Clock size={16} />
                      <span>Timed Examination</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Official exam countdown timer
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!preview?.practice}
                    onClick={() => setIsTimed(false)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: !isTimed ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                      background: !isTimed ? '#ecfdf5' : '#ffffff',
                      color: !isTimed ? '#0b5e4a' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                      <Sparkles size={16} />
                      <span>Extended Practice (24 hours)</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Study questions at your own pace
                    </div>
                  </button>
                </div>

                {isTimed && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Select Exam Duration:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[15, 30, 50].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          disabled={!preview?.practice}
                          onClick={() => setSelectedDurationMin(mins)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: selectedDurationMin === mins ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                            background: selectedDurationMin === mins ? '#0b5e4a' : '#ffffff',
                            color: selectedDurationMin === mins ? '#ffffff' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer'
                          }}
                        >
                          {mins} Minutes {mins === 50 ? '(Official)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Offline Cache & Feature Readiness Notice */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', color: '#854d0e', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={17} />
                    <span>Quiz practice and answer review</span>
                  </div>
                  {diagramCacheProgress.totalDiagrams > 0 && (
                    <span style={{ fontSize: '0.75rem', background: '#fef08a', padding: '2px 8px', borderRadius: '999px' }}>
                      {diagramCacheProgress.ready
                        ? `✓ All ${diagramCacheProgress.totalDiagrams} Diagrams Pre-Cached`
                        : `Pre-caching diagrams (${diagramCacheProgress.cachedCount}/${diagramCacheProgress.totalDiagrams})`}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#713f12', lineHeight: 1.55 }}>
                  • <strong>Saved progress:</strong> Your answers are kept locally while they sync with the assessment service.<br />
                  • <strong>Answer review:</strong> Explanations appear only when the quiz settings allow them.<br />
                  • <strong>Keyboard Shortcuts:</strong> Press <kbd>A</kbd>–<kbd>D</kbd> to answer, <kbd>←</kbd>/<kbd>→</kbd> to navigate, and <kbd>F</kbd> to bookmark.
                </div>
              </div>

              {startQuizError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '1.25rem',
                  color: '#991b1b',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <span>{startQuizError}</span>
                </div>
              )}

              {/* Launch Button */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartQuizClick}
                  disabled={loadingQuizQuestions}
                  style={{
                    flex: 2,
                    background: loadingQuizQuestions ? '#94a3b8' : '#0b5e4a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: loadingQuizQuestions ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(11, 94, 74, 0.2)'
                  }}
                >
                  <span>
                    {loadingQuizQuestions
                      ? 'Loading Questions...'
                      : `Start Quiz (${preview?.count || questions?.length || activeQuestions?.length || 40} Items)`}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Fallback if Phase is Active but No Question Loaded */}
          {phase === 'active' && !currentQ && (
            <div style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              borderRadius: '16px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                {engine.error ? 'Unable to start assessment' : engine.exam ? 'No questions in this assessment' : 'Loading assessment…'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '420px', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                {engine.error || (engine.exam ? 'This assessment has no questions. Please return to the paper.' : 'Loading your saved questions. This may take a few seconds.')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhase('setup');
                  setLoadingQuizQuestions(false);
                  if (!engine.error) onClose();
                }}
                style={{
                  background: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                {engine.error ? 'Return to setup' : 'Close Examination'}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 3: ACTIVE QUIZ SCREEN                                               */}
          {/* ========================================================================= */}
          {phase === 'active' && currentQ && (
            <div
              id="aku-active-quiz-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                maxHeight: '100%',
                overflow: 'hidden',
                position: 'relative',
                filter: isWindowMasked ? 'blur(35px)' : 'none',
                transition: 'filter 0.15s ease',
                WebkitTouchCallout: 'none',
                userSelect: 'auto',
                touchAction: 'pan-y'
              }}
            >
              {/* Smooth Spring Progress Bar at Very Top */}
              <div style={{ height: '4px', width: '100%', background: '#e2e8f0', flexShrink: 0 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((liveAttemptedStats.attempted / Math.max(1, activeQuestions.length)) * 100))}%`,
                    background: 'linear-gradient(90deg, #0b5e4a, #10b981)',
                    transition: 'width 300ms cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                />
              </div>

              {cheatWarningVisible && (
                <div style={{
                  background: '#fffbeb',
                  borderBottom: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 20,
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={17} color="#d97706" />
                    <span>
                      Notice: Window departure #{tabSwitchCount} noted ({lastSwitchDuration}s away). Please remain on the examination window.
                    </span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      setCheatWarningVisible(false);
                    }}
                    style={{
                      background: 'rgba(217, 119, 6, 0.12)',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      color: '#92400e',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quiz Header Bar */}
              <div
                className="exam-header"
                style={{
                  padding: '0.85rem 1.5rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  zIndex: 2,
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0b5e4a', textTransform: 'uppercase' }}>
                      {paperCode} {isRetrySubsetMode ? '• Smart Retry Mode' : ''} • Item {currentIndex + 1} of {activeQuestions.length}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Question {currentQ.displayNumber}</span>
                      {currentQTelemetry && currentQTelemetry.peerAvgTimeSec > 0 && (
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: currentQTimeSec > currentQTelemetry.peerAvgTimeSec * 1.25 ? '#fef2f2' : '#f1f5f9',
                          color: currentQTimeSec > currentQTelemetry.peerAvgTimeSec * 1.25 ? '#dc2626' : '#475569',
                          border: '1px solid #cbd5e1'
                        }}>
                          ⏱ {currentQTimeSec}s (Peer Avg: {currentQTelemetry.peerAvgTimeSec}s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicators: Bookmark, Timer, Fullscreen, Warnings, Grid & Finish */}
                <div style={{ display: 'flex', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%', alignItems: 'center', gap: '0.55rem' }}>
                  {/* Bookmark / Flag Question Button */}
                  <button
                    type="button"
                    onClick={() => toggleBookmark(currentQ.displayNumber)}
                    title="Flag / Bookmark Question for Review (Shortcut: F)"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: bookmarkedQuestions.includes(currentQ.displayNumber) ? '#fffbeb' : '#ffffff',
                      border: bookmarkedQuestions.includes(currentQ.displayNumber) ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                      color: bookmarkedQuestions.includes(currentQ.displayNumber) ? '#b45309' : '#475569',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Bookmark size={14} fill={bookmarkedQuestions.includes(currentQ.displayNumber) ? '#f59e0b' : 'none'} />
                    <span>{bookmarkedQuestions.includes(currentQ.displayNumber) ? 'Flagged' : 'Flag'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: isFullscreen ? '#ecfdf5' : '#ffffff',
                      border: isFullscreen ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      color: isFullscreen ? '#065f46' : '#475569',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
                  </button>

                  {isTimed && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: timeLeftSeconds < 300 ? '#fef2f2' : '#ffffff',
                      border: timeLeftSeconds < 300 ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      color: timeLeftSeconds < 300 ? '#b91c1c' : '#0f172a',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      <Clock size={15} />
                      <span>{formatTime(timeLeftSeconds)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowSwitchAuditModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: tabSwitchCount > 0 || screenshotAttemptCount > 0 ? '#b91c1c' : '#059669',
                      background: tabSwitchCount > 0 || screenshotAttemptCount > 0 ? '#fef2f2' : '#ecfdf5',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: tabSwitchCount > 0 || screenshotAttemptCount > 0 ? '1px solid #fecaca' : '1px solid #a7f3d0',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} />
                    <span>👁️ {tabSwitchCount} Events</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Palette ({Object.keys(userSelections).length}/{activeQuestions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFinishConfirmModal(true)}
                    disabled={submitting}
                    style={{
                      background: '#0b5e4a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Finish Quiz'}
                  </button>
                </div>
              </div>

              {/* Quick Question Jump Drawer (Color-Coded: Correct=Green, Wrong=Red, Flagged=Amber, Unvisited=Gray) */}
              {showQuestionGrid && (
                <div
                  className="no-scrollbar exam-question-grid"
                  style={{
                    padding: '0.85rem 1.25rem',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    maxHeight: '185px',
                    overflowY: 'auto',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span>🟢 Correct</span>
                    <span>🔴 Incorrect</span>
                    <span>🟡 Flagged ({bookmarkedQuestions.length})</span>
                    <span>⚪ Unattempted ({liveAttemptedStats.unattempted})</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: '6px'
                  }}>
                    {activeQuestions.map((q, idx) => {
                      const sel = userSelections[q.displayNumber.toString()];
                      const answered = Boolean(sel);
                      const isRight = answered && q.correctOption && sel === q.correctOption;
                      const isFlagged = bookmarkedQuestions.includes(q.displayNumber);
                      const isCurrent = idx === currentIndex;

                      let bg = '#f8fafc';
                      let col = '#334155';
                      let brd = isCurrent ? '2px solid #0f172a' : '1px solid #cbd5e1';
                      if (isFlagged && !answered) {
                        bg = '#fef3c7';
                        col = '#92400e';
                        brd = '1.5px solid #f59e0b';
                      } else if (answered) {
                        bg = isRight ? '#059669' : '#dc2626';
                        col = '#ffffff';
                      }

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setShowQuestionGrid(false);
                          }}
                          style={{
                            padding: '7px 0',
                            borderRadius: '6px',
                            border: brd,
                            background: bg,
                            color: col,
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {q.displayNumber}
                          {isFlagged && (
                            <span style={{ position: 'absolute', top: '1px', right: '3px', fontSize: '0.55rem' }}>★</span>
                          )}
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
                className="aku-single-scroll aku-question-animate"
                style={{
                  padding: '1.75rem',
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain'
                }}
              >
                {/* Question Stem Text */}
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'var(--text-color, #111827)',
                  lineHeight: 1.6,
                  marginBottom: '1.25rem'
                }}>
                  <span style={{ fontWeight: 800, color: '#0b5e4a', marginRight: '6px' }}>
                    Q{currentQ.displayNumber}.
                  </span>
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
                      <div style={{
                        background: '#fffbeb',
                        border: '1.5px dashed #f59e0b',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        textAlign: 'center',
                        marginBottom: '1.25rem'
                      }}>
                        <WifiOff size={26} color="#d97706" style={{ margin: '0 auto 0.4rem auto' }} />
                        <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                          Diagram Waiting for Network Connection
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: '0.75rem' }}>
                          You went offline before this diagram finished caching. You can flag this question and continue — it will load automatically as soon as your connection returns.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              void cacheSingleDiagramOffline(rawDiagramSrc, 'high').then(() => {
                                setDiagramLoadFailed(prev => ({ ...prev, [failKey]: false }));
                                setDiagramRetryTick(t => t + 1);
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#0b5e4a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <RefreshCw size={14} /> Retry Loading Diagram
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(currentQ.displayNumber)}
                            style={{
                              background: '#ffffff',
                              color: '#92400e',
                              border: '1px solid #f59e0b',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Flag Question for Later
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <img
                        key={`${cachedSrc}-${diagramRetryTick}`}
                        src={cachedSrc}
                        alt={`Diagram for Question ${currentQ.displayNumber}`}
                        fetchPriority="high"
                        decoding="sync"
                        onError={() => {
                          setDiagramLoadFailed(prev => ({ ...prev, [failKey]: true }));
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '280px',
                          objectFit: 'contain',
                          border: '1.5px solid var(--border-color, #cbd5e1)',
                          borderRadius: '8px',
                          padding: '6px',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Randomized Multiple Choice Options (A, B, C, D) + Peer Option Popularity % */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {Object.entries(currentQ.options).map(([key, optText]) => {
                    const serverQuestion = engine.exam?.questions[currentIndex];
                    const optionId = serverQuestion?.options[key.charCodeAt(0) - 65]?.id;
                    const isChosen =
                      currentQ.questionType === 'MCQ_MULTIPLE'
                        ? Boolean(optionId && engine.exam?.answers[currentQ.id]?.payload.selectedOptionIds?.includes(optionId))
                        : currentSelected === key;
                    const isRightAnswer = currentQ.correctOption === key;
                    const peerPct = currentQTelemetry?.optionDistribution?.[key] ?? 0;
                    const isPeerTrap = Boolean(paperAnalytics) && isAnswered && !isRightAnswer && peerPct >= 18;

                    let borderStyle = '1.5px solid #e2e8f0';
                    let bgStyle = '#ffffff';
                    let textColor = '#1e293b';

                    if (isAnswered) {
                      if (isRightAnswer) {
                        borderStyle = '2px solid #059669';
                        bgStyle = '#ecfdf5';
                        textColor = '#065f46';
                      } else if (isChosen && !isRightAnswer) {
                        borderStyle = '2px solid #ef4444';
                        bgStyle = '#fef2f2';
                        textColor = '#991b1b';
                      }
                    } else if (isChosen) {
                      borderStyle = '2px solid #0b5e4a';
                      bgStyle = '#e8f5f1';
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.displayNumber, key)}
                        disabled={isAnswered}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '1rem 1.25rem',
                          borderRadius: '10px',
                          border: borderStyle,
                          background: bgStyle,
                          color: textColor,
                          textAlign: 'left',
                          cursor: isAnswered ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1.5px solid currentColor',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          {key}
                        </span>
                        <span style={{ fontSize: '0.98rem', flex: 1 }}>
                          <MathText text={String(optText)} />
                        </span>

                        {/* Peer Popularity Percentage Pill on Reveal */}
                        {isAnswered && Boolean(paperAnalytics?.questionStats) && (
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: isRightAnswer ? '#d1fae5' : isPeerTrap ? '#fef3c7' : '#f1f5f9',
                            color: isRightAnswer ? '#065f46' : isPeerTrap ? '#92400e' : '#64748b',
                            flexShrink: 0
                          }}>
                            {peerPct}% peers {isPeerTrap ? '⚠️ Trap' : ''}
                          </span>
                        )}

                        {isAnswered && isRightAnswer && <CheckCircle2 size={20} color="#059669" />}
                        {isAnswered && isChosen && !isRightAnswer && <XCircle size={20} color="#ef4444" />}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Answer Feedback, Per-Question Time vs Peer Avg, & "Why Incorrect" Explanation */}
                {isAnswered && (
                  <div style={{
                    background: isCurrentCorrect ? '#f0fdf4' : '#fff1f2',
                    border: `1.5px solid ${isCurrentCorrect ? '#86efac' : '#fecdd3'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    animation: 'akuSlideFadeIn 0.18s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.55rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: isCurrentCorrect ? '#166534' : '#9f1239'
                      }}>
                        {isCurrentCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        <span>
                          {isCurrentCorrect
                            ? 'Correct Answer! Well Done.'
                            : `Incorrect — Correct Option is (${currentQ.correctOption})`}
                        </span>
                      </div>

                      {/* Per-Question Time vs Peer Average Pill */}
                      {currentQTelemetry && currentQTelemetry.peerAvgTimeSec > 0 && (
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a'
                        }}>
                          ⏱ Your Time: <strong>{currentQTimeSec}s</strong> • Peer Avg: <strong>{currentQTelemetry.peerAvgTimeSec}s</strong>{' '}
                          {currentQTimeSec <= currentQTelemetry.peerAvgTimeSec
                            ? `(${currentQTelemetry.peerAvgTimeSec - currentQTimeSec}s Faster ⚡)`
                            : `(+${currentQTimeSec - currentQTelemetry.peerAvgTimeSec}s Slower)`}
                        </span>
                      )}
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      <div style={{ marginBottom: '0.4rem' }}>
                        <strong>Why this answer is correct:</strong> <MathText text={currentQ.explanation} />
                      </div>

                      {!isCurrentCorrect && currentSelected && (
                        <div style={{ color: '#9f1239', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                          <strong>Why your choice ({currentSelected}) was incorrect:</strong>{' '}
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

              {/* Bottom Stepper Controls (Previous / Next / Finish Confirmation Trigger) */}
              <div
                className="exam-stepper"
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  flexShrink: 0
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.max(0, currentIndex - 1);
                    setCurrentIndex(nextIdx);
                    engine.updateMeta({ currentIndex: nextIdx, questionTimes, bookmarkedQuestions });
                  }}
                  disabled={currentIndex === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: currentIndex === 0 ? '#f8fafc' : '#ffffff',
                    color: currentIndex === 0 ? '#94a3b8' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#0b5e4a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Next Question</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFinishConfirmModal(true)}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      background: '#0b5e4a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Submit & Review Score</span>
                    <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB-SWITCH DETAILS MODAL */}
          {showSwitchAuditModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '540px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={22} color="#0b5e4a" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Tab-Switch & Away Time Audit
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSwitchAuditModal(false)}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setShowSwitchAuditModal(false)}
                  style={{
                    width: '100%',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    marginTop: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Return to Active Exam
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 4: COMPLETION SCREEN (DUAL ATTEMPTED/TOTAL SCORE, PERCENTILE,       */}
          {/* SINGLE-ROW ATTEMPT HISTORY, LEADERBOARD, & PER-QUESTION TIME REVIEW)      */}
          {/* ========================================================================= */}
          {phase === 'completed' && completionData && (
            <div className="exam-phase-panel" style={{ padding: '2rem', maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
              {/* Top Score & Percentile Banner */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0b5e4a', background: '#e8f5f1', padding: '4px 12px', borderRadius: '999px' }}>
                  {paperCode} • ATTEMPT #{completionData.attemptNumber || attemptHistory.length || 1} REPORT
                </span>

                {/* Dual Score Cards: Score on Attempted Questions vs Total Paper Score */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginTop: '1.1rem',
                  marginBottom: '1rem'
                }}>
                  {/* Card 1: Attempted Questions Score */}
                  <div style={{
                    background: '#ecfdf5',
                    border: '2px solid #10b981',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                      Score on Attempted Questions
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#064e3b', margin: '0.2rem 0' }}>
                      {completionData.correctCount ?? completionData.score} / {completionData.attemptedCount ?? completionData.totalMarks}{' '}
                      <span style={{ fontSize: '1.15rem', color: '#059669' }}>
                        ({completionData.attemptedAccuracyPct ?? completionData.percentage}% Accuracy)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>
                      ✓ {completionData.correctCount ?? completionData.score} Correct • ✗ {completionData.incorrectCount ?? 0} Incorrect
                    </div>
                  </div>

                  {/* Card 2: Full Paper Total Score */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Total Paper Score (All {completionData.totalMarks} Marks)
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
                      {completionData.score} / {completionData.totalMarks}{' '}
                      <span style={{ fontSize: '1.15rem', color: '#475569' }}>
                        ({completionData.percentage}% Total)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                      {completionData.unattemptedCount > 0
                        ? `${completionData.unattemptedCount} Unattempted Questions Remaining`
                        : 'All 100% of Paper Questions Attempted'}
                    </div>
                  </div>

                  {(completionData.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS && completionData.percentile !== null && <div style={{
                    background: '#eff6ff',
                    border: '1.5px solid #93c5fd',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                      Score percentile
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e3a8a', margin: '0.2rem 0' }}>
                      {completionData.percentile}th %ile
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>
                      Based on {completionData.verifiedSampleSize} graded first attempts
                    </div>
                  </div>}
                </div>

                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: '0.5rem auto 0 auto' }}>
                  {completionData.dynamicMessage}
                </p>
              </div>

              {/* SINGLE-ROW GROUPED ATTEMPT HISTORY ON RESULTS SCREEN (Click any pill to switch attempt report) */}
              {attemptHistory.length > 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '0.9rem 1.15rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                    All Attempts for {paperCode} (Click Any Attempt in This Row to View Its Full Details):
                  </div>
                  <div className="no-scrollbar" style={{ display: 'flex', gap: '0.55rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {attemptHistory.map(att => {
                      const isActiveAtt = completionData.attemptNumber === att.attemptNumber;
                      return (
                        <button
                          key={att.attemptId}
                          type="button"
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
                          style={{
                            flexShrink: 0,
                            padding: '7px 12px',
                            borderRadius: '9px',
                            border: isActiveAtt ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                            background: isActiveAtt ? '#ecfdf5' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <span style={{
                            background: isActiveAtt ? '#0b5e4a' : '#475569',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '5px'
                          }}>
                            Attempt #{att.attemptNumber}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                            {att.correctCount}/{att.attemptedCount} Attempted ({att.attemptedAccuracyPct}%) • {att.score}/{att.totalMarks} Total{(att.verifiedSampleSize ?? 0) >= MIN_PERCENTILE_ATTEMPTS ? ` • ${att.percentile}%ile` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Tabs: Question Review | Live Paper Leaderboard | Chapter Speed & Accuracy */}
              <div style={{
                display: 'flex',
                gap: '0.6rem',
                borderBottom: '1.5px solid #e2e8f0',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('review')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9px',
                      border: 'none',
                      background: activeResultTab === 'review' ? '#0b5e4a' : '#f1f5f9',
                      color: activeResultTab === 'review' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Question & Time Review ({(completionData.reviewedQuestions || activeQuestions).length})
                  </button>
                  {Boolean(paperAnalytics?.firstAttemptLeaderboard?.length || paperAnalytics?.bestScoreLeaderboard?.length) && <button
                    type="button"
                    onClick={() => setActiveResultTab('leaderboard')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9px',
                      border: 'none',
                      background: activeResultTab === 'leaderboard' ? '#0b5e4a' : '#f1f5f9',
                      color: activeResultTab === 'leaderboard' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Trophy size={15} />
                    <span>Paper Leaderboard & Percentile</span>
                  </button>}
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('chapters')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9px',
                      border: 'none',
                      background: activeResultTab === 'chapters' ? '#0b5e4a' : '#f1f5f9',
                      color: activeResultTab === 'chapters' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <BarChart3 size={15} />
                    <span>Chapter Speed & Accuracy</span>
                  </button>
                </div>

                {/* Smart Action: Retry Only Incorrect & Unattempted Questions */}
                {((completionData.incorrectCount || 0) + (completionData.unattemptedCount || 0)) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStartRetryIncorrectAndUnattempted(completionData.reviewedQuestions)}
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1.5px solid #f59e0b',
                      padding: '8px 14px',
                      borderRadius: '9px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Zap size={15} />
                    <span>
                      Retry Only Incorrect & Unattempted ({(completionData.incorrectCount || 0) + (completionData.unattemptedCount || 0)} Qs)
                    </span>
                  </button>
                )}
              </div>

              {/* TAB 2: LIVE PAPER LEADERBOARD (1st Attempt Official vs All-Time Best) */}
              {activeResultTab === 'leaderboard' && Boolean(paperAnalytics?.firstAttemptLeaderboard?.length || paperAnalytics?.bestScoreLeaderboard?.length) && (
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {paperCode} Competitive Leaderboard (Score + Speed Composite Rank)
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        {paperAnalytics?.totalParticipants ? `Ranked by total marks, then completion time (${paperAnalytics.totalParticipants} candidates)` : 'No verified leaderboard data is available yet.'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setLeaderboardTab('first')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: leaderboardTab === 'first' ? '#0b5e4a' : '#f1f5f9',
                          color: leaderboardTab === 'first' ? '#ffffff' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        🥇 Official 1st-Attempt Rank
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardTab('best')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: leaderboardTab === 'best' ? '#0b5e4a' : '#f1f5f9',
                          color: leaderboardTab === 'best' ? '#ffffff' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        🏆 All-Time Best Score
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '10px 12px' }}>Rank</th>
                          <th style={{ padding: '10px 12px' }}>Candidate</th>
                          <th style={{ padding: '10px 12px' }}>Total Score</th>
                          <th style={{ padding: '10px 12px' }}>Attempted Acc.</th>
                          <th style={{ padding: '10px 12px' }}>Time Spent</th>
                          <th style={{ padding: '10px 12px' }}>Avg / Q</th>
                          <th style={{ padding: '10px 12px' }}>Percentile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(leaderboardTab === 'first'
                          ? paperAnalytics?.firstAttemptLeaderboard || []
                          : paperAnalytics?.bestScoreLeaderboard || []
                        ).map((row: LeaderboardEntry) => {
                          const isMe = Boolean(row.isCurrentUser);
                          return (
                            <tr
                              key={`${row.rank}-${row.studentId}`}
                              style={{
                                borderBottom: '1px solid #e2e8f0',
                                background: isMe ? '#ecfdf5' : '#ffffff',
                                fontWeight: isMe ? 800 : 500
                              }}
                            >
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: row.rank <= 3 ? '#b45309' : '#0f172a' }}>
                                {row.rank === 1 ? '🥇 #1' : row.rank === 2 ? '🥈 #2' : row.rank === 3 ? '🥉 #3' : `#${row.rank}`}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                                {row.studentName} {isMe && <span style={{ background: '#0b5e4a', color: '#fff', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
                                <span style={{ color: '#64748b', fontSize: '0.76rem', marginLeft: '6px' }}>• {row.cityOrCampus}</span>
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0b5e4a' }}>
                                {row.score}/{row.totalMarks} ({row.percentage}%)
                              </td>
                              <td style={{ padding: '10px 12px' }}>{row.attemptedAccuracyPct}%</td>
                              <td style={{ padding: '10px 12px' }}>{formatDurationShort(row.totalTimeSec)}</td>
                              <td style={{ padding: '10px 12px' }}>{row.avgTimePerQuestionSec}s</td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1d4ed8' }}>
                                {row.percentile}th %ile
                              </td>
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
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                    Chapter-Wise Speed & Accuracy Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(completionData.chapterStats || []).map((cs: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{cs.topicName}</div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                            Score: <strong>{cs.correctQuestions}/{cs.totalQuestions}</strong> ({cs.accuracyPercentage}% Total • {cs.attemptedAccuracyPercentage}% on Attempted) • Avg Speed: <strong>{cs.avgTimeSec}s/Q</strong>
                          </div>
                        </div>
                        <span style={{
                          background: cs.accuracyPercentage >= 75 ? '#dcfce7' : '#fef3c7',
                          color: cs.accuracyPercentage >= 75 ? '#166534' : '#b45309',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          {cs.accuracyPercentage >= 75 ? '✓ Strong Mastery' : 'Needs Practice'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: COMPREHENSIVE QUESTION-BY-QUESTION & TIME REVIEW */}
              {activeResultTab === 'review' && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Question-by-Question Score, Time & Explanation Breakdown
                    </h3>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: reviewFilter === tab.key ? 800 : 600,
                            background: reviewFilter === tab.key ? '#0b5e4a' : '#f1f5f9',
                            color: reviewFilter === tab.key ? '#ffffff' : '#475569',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                            style={{
                              background: '#ffffff',
                              border: `1.5px solid ${isRight ? '#86efac' : isAtt ? '#fca5a5' : '#cbd5e1'}`,
                              borderRadius: '12px',
                              padding: '1.25rem',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>Question {qNum}</span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: isRight ? '#ecfdf5' : isAtt ? '#fef2f2' : '#f1f5f9',
                                  color: isRight ? '#059669' : isAtt ? '#dc2626' : '#475569'
                                }}>
                                  {isRight ? '✓ Correct' : isAtt ? '✗ Incorrect' : '⚪ Unattempted'}
                                </span>
                                {item.timeTag === 'RUSHED_ERROR' && (
                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                                    ⚡ Rushed Mistake ({item.timeSpentSec}s)
                                  </span>
                                )}
                                {item.timeTag === 'CONCEPT_GAP' && (
                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px' }}>
                                    🧠 Concept Bottleneck ({item.timeSpentSec}s)
                                  </span>
                                )}
                                {item.topicName && (
                                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>• {item.topicName}</span>
                                )}
                              </div>

                              {/* Per-Question Time vs Community Average Badge */}
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '2px 9px',
                                borderRadius: '999px',
                                color: '#334155'
                              }}>
                                ⏱ You: <strong>{item.timeSpentSec ?? 0}s</strong>{item.peerAvgTimeSec > 0 && <> • Peer Avg: <strong>{item.peerAvgTimeSec}s</strong></>}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.98rem', color: '#1e293b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                              <MathText text={item.questionText} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <div style={{
                                background: isRight ? '#ecfdf5' : isAtt ? '#fef2f2' : '#f8fafc',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem'
                              }}>
                                <strong>Your Answer:</strong> <MathText text={item.selectedText || item.selectedOption || 'Not answered'} />
                              </div>
                              <div style={{
                                background: '#ecfdf5',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: '#065f46'
                              }}>
                                <strong>Correct Answer:</strong> <MathText text={item.correctOption} />
                              </div>
                            </div>

                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.85rem',
                              fontSize: '0.86rem',
                              color: '#334155',
                              lineHeight: 1.5
                            }}>
                              <div style={{ fontWeight: 700, color: '#0b5e4a', marginBottom: '3px' }}>
                                💡 Explanation & Why It Is Correct:
                              </div>
                              <MathText text={item.explanation} />

                              {!isRight && item.whyIncorrect && (
                                <div style={{ marginTop: '0.5rem', color: '#991b1b', fontWeight: 600 }}>
                                  ⚠️ Why your choice was incorrect: <MathText text={item.whyIncorrect} />
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
              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('setup');
                    setUserSelections({});
                    setQuestionTimes({});
                    setBookmarkedQuestions([]);
                    setTabSwitchLogs([]);
                  }}
                  style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Start Another Attempt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Close & Return to Paper
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
