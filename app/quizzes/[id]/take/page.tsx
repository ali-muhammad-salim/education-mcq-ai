'use client';

import React, { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, ShieldAlert, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, 
  Flag, Check, RefreshCw, Send, AlertOctagon, HelpCircle, Eye, CheckSquare, 
  Square, Radio, CheckCircle2, RotateCcw
} from 'lucide-react';
import MathText from '@/components/MathText';

interface QuizQuestion {
  id: string;
  orderIndex: number;
  marks: number;
  isRequired: boolean;
  questionType: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'NUMERICAL' | 'MATCHING' | 'LONG_ANSWER';
  stemText: string;
  difficulty: string;
  cognitiveLevel: string;
  options: Array<{ id: string; text: string }>;
  matchingPairs?: Array<{ left: string; right: string }>;
  drawingSvg?: string | null;
}

interface AttemptData {
  id: string;
  startedAt: string;
  deadline: string;
  remainingSeconds: number;
  tabSwitchCount: number;
  quizTitle: string;
  durationMin: number;
  settings: {
    tabMonitoringEnabled?: boolean;
    tabWarningThreshold?: number;
    showCorrectAnswers?: boolean;
    immediateFeedback?: boolean;
  };
  questions: QuizQuestion[];
  answers: Record<string, any>;
}

export default function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);

  // Active student state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [remainingSec, setRemainingSec] = useState<number>(0);

  // Anti-cheating tab monitoring state
  const [tabSwitches, setTabSwitches] = useState(0);
  const [tabWarningModal, setTabWarningModal] = useState<{
    isOpen: boolean;
    count: number;
    isThresholdExceeded: boolean;
  }>({
    isOpen: false,
    count: 0,
    isThresholdExceeded: false
  });

  // Submission state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or resume assessment
  useEffect(() => {
    async function startOrResumeAttempt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success && data.attempt) {
          setAttempt(data.attempt);
          setAnswers(data.attempt.answers || {});
          setTabSwitches(data.attempt.tabSwitchCount || 0);
          setRemainingSec(data.attempt.remainingSeconds || 0);
          
          // Re-populate marked for review if present in saved answers
          const initialMarked = new Set<string>();
          Object.entries(data.attempt.answers || {}).forEach(([qId, payload]: [string, any]) => {
            if (payload?.markedForReview) {
              initialMarked.add(qId);
            }
          });
          setMarkedForReview(initialMarked);
        } else {
          setError(data.error || 'Failed to initialize assessment attempt.');
        }
      } catch (err: any) {
        console.error('Failed to load assessment:', err);
        setError('Error loading assessment. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    }

    startOrResumeAttempt();
  }, [quizId]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (remainingSec <= 0 || !attempt) return;

    const timer = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time expired! Auto-submit
          handleAutoSubmit('Time Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSec, attempt]);

  // Anti-cheating tab visibility monitoring
  useEffect(() => {
    if (!attempt || !attempt.settings?.tabMonitoringEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Student switched away from assessment window!
        try {
          const res = await fetch(`/api/quizzes/${quizId}/attempt/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attemptId: attempt.id,
              eventType: 'TAB_VISIBILITY_CHANGE',
              metadata: { clientTimestamp: new Date().toISOString() }
            })
          });
          const data = await res.json();
          if (data.success) {
            setTabSwitches(data.tabSwitchCount);
          }
        } catch (err) {
          console.error('Failed to log visibility event:', err);
        }
      } else {
        // Student returned to assessment window! Show integrity warning modal
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        const threshold = attempt.settings.tabWarningThreshold ?? 2;
        setTabWarningModal({
          isOpen: true,
          count: newCount,
          isThresholdExceeded: newCount > threshold
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attempt, quizId, tabSwitches]);

  // Autosave answer to server
  const persistAnswer = useCallback(async (qId: string, answerPayload: any) => {
    if (!attempt) return;
    try {
      setSaveStatus('saving');
      const res = await fetch(`/api/quizzes/${quizId}/attempt/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          questionId: qId,
          answerPayload
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Autosave answer error:', err);
      setSaveStatus('error');
    }
  }, [attempt, quizId]);

  // Handle option select
  const handleSelectOption = (qId: string, optionId: string, isMulti: boolean) => {
    const currentPayload = answers[qId] || {};
    let nextPayload;

    if (isMulti) {
      const currentSelected: string[] = currentPayload.selectedOptionIds || [];
      const updated = currentSelected.includes(optionId)
        ? currentSelected.filter(id => id !== optionId)
        : [...currentSelected, optionId];
      nextPayload = { ...currentPayload, selectedOptionIds: updated };
    } else {
      nextPayload = { ...currentPayload, selectedOptionId: optionId };
    }

    setAnswers(prev => ({ ...prev, [qId]: nextPayload }));
    persistAnswer(qId, nextPayload);
  };

  // Handle text/numeric input change (with debounced autosave)
  const handleInputChange = (qId: string, field: 'numericAnswer' | 'textAnswer', value: string) => {
    const nextPayload = { ...(answers[qId] || {}), [field]: value };
    setAnswers(prev => ({ ...prev, [qId]: nextPayload }));
    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(qId, nextPayload);
    }, 700);
  };

  // Toggle mark for review
  const toggleMarkForReview = (qId: string) => {
    const nextMarked = new Set(markedForReview);
    const isNowMarked = !nextMarked.has(qId);
    if (isNowMarked) nextMarked.add(qId);
    else nextMarked.delete(qId);
    setMarkedForReview(nextMarked);

    const nextPayload = { ...(answers[qId] || {}), markedForReview: isNowMarked };
    setAnswers(prev => ({ ...prev, [qId]: nextPayload }));
    persistAnswer(qId, nextPayload);
  };

  // Clear answer for current question
  const handleClearAnswer = (qId: string) => {
    const emptyPayload = { markedForReview: markedForReview.has(qId) };
    setAnswers(prev => ({ ...prev, [qId]: emptyPayload }));
    persistAnswer(qId, emptyPayload);
  };

  // Submit assessment
  const handleSubmitAssessment = async () => {
    if (!attempt || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/quizzes/${quizId}/attempt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id })
      });
      const data = await res.json();
      if (data.success) {
        router.replace(`/quizzes/${quizId}/results?attemptId=${attempt.id}`);
      } else {
        alert(data.error || 'Failed to submit assessment.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Submit assessment error:', err);
      alert('Error submitting assessment. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Auto-submit when countdown hits zero
  const handleAutoSubmit = async (reason: string) => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/quizzes/${quizId}/attempt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id, reason })
      });
      router.replace(`/quizzes/${quizId}/results?attemptId=${attempt.id}`);
    } catch {
      router.replace(`/quizzes/${quizId}/results?attemptId=${attempt?.id}`);
    }
  };

  // Format countdown clock mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-sm font-medium">Securing examination environment & loading questions...</span>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-xl">
          <AlertOctagon className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-white">Assessment Access Blocked</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const questions = attempt.questions || [];
  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(answers).filter(a => 
    a?.selectedOptionId || (a?.selectedOptionIds && a.selectedOptionIds.length > 0) || a?.numericAnswer || a?.textAnswer
  ).length;

  const isCurrentAnswered = currentQ && (
    answers[currentQ.id]?.selectedOptionId || 
    (answers[currentQ.id]?.selectedOptionIds && answers[currentQ.id]?.selectedOptionIds.length > 0) ||
    answers[currentQ.id]?.numericAnswer || 
    answers[currentQ.id]?.textAnswer
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Authoritative Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/40">
            AKU
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {attempt.quizTitle}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {saveStatus === 'saved' && <><Check className="w-3 h-3 text-emerald-400" /> Answer Saved</>}
                {saveStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Saving...</>}
                {saveStatus === 'unsaved' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unsaved</>}
                {saveStatus === 'error' && <><AlertTriangle className="w-3 h-3 text-rose-400" /> Save Error</>}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Authoritative Countdown Timer & Submit */}
        <div className="flex items-center gap-3">
          {/* Timer Display */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-wider ${
            remainingSec < 120 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' 
              : 'bg-slate-800/80 text-amber-300 border-slate-700'
          }`}>
            <Clock className={`w-4 h-4 ${remainingSec < 120 ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>{formatTime(remainingSec)}</span>
          </div>

          {/* Submit Assessment Button */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Examination Layout: Question View + Side Navigator */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Question Card & Answer Workspace */}
        <div className="flex-1 flex flex-col gap-4">
          {currentQ ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 flex flex-col gap-6 shadow-xl relative">
              {/* Question Meta Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Question {currentIndex + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {currentQ.marks} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {currentQ.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mark for Review Toggle */}
                  <button
                    onClick={() => toggleMarkForReview(currentQ.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      markedForReview.has(currentQ.id)
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{markedForReview.has(currentQ.id) ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>

                  {/* Clear answer */}
                  {isCurrentAnswered && (
                    <button
                      onClick={() => handleClearAnswer(currentQ.id)}
                      className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
                      title="Clear selected answer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                <MathText text={currentQ.stemText} />
              </div>

              {/* Attached Visual Diagram if present */}
              {currentQ.drawingSvg && (
                <div 
                  className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 max-w-md mx-auto my-2"
                  dangerouslySetInnerHTML={{ __html: currentQ.drawingSvg }}
                />
              )}

              {/* Answer Input Area by Question Type */}
              <div className="pt-2">
                {/* MCQ SINGLE CHOICE */}
                {currentQ.questionType === 'MCQ_SINGLE' && (
                  <div className="flex flex-col gap-3">
                    {currentQ.options.map((opt, optIdx) => {
                      const isChosen = answers[currentQ.id]?.selectedOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQ.id, opt.id, false)}
                          className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3.5 transition-all ${
                            isChosen
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isChosen ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'
                          }`}>
                            {isChosen && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs font-bold text-slate-500 w-5">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="text-sm font-medium flex-1">
                            <MathText text={opt.text} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MCQ MULTIPLE SELECT */}
                {currentQ.questionType === 'MCQ_MULTIPLE' && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs text-indigo-400">Select all options that apply:</span>
                    {currentQ.options.map((opt, optIdx) => {
                      const selectedIds: string[] = answers[currentQ.id]?.selectedOptionIds || [];
                      const isChosen = selectedIds.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQ.id, opt.id, true)}
                          className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3.5 transition-all ${
                            isChosen
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChosen ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'
                          }`}>
                            {isChosen && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-xs font-bold text-slate-500 w-5">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="text-sm font-medium flex-1">
                            <MathText text={opt.text} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TRUE / FALSE */}
                {currentQ.questionType === 'TRUE_FALSE' && (
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    {currentQ.options.map((opt) => {
                      const isChosen = answers[currentQ.id]?.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQ.id, opt.id, false)}
                          className={`py-4 px-6 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            isChosen
                              ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/40'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isChosen ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'}`}>
                            {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* NUMERICAL */}
                {currentQ.questionType === 'NUMERICAL' && (
                  <div className="flex flex-col gap-2 max-w-sm">
                    <label className="text-xs text-slate-400">Enter your calculated numerical answer:</label>
                    <input
                      type="number"
                      step="any"
                      value={answers[currentQ.id]?.numericAnswer || ''}
                      onChange={(e) => handleInputChange(currentQ.id, 'numericAnswer', e.target.value)}
                      placeholder="E.g. 9.8 or 3.14"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                )}

                {/* SHORT ANSWER */}
                {currentQ.questionType === 'SHORT_ANSWER' && (
                  <div className="flex flex-col gap-2 max-w-md">
                    <label className="text-xs text-slate-400">Type your answer:</label>
                    <input
                      type="text"
                      value={answers[currentQ.id]?.textAnswer || ''}
                      onChange={(e) => handleInputChange(currentQ.id, 'textAnswer', e.target.value)}
                      placeholder="Type concise answer..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                )}

                {/* LONG ANSWER / ESSAY */}
                {currentQ.questionType === 'LONG_ANSWER' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400">Provide your detailed written response:</label>
                    <textarea
                      rows={6}
                      value={answers[currentQ.id]?.textAnswer || ''}
                      onChange={(e) => handleInputChange(currentQ.id, 'textAnswer', e.target.value)}
                      placeholder="Type your response with relevant formulas, reasoning, and units..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Navigation Footer (Previous / Next) */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs text-slate-400">
                  {currentIndex + 1} of {questions.length}
                </span>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all"
                  >
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">No questions found in this assessment.</div>
          )}
        </div>

        {/* Right Column: Question Navigator Palette */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Question Navigator
            </h3>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/80" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-500/80" />
                <span>Review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-indigo-500" />
                <span>Current</span>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.selectedOptionId || 
                  (answers[q.id]?.selectedOptionIds && answers[q.id]?.selectedOptionIds.length > 0) ||
                  answers[q.id]?.numericAnswer || 
                  answers[q.id]?.textAnswer;
                const isMarked = markedForReview.has(q.id);
                const isCurrent = currentIndex === idx;

                let style = 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700';
                if (isAnswered) style = 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300';
                if (isMarked) style = 'bg-purple-600/30 border-purple-500/70 text-purple-200';
                if (isCurrent) style += ' ring-2 ring-indigo-500 font-bold text-white';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${style}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Finish & Submit Trigger */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full mt-2 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment</span>
            </button>
          </div>

          {/* Assessment Integrity Status */}
          {attempt.settings?.tabMonitoringEnabled && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Integrity Sentinel</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Browser focus and window visibility are monitored. Tab switches are logged for teacher review.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                <span>Logged Switches:</span>
                <strong className={tabSwitches > (attempt.settings.tabWarningThreshold ?? 2) ? 'text-rose-400' : 'text-slate-300'}>
                  {tabSwitches} / {attempt.settings.tabWarningThreshold ?? 2} Max
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ANTI-CHEATING TAB SWITCH ALERT MODAL */}
      {tabWarningModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl shadow-rose-950/40">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {tabWarningModal.isThresholdExceeded ? 'Integrity Warning: Threshold Exceeded!' : 'Tab Switch Detected'}
                </h3>
                <span className="text-xs text-rose-300">Logged Switch #{tabWarningModal.count}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {tabWarningModal.isThresholdExceeded ? (
                <span className="text-rose-200 font-medium">
                  You have switched tabs {tabWarningModal.count} times, exceeding the assessment integrity threshold of {attempt.settings.tabWarningThreshold ?? 2}. This incident has been flagged and recorded in your permanent assessment event log for teacher review.
                </span>
              ) : (
                <span>
                  You have navigated away from the assessment window. Please remain on this screen to ensure test integrity. All navigation events are recorded on the server.
                </span>
              )}
            </p>

            <button
              onClick={() => setTabWarningModal(prev => ({ ...prev, isOpen: false }))}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md"
            >
              I Understand & Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Assessment?</h3>
                <span className="text-xs text-slate-400">Review your completion status</span>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Total Questions:</span>
                <strong className="text-slate-200 text-sm">{questions.length}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Answered:</span>
                <strong className="text-emerald-400 text-sm">{answeredCount}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Unanswered:</span>
                <strong className="text-rose-400 text-sm">{questions.length - answeredCount}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Marked for Review:</span>
                <strong className="text-purple-400 text-sm">{markedForReview.size}</strong>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                ⚠️ You have {questions.length - answeredCount} unanswered questions. Unanswered questions will receive 0 marks.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Keep Working
              </button>
              <button
                onClick={handleSubmitAssessment}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Grading & Submitting...</span>
                  </>
                ) : (
                  <span>Confirm Final Submission</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
