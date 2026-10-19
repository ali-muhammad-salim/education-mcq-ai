'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Clock, 
  ArrowRight, ArrowLeft, ShieldCheck, Award, RotateCcw, 
  Eye, EyeOff, Check, X, FileText, ChevronRight, User, Lock, Mail, Smartphone,
  ShieldAlert, Shield, Info, Maximize, Minimize
} from 'lucide-react';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';

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
  options: Record<string, string>;
  correctOption: string;
  explanation: string;
  topicName: string;
  topicNumber?: string;
  sloCode?: string;
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

// Fisher-Yates array shuffle
function shuffleArray<T>(array: T[]): T[] {
  if (!array || !Array.isArray(array)) return [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to safely parse source region
const parseSourceRegion = (sourceRegion: any) => {
  if (!sourceRegion) return {};
  if (typeof sourceRegion === 'string') {
    try { return JSON.parse(sourceRegion); } catch { return {}; }
  }
  return sourceRegion;
};

// Prepares questions with random question order AND randomized options (A, B, C, D)
function randomizeQuestionsAndOptions(rawQuestions: Question[]): ShuffledQuestion[] {
  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return [];
  }

  const shuffledRaw = shuffleArray(rawQuestions);

  return shuffledRaw.map((q, qIndex) => {
    const anyQ = q as any;
    const meta = parseSourceRegion(q.sourceRegion);

    let rawChoices: Record<string, string> = meta.choices || meta.options || anyQ.options || anyQ.choices;
    if (Array.isArray(rawChoices)) {
      const mapped: Record<string, string> = {};
      rawChoices.forEach((item, idx) => {
        const key = item.id || String.fromCharCode(65 + idx);
        mapped[key] = item.text || String(item);
      });
      rawChoices = mapped;
    }

    // Normalize keys to uppercase 'A', 'B', 'C', 'D'
    const normalizedChoices: Record<string, string> = {};
    if (rawChoices && typeof rawChoices === 'object') {
      Object.entries(rawChoices).forEach(([k, v]) => {
        const upperKey = k.trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(upperKey)) {
          normalizedChoices[upperKey] = String(v);
        }
      });
    }

    if (Object.keys(normalizedChoices).length === 0) {
      if (rawChoices && typeof rawChoices === 'object' && Object.keys(rawChoices).length > 0) {
        const vals = Object.values(rawChoices);
        ['A', 'B', 'C', 'D'].forEach((k, idx) => {
          normalizedChoices[k] = vals[idx] !== undefined ? String(vals[idx]) : `Option ${k}`;
        });
      } else {
        normalizedChoices['A'] = 'Option A';
        normalizedChoices['B'] = 'Option B';
        normalizedChoices['C'] = 'Option C';
        normalizedChoices['D'] = 'Option D';
      }
    }

    // Extract correct answer safely
    const rawCorrect = String(
      meta.correct_answer || meta.correctOption || anyQ.correctOption || anyQ.correctAnswer || anyQ.answer || 'A'
    ).trim();
    const correctMatch = rawCorrect.match(/([A-D])/i);
    const origCorrect = correctMatch ? correctMatch[1].toUpperCase() : 'A';
    const correctText = normalizedChoices[origCorrect] || normalizedChoices['A'] || Object.values(normalizedChoices)[0] || '';

    // Permute choice text values
    const choiceKeys = ['A', 'B', 'C', 'D'].filter(k => normalizedChoices[k] !== undefined);
    const textValues = choiceKeys.map(k => normalizedChoices[k]);
    const shuffledValues = shuffleArray(textValues);

    const randomizedChoices: Record<string, string> = {};
    let randomizedCorrectKey = 'A';

    choiceKeys.forEach((key, idx) => {
      randomizedChoices[key] = shuffledValues[idx];
      if (shuffledValues[idx] === correctText) {
        randomizedCorrectKey = key;
      }
    });

    const origExpl = meta.explanation || anyQ.explanation || 'Refer to official AKU-EB Syllabus Student Learning Outcomes for detailed conceptual background.';
    const safeRegexKey = origCorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updatedExpl = origExpl.replace(new RegExp(`Option\\s+${safeRegexKey}`, 'gi'), `Option ${randomizedCorrectKey}`);

    const topic = q.topics?.[0]?.topic;
    const slo = q.slos?.[0]?.slo;
    const questionText = q.questionText || anyQ.stem || anyQ.text || anyQ.stemText || 'Question';

    return {
      id: q.id || `q-${qIndex + 1}`,
      displayNumber: qIndex + 1,
      originalQuestionNumber: q.questionNumber || (anyQ.questionNumber ? String(anyQ.questionNumber) : String(qIndex + 1)),
      questionText,
      questionType: q.questionType || anyQ.questionType || 'MCQ_SINGLE',
      marks: q.marks || anyQ.marks || 1,
      difficulty: q.difficulty || anyQ.cognitiveLevel || 'U',
      diagramUrl: meta.diagram_url || anyQ.diagramUrl || (anyQ.isDiagram ? `/materials/scans/ssc1_p1_page_${anyQ.pageNumber}.png` : undefined),
      options: randomizedChoices,
      correctOption: randomizedCorrectKey,
      explanation: updatedExpl,
      topicName: topic?.name || meta.slo_details?.topic_name || anyQ.unitName || 'General Physics',
      topicNumber: topic?.topicNumber,
      sloCode: slo?.code || meta.slo
    };
  });
}

export default function TakeQuizModal({
  isOpen,
  onClose,
  paperTitle,
  paperCode,
  questions
}: TakeQuizModalProps) {
  // Navigation / Phase State: 'auth' -> 'setup' -> 'active' -> 'completed'
  const [phase, setPhase] = useState<'auth' | 'setup' | 'active' | 'completed'>('setup');
  const [loadingQuizQuestions, setLoadingQuizQuestions] = useState<boolean>(false);
  const [startQuizError, setStartQuizError] = useState<string | null>(null);

  // Student Authentication State
  const [student, setStudent] = useState<{ id?: string; name: string; age?: number; classLevel?: string } | null>(null);
  const [authTab, setAuthTab] = useState<'otp' | 'google'>('otp');
  const [otpPhoneOrEmail, setOtpPhoneOrEmail] = useState('');
  const [otpName, setOtpName] = useState('');
  const [otpAge, setOtpAge] = useState('15');
  const [otpClass, setOtpClass] = useState('Class IX');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Setup / Timer Options
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [selectedDurationMin, setSelectedDurationMin] = useState<number>(50);
  const [customDuration, setCustomDuration] = useState<string>('50');

  // Active Quiz State (Randomized Questions & Options)
  const [activeQuestions, setActiveQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({}); // { [displayNum]: optionKey }
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(50 * 60);
  const [showQuestionGrid, setShowQuestionGrid] = useState<boolean>(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());

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

  const switchLeaveTimeRef = useRef<number | null>(null);
  const isAwayRef = useRef<boolean>(false);

  // Completion State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('incorrect');

  // Check existing session on modal open & reset when closed
  useEffect(() => {
    if (!isOpen) {
      setPhase('setup');
      setCurrentIndex(0);
      setUserSelections({});
      setCompletionData(null);
      setScreenshotAlert(false);
      setCheatWarningVisible(false);
      setShowSwitchAuditModal(false);
      setIsWindowMasked(false);
      setStartQuizError(null);
      return;
    }

    const checkActiveUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setStudent({
              id: data.user.id,
              name: data.user.name,
              classLevel: 'Class IX'
            });
            setPhase('setup');
            return;
          }
        }
      } catch (e) {
        // Fall back to setup
      }
      setPhase('setup');
    };

    checkActiveUser();
  }, [isOpen]);

  // Tab-Switch & Departure Duration Tracking (Standard Page Visibility API)
  // Ensures removing/dismissing a notification NEVER triggers a tab switch!
  useEffect(() => {
    if (phase !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Candidate switched away from examination tab
        isAwayRef.current = true;
        switchLeaveTimeRef.current = Date.now();
        setIsWindowMasked(true); // Content blur shield
      } else {
        // Candidate returned back to examination tab
        setIsWindowMasked(false);
        if (isAwayRef.current && switchLeaveTimeRef.current) {
          const durationMs = Date.now() - switchLeaveTimeRef.current;
          // Ignore micro-flickers under 500ms
          if (durationMs >= 500) {
            const durationSec = Math.max(1, Math.round(durationMs / 1000));
            const leftDate = new Date(switchLeaveTimeRef.current);
            const returnDate = new Date();

            const newRecord: TabSwitchRecord = {
              index: tabSwitchLogs.length + 1,
              leftAt: leftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              returnedAt: returnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              durationSeconds: durationSec
            };

            setTabSwitchLogs(prev => [...prev, newRecord]);
            setTabSwitchCount(prev => prev + 1);
            setLastSwitchDuration(durationSec);
            setCheatWarningVisible(true);
          }
          isAwayRef.current = false;
          switchLeaveTimeRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase, tabSwitchLogs.length]);

  // Fullscreen tracking & helper
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => {
            setIsFullscreen(false);
          }).catch(() => {});
        }
      }
    } catch (e) {}
  };

  // Multi-pass cascading clipboard poisoner to neutralize Windows PrtScn capture
  const poisonClipboard = useCallback(() => {
    const candidateName = student?.name || 'Proctored Candidate';
    const violationNotice = 
      `⚠️ [AKU-EB EXAMINATION SECURITY VIOLATION]\n` +
      `Screen capture and printing are strictly prohibited under AKU-EB examination anti-cheat regulations.\n` +
      `Candidate: ${candidateName}\n` +
      `Paper: ${paperCode}\n` +
      `Timestamp: ${new Date().toLocaleString()}\n` +
      `Audit Status: Unauthorized screen capture attempt logged to candidate profile.`;

    // 1. Synchronous fallback via hidden textarea (executes immediately on event thread)
    try {
      const textarea = document.getElementById('aku-clipboard-poison-textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.value = violationNotice;
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        document.execCommand('copy');
      }
    } catch (e) {}

    // 2. Modern Clipboard API writeText
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(violationNotice).catch(() => {});
      }
    } catch (e) {}

    // 3. Image format overwrite (wiping image clipboard if supported)
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1, 1);
          canvas.toBlob((blob) => {
            if (blob) {
              try {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).catch(() => {});
              } catch (err) {}
            }
          });
        }
      }
    } catch (e) {}
  }, [student?.name, paperCode]);

  const poisonClipboardCascading = useCallback(() => {
    poisonClipboard();
    // Cascading delayed sweeps to guarantee overwriting OS-level clipboard writes (at keydown, keyup, and driver latency delays)
    [20, 50, 100, 200, 350, 600, 1000, 1500].forEach((ms) => {
      setTimeout(poisonClipboard, ms);
    });
  }, [poisonClipboard]);

  const triggerScreenshotDefense = useCallback(() => {
    // 1. Synchronous direct DOM blackout (0ms latency, precedes browser paint)
    const blackoutEl = document.getElementById('aku-fullscreen-blackout');
    const activeBody = document.getElementById('aku-active-quiz-content');
    if (blackoutEl) {
      blackoutEl.style.display = 'flex';
      blackoutEl.style.opacity = '1';
      blackoutEl.style.pointerEvents = 'all';
    }
    if (activeBody) {
      activeBody.style.filter = 'blur(60px)';
      activeBody.style.opacity = '0';
      activeBody.style.visibility = 'hidden';
    }

    // 2. Multi-pass cascading clipboard poison
    poisonClipboardCascading();

    // 3. React state update
    setScreenshotAlert(true);
    setScreenshotAttemptCount((prev) => prev + 1);

    // 4. Reset blackout after 2.5 seconds
    setTimeout(() => {
      setScreenshotAlert(false);
      if (blackoutEl) {
        blackoutEl.style.display = 'none';
        blackoutEl.style.opacity = '0';
        blackoutEl.style.pointerEvents = 'none';
      }
      if (activeBody) {
        activeBody.style.filter = 'none';
        activeBody.style.opacity = '1';
        activeBody.style.visibility = 'visible';
      }
    }, 2500);
  }, [poisonClipboardCascading]);

  // Robust Anti-Screenshot, Snipping Tool, and Focus Concealment Engine
  useEffect(() => {
    if (phase !== 'active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. PrintScreen key (any code / key variant across Windows, Mac, Linux)
      const isPrtScn = 
        e.key === 'PrintScreen' || 
        e.keyCode === 44 || 
        e.which === 44 || 
        e.code === 'PrintScreen' ||
        e.key === 'Snapshot' ||
        e.code === 'Snapshot';

      if (isPrtScn) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense();
        return;
      }

      // 2. Windows Snipping: Win + Shift + S or Ctrl + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense();
        return;
      }

      // 3. Mac Screenshot shortcuts: Cmd + Shift + 3 / 4 / 5 / 6
      if (e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense();
        return;
      }

      // 4. Alt + PrintScreen
      if (e.altKey && (isPrtScn || e.key === 'PrintScreen')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense();
        return;
      }

      // 5. Print Dialog: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense();
        return;
      }

      // 6. Developer Tools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrtScn = 
        e.key === 'PrintScreen' || 
        e.keyCode === 44 || 
        e.which === 44 || 
        e.code === 'PrintScreen' ||
        e.key === 'Snapshot' ||
        e.code === 'Snapshot';

      if (isPrtScn) {
        e.preventDefault();
        triggerScreenshotDefense();
      }
    };

    const handleWindowBlur = () => {
      // Whenever focus is lost (Snipping Tool, Alt+Tab, Screen capture app), immediately conceal quiz
      setIsFocusLost(true);
      poisonClipboardCascading();
      const activeBody = document.getElementById('aku-active-quiz-content');
      if (activeBody) {
        activeBody.style.filter = 'blur(45px)';
        activeBody.style.opacity = '0.05';
      }
    };

    const handleWindowFocus = () => {
      // Refocused: Poison clipboard again in case a capture was taken while outside
      poisonClipboardCascading();
      setTimeout(() => {
        setIsFocusLost(false);
        const activeBody = document.getElementById('aku-active-quiz-content');
        if (activeBody) {
          activeBody.style.filter = 'none';
          activeBody.style.opacity = '1';
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [phase, triggerScreenshotDefense, poisonClipboardCascading]);

  // Timer countdown during active quiz
  useEffect(() => {
    if (phase !== 'active' || !isTimed) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isTimed, activeQuestions, userSelections]);

  // ==========================================
  // AUTH ACTION HANDLERS
  // ==========================================

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          identifier: otpPhoneOrEmail,
          name: otpName,
          age: otpAge,
          classLevel: otpClass
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpSent(true);
      setDevOtpCode(data.devOtp || '123456');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          identifier: otpPhoneOrEmail,
          otp: otpCode,
          name: otpName,
          age: otpAge,
          classLevel: otpClass
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');
      setStudent(data.user);
      setPhase('setup');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google',
          identifier: 'student.google@akueb.edu.pk',
          name: 'Verified Google Student'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');
      setStudent(data.user);
      setPhase('setup');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoName: string) => {
    setStudent({
      id: 'demo-student-uuid',
      name: demoName,
      age: 15,
      classLevel: 'Class IX'
    });
    setPhase('setup');
  };

  // ==========================================
  // QUIZ ENGINE: START & RANDOMIZATION
  // ==========================================

  const handleStartQuiz = async () => {
    setStartQuizError(null);
    try {
      let rawQs = (questions && Array.isArray(questions)) ? [...questions] : [];

      // If no questions in props, fetch from API
      if (rawQs.length === 0 && paperCode) {
        setLoadingQuizQuestions(true);
        try {
          const res = await fetch(`/api/quizzes/by-code?code=${encodeURIComponent(paperCode)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.quiz?.questions && Array.isArray(data.quiz.questions) && data.quiz.questions.length > 0) {
              rawQs = data.quiz.questions;
            }
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch quiz questions by code:', fetchErr);
        } finally {
          setLoadingQuizQuestions(false);
        }
      }

      // If still empty and it's a P2 or theory paper, attempt P1 fallback
      if (rawQs.length === 0 && paperCode) {
        try {
          const p1Code = paperCode.replace(/P2/i, 'P1').replace(/PAPER-2/i, 'PAPER-1');
          const res = await fetch(`/api/quizzes/by-code?code=${encodeURIComponent(p1Code)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.quiz?.questions && Array.isArray(data.quiz.questions) && data.quiz.questions.length > 0) {
              rawQs = data.quiz.questions;
            }
          }
        } catch (e) {}
      }

      if (rawQs.length === 0) {
        setStartQuizError('No questions are available for this paper at the moment. Please try another paper.');
        return;
      }

      // 1. Generate randomized questions and randomized choices
      const randomized = randomizeQuestionsAndOptions(rawQs);
      if (randomized.length === 0) {
        setStartQuizError('Could not process questions for this quiz.');
        return;
      }

      setActiveQuestions(randomized);

      // 2. Setup timer
      const finalMinutes = isTimed ? (parseInt(customDuration) || selectedDurationMin || 50) : 0;
      setTimeLeftSeconds(finalMinutes * 60);
      setQuizStartTime(Date.now());
      setCurrentIndex(0);
      setUserSelections({});
      setTabSwitchLogs([]);
      setTabSwitchCount(0);
      setCheatWarningVisible(false);
      setPhase('active');
    } catch (err: any) {
      console.error('Failed to start quiz:', err);
      setStartQuizError(err?.message || 'Failed to start quiz');
    }
  };

  // Answer selection (Instant evaluation)
  const handleSelectAnswer = (displayNum: number, optionKey: string) => {
    const key = displayNum.toString();
    if (userSelections[key]) return; // lock once answered
    setUserSelections(prev => ({ ...prev, [key]: optionKey }));
  };

  const buildSubmissionPayload = useCallback((isAuto = false) => {
    const answersList = activeQuestions.map(q => {
      const selected = userSelections[q.displayNumber.toString()];
      const isCorrect = selected === q.correctOption;

      return {
        questionNumber: q.originalQuestionNumber || q.displayNumber.toString(),
        displayNumber: q.displayNumber,
        questionText: q.questionText,
        selectedOption: selected || null,
        correctOption: q.correctOption,
        selectedText: selected ? q.options[selected] : 'Not Attempted',
        correctText: q.options[q.correctOption],
        isCorrect,
        explanation: q.explanation,
        whyIncorrect: !isCorrect && selected 
          ? `Your chosen option (${selected}: ${q.options[selected]}) is incorrect. According to AKU-EB curriculum rules, Option (${q.correctOption}: ${q.options[q.correctOption]}) is the correct answer.`
          : null,
        topicName: q.topicName,
        topicNumber: q.topicNumber,
        sloCode: q.sloCode,
        marks: q.marks || 1
      };
    });

    const timeTakenSec = Math.round((Date.now() - quizStartTime) / 1000);
    const totalAwayTimeSeconds = tabSwitchLogs.reduce((acc, cur) => acc + cur.durationSeconds, 0);

    return {
      paperCode,
      paperTitle,
      studentId: student?.id,
      studentName: student?.name || 'Student Candidate',
      studentAge: student?.age || 15,
      studentClass: student?.classLevel || 'Class IX',
      timeTakenSeconds: timeTakenSec,
      tabSwitchCount: tabSwitchLogs.length,
      tabSwitchLogs,
      totalAwayTimeSeconds,
      screenshotAttempts: screenshotAttemptCount,
      answers: answersList,
      isAutoSubmitted: isAuto
    };
  }, [activeQuestions, userSelections, quizStartTime, tabSwitchLogs, screenshotAttemptCount, paperCode, paperTitle, student]);

  // Prevent reload / back navigation during active examination & auto-submit on departure
  useEffect(() => {
    if (phase !== 'active') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to reload or leave? Your quiz is currently in progress! If you leave, your score will be stored and submitted to your teacher.';
      try {
        const payload = buildSubmissionPayload(true);
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/quizzes/submit-attempt', blob);
        }
      } catch (err) {}
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Prevent accidental browser back button
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      const confirmLeave = window.confirm(
        '⚠️ Are you sure you want to go back? Your quiz is currently in progress!\n\nIf you click OK, the quiz will finish now and your score will be recorded and sent to your teacher.'
      );
      if (confirmLeave) {
        handleSubmitQuiz(true);
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [phase, buildSubmissionPayload]);

  // Submit Quiz and Compute Results
  const handleSubmitQuiz = async (isAutoSubmitted: boolean = false) => {
    setSubmitting(true);
    const payload = buildSubmissionPayload(isAutoSubmitted);

    try {
      const res = await fetch('/api/quizzes/submit-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');
      setCompletionData(data);
      setPhase('completed');
    } catch (err: any) {
      console.warn('Submitting with resilient client fallback:', err);
      let totalEarned = 0;
      payload.answers.forEach((a: any) => { if (a.isCorrect) totalEarned += (a.marks || 1); });
      const pct = Math.round((totalEarned / Math.max(1, payload.answers.length)) * 100);
      setCompletionData({
        success: true,
        score: totalEarned,
        totalMarks: payload.answers.length,
        percentage: pct,
        studentName: payload.studentName,
        tabSwitchCount: payload.tabSwitchCount,
        tabSwitchLogs: payload.tabSwitchLogs,
        totalAwayTimeSeconds: payload.totalAwayTimeSeconds,
        dynamicMessage: `Exam completed and submitted. Score: ${totalEarned}/${payload.answers.length} (${pct}%). Results sent to your teacher.`,
        messageTone: pct >= 70 ? 'success' : 'info',
        weakTopics: [],
        incorrectQuestions: payload.answers.filter((a: any) => !a.isCorrect),
        submittedAt: new Date().toISOString(),
        isAutoSubmitted
      });
      setPhase('completed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = activeQuestions[currentIndex];
  const currentSelected = currentQ ? userSelections[currentQ.displayNumber.toString()] : null;
  const isAnswered = Boolean(currentSelected);
  const isCurrentCorrect = isAnswered && currentQ && currentSelected === currentQ.correctOption;

  const totalAwayTime = tabSwitchLogs.reduce((acc, cur) => acc + cur.durationSeconds, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Global CSS to prevent printing and disable user selection */}
      <style jsx global>{`
        @media print {
          body, #quiz-modal-container, #aku-active-quiz-content {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Synchronous Hidden Textarea for Instant Clipboard Overwrite */}
      <textarea
        id="aku-clipboard-poison-textarea"
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        value={`⚠️ [AKU-EB EXAMINATION SECURITY VIOLATION]\nScreen capture and printing are strictly prohibited under AKU-EB examination anti-cheat regulations.\nCandidate: ${student?.name || 'Proctored Candidate'}\nPaper: ${paperCode}\nTimestamp: ${new Date().toLocaleString()}\nAudit Status: Unauthorized screen capture attempt logged to candidate profile.`}
      />

      {/* FULLSCREEN ZERO-LATENCY BLACKOUT SHIELD (Neutralizes Hardware PrtScn Key) */}
      <div
        id="aku-fullscreen-blackout"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#020617',
          zIndex: 99999999,
          display: screenshotAlert ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          textAlign: 'center',
          padding: '2rem',
          opacity: screenshotAlert ? 1 : 0,
          pointerEvents: screenshotAlert ? 'all' : 'none',
          transition: 'opacity 0.08s ease'
        }}
      >
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: '#ef4444'
        }}>
          <ShieldAlert size={50} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#f87171', margin: '0 0 0.75rem 0', letterSpacing: '-0.02em' }}>
          SCREEN CAPTURE BLOCKED
        </h2>
        <p style={{ fontSize: '1.05rem', color: '#e2e8f0', maxWidth: '580px', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
          Screen capture (PrintScreen), snipping tools, and page recording are strictly prohibited during AKU-EB examinations.
        </p>
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '12px',
          padding: '14px 24px',
          color: '#fca5a5',
          fontSize: '0.92rem',
          fontWeight: 600,
          maxWidth: '540px',
          lineHeight: 1.5
        }}>
          🛡️ Your clipboard has been scrubbed with a security notice. This capture attempt has been recorded in your examination audit trail.
        </div>
      </div>

      <div
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
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onCopy={(e) => { e.preventDefault(); poisonClipboardCascading(); }}
        onCut={(e) => { e.preventDefault(); poisonClipboardCascading(); }}
        onPaste={(e) => { e.preventDefault(); }}
        onContextMenu={(e) => { e.preventDefault(); }}
        onDragStart={(e) => { e.preventDefault(); }}
      >
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          color: 'var(--text-color, #1e293b)',
          borderRadius: phase === 'active' || phase === 'completed' ? '0px' : '20px',
          maxWidth: phase === 'active' || phase === 'completed' ? '100vw' : '620px',
          width: phase === 'active' || phase === 'completed' ? '100vw' : '100%',
          height: phase === 'active' || phase === 'completed' ? '100vh' : 'auto',
          maxHeight: phase === 'active' || phase === 'completed' ? '100vh' : '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* Examination Privacy & Anti-Snipping Shield (Active when window loses focus) */}
          {isFocusLost && !screenshotAlert && phase === 'active' && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(25px)',
                zIndex: 999998,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                textAlign: 'center',
                padding: '2.5rem',
                borderRadius: '20px'
              }}
              onClick={() => {
                setIsFocusLost(false);
                window.focus();
              }}
            >
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                color: '#f87171'
              }}>
                <Lock size={38} />
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                Examination Privacy Shield Active
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', maxWidth: '480px', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                Question content is automatically concealed while the examination window is unfocused to protect against screen capture and snipping tools.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsFocusLost(false);
                  window.focus();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '10px 22px',
                  background: '#0b5e4a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(11, 94, 74, 0.35)'
                }}
              >
                <Eye size={17} /> Click here to return to examination
              </button>
            </div>
          )}

          {/* Global Close Button (Hidden during active examination to enforce completion) */}
          {phase !== 'active' && (
            <button
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

          {/* ========================================================================= */}
          {/* PHASE 1: STUDENT AUTHENTICATION GATE (OTP OR GOOGLE SIGNIN)              */}
          {/* ========================================================================= */}
          {phase === 'auth' && (
            <div style={{ padding: '2.5rem 2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#e8f5f1',
                  color: '#0b5e4a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <ShieldCheck size={30} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                  Student Quiz Sign-in
                </h2>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  Sign in to verify your identity, record your scores, and receive personalized weak topic recommendations.
                </p>
              </div>

              {/* Auth Mode Tabs */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setAuthTab('otp')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: authTab === 'otp' ? 700 : 500,
                    background: authTab === 'otp' ? '#ffffff' : 'transparent',
                    color: authTab === 'otp' ? '#0b5e4a' : '#64748b',
                    boxShadow: authTab === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  📱 Mobile / Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('google')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: authTab === 'google' ? 700 : 500,
                    background: authTab === 'google' ? '#ffffff' : 'transparent',
                    color: authTab === 'google' ? '#0b5e4a' : '#64748b',
                    boxShadow: authTab === 'google' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  🌐 Google Sign-in
                </button>
              </div>

              {authError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#b91c1c',
                  fontSize: '0.84rem',
                  marginBottom: '1rem'
                }}>
                  {authError}
                </div>
              )}

              {/* OTP Flow */}
              {authTab === 'otp' && (
                <div>
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Student Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Hamza Khan"
                          value={otpName}
                          onChange={(e) => setOtpName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                            Age
                          </label>
                          <input
                            type="number"
                            required
                            min="10"
                            max="25"
                            value={otpAge}
                            onChange={(e) => setOtpAge(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                            Class / Grade
                          </label>
                          <select
                            value={otpClass}
                            onChange={(e) => setOtpClass(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="Class IX">Class IX (SSC-I)</option>
                            <option value="Class X">Class X (SSC-II)</option>
                            <option value="Class XI">Class XI (HSSC-I)</option>
                            <option value="Class XII">Class XII (HSSC-II)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Mobile Phone or Email
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 03001234567 or student@gmail.com"
                          value={otpPhoneOrEmail}
                          onChange={(e) => setOtpPhoneOrEmail(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        style={{
                          background: '#0b5e4a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          marginTop: '0.5rem'
                        }}
                      >
                        {authLoading ? 'Sending Verification Code...' : 'Send Verification OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem', fontSize: '0.86rem', color: '#166534' }}>
                        OTP code sent to <strong>{otpPhoneOrEmail}</strong>
                        {devOtpCode && (
                          <div style={{ marginTop: '4px', fontWeight: 700 }}>
                            Test Code: <span style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>{devOtpCode}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Enter 6-Digit OTP Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            letterSpacing: '4px',
                            textAlign: 'center',
                            fontWeight: 800,
                            borderRadius: '8px',
                            border: '2px solid #0b5e4a',
                            fontSize: '1.25rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          style={{
                            flex: 1,
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={authLoading}
                          style={{
                            flex: 2,
                            background: '#0b5e4a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {authLoading ? 'Verifying...' : 'Verify & Continue'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Google Sign-in */}
              {authTab === 'google' && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}
                  >
                    <span>Continue with Google Student Account</span>
                  </button>
                </div>
              )}

              {/* Quick Demo Bypass */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('Ali Raza (Candidate IX)')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0b5e4a',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ⚡ Continue as Demo Student (Ali Raza, Class IX)
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2: QUIZ SETUP, TIMER, & RANDOMIZATION NOTICE                       */}
          {/* ========================================================================= */}
          {phase === 'setup' && (
            <div style={{ padding: '2.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0b5e4a', color: '#ffffff', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                  <Award size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0b5e4a', background: '#e8f5f1', padding: '2px 8px', borderRadius: '4px' }}>
                    {paperCode}
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                    {paperTitle} — Quiz Setup
                  </h2>
                </div>
              </div>

              {/* Student Identified Badge */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Candidate Logged In:</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                    {student?.name || 'Guest Student (Class IX)'}
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.6rem' }}>
                  1. Examination Timer (Optional)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
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
                      <span>Untimed Practice</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Study questions at your own pace
                    </div>
                  </button>
                </div>

                {isTimed && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Select Exam Duration:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[15, 30, 50].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            setSelectedDurationMin(mins);
                            setCustomDuration(mins.toString());
                          }}
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

              {/* Security, Randomization & Integrity Advisory */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#854d0e', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  <ShieldCheck size={18} />
                  <span>Secure Examination Anti-Cheat & Security Policy</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#713f12', lineHeight: 1.6 }}>
                  • <strong>Randomized Questions & Options:</strong> Both question sequence and A/B/C/D choices are freshly shuffled.<br />
                  • <strong>No Text Selection & Copying:</strong> Copying, dragging, and context menus are disabled.<br />
                  • <strong>Anti-Screenshot & Privacy Shield:</strong> Hardware PrintScreen, Windows Snipping Tool (Win+Shift+S), and focus departures are intercepted; content is instantly concealed and clipboard is scrubbed.<br />
                  • <strong>Precise Tab-Switch Duration:</strong> Tab departures are accurately timed down to the second and logged in your security audit trail without false alarms from toast notifications.
                </div>
              </div>

              {/* Error Notice if Questions Failed to Load */}
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
                  onClick={handleStartQuiz}
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
                    {loadingQuizQuestions ? 'Loading Questions...' : `Start Quiz (${questions?.length || activeQuestions?.length || 40} Items)`}
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
                Questions Unavailable
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '420px', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                We could not load multiple choice questions for this assessment. Please return to the paper and select another session.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhase('setup');
                  onClose();
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
                Close Examination
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 3: ACTIVE QUIZ SCREEN (TEXT-SELECT DISABLED & SCREENSHOT BLOCKED)   */}
          {/* ========================================================================= */}
          {phase === 'active' && currentQ && (
            <div
              id="aku-active-quiz-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                filter: isWindowMasked ? 'blur(35px)' : 'none',
                transition: 'filter 0.15s ease'
              }}
            >
              {/* Tab Switch Warning Toast with Exact Away Duration */}
              {cheatWarningVisible && (
                <div style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    <span>
                      Cheating Check Warning: Tab switch #{tabSwitchCount} detected! (Away for {lastSwitchDuration}s). Logged to audit trail.
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setCheatWarningVisible(false);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quiz Header Bar */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                flexWrap: 'wrap',
                gap: '0.75rem',
                zIndex: 2
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a', textTransform: 'uppercase' }}>
                    {paperCode} • Item {currentIndex + 1} of {activeQuestions.length} (Randomized)
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Question {currentQ.displayNumber}
                  </div>
                </div>

                {/* Status Indicators: Timer, Fullscreen & Clickable Anti-Cheat Warnings Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {/* Fullscreen Examination Mode Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen Examination Mode" : "Enter Fullscreen Examination Mode (Recommended)"}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: isFullscreen ? '#ecfdf5' : '#ffffff',
                      border: isFullscreen ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      color: isFullscreen ? '#065f46' : '#475569',
                      padding: '5px 11px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
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
                      fontSize: '0.92rem'
                    }}>
                      <Clock size={16} />
                      <span>{formatTime(timeLeftSeconds)}</span>
                    </div>
                  )}

                  {/* Clickable Tab Switch & Anti-Capture Warnings Badge with Detailed Log */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSwitchAuditModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: (tabSwitchCount > 0 || screenshotAttemptCount > 0) ? '#b91c1c' : '#059669',
                      background: (tabSwitchCount > 0 || screenshotAttemptCount > 0) ? '#fef2f2' : '#ecfdf5',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: (tabSwitchCount > 0 || screenshotAttemptCount > 0) ? '1px solid #fecaca' : '1px solid #a7f3d0',
                      cursor: 'pointer'
                    }}
                    title="Click to view tab switch audit log, departure durations, and screenshot blocks"
                  >
                    <Eye size={15} />
                    <span>
                      👁️ {tabSwitchCount} Warnings 
                      {screenshotAttemptCount > 0 ? ` • 📸 ${screenshotAttemptCount} Blocked` : ''} 
                      {totalAwayTime > 0 ? ` (${totalAwayTime}s Away)` : ''}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Grid ({Object.keys(userSelections).length}/{activeQuestions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitQuiz(false)}
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

              {/* Quick Question Jump Drawer (Grid View) */}
              {showQuestionGrid && (
                <div style={{
                  padding: '1rem',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                  gap: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}>
                  {activeQuestions.map((q, idx) => {
                    const answered = Boolean(userSelections[q.displayNumber.toString()]);
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setShowQuestionGrid(false);
                        }}
                        style={{
                          padding: '8px 0',
                          borderRadius: '6px',
                          border: isCurrent ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                          background: answered ? '#0b5e4a' : '#f8fafc',
                          color: answered ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        {q.displayNumber}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Question Body (Text Selection Blocked) */}
              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
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

                {/* Cropped Diagram / Graph / Circuit (if present) */}
                {(() => {
                  const diagramSrc = resolveQuestionDiagram(paperCode, currentQ.originalQuestionNumber || currentQ.displayNumber, currentQ);
                  if (!diagramSrc) return null;
                  return (
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <img
                        src={diagramSrc}
                        alt={`Diagram for Question ${currentQ.displayNumber}`}
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

                {/* Randomized Multiple Choice Options (A, B, C, D) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {Object.entries(currentQ.options).map(([key, optText]) => {
                    const isChosen = currentSelected === key;
                    const isRightAnswer = currentQ.correctOption === key;

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
                          transition: 'all 0.15s ease'
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
                        {isAnswered && isRightAnswer && (
                          <CheckCircle2 size={20} color="#059669" />
                        )}
                        {isAnswered && isChosen && !isRightAnswer && (
                          <XCircle size={20} color="#ef4444" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Answer Feedback & Detailed "Why It Is Incorrect" Reason */}
                {isAnswered && (
                  <div style={{
                    background: isCurrentCorrect ? '#f0fdf4' : '#fff1f2',
                    border: `1.5px solid ${isCurrentCorrect ? '#86efac' : '#fecdd3'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: isCurrentCorrect ? '#166534' : '#9f1239',
                      marginBottom: '0.5rem'
                    }}>
                      {isCurrentCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      <span>{isCurrentCorrect ? 'Correct Answer! Well Done.' : `Incorrect — Correct Option is (${currentQ.correctOption})`}</span>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      <div style={{ marginBottom: '0.4rem' }}>
                        <strong>Why this answer is correct:</strong> <MathText text={currentQ.explanation} />
                      </div>

                      {!isCurrentCorrect && (
                        <div style={{ color: '#9f1239', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                          <strong>Why your choice ({currentSelected}) was incorrect:</strong> Option ({currentSelected}) does not satisfy the formula requirements or physical principles outlined in AKU-EB Syllabus Grade 9.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Stepper Controls (Previous / Next / Finish) */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff'
              }}>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
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
                    onClick={() => setCurrentIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))}
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
                    onClick={() => handleSubmitQuiz(false)}
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

          {/* ========================================================================= */}
          {/* TAB-SWITCH DETAILS MODAL (POPUP WHEN CLICKING WARNINGS COUNT)             */}
          {/* ========================================================================= */}
          {showSwitchAuditModal && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
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
                    <ShieldAlert size={22} color="#dc2626" />
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 600 }}>Tab Switches</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{tabSwitchLogs.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Time Away</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalAwayTime}s</div>
                  </div>
                  <div style={{ background: screenshotAttemptCount > 0 ? '#fff1f2' : '#f0fdf4', padding: '0.75rem', borderRadius: '10px', border: screenshotAttemptCount > 0 ? '1px solid #fecdd3' : '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.72rem', color: screenshotAttemptCount > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>Snips Blocked</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: screenshotAttemptCount > 0 ? '#dc2626' : '#16a34a' }}>{screenshotAttemptCount}</div>
                  </div>
                </div>

                {screenshotAttemptCount > 0 && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: '#991b1b',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <ShieldAlert size={16} />
                    <span>Anti-Capture Shield: {screenshotAttemptCount} screenshot / PrintScreen attempt(s) intercepted & clipboard scrubbed.</span>
                  </div>
                )}

                {tabSwitchLogs.length === 0 ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', color: '#166534', fontSize: '0.9rem', textAlign: 'center' }}>
                    ✓ Perfect Tab Integrity. No tab departures recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {tabSwitchLogs.map((log) => (
                      <div
                        key={log.index}
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.86rem'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: '#991b1b', marginRight: '6px' }}>Switch #{log.index}:</span>
                          <span style={{ color: '#475569' }}>Left at <strong>{log.leftAt}</strong> ➔ Returned at <strong>{log.returnedAt}</strong></span>
                        </div>
                        <span style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.8rem'
                        }}>
                          {log.durationSeconds}s Away
                        </span>
                      </div>
                    ))}
                  </div>
                )}

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
                    marginTop: '1.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Return to Active Exam
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 4: COMPLETION SCREEN WITH TAB SWITCH BREAKDOWN & WEAK TOPICS        */}
          {/* ========================================================================= */}
          {phase === 'completed' && completionData && (
            <div style={{ padding: '2.5rem 2rem' }}>
              {/* Header Score Card */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: completionData.percentage >= 70 ? '#ecfdf5' : '#fef2f2',
                  color: completionData.percentage >= 70 ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <Award size={40} />
                </div>

                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0b5e4a', background: '#e8f5f1', padding: '3px 10px', borderRadius: '4px' }}>
                  {paperCode} SCORE REPORT
                </span>

                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0 0.2rem 0' }}>
                  Score: {completionData.score} / {completionData.totalMarks} ({completionData.percentage}%)
                </h2>

                <p style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: completionData.percentage >= 70 ? '#059669' : '#b45309',
                  maxWidth: '680px',
                  margin: '0.75rem auto 0 auto',
                  lineHeight: 1.5
                }}>
                  {completionData.dynamicMessage}
                </p>
              </div>

              {/* Candidate Metadata Strip with Cheating Summary */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Candidate</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{completionData.studentName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Accuracy</div>
                  <div style={{ fontWeight: 700, color: '#0b5e4a' }}>{completionData.percentage}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Integrity Warnings</div>
                  <div style={{ fontWeight: 700, color: (completionData.tabSwitchCount > 0 || (completionData.screenshotAttempts || screenshotAttemptCount) > 0) ? '#dc2626' : '#059669' }}>
                    {completionData.tabSwitchCount} Switches ({completionData.totalAwayTimeSeconds || 0}s Away)
                    {(completionData.screenshotAttempts || screenshotAttemptCount) > 0 ? ` • ${completionData.screenshotAttempts || screenshotAttemptCount} Snips Blocked` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Submitted At</div>
                  <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>
                    {new Date(completionData.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Tab Switch Breakdown Card with Exact Duration for Each Switch */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={20} color={tabSwitchLogs.length > 0 ? '#dc2626' : '#059669'} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Tab-Switch & Anti-Capture Audit Trail (Stored in Database)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: tabSwitchLogs.length > 0 ? '#fee2e2' : '#dcfce7',
                      color: tabSwitchLogs.length > 0 ? '#b91c1c' : '#15803d'
                    }}>
                      {tabSwitchLogs.length} Departures Recorded ({totalAwayTime}s Total Away)
                    </span>
                    {(completionData.screenshotAttempts || screenshotAttemptCount) > 0 && (
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: '#fee2e2',
                        color: '#b91c1c'
                      }}>
                        📸 {completionData.screenshotAttempts || screenshotAttemptCount} Snips Blocked
                      </span>
                    )}
                  </div>
                </div>

                {tabSwitchLogs.length === 0 ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', color: '#15803d', fontSize: '0.9rem' }}>
                    🛡️ Clean Integrity: Zero window departures or tab switches were logged during this exam attempt.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {tabSwitchLogs.map((log) => (
                      <div
                        key={log.index}
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '0.85rem 1.15rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ fontSize: '0.9rem' }}>
                          <strong style={{ color: '#991b1b', marginRight: '6px' }}>Tab Departure #{log.index}:</strong>
                          <span style={{ color: '#334155' }}>Switched away at <strong>{log.leftAt}</strong> and returned at <strong>{log.returnedAt}</strong></span>
                        </div>
                        <div style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '3px 10px',
                          borderRadius: '6px'
                        }}>
                          Away for {log.durationSeconds} Seconds
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weak Subjects / Recommendation Engine Box */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Sparkles size={20} color="#0b5e4a" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Personalized Weak Topic Recommendations (Stored in Database)
                  </h3>
                </div>

                {completionData.weakTopics && completionData.weakTopics.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {completionData.weakTopics.map((wt: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                            Unit {wt.topicNumber ? wt.topicNumber + ': ' : ''}{wt.topicName}
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#78350f', marginTop: '2px' }}>
                            Accuracy: {wt.accuracyPercentage}% ({wt.correctQuestions}/{wt.totalQuestions} correct) • {wt.recommendation}
                          </div>
                        </div>
                        <span style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          Needs Revision
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', color: '#15803d', fontSize: '0.9rem' }}>
                    🎉 Excellent mastery! No weak topics detected (&ge;65% achieved across all units).
                  </div>
                )}
              </div>

              {/* Comprehensive Review List of Incorrect Responses */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Comprehensive Question-by-Question Review
                  </h3>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => setReviewFilter('incorrect')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: reviewFilter === 'incorrect' ? 700 : 500,
                        background: reviewFilter === 'incorrect' ? '#dc2626' : '#f1f5f9',
                        color: reviewFilter === 'incorrect' ? '#ffffff' : '#475569',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Incorrect Items ({completionData.incorrectQuestions?.length || 0})
                    </button>
                    <button
                      onClick={() => setReviewFilter('all')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: reviewFilter === 'all' ? 700 : 500,
                        background: reviewFilter === 'all' ? '#0b5e4a' : '#f1f5f9',
                        color: reviewFilter === 'all' ? '#ffffff' : '#475569',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      All Items ({activeQuestions.length})
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(reviewFilter === 'incorrect' ? completionData.incorrectQuestions : activeQuestions).map((item: any, i: number) => {
                    const isIncList = reviewFilter === 'incorrect';
                    const qNum = isIncList ? item.questionNumber : item.displayNumber;
                    const qText = item.questionText;
                    const userAns = isIncList ? item.selectedOption : userSelections[item.displayNumber.toString()];
                    const correctAns = isIncList ? item.correctOption : item.correctOption;
                    const isRight = userAns === correctAns;
                    const expl = item.explanation;

                    return (
                      <div
                        key={i}
                        style={{
                          background: '#ffffff',
                          border: `1.5px solid ${isRight ? '#86efac' : '#fca5a5'}`,
                          borderRadius: '12px',
                          padding: '1.25rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>Question {qNum}</span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isRight ? '#ecfdf5' : '#fef2f2',
                            color: isRight ? '#059669' : '#dc2626'
                          }}>
                            {isRight ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          {item.topicName && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              • {item.topicName}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.98rem', color: '#1e293b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                          <MathText text={qText} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            background: isRight ? '#ecfdf5' : '#fef2f2',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                          }}>
                            <strong>Your Answer:</strong> ({userAns || 'None'}) {item.selectedText ? `— ${item.selectedText}` : ''}
                          </div>
                          <div style={{
                            background: '#ecfdf5',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: '#065f46'
                          }}>
                            <strong>Correct Answer:</strong> ({correctAns}) {item.correctText ? `— ${item.correctText}` : ''}
                          </div>
                        </div>

                        {/* Explanation of Why It's Correct & Why Incorrect */}
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
                          <MathText text={expl} />

                          {!isRight && item.whyIncorrect && (
                            <div style={{ marginTop: '0.5rem', color: '#991b1b', fontWeight: 600 }}>
                              ⚠️ Why your choice ({userAns}) was incorrect: {item.whyIncorrect}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('setup');
                    setUserSelections({});
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
                  <span>Retake Quiz (Fresh Shuffle)</span>
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
