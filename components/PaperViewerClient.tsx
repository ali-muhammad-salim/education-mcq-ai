'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, Award, CheckCircle2, XCircle, AlertCircle, 
  HelpCircle, Sparkles, BookOpen, Clock, Download, ChevronRight, Check, Eye, EyeOff,
  ShieldCheck, AlertTriangle, Lightbulb, CheckSquare, Edit3, ArrowLeft
} from 'lucide-react';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import DownloadCountdownModal from '@/components/DownloadCountdownModal';
import TakeQuizModal from '@/components/TakeQuizModal';

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

interface Paper {
  id: string;
  title: string;
  paperCode?: string;
  examYear: number;
  examSession?: string;
  fileUrl?: string;
  subjectId?: string;
  academicClass?: { name: string; level: number };
  subject?: { id?: string; name: string };
}

interface Props {
  paper: Paper;
  questions: Question[];
  backUrl?: string;
  hideHeader?: boolean;
  pdfUrl?: string;
}

export default function PaperViewerClient({ paper, questions, backUrl, hideHeader = false, pdfUrl }: Props) {
  const [displayMode, setDisplayMode] = useState<'generated' | 'original_pdf'>('generated');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(false);
  const [interactiveMode, setInteractiveMode] = useState<boolean>(false);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  
  // Interactive Simulator State (for Paper 1 MCQs)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});

  const toggleSolution = (qNum: string) => {
    setRevealedSolutions(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const handleSelectOption = (qNum: string, option: string) => {
    if (checkedAnswers[qNum]) return; // locked after checking
    setUserAnswers(prev => ({ ...prev, [qNum]: option }));
  };

  const handleCheckAnswer = (qNum: string) => {
    setCheckedAnswers(prev => ({ ...prev, [qNum]: true }));
  };

  // Parse metadata safely
  const parseSourceRegion = (sourceRegion: any) => {
    if (!sourceRegion) return {};
    if (typeof sourceRegion === 'string') {
      try {
        return JSON.parse(sourceRegion);
      } catch (e) {
        return {};
      }
    }
    return sourceRegion;
  };

  const isPaper2 = (paper.paperCode && paper.paperCode.toUpperCase().includes('P2')) || 
                   (paper.title && paper.title.toUpperCase().includes('PAPER II')) || 
                   questions.some(q => q.questionType === 'CONSTRUCTED_RESPONSE' || q.questionType === 'EXTENDED_RESPONSE');

  const className = paper.academicClass?.name || 'Class IX';
  const isGrade9 = className.includes('IX') || paper.academicClass?.level === 9;
  const gradeLabel = isGrade9 ? 'CLASS IX' : 'CLASS X';
  const subjectId = paper.subjectId || (paper.subject as any)?.id || '3e6f82ae-95dc-4edb-b806-d75b194a21cd';

  // Count in-syllabus vs out-of-syllabus questions
  let inSyllabusCount = 0;
  let outOfSyllabusCount = 0;
  questions.forEach(q => {
    const meta = parseSourceRegion(q.sourceRegion);
    const inSyllabus = meta.in_syllabus ?? (q.slos && q.slos.length > 0 && !meta.out_of_syllabus);
    if (inSyllabus) {
      inSyllabusCount++;
    } else {
      outOfSyllabusCount++;
    }
  });

  // Helper to render question text with structured bullet points for Roman numerals
  const renderQuestionContent = (text: string) => {
    if (!text) return null;
    if (text.includes('\n') || text.includes('•')) {
      const lines = text.split('\n');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} style={{ height: '0.35rem' }} />;
            const isBullet = trimmed.startsWith('•') || /^(I|II|III|IV|V)\./i.test(trimmed);
            if (isBullet) {
              const cleanText = trimmed.replace(/^•\s*/, '');
              return (
                <div key={lIdx} style={{
                  paddingLeft: '1.5rem',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.65rem',
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  <span style={{ color: '#0b5e4a', fontSize: '0.9rem' }}>•</span>
                  <span><MathText text={cleanText} /></span>
                </div>
              );
            }
            return (
              <div key={lIdx}>
                <MathText text={line} />
              </div>
            );
          })}
        </div>
      );
    }
    return <MathText text={text} />;
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      
      {/* Top Paper Header Bar (Rendered only if not hidden by parent page) */}
      {!hideHeader && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e1e8e5',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {backUrl && (
                <Link
                  href={backUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: '#0b5e4a',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#e8f5f1',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>All Model Papers</span>
                </Link>
              )}
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a', background: '#e6f0ed', padding: '4px 10px', borderRadius: '4px' }}>
                {paper.paperCode || (isPaper2 ? `PHY-${isGrade9 ? 'IX' : 'X'}-${paper.examYear}-P2` : `PHY-${isGrade9 ? 'IX' : 'X'}-${paper.examYear}-P1`)}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#666', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {isPaper2 ? '25 Marks • 1h 40m' : '40 Marks • 50 Minutes'}
              </span>
              <span style={{ fontSize: '0.8rem', color: isPaper2 ? '#7c2d12' : '#1e3a8a', background: isPaper2 ? '#ffedd5' : '#dbeafe', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {isPaper2 ? 'Paper II (Theory • CRQs & ERQs)' : 'Paper I (Multiple Choice Questions)'}
              </span>
            </div>

            <h1 style={{ color: '#1a3b32', fontSize: '1.65rem', margin: '0 0 0.35rem 0', fontWeight: 800 }}>
              {paper.title}
            </h1>

            <div style={{ display: 'flex', gap: '1.25rem', color: '#666', fontSize: '0.86rem', flexWrap: 'wrap' }}>
              <span><strong>Board:</strong> Aga Khan University Examination Board</span>
              <span><strong>Subject:</strong> {paper.subject?.name || 'Physics'}</span>
              <span><strong>Grade:</strong> {gradeLabel}</span>
              <span><strong>Questions:</strong> {questions.length} Items</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDownloadModalOpen(true)}
            style={{
              background: '#0b5e4a',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(11, 94, 74, 0.2)'
            }}
          >
            <Download size={16} />
            <span>Download Official PDF</span>
          </button>
        </div>
      )}

      {/* Primary Display Mode Selector (Generated Digital Paper vs Original Board PDF) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        marginBottom: '1.5rem',
        background: '#f8fafc',
        padding: '0.65rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Toggle between Generated Digital Paper and Original Board PDF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setDisplayMode('generated')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.88rem',
              fontWeight: displayMode === 'generated' ? 800 : 600,
              background: displayMode === 'generated' ? '#0b5e4a' : 'transparent',
              color: displayMode === 'generated' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} />
            ✨ Text Form (Digital Paper)
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('original_pdf')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.88rem',
              fontWeight: displayMode === 'original_pdf' ? 800 : 600,
              background: displayMode === 'original_pdf' ? '#0b5e4a' : 'transparent',
              color: displayMode === 'original_pdf' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} />
            📄 Original PDF (Board Document)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTION 2: EMBEDDED ORIGINAL BOARD PDF VIEWER                              */}
      {/* ========================================================================= */}
      {displayMode === 'original_pdf' && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          marginBottom: '3rem'
        }}>
          <div style={{
            padding: '0.85rem 1.25rem',
            background: '#f1f5f9',
            borderBottom: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: '#334151'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#0b5e4a" />
              <span>Original Board Document: <strong>{paper.title}</strong></span>
            </div>
            {paper.fileUrl && (
              <a
                href={paper.fileUrl}
                download
                style={{ color: '#0b5e4a', fontWeight: 700, textDecoration: 'underline', fontSize: '0.82rem' }}
              >
                Direct Download ⬇
              </a>
            )}
          </div>
          {paper.fileUrl ? (
            <iframe
              src={`${paper.fileUrl}#view=FitH`}
              style={{ width: '100%', height: '950px', border: 'none' }}
              title="Original Board Examination PDF"
            />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No PDF file URL found for this paper.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 1: GENERATED DIGITAL INTERACTIVE VIEW (WITH TOGGLE & WORKING SLOS) */}
      {/* ========================================================================= */}
      {displayMode === 'generated' && (
        <>
          {/* Control Bar with "Show correct answer only" Study Toggle & "Take A Quiz" */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: '#ffffff',
            border: '1.5px solid #dce5e1',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 10px rgba(11, 94, 74, 0.04)'
          }}>
            {/* The Main Study Toggle: Show correct answer only & Take A Quiz */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '9px 20px',
                  borderRadius: '30px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: showCorrectAnswers ? '2px solid #0b5e4a' : '2px solid #cbd5e1',
                  background: showCorrectAnswers ? '#ecfdf5' : '#f8fafc',
                  color: showCorrectAnswers ? '#0b5e4a' : '#475569',
                  boxShadow: showCorrectAnswers ? '0 2px 10px rgba(11, 94, 74, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>{showCorrectAnswers ? '✅' : '⚪'}</span>
                <span>{showCorrectAnswers ? 'Hide correct answers' : 'Show correct answer only'}</span>
              </button>

              <button
                type="button"
                onClick={() => setInteractiveMode(!interactiveMode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '9px 20px',
                  borderRadius: '30px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: interactiveMode ? '2px solid #2563eb' : '2px solid #cbd5e1',
                  background: interactiveMode ? '#eff6ff' : '#f8fafc',
                  color: interactiveMode ? '#1d4ed8' : '#475569',
                  boxShadow: interactiveMode ? '0 2px 10px rgba(37, 99, 235, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{interactiveMode ? '📝 Practice Mode (Active)' : '✏️ Practice & Select Options'}</span>
              </button>

              {!isPaper2 && (
                <button
                  type="button"
                  onClick={() => setQuizModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '9px 22px',
                    borderRadius: '30px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: 'none',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(11, 94, 74, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Award size={18} />
                  <span>Take A Quiz</span>
                </button>
              )}
            </div>
          </div>

          {/* Authentic Examination Paper Replica */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #111827',
            borderRadius: '4px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            fontFamily: "'Times New Roman', Times, serif, system-ui",
            color: '#111827'
          }}>
            {/* Examination Cover Header */}
            <div style={{
              padding: '2.5rem 2.5rem 1.75rem',
              borderBottom: '2px solid #111827',
              textAlign: 'center',
              background: '#ffffff'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px', color: '#4b5563', marginBottom: '0.25rem' }}>
                AGA KHAN UNIVERSITY EXAMINATION BOARD
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.5px', color: '#111827', marginBottom: '0.25rem' }}>
                SECONDARY SCHOOL CERTIFICATE
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
                {gradeLabel} EXAMINATION {paper.examYear}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0b5e4a', marginBottom: '0.5rem' }}>
                Physics {isPaper2 ? 'Paper II (Theory)' : 'Paper I (Multiple Choice Questions)'}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 600, color: '#374151' }}>
                {isPaper2 ? 'Time: 1 hour 45 minutes • Marks: 35' : 'Time: 1 hour 10 minutes • Marks: 40'}
              </div>

              {/* Instructions Box (hidden in quick study mode to minimize clutter) */}
              {!showCorrectAnswers && (
                <div style={{
                  marginTop: '1.5rem',
                  border: '1.5px solid #111827',
                  borderRadius: '4px',
                  padding: '1rem 1.25rem',
                  textAlign: 'left',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.4rem', textAlign: 'center', letterSpacing: '0.5px' }}>
                    INSTRUCTIONS TO CANDIDATES
                  </div>
                  {isPaper2 ? (
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>
                      <li>This question paper contains two sections: <strong>Section B (CRQs)</strong> and <strong>Section C (ERQs)</strong>.</li>
                      <li>Answer <strong>ALL questions</strong> in Section B. Answer <strong>any ONE question</strong> in Section C.</li>
                      <li>Write your answers strictly inside the <strong>designated ruled writing lines</strong> provided for each question.</li>
                    </ol>
                  ) : (
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>
                      <li>Read each question carefully before choosing your answer.</li>
                      <li>Use answer numbers <strong>1 to 40</strong> only. Fill <strong>ONLY ONE</strong> oval for each question.</li>
                      <li>Double-check all calculations before marking your response.</li>
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Running Sub-header Bar */}
            <div style={{
              background: '#f9fafb',
              padding: '8px 2.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#6b7280',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 600
            }}>
              <span>Physics {isPaper2 ? 'Paper II' : 'Paper I'} &bull; {gradeLabel}</span>
              <span>
                {showCorrectAnswers ? '⭐ Quick Study Mode: Questions & Verified Correct Answers Only' : `Total ${questions.length} Examination Items`}
              </span>
            </div>

            {/* Questions Listing */}
            <div style={{ padding: '2.5rem' }}>
              {questions.map((q, idx) => {
                const meta = parseSourceRegion(q.sourceRegion);
                const rawChoices = meta.choices || meta.options || (q as any).options || (q as any).choices || {};
                const choices: Record<string, string> = {};
                if (Array.isArray(rawChoices)) {
                  rawChoices.forEach((opt: any, i: number) => {
                    const k = (opt.id || opt.key || opt.label || ['A', 'B', 'C', 'D'][i] || '').toUpperCase();
                    const t = typeof opt === 'string' ? opt : (opt.text || opt.value || opt.content || '');
                    if (k) choices[k] = t;
                  });
                } else if (typeof rawChoices === 'object' && rawChoices !== null) {
                  Object.entries(rawChoices).forEach(([k, v]) => {
                    choices[k.toUpperCase()] = typeof v === 'string' ? v : (v as any)?.text || String(v);
                  });
                }
                const qNum = q.questionNumber || (idx + 1).toString();
                const isSolutionRevealed = revealedSolutions[qNum];
                const marks = q.marks || (meta.rubric ? meta.rubric.reduce((acc: number, r: any) => acc + (r.marks || 1), 0) : 3);
                const ruledLinesCount = marks <= 1 ? 3 : marks <= 2 ? 5 : marks <= 3 ? 7 : 12;

                // SLO & Syllabus Data
                const inSyllabus = meta.in_syllabus ?? (q.slos && q.slos.length > 0 && !meta.out_of_syllabus);
                const sloCode = meta.slo || (q.slos && q.slos[0]?.slo?.code);
                const sloDesc = meta.slo_details?.description || (q.slos && q.slos[0]?.slo?.description);
                const topicName = meta.slo_details?.topic_name || (q.topics && q.topics[0]?.topic?.name);

                // Correct answer and candidate responses (pure text)
                const correctKey = meta.correct_answer || meta.solved_correct_option || 'A';
                const correctOptionText = choices[correctKey] || '';
                const betterResponse = meta.better_response || meta.model_answer || (
                  isPaper2
                    ? meta.explanation || "Candidate clearly stated the relevant formula, substituted numerical values with appropriate units, and provided the final answer with correct SI units."
                    : `Option ${correctKey} (${correctOptionText}) is verified through direct physical principles.`
                );
                const weakResponse = meta.weaker_response || meta.weak_response || (
                  isPaper2
                    ? "Common errors: Omitted units or incorrect algebraic rearrangement resulted in lost marks."
                    : `Common misconception: Confusing base quantities or incorrect rounding.`
                );
                const examinerGuidance = meta.suggestions || meta.examiner_guidance;

                // Interactive practice variables
                const selectedOpt = userAnswers[qNum];
                const isChecked = checkedAnswers[qNum];
                const isCorrect = isChecked && selectedOpt === correctKey;

                return (
                  <div key={q.id} style={{
                    marginBottom: showCorrectAnswers ? '2.25rem' : '3rem',
                    paddingBottom: showCorrectAnswers ? '1.75rem' : '2.5rem',
                    borderBottom: idx === questions.length - 1 ? 'none' : '1px solid #e5e7eb'
                  }}>
                    
                    {/* Question Header & Marks */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexGrow: 1 }}>
                        {(() => {
                          const cleanQ = qNum.replace(/^Q\.?\s*/i, '').replace(/\.$/, '');
                          const displayQ = /^[0-9]+$/.test(cleanQ) ? `Q.${cleanQ}.` : `Q.${cleanQ}`;
                          return (
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', minWidth: '28px' }}>
                              {displayQ}
                            </span>
                          );
                        })()}
                        <div style={{ fontSize: '1.1rem', color: '#1f2937', lineHeight: 1.6, flexGrow: 1 }}>
                          <StructuredContent text={q.questionText} />
                        </div>
                      </div>
                      {isPaper2 && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827', background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                          (Total {marks} Marks)
                        </span>
                      )}
                    </div>

                    {/* SLO Navigation Badge vs Out of Syllabus Indicator */}
                    <div style={{
                      marginLeft: '2.5rem',
                      marginBottom: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      {inSyllabus && sloCode ? (
                        <Link
                          href={`/syllabus/${subjectId}#slo-${sloCode}`}
                          title={`Click to navigate to SLO ${sloCode} in AKU-EB Syllabus`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            background: '#e6f0ed',
                            color: '#0b5e4a',
                            border: '1px solid #b7dfd2',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>📚 SLO {sloCode}{topicName ? ` • ${topicName}` : ''}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>↗</span>
                        </Link>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {sloCode && (
                            <span style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}>
                              SLO {sloCode}
                            </span>
                          )}
                          <span style={{
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            padding: '2px 9px',
                            borderRadius: '5px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <span>⚠️</span> Out of Syllabus
                          </span>
                        </div>
                      )}

                      {q.difficulty && (
                        <span style={{
                          background: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}>
                          Cognitive: {q.difficulty === 'K' ? 'Knowledge' : q.difficulty === 'U' ? 'Understanding' : q.difficulty === 'A' ? 'Application' : q.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Cropped Diagram / Graph / Circuit (if present) */}
                    {(() => {
                      const diagramSrc = resolveQuestionDiagram(paper.paperCode || paper.title, qNum, q);
                      if (!diagramSrc) return null;
                      return (
                        <div style={{ textAlign: 'center', margin: '1.25rem 0', marginLeft: '2.5rem' }}>
                          <img
                            src={diagramSrc}
                            alt={`Diagram for Question ${qNum}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              objectFit: 'contain',
                              border: '1.5px solid var(--border-color, #d1d5db)',
                              borderRadius: '8px',
                              padding: '8px',
                              background: '#ffffff',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 1: OPTIONS & VERIFIED KEY                      */}
                    {/* ---------------------------------------------------- */}
                    {!isPaper2 && choices && Object.keys(choices).length > 0 && (
                      <div style={{ marginLeft: '2.5rem', marginBottom: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        
                        {/* Interactive Practice Mode */}
                        {interactiveMode ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
                            {['A', 'B', 'C', 'D'].map(optKey => {
                              const optText = choices[optKey] || '';
                              if (!optText) return null;
                              const isSelected = selectedOpt === optKey;
                              return (
                                <button
                                  key={optKey}
                                  type="button"
                                  disabled={isChecked}
                                  onClick={() => handleSelectOption(qNum, optKey)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid #0b5e4a' : '1px solid #d1d5db',
                                    background: isSelected ? '#e6f0ed' : '#ffffff',
                                    color: '#1e293b',
                                    fontSize: '0.95rem',
                                    cursor: isChecked ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <strong style={{ color: isSelected ? '#0b5e4a' : '#111827' }}>{optKey}.</strong>
                                  <div style={{ flexGrow: 1 }}><MathText text={optText} /></div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Standard / Quick Study Mode Options */
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
                            {['A', 'B', 'C', 'D'].map(optKey => {
                              const optText = choices[optKey] || '';
                              if (!optText) return null;
                              const isThisCorrect = optKey === correctKey;

                              return (
                                <div key={optKey} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.5rem',
                                  padding: showCorrectAnswers && isThisCorrect ? '8px 12px' : '6px 0',
                                  borderRadius: '6px',
                                  background: showCorrectAnswers && isThisCorrect ? '#dcfce7' : 'transparent',
                                  border: showCorrectAnswers && isThisCorrect ? '1.5px solid #22c55e' : 'none',
                                  color: showCorrectAnswers && isThisCorrect ? '#14532d' : '#374151',
                                  fontSize: '0.98rem',
                                  lineHeight: 1.5
                                }}>
                                  <strong style={{ minWidth: '22px', color: showCorrectAnswers && isThisCorrect ? '#166534' : '#111827' }}>
                                    {optKey}.
                                  </strong>
                                  <div style={{ flexGrow: 1 }}>
                                    <MathText text={optText} />
                                  </div>
                                  {showCorrectAnswers && isThisCorrect && (
                                    <span style={{
                                      background: '#16a34a',
                                      color: '#fff',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      marginLeft: 'auto',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ✓ Correct Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Interactive Practice Mode Check Button */}
                        {interactiveMode && (
                          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {!isChecked ? (
                              <button
                                type="button"
                                disabled={!selectedOpt}
                                onClick={() => handleCheckAnswer(qNum)}
                                style={{
                                  background: selectedOpt ? '#0b5e4a' : '#e2e8f0',
                                  color: selectedOpt ? '#ffffff' : '#94a3b8',
                                  border: 'none',
                                  padding: '6px 16px',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  cursor: selectedOpt ? 'pointer' : 'not-allowed'
                                }}
                              >
                                Check Answer
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                <span>{isCorrect ? 'Correct!' : `Incorrect. Verified Key: Option ${correctKey}`}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 1: SOLUTION / REASONING CARD                   */}
                    {/* ---------------------------------------------------- */}
                    {!isPaper2 && (
                      <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        {showCorrectAnswers ? (
                          /* Quick Study: Automatically Show Solution & Key */
                          <div style={{
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: '8px',
                            padding: '1rem 1.25rem',
                            color: '#14532d'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                                ✓ Verified Key: Option {correctKey}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                              <MathText text={betterResponse} />
                            </div>
                          </div>
                        ) : (
                          /* Default: Toggleable Solution Button */
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleSolution(qNum)}
                              style={{
                                background: isSolutionRevealed ? '#e6f0ed' : '#f3f4f6',
                                color: isSolutionRevealed ? '#0b5e4a' : '#4b5563',
                                border: '1px solid',
                                borderColor: isSolutionRevealed ? '#b7dfd2' : '#d1d5db',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              {isSolutionRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                              {isSolutionRevealed ? 'Hide Solution' : 'View Verified Solution & Key'}
                            </button>

                            {isSolutionRevealed && (
                              <div style={{
                                marginTop: '0.75rem',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '1.25rem',
                                color: '#1e293b'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                                    Correct Option: {correctKey}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
                                  <MathText text={betterResponse} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 2: RESPONSIVE TEXT CANDIDATE RESPONSES         */}
                    {/* ---------------------------------------------------- */}
                    {isPaper2 && (
                      <div style={{ marginLeft: '2.5rem', marginTop: '0.75rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        
                        {/* 1. Ruled lines for answering (Only shown when NOT in quick study mode) */}
                        {!showCorrectAnswers && (
                          <div style={{
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.75rem 1.25rem 0.5rem',
                            background: '#fafafa',
                            position: 'relative',
                            marginBottom: '1rem'
                          }}>
                            {/* Left Hand Margin indicator */}
                            <div style={{
                              position: 'absolute',
                              left: '36px',
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              background: '#fca5a5'
                            }} />

                            {/* Ruled Horizontal Answer Lines */}
                            {Array.from({ length: ruledLinesCount }).map((_, lIdx) => (
                              <div key={lIdx} style={{
                                height: '32px',
                                borderBottom: '1px solid #cbd5e1',
                                display: 'flex',
                                alignItems: 'flex-end',
                                color: '#94a3b8',
                                fontSize: '0.75rem',
                                paddingLeft: '28px'
                              }}>
                                <span style={{ opacity: 0.4 }}>&bull;</span>
                              </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                              <div style={{ border: '1.5px solid #111827', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 800, background: '#fff' }}>
                                Marks: &nbsp;&nbsp;&nbsp;&nbsp; / {marks}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. BETTER RESPONSE (Responsive Text on Ruled Notebook Lines) */}
                        <div style={{
                          background: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          borderRadius: '10px',
                          padding: '1.25rem 1.5rem',
                          marginBottom: showCorrectAnswers ? '0.5rem' : '1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ background: '#16a34a', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>
                              ✓ BETTER RESPONSE (Full Marks Standard)
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
                              Score: {marks}/{marks} Marks
                            </span>
                          </div>

                          {/* Responsive Ruled Line Student Notebook Effect */}
                          <div style={{
                            background: 'repeating-linear-gradient(transparent, transparent 29px, #bbf7d0 30px)',
                            lineHeight: '30px',
                            fontSize: '0.98rem',
                            color: '#14532d',
                            fontWeight: 500,
                            padding: '4px 6px'
                          }}>
                            <MathText text={betterResponse} />
                          </div>
                        </div>

                        {/* 3. WEAKER RESPONSE (Only shown when "Show Correct Answers" is OFF) */}
                        {!showCorrectAnswers && weakResponse && (
                          <div style={{
                            background: '#fffbeb',
                            border: '1.5px solid #fde68a',
                            borderRadius: '10px',
                            padding: '1.25rem 1.5rem',
                            marginBottom: '1rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ background: '#d97706', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>
                                ⚠ WEAKER RESPONSE (Common Mistakes & Lost Marks)
                              </span>
                            </div>

                            {/* Responsive Ruled Line Flawed Attempt Effect */}
                            <div style={{
                              background: 'repeating-linear-gradient(transparent, transparent 29px, #fed7aa 30px)',
                              lineHeight: '30px',
                              fontSize: '0.96rem',
                              color: '#78350f',
                              fontWeight: 500,
                              padding: '4px 6px'
                            }}>
                              <MathText text={weakResponse} />
                            </div>
                          </div>
                        )}

                        {/* 4. SENIOR EXAMINER SUGGESTIONS (Only shown when "Show Correct Answers" is OFF) */}
                        {!showCorrectAnswers && examinerGuidance && (
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.85rem 1.15rem',
                            fontSize: '0.88rem',
                            color: '#0f766e',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            <Lightbulb size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <strong>Senior Examiner Suggestions:</strong> {examinerGuidance}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Examination Booklet Footer */}
            <div style={{
              borderTop: '2px solid #111827',
              padding: '1.25rem 2.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.88rem',
              fontFamily: "'Times New Roman', Times, serif, system-ui",
              fontWeight: 700,
              color: '#111827',
              background: '#ffffff'
            }}>
              <span>{isPaper2 ? 'S2501-1711120' : 'S2501-1711110'}</span>
              <span style={{ letterSpacing: '1px' }}>END OF EXAMINATION &bull; VERIFIED AKU-EB KEY</span>
              <span>Physics {isPaper2 ? 'Paper II' : 'Paper I'}</span>
            </div>
          </div>
        </>
      )}

      {/* 5-Second Countdown Download Modal */}
      <DownloadCountdownModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        pdfUrl={pdfUrl || paper.fileUrl || '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf'}
        paperTitle={paper.title}
        paperCode={paper.paperCode}
      />

      {/* Full-featured Take A Quiz Modal */}
      <TakeQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        paperTitle={paper.title}
        paperCode={paper.paperCode || 'PHY-IX-P1'}
        questions={questions}
      />

    </div>
  );
}
