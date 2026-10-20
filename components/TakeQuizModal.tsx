'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Clock,
  ArrowRight, ArrowLeft, ShieldCheck, Award, RotateCcw,
  Eye, EyeOff, Check, X, FileText, ChevronRight, User, Lock, Mail, Smartphone,
  ShieldAlert, Shield, Info, Maximize, Minimize
} from 'lucide-react';
import MathText from '@/components/MathText';
import AuthModal from '@/components/AuthModal';
import { useDialog } from '@/lib/use-dialog';
import { useSecureExam } from '@/lib/use-secure-exam';
import { z } from 'zod';
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
  diagramBased?: boolean;
  isDiagram?: boolean;
  sourceRegion?: any;
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

export default function TakeQuizModal({
  isOpen,
  onClose,
  paperTitle: initialPaperTitle,
  paperCode,
  questions
}: TakeQuizModalProps) {
  const dialogProps = useDialog(isOpen, 'Assessment', onClose);
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

  const engine = useSecureExam({ isOpen: isOpen && phase === 'active', paperCode, practiceDurationMin: selectedDurationMin, practiceUntimed: !isTimed });
  const [preview, setPreview] = useState<{ title: string; count: number; practice: boolean } | null>(null);
  const paperTitle = engine.exam?.quizTitle || preview?.title || initialPaperTitle;
  useEffect(() => { if (phase === 'setup') setLoadingQuizQuestions(false); }, [phase]);
  useEffect(() => {
    if (!engine.submitted) return;
    const resultSchema = z.object({ score: z.number(), maxMarks: z.number(), percentage: z.number(), studentName: z.string(), submittedAt: z.string().nullable(), tabSwitchCount: z.number(), status: z.string(), canViewCorrectAnswers: z.boolean(),
      questions: z.array(z.object({ questionId: z.string(), marks: z.number(), scoreAwarded: z.number().nullable().optional(), explanation: z.string().optional(), options: z.array(z.object({ id: z.string().optional(), text: z.string(), isCorrect: z.boolean().optional() })) })) });
    void fetch('/api/quizzes/' + encodeURIComponent(engine.submitted.quizId) + '/results?attemptId=' + encodeURIComponent(engine.submitted.attemptId)).then(async response => {
      if (!response.ok) { setCompletionData({ pending: true }); setPhase('completed'); return; }
      const result = resultSchema.parse((await response.json()).result);
      if (result.status !== 'GRADED') { setCompletionData({ pending: true }); setPhase('completed'); return; }
      const reviewed = activeQuestions.map(q => { const server = result.questions.find(r => r.questionId === q.id), source = engine.exam?.questions.find(s => s.id === q.id);
        const correct = server?.options.find(o => o.isCorrect)?.id, index = source?.options.findIndex(o => o.id === correct) ?? -1;
        return { ...q, correctOption: index >= 0 ? String.fromCharCode(65 + index) : '', explanation: server?.explanation || '' };
      });
      setActiveQuestions(reviewed);
      setCompletionData({ ...result, totalMarks: result.maxMarks, weakTopics: [], dynamicMessage: 'Your assessment has been submitted and graded.',
        incorrectQuestions: reviewed.filter(q => { const server = result.questions.find(r => r.questionId === q.id); return server?.scoreAwarded !== null && server?.scoreAwarded !== undefined && server.scoreAwarded < server.marks; }).map(q => ({ ...q, questionNumber: q.displayNumber, selectedOption: userSelections[String(q.displayNumber)] })) });
      setPhase('completed');
    }).catch(() => { setCompletionData({ pending: true }); setPhase('completed'); });
  }, [engine.submitted]);
  useEffect(() => {
    if (!isOpen) return;
    void fetch('/api/quizzes/' + encodeURIComponent(paperCode)).then(r => r.json()).then(data => {
      if (data.quiz) {
        const practice = String(data.quiz.id).startsWith('practice-');
        setPreview({ title: data.quiz.title, count: data.quiz.questions.length, practice });
        if (!practice) { setSelectedDurationMin(data.quiz.durationMin || 45); setIsTimed(true); }
      }
    }).catch(() => undefined);
  }, [isOpen, paperCode]);
  useEffect(() => {
    if (!isOpen) { setPhase('setup'); setCurrentIndex(0); return; }
    void fetch('/api/auth/me').then(r => r.json()).then(data => { if (data.user) setStudent(data.user); }).catch(() => undefined);
  }, [isOpen]);
  useEffect(() => { if (engine.auth) { engine.closeAuth(); setPhase('auth'); } }, [engine.auth]);
  useEffect(() => { setTimeLeftSeconds(engine.remaining); }, [engine.remaining]);
  useEffect(() => { setTabSwitchCount(engine.tabSwitchCount); }, [engine.tabSwitchCount]);
  useEffect(() => {
    if (!engine.exam) return;
    const mapped = engine.exam.questions.map((q, i) => ({
      id: q.id, displayNumber: i + 1, originalQuestionNumber: String(q.orderIndex), questionText: q.stemText, questionType: q.questionType, marks: q.marks,
      diagramUrl: q.diagramUrl, options: Object.fromEntries(q.options.map((o, j) => [String.fromCharCode(65 + j), o.text])),
      correctOption: '', explanation: '', topicName: '',
    }));
    setActiveQuestions(mapped);
    setUserSelections(Object.fromEntries(engine.exam.questions.flatMap((q, i) => {
      const payload = engine.exam?.answers[q.id]?.payload;
      if (!payload) return [];
      const selected = payload.selectedOptionId, optionIndex = q.options.findIndex(o => o.id === selected);
      const value = optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : payload.selectedOptionIds?.length ? payload.selectedOptionIds.join(',') : payload.numericAnswer || payload.textAnswer || (payload.matchedPairs?.length ? 'Answered' : '');
      return value ? [[String(i + 1), value]] : [];
    })));
    setLoadingQuizQuestions(false);
  }, [engine.exam]);
  const handleStartQuiz = async () => { setStartQuizError(null); setLoadingQuizQuestions(true); setPhase(student ? 'active' : 'auth'); };
  const handleSelectAnswer = (displayNum: number, optionKey: string) => {
    const index = displayNum - 1, question = engine.exam?.questions[index], optionIndex = optionKey.charCodeAt(0) - 65;
    if (!question) return;
    const id = question.options[optionIndex]?.id;
    if (!id) return;
    if (question.questionType === 'MCQ_MULTIPLE') {
      const selected = engine.exam?.answers[question.id]?.payload.selectedOptionIds || [];
      engine.answer(index, { selectedOptionIds: selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id] });
    } else engine.answer(index, { selectedOptionId: id });
  };
  const handleSubmitQuiz = async (_automatic = false) => { setSubmitting(true); await engine.submit(engine.remaining <= 0); setSubmitting(false); };
  const dismissScreenshotDefense = () => { setScreenshotAlert(false); setIsFocusLost(false); setIsWindowMasked(false); };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setIsFullscreen(Boolean(document.fullscreenElement)); } catch {} };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = activeQuestions[currentIndex];
  const currentSelected = currentQ ? userSelections[currentQ.displayNumber.toString()] : null;
  const isAnswered = Boolean(currentSelected) && Boolean(currentQ?.correctOption);
  const isCurrentCorrect = isAnswered && currentQ && currentSelected === currentQ.correctOption;

  const totalAwayTime = tabSwitchLogs.reduce((acc, cur) => acc + cur.durationSeconds, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Global CSS to prevent printing, manage single scrollbar, and disable selection */}
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

      {/* LIGHT SCREENSHOT & PRIVACY SHIELD (Reassuring, Clean & Non-Dangerous) */}
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
          {/* Friendly Emerald Badge */}
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

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 16px',
            color: '#0b5e4a',
            fontSize: '0.86rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            justifyContent: 'center'
          }}>
            <Info size={16} color="#0b5e4a" style={{ flexShrink: 0 }} />
            <span>Your answers & timer are safely saved</span>
          </div>

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
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(11, 94, 74, 0.25)',
              transition: 'transform 0.1s ease'
            }}
          >
            <Eye size={17} /> Resume Quiz
          </button>
        </div>
      </div>

      <div
        {...dialogProps} id="quiz-modal-container"
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
          MozUserSelect: 'auto',
          msUserSelect: 'text',
          overflow: 'hidden'
        }}

      >
        <div
          id="quiz-modal-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--text-color, #1e293b)',
            borderRadius: phase === 'active' || phase === 'completed' ? '0px' : '20px',
            maxWidth: phase === 'active' || phase === 'completed' ? '100vw' : '620px',
            width: phase === 'active' || phase === 'completed' ? '100vw' : '100%',
            height: phase === 'active' ? '100dvh' : (phase === 'completed' ? '100vh' : 'auto'),
            maxHeight: phase === 'active' ? '100dvh' : (phase === 'completed' ? '100vh' : '94vh'),
            overflowY: phase === 'active' ? 'hidden' : 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>

          {phase === 'active' && <div role="status" style={{ padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: '0.82rem' }}>
            {engine.error || engine.notice || (engine.saving ? 'Saving answers…' : engine.pending ? engine.pending + ' answers pending synchronization' : engine.exam ? 'All answers saved' : 'Loading saved assessment…')}
            {engine.error && <button onClick={engine.reload} style={{ marginLeft: 12 }}>Retry</button>}
          </div>}

          {/* Examination Privacy & Anti-Snipping Shield (Active when window loses focus - Light Sign) */}
          {isFocusLost && !screenshotAlert && phase === 'active' && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(248, 250, 252, 0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                zIndex: 999998,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                textAlign: 'center',
                padding: '1.5rem'
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
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
                  Screen Protected
                </h3>
                <p style={{ fontSize: '0.94rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                  Question content is temporarily concealed while outside the quiz window. Click below to continue your examination.
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
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(11, 94, 74, 0.25)'
                  }}
                >
                  <Eye size={17} /> Resume Quiz
                </button>
              </div>
            </div>
          )}

          {/* Global Close Button (Hidden during active examination to enforce completion) */}
          {phase !== 'active' && (
            <button
              aria-label="Close assessment" onClick={onClose}
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
          <AuthModal isOpen={phase === 'auth'} onClose={() => setPhase('setup')} onSuccess={user => { setStudent(user); setPhase('active'); }} />

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
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Select Exam Duration:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[15, 30, 50].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          disabled={!preview?.practice}
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
                  • <strong>Randomized Questions & Options:</strong> Question and option ordering follows the assessment settings.<br />
                  • <strong>Answer Recovery:</strong> Answers are stored on this device and synchronized when connected.<br />
                  • <strong>Secure Grading:</strong> Answers and marks are checked by the server after submission.<br />
                  • <strong>Session Integrity:</strong> Visibility events are recorded when the teacher enables monitoring.
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
                    {loadingQuizQuestions ? 'Loading Questions...' : `Start Quiz (${preview?.count || questions?.length || activeQuestions?.length || 40} Items)`}
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
                maxHeight: '100%',
                overflow: 'hidden',
                position: 'relative',
                filter: isWindowMasked ? 'blur(35px)' : 'none',
                transition: 'filter 0.15s ease',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'auto',
                userSelect: 'auto',
                touchAction: 'pan-y'
              }}
            >
              {/* Tab Switch Warning Toast (Friendly notice) */}
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
                    onClick={(e) => {
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
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                flexWrap: 'wrap',
                gap: '0.75rem',
                zIndex: 2,
                flexShrink: 0
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a', textTransform: 'uppercase' }}>
                    {paperCode} • Item {currentIndex + 1} of {activeQuestions.length}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Question {currentQ.displayNumber}
                  </div>
                </div>

                {/* Status Indicators: Timer, Fullscreen & Clickable Anti-Cheat Warnings Pill */}
                <div style={{ display: 'flex', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%', alignItems: 'center', gap: '0.65rem' }}>
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
                    title="View recorded session events"
                  >
                    <Eye size={15} />
                    <span>
                      👁️ {tabSwitchCount} Events
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

              {/* Quick Question Jump Drawer (Grid View - No separate scrollbar track) */}
              {showQuestionGrid && (
                <div
                  className="no-scrollbar"
                  style={{
                    padding: '1rem',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    flexShrink: 0
                  }}
                >
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

              {/* Active Question Body (SINGLE AND ONLY SCROLLBAR CONTAINER) */}
              <div
                id="aku-question-scroll-body"
                className="aku-single-scroll"
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

                {/* Cropped Diagram / Graph / Circuit (if present) */}
                {(() => {
                  if (currentQ.diagramBased === false || (currentQ as any).isDiagram === false) return null;
                  const diagramSrc = resolveQuestionDiagram(paperCode, currentQ.originalQuestionNumber || currentQ.displayNumber, currentQ);
                  if (!diagramSrc) return null;
                  return (
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <img
                        src={diagramSrc}
                        alt={`Diagram for Question ${currentQ.displayNumber}`}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                    const serverQuestion = engine.exam?.questions[currentIndex];
                    const optionId = serverQuestion?.options[key.charCodeAt(0) - 65]?.id;
                    const isChosen = currentQ.questionType === 'MCQ_MULTIPLE' ? Boolean(optionId && engine.exam?.answers[currentQ.id]?.payload.selectedOptionIds?.includes(optionId)) : currentSelected === key;
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

                {!['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(currentQ.questionType) && (
                  <div style={{ margin: '1rem 0 1.5rem', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    {currentQ.questionType === 'MATCHING' ? engine.exam?.questions[currentIndex]?.matchingLeft?.map(left => <label key={left} style={{ display: 'block', marginBottom: 12 }}>{left}
                      <select value={engine.exam?.answers[currentQ.id]?.payload.matchedPairs?.find(pair => pair.left === left)?.right || ''} onChange={event => engine.answer(currentIndex, { matchedPairs: [...(engine.exam?.answers[currentQ.id]?.payload.matchedPairs || []).filter(pair => pair.left !== left), { left, right: event.target.value }] })} style={{ marginLeft: 12, padding: 8 }}>
                        <option value="">Select a match</option>{engine.exam?.questions[currentIndex]?.matchingRight?.map(right => <option key={right}>{right}</option>)}
                      </select></label>)
                    : currentQ.questionType === 'NUMERICAL' ? <label>Numerical answer<input aria-label="Numerical answer" value={engine.exam?.answers[currentQ.id]?.payload.numericAnswer || ''} onChange={event => engine.answer(currentIndex, { numericAnswer: event.target.value })} style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} /></label>
                    : <label>Your answer<textarea aria-label="Written answer" rows={8} value={engine.exam?.answers[currentQ.id]?.payload.textAnswer || ''} onChange={event => engine.answer(currentIndex, { textAnswer: event.target.value })} style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} /></label>}
                  </div>
                )}

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
                background: '#ffffff',
                flexShrink: 0
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Tab Switches</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{tabSwitchLogs.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Time Away</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalAwayTime}s</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Snips Paused</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b5e4a' }}>{screenshotAttemptCount}</div>
                  </div>
                </div>

                {screenshotAttemptCount > 0 && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: '#0b5e4a',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <ShieldCheck size={16} />
                    <span>Privacy Shield: {screenshotAttemptCount} screen capture attempt(s) paused & examination questions protected.</span>
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
          {phase === 'completed' && completionData?.pending && <div style={{ padding: '3rem 2rem', textAlign: 'center' }}><ShieldCheck size={40} color="#0b5e4a" /><h2>Assessment submitted</h2><p>Your answers are saved. Results will be available when grading and release are complete.</p><p>Submission receipt: {engine.submitted?.attemptId}</p><p><a href={'/quizzes/' + engine.submitted?.quizId + '/results?attemptId=' + engine.submitted?.attemptId}>Check results</a></p><button onClick={onClose}>Close & Return to Paper</button></div>}
          {phase === 'completed' && completionData && !completionData.pending && (
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
                    {completionData.tabSwitchCount} Switches (visibility events)
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
                      Session Integrity Audit Trail
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
                    Topic Recommendations
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
                    Topic recommendations will appear when your answers are linked to curriculum outcomes.
                  </div>
                )}
              </div>

              {/* Comprehensive Review List of Incorrect Responses */}
              <div style={{ marginBottom: '2rem', display: completionData.canViewCorrectAnswers ? 'block' : 'none' }}>
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
