'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircle2, XCircle, AlertCircle, ArrowLeft, RotateCcw, 
  HelpCircle, Clock, ShieldAlert, Award, FileText, ChevronDown, 
  ChevronUp, Sparkles, BookOpen, ExternalLink, ArrowRight
} from 'lucide-react';
import MathText from '@/components/MathText';

export default function AssessmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams ? searchParams.get('attemptId') : null;
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const url = attemptId 
          ? `/api/quizzes/${quizId}/results?attemptId=${attemptId}`
          : `/api/quizzes/${quizId}/results`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.result) {
          setResult(data.result);
          // Auto-expand all incorrect answers so student can review immediately
          const initialExpanded: Record<string, boolean> = {};
          data.result.questions.forEach((q: any) => {
            if (q.scoreAwarded < q.marks) {
              initialExpanded[q.questionId] = true;
            }
          });
          setExpandedExplanation(initialExpanded);
        } else {
          setError(data.error || 'Failed to load assessment results.');
        }
      } catch (err: any) {
        console.error('Fetch results error:', err);
        setError('Error loading assessment results.');
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [quizId, attemptId]);

  const toggleExpand = (qId: string) => {
    setExpandedExplanation(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
        <span className="text-xs font-semibold">Calculating grades & compiling RAG explanations...</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold">Results Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
          <Link
            href="/dashboard/student"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] text-white"
          >
            Go to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/student"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm">
              {result.quizTitle}
            </h1>
            <span className="text-xs text-slate-500 dark:text-slate-400">Assessment Performance Report</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/quizzes/${quizId}/take`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Assessment</span>
          </Link>

          <Link
            href="/dashboard/student"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] text-white shadow-md shadow-emerald-950/20 transition-all"
          >
            <span>Student Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-8">
        
        {/* Performance Scorecard Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-2 ${
            isPassed ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'
          }`} />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border shadow-sm ${
                isPassed 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
              }`}>
                <span className="text-2xl font-black">{result.percentage}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isPassed ? 'Passed' : 'Needs Review'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Candidate Name</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{result.studentName}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Score: <strong className="text-slate-900 dark:text-white">{result.score}</strong> / {result.maxMarks} marks</span>
                  <span>•</span>
                  <span>Status: <strong className={result.status === 'GRADING_PENDING' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>{result.status.replace('_', ' ')}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Time Taken</span>
                  <strong className="text-slate-800 dark:text-slate-200">{formatTime(result.timeSpentSec)}</strong>
                </div>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${result.tabSwitchCount > 2 ? 'text-rose-500' : 'text-cyan-600 dark:text-cyan-400'}`} />
                <div>
                  <span className="text-slate-500 block text-[10px]">Tab Switches</span>
                  <strong className={result.tabSwitchCount > 2 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                    {result.tabSwitchCount} {result.tabSwitchCount > 2 ? '(Flagged)' : ''}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Written grading notice if applicable */}
        {result.status === 'GRADING_PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900 dark:text-amber-300 font-semibold mb-0.5">Written Grading in Progress</strong>
              Objective MCQs and Numerical problems have been auto-graded. Extended response questions are currently queued for AI-assisted / teacher rubric evaluation.
            </div>
          </div>
        )}

        {/* Question Review Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Question-by-Question Review & RAG Explanations</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {result.questions.filter((q: any) => q.scoreAwarded === q.marks).length} of {result.questions.length} Correct
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {result.questions.map((q: any, idx: number) => {
              const isCorrect = q.scoreAwarded === q.marks;
              const isPartial = q.scoreAwarded > 0 && q.scoreAwarded < q.marks;
              const isExpanded = expandedExplanation[q.questionId] ?? !isCorrect;

              return (
                <div 
                  key={q.questionId}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-5 sm:p-6 flex flex-col gap-4 shadow-sm ${
                    isCorrect 
                      ? 'border-emerald-300 dark:border-emerald-500/30' 
                      : isPartial
                      ? 'border-amber-300 dark:border-amber-500/30'
                      : 'border-rose-300 dark:border-rose-500/30'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCorrect 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40' 
                          : isPartial
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40'
                          : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      {q.pastPaperRef && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-semibold">
                          {q.pastPaperRef}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        isCorrect 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                          : isPartial
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      }`}>
                        {q.scoreAwarded} / {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                    </div>
                  </div>

                  {/* Question Stem with KaTeX math */}
                  <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                    <MathText text={q.stemText} />
                  </div>

                  {/* Visual SVG diagram if present */}
                  {q.drawingSvg && (
                    <div 
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm"
                      dangerouslySetInnerHTML={{ __html: q.drawingSvg }}
                    />
                  )}

                  {/* Options & Choices */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: any, oIdx: number) => {
                        const isStudentChoice = q.studentAnswer?.selectedOptionId === opt.id || 
                          (Array.isArray(q.studentAnswer?.selectedOptionIds) && q.studentAnswer.selectedOptionIds.includes(opt.id));
                        const isCorrectOption = opt.isCorrect;

                        let cardStyle = 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
                        if (isCorrectOption) {
                          cardStyle = 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold';
                        } else if (isStudentChoice && !isCorrectOption) {
                          cardStyle = 'bg-rose-50 dark:bg-rose-500/15 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 line-through';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${cardStyle}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-500">{String.fromCharCode(65 + oIdx)}.</span>
                              <MathText text={opt.text} />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isStudentChoice && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                  Your Choice
                                </span>
                              )}
                              {isCorrectOption && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                              {isStudentChoice && !isCorrectOption && (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical / Short Answer response */}
                  {q.questionType === 'NUMERICAL' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Your Answer:</span>
                        <strong className="text-slate-900 dark:text-white">{q.studentAnswer?.numericAnswer || 'None'}</strong>
                      </div>
                      {result.canViewCorrectAnswers && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Target Value:</span>
                          <strong className="text-emerald-700 dark:text-emerald-400">{q.correctAnswerText}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Accordion (RAG Grounded) */}
                  {result.canViewCorrectAnswers && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => toggleExpand(q.questionId)}
                        className="flex items-center justify-between w-full text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Concept Explanation & Study Material</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Verified Curriculum RAG Grounding</span>
                          </div>
                          <div className="leading-relaxed">
                            <MathText text={q.explanation} />
                          </div>
                          {q.rubric && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-900 dark:text-slate-300 block mb-0.5">Scoring Rubric:</span>
                              <MathText text={q.rubric} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
