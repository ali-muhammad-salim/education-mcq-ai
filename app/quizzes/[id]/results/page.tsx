'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2, XCircle, AlertCircle, ArrowLeft, RotateCcw,
  HelpCircle, Clock, ShieldAlert, Award, FileText, ChevronDown,
  ChevronUp, Sparkles, BookOpen, ExternalLink, ArrowRight
} from 'lucide-react';
import { QuestionMarker } from '@/components/AssessmentManagement';
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
    if(result?.status !== 'SUBMITTED' || !attemptId) return;
    let cancelled=false, delay=5000, timer:ReturnType<typeof setTimeout>;
    const poll=async () => {
      try {
        if(document.hidden) return;
        const response=await fetch(`/api/quizzes/${quizId}/attempt/status?attemptId=${attemptId}`,{signal:AbortSignal.timeout(10000)});
        if(!response.ok) return;
        const state=await response.json();
        if(state.status && state.status !== 'SUBMITTED') {
          const refreshed=await fetch(`/api/quizzes/${quizId}/results?attemptId=${attemptId}`,{signal:AbortSignal.timeout(10000)});
          const data=await refreshed.json();
          if(!cancelled && refreshed.ok && data.result) setResult(data.result);
        }
      } catch { /* Keep the durable receipt visible while reconnecting. */ }
      finally { if(!cancelled) { delay=Math.min(delay*2,30000);timer=setTimeout(poll,delay+Math.random()*2000); } }
    };
    timer=setTimeout(poll,delay+Math.random()*2000);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[result?.status,quizId,attemptId]);

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
          setError(typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to load assessment results.');
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
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color, #f4f7f6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--text-light, #5a7a6f)',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '4px solid rgba(11, 94, 74, 0.15)',
          borderTopColor: '#0b5e4a',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading saved assessment results…</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color, #f4f7f6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          maxWidth: '450px',
          width: '100%',
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #dce5e1)',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <AlertCircle size={48} color="#ef4444" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-color, #2c3e38)' }}>
            Results Unavailable
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light, #5a7a6f)', margin: 0 }}>
            {error}
          </p>
          <Link
            href={result?.educatorView ? '/dashboard/teacher' : '/dashboard/student'}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              backgroundColor: '#0b5e4a',
              color: '#ffffff',
              textDecoration: 'none',
              marginTop: '0.5rem'
            }}
          >
            Go to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if(result.status === 'SUBMITTED') return <div className="card" style={{maxWidth:'650px',margin:'3rem auto',padding:'2rem'}} role="status"><h1>Submission received</h1><p>Your saved answers are safely recorded. Your result is being processed and will appear here automatically.</p><p>Receipt: {attemptId || result.attemptId}</p><p>Submitted: {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'Recorded'}</p><Link href="/dashboard/student">Go to dashboard</Link></div>;
  const provisional = result.status !== 'GRADED';
  const isPassed = !provisional && result.percentage >= 50;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color, #f4f7f6)',
      color: 'var(--text-color, #2c3e38)',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '5rem',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>

      {/* Top Bar */}
      <header className="assessment-header" style={{ flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'var(--card-bg, #ffffff)',
        borderBottom: '1px solid var(--border-color, #dce5e1)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/dashboard/student"
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              color: 'var(--text-light, #5a7a6f)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--text-color, #2c3e38)',
              margin: 0,
              maxWidth: '380px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {result.quizTitle}
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light, #5a7a6f)' }}>
              Assessment Performance Report
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {result.canRetake && <Link
            href={`/quizzes/${quizId}/take`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: 'rgba(244, 247, 246, 0.8)',
              color: 'var(--text-color, #2c3e38)',
              border: '1px solid var(--border-color, #dce5e1)',
              textDecoration: 'none'
            }}
          >
            <RotateCcw size={14} />
            <span>Retake Assessment</span>
          </Link>}

          <Link
            href="/dashboard/student"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#0b5e4a',
              color: '#ffffff',
              border: 'none',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)'
            }}
          >
            <span>{result.educatorView ? 'Teacher Dashboard' : 'Student Dashboard'}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem 1.5rem 0 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>

        {/* Performance Scorecard Card */}
        <div style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          borderRadius: '24px',
          border: '1px solid var(--border-color, #dce5e1)',
          padding: '1.75rem 2rem',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: isPassed
              ? 'linear-gradient(90deg, #0b5e4a 0%, #10b981 100%)'
              : 'linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)'
          }} />

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isPassed ? '#e6f0ed' : '#fee2e2',
                border: isPassed ? '1.5px solid rgba(11, 94, 74, 0.3)' : '1.5px solid rgba(239, 68, 68, 0.3)',
                color: isPassed ? '#0b5e4a' : '#b91c1c'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{provisional ? 'Pending' : result.percentage + '%'}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {provisional ? 'Awaiting marking' : 'Graded'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Candidate Name
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color, #2c3e38)', margin: '0.2rem 0' }}>
                  {result.studentName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-light, #5a7a6f)' }}>
                  <span>Score: <strong style={{ color: 'var(--text-color, #2c3e38)' }}>{result.score}</strong> / {result.maxMarks} marks</span>
                  <span>•</span>
                  <span>Status: <strong style={{ color: result.status === 'GRADING_PENDING' ? '#d97706' : '#0b5e4a' }}>{result.status.replace('_', ' ')}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              backgroundColor: 'rgba(244, 247, 246, 0.7)',
              padding: '0.85rem 1.25rem',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #dce5e1)',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#d97706" />
                <div>
                  <span style={{ color: 'var(--text-light, #5a7a6f)', display: 'block', fontSize: '0.68rem' }}>Time Taken</span>
                  <strong style={{ color: 'var(--text-color, #2c3e38)' }}>{formatTime(result.timeSpentSec)}</strong>
                </div>
              </div>

              <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color, #dce5e1)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={16} color={result.tabSwitchCount > 2 ? '#ef4444' : '#0b5e4a'} />
                <div>
                  <span style={{ color: 'var(--text-light, #5a7a6f)', display: 'block', fontSize: '0.68rem' }}>Tab Switches</span>
                  <strong style={{ color: result.tabSwitchCount > 2 ? '#ef4444' : 'var(--text-color, #2c3e38)' }}>
                    {result.tabSwitchCount} {result.tabSwitchCount > 2 ? '(Flagged)' : ''}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Written grading notice if applicable */}
        {result.status === 'GRADING_PENDING' && (
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.82rem',
            color: '#92400e'
          }}>
            <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontWeight: 800, marginBottom: '0.2rem' }}>Written Grading in Progress</strong>
              Objective MCQs and Numerical problems have been auto-graded. Written responses are awaiting teacher evaluation.
            </div>
          </div>
        )}

        {/* Question Review Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-color, #2c3e38)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              <BookOpen size={16} color="#0b5e4a" />
              <span>Question Review & Teacher Feedback</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light, #5a7a6f)', fontWeight: 700 }}>
              {result.questions.filter((q: any) => q.scoreAwarded === q.marks).length} of {result.questions.length} Correct
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {result.questions.map((q: any, idx: number) => {
              const awaiting = q.scoreAwarded == null;
              const isCorrect = q.scoreAwarded === q.marks;
              const isPartial = q.scoreAwarded > 0 && q.scoreAwarded < q.marks;
              const isExpanded = expandedExplanation[q.questionId] ?? !isCorrect;

              return (
                <div
                  key={q.questionId}
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderRadius: '16px',
                    border: awaiting ? '1px solid var(--border-color, #cbd5e1)' : isCorrect
                      ? '1.5px solid rgba(16, 185, 129, 0.4)'
                      : isPartial
                      ? '1.5px solid rgba(245, 158, 11, 0.4)'
                      : '1.5px solid rgba(239, 68, 68, 0.35)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        backgroundColor: awaiting ? '#f1f5f9' : isCorrect ? '#e6f0ed' : isPartial ? '#fef3c7' : '#fee2e2',
                        color: awaiting ? '#475569' : isCorrect ? '#0b5e4a' : isPartial ? '#b45309' : '#b91c1c'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase' }}>
                        Question {idx + 1}
                      </span>
                      {q.pastPaperRef && (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(244, 247, 246, 0.8)',
                          color: '#0b5e4a',
                          border: '1px solid var(--border-color, #dce5e1)',
                          fontWeight: 700
                        }}>
                          {q.pastPaperRef}
                        </span>
                      )}
                    </div>

                    <div>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: isCorrect ? '#e6f0ed' : isPartial ? '#fef3c7' : '#fee2e2',
                        color: isCorrect ? '#0b5e4a' : isPartial ? '#b45309' : '#b91c1c'
                      }}>
                        {awaiting ? 'Awaiting marking' : q.scoreAwarded + ' / ' + q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                    </div>
                  </div>

                  {q.studentAnswer?.textAnswer && <div style={{ whiteSpace: 'pre-wrap', borderLeft: '3px solid #0b5e4a', padding: '0.75rem' }}><strong>Submitted response</strong><p>{q.studentAnswer.textAnswer}</p></div>}
                  {q.studentAnswer?.matchedPairs && <ul>{q.studentAnswer.matchedPairs.map((p: {left: string; right: string}, i: number) => <li key={i}>{p.left} → {p.right}</li>)}</ul>}
                  {q.teacherComment && <p><strong>Teacher feedback:</strong> {q.teacherComment}</p>}
                  {result.canGrade && <QuestionMarker quizId={quizId} answerId={q.quizAnswerId} maximum={q.marks} score={q.scoreAwarded} feedback={q.teacherComment} />}
                  {/* Question Stem with KaTeX math */}
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color, #2c3e38)', lineHeight: 1.55 }}>
                    <MathText text={q.stemText} />
                  </div>

                  {/* Visual SVG diagram if present */}
                  {q.diagramUrl && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(244, 247, 246, 0.6)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #dce5e1)',
                        maxWidth: '380px'
                      }}
                      children={<img src={q.diagramUrl} alt="Question diagram" style={{ maxWidth: '100%' }} />}
                    />
                  )}

                  {/* Options & Choices */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '0.6rem',
                      paddingTop: '0.25rem'
                    }}>
                      {q.options.map((opt: any, oIdx: number) => {
                        const isStudentChoice = q.studentAnswer?.selectedOptionId === opt.id ||
                          (Array.isArray(q.studentAnswer?.selectedOptionIds) && q.studentAnswer.selectedOptionIds.includes(opt.id));
                        const isCorrectOption = opt.isCorrect;

                        let bg = 'rgba(244, 247, 246, 0.5)';
                        let border = '1px solid var(--border-color, #dce5e1)';
                        let textColor = 'var(--text-color, #2c3e38)';
                        let textDecoration = 'none';

                        if (isCorrectOption) {
                          bg = '#e6f0ed';
                          border = '1.5px solid #10b981';
                          textColor = '#065f46';
                        } else if (isStudentChoice && !isCorrectOption) {
                          bg = '#fee2e2';
                          border = '1.5px solid #ef4444';
                          textColor = '#991b1b';
                          textDecoration = 'line-through';
                        }

                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              backgroundColor: bg,
                              border: border,
                              color: textColor,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: textDecoration }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-light, #5a7a6f)' }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <MathText text={opt.text} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                              {isStudentChoice && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(0,0,0,0.06)',
                                  fontWeight: 700
                                }}>
                                  Your Choice
                                </span>
                              )}
                              {isCorrectOption && (
                                <CheckCircle2 size={16} color="#059669" />
                              )}
                              {isStudentChoice && !isCorrectOption && (
                                <XCircle size={16} color="#dc2626" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical / Short Answer response */}
                  {q.questionType === 'NUMERICAL' && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(244, 247, 246, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color, #dce5e1)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-light, #5a7a6f)', display: 'block', fontSize: '0.68rem' }}>Your Answer:</span>
                        <strong style={{ color: 'var(--text-color, #2c3e38)' }}>{q.studentAnswer?.numericAnswer || 'None'}</strong>
                      </div>
                      {result.canViewCorrectAnswers && (
                        <div>
                          <span style={{ color: 'var(--text-light, #5a7a6f)', display: 'block', fontSize: '0.68rem' }}>Target Value:</span>
                          <strong style={{ color: '#0b5e4a' }}>{q.correctAnswerText}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Accordion (RAG Grounded) */}
                  {result.canViewCorrectAnswers && (
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color, #dce5e1)' }}>
                      <button
                        onClick={() => toggleExpand(q.questionId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#0b5e4a',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem 0'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <HelpCircle size={15} />
                          <span>Concept Explanation & Study Material</span>
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(244, 247, 246, 0.7)',
                          border: '1px solid rgba(11, 94, 74, 0.2)',
                          fontSize: '0.82rem',
                          color: 'var(--text-color, #2c3e38)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#0b5e4a',
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}>
                            <Sparkles size={14} color="#c9a050" />
                            <span>Study Guidance & Marking Rubric</span>
                          </div>
                          <div style={{ lineHeight: 1.6 }}>
                            <MathText text={q.explanation} />
                          </div>
                          {q.rubric && (
                            <div style={{
                              paddingTop: '0.5rem',
                              borderTop: '1px solid var(--border-color, #dce5e1)',
                              fontSize: '0.75rem',
                              color: 'var(--text-light, #5a7a6f)'
                            }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-color, #2c3e38)', display: 'block', marginBottom: '0.2rem' }}>
                                Scoring Rubric:
                              </span>
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
