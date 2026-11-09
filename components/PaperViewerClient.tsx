'use client';

import React, { useState, useEffect } from 'react';
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
import ContinuousDocument from '@/components/ContinuousDocument';
import PracticeHud from '@/components/PracticeHud';
import practice from '@/components/Practice.module.css';
import {safePaperOriginal, paperAnswer, paperChoices} from '@/lib/paperPresentation';
import {questionSyllabus} from '@/lib/questionSyllabus';
import {scrollAndPulse} from '@/lib/anchorPulse';

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
  totalMarks?: number;
  durationMinutes?: number;
  rubricInstruction?: string;
  markScalingNote?: string;
  id: string;
  title: string;
  paperCode?: string;
  examYear: number;
  examSession?: string | null;
  fileUrl?: string;
  subjectId?: string;
  boardCode?: string;
  academicClass?: { name: string; level: number };
  subject?: { id?: string; name: string };
}

interface Props {
  paper: Paper;
  questions: Question[];
  backUrl?: string;
  hideHeader?: boolean;
  pdfUrl?: string;
  historical?: boolean;
}

export default function PaperViewerClient({ paper, questions, backUrl, hideHeader = false, pdfUrl, historical = false }: Props) {
  const [displayMode, setDisplayMode] = useState<'generated' | 'original_pdf'>(
    questions && questions.length > 0 ? 'generated' : 'original_pdf'
  );
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(false);
  const [interactiveMode, setInteractiveMode] = useState<boolean>(false);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);

  const original = safePaperOriginal(paper.paperCode, paper.fileUrl || pdfUrl);

  // Auto-open quiz modal if URL query indicates ?quiz=1, ?take=true, or #quiz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (new URLSearchParams(search).get('view')==='solved') {
        setShowCorrectAnswers(true);
        setRevealedSolutions(Object.fromEntries(questions.map(q=>[q.questionNumber,true])));
      }
      if (search.includes('quiz') || search.includes('take') || hash === '#quiz') {
        setQuizModalOpen(true);
      }
    }
  }, []);

  // Deep link from a source link: land on the question and pulse it.
  useEffect(() => {
    const followQuestion = () => {
      const match = window.location.hash.match(/^#question-(.+)$/);
      if (!match) return;
      scrollAndPulse('question-' + decodeURIComponent(match[1]), 'start');
    };
    followQuestion();
    window.addEventListener('hashchange', followQuestion);
    return () => window.removeEventListener('hashchange', followQuestion);
  }, []);

  // Interactive Simulator State (for Paper 1 MCQs)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});

  const toggleSolution = (qNum: string) => {
    setRevealedSolutions(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  // Quick study and practice are two ways of revealing the key, so only one can be on.
  const toggleCorrectAnswers = () => {
    const next = !showCorrectAnswers;
    setShowCorrectAnswers(next);
    if (next) setInteractiveMode(false);
  };

  const togglePractice = () => {
    const next = !interactiveMode;
    setInteractiveMode(next);
    if (next) setShowCorrectAnswers(false);
  };

  const handleSelectOption = (qNum: string, option: string) => {
    if (checkedAnswers[qNum]) return; // locked after answering
    setUserAnswers(prev => ({ ...prev, [qNum]: option }));
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

  const isPaper2 = !paper.paperCode?.toUpperCase().includes('CHAP') && (
    (paper.paperCode && (paper.paperCode.toUpperCase().includes('-P2') || paper.paperCode.toUpperCase().endsWith('P2'))) ||
    (paper.title && paper.title.toUpperCase().includes('PAPER II')) ||
    questions.some(q => q.questionType === 'CONSTRUCTED_RESPONSE' || q.questionType === 'EXTENDED_RESPONSE')
  );

  const className = paper.academicClass?.name || 'Class IX';
  const isGrade9 = className.includes('IX') || paper.academicClass?.level === 9;
  const hsscAnnual = /^PHY-XI-(?:201[7-9]|202[1-5])-P[12]$/.test(paper.paperCode || '');
  const hsscPhysics = hsscAnnual || /^PHY-XII?-P[12]$/.test(paper.paperCode || '');
  const gradeLabel = hsscPhysics ? (paper.academicClass?.level === 11 ? 'CLASS XI' : 'CLASS XII') : isGrade9 ? 'CLASS IX' : 'CLASS X';
  const subjectId = paper.subjectId || (paper.subject as any)?.id || '3e6f82ae-95dc-4edb-b806-d75b194a21cd';

  const practiceItems = isPaper2 ? [] : questions.map((question, index) => {
    const metadata = parseSourceRegion(question.sourceRegion);
    const choices = paperChoices(metadata.choices || metadata.options || (question as any).options || (question as any).choices || {});
    return {
      qNum: question.questionNumber || String(index + 1),
      correctKey: paperAnswer(metadata, choices) || ''
    };
  }).filter(item => item.correctKey);
  const practiceTotal = practiceItems.length;
  const practiceAnswered = practiceItems.filter(item => userAnswers[item.qNum]).length;
  const practiceCorrect = practiceItems.filter(item => userAnswers[item.qNum] && userAnswers[item.qNum] === item.correctKey).length;

  return (
    <div data-paper-page data-practice-active={interactiveMode && displayMode === 'generated' && !isPaper2 ? 'true' : undefined} style={{ marginTop: '0.5rem', paddingBottom: interactiveMode && displayMode === 'generated' ? '6.5rem' : undefined }}>

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
                {isPaper2
                  ? 'Theory questions • Refer to original PDF'
                  : paper.paperCode?.startsWith('MTH-')
                    ? `${paper.totalMarks ?? questions.length} Marks • ${paper.durationMinutes ?? 80} Minutes`
                    : `${paper.totalMarks ?? questions.length} Marks • ${paper.durationMinutes ?? 70} Minutes`}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!isPaper2 && (
              <button
                type="button"
                onClick={() => setQuizModalOpen(true)}
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
                <Award size={16} />
                <span>Take A Quiz</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => original && setDownloadModalOpen(true)}
              style={{
                background: !isPaper2 ? '#ffffff' : '#0b5e4a',
                color: !isPaper2 ? '#0b5e4a' : '#ffffff',
                border: !isPaper2 ? '1.5px solid #0b5e4a' : 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: !isPaper2 ? 'none' : '0 2px 8px rgba(11, 94, 74, 0.2)'
              }}
            >
              <Download size={16} />
              <span>Download Official PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Display Mode Selector (Exact Dark Navy + Emerald Green Pill Switcher) */}
      <div
        role="group"
        aria-label="Document view"
        data-paper-switch
        style={{
          background: '#151f32',
          border: '1px solid #26334d',
          borderRadius: '14px',
          padding: '6px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.18)',
        }}
      >
        <button
          type="button"
          aria-pressed={displayMode === 'generated'}
          onClick={() => setDisplayMode('generated')}
          data-paper-switch-btn
          style={{
            padding: '11px 20px',
            borderRadius: '10px',
            fontSize: '0.95rem',
            minHeight: '46px',
            fontWeight: 800,
            background: displayMode === 'generated' ? '#066e4f' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={18} />
          <span>Digital Paper</span>
        </button>

        <button
          type="button"
          aria-pressed={displayMode === 'original_pdf'}
          onClick={() => setDisplayMode('original_pdf')}
          data-paper-switch-btn
          style={{
            padding: '11px 20px',
            borderRadius: '10px',
            fontSize: '0.95rem',
            minHeight: '46px',
            fontWeight: 800,
            background: displayMode === 'original_pdf' ? '#066e4f' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={18} />
          <span>Original PDF</span>
        </button>
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
            color: 'var(--text-color)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#0b5e4a" />
              <span>Original Board Document: <strong>{paper.title}</strong></span>
            </div>
            {(() => {
              const safeUrl = original;
              return safeUrl ? (
                <a
                  href={safeUrl}
                  download
                  style={{ color: 'var(--primary-color)', flexShrink: 0, fontWeight: 700, textDecoration: 'underline', fontSize: '0.82rem' }}
                >
                  Direct Download ⬇
                </a>
              ) : null;
            })()}
          </div>
          {(() => {
            const safeUrl = original;
            return safeUrl ? (
              <div style={{padding:"1rem"}}><ContinuousDocument url={safeUrl} title={paper.title} /></div>
            ) : (
              <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Scanned PDF is currently being digitized for this session.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  All authentic board questions and verified solutions are available in digital interactive format below.
                </p>
                <button
                  type="button"
                  onClick={() => setDisplayMode('generated')}
                  style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Switch to Digital Interactive Examination →
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 1: GENERATED DIGITAL INTERACTIVE VIEW (WITH TOGGLE & WORKING SLOS) */}
      {/* ========================================================================= */}
      {displayMode === 'generated' && (
        <>
          {/* Control Bar (For Paper I: Answer Toggle & Timed Quiz | For Paper II: Exact Ditto Question Paper Notice + Link to Solved E-Marking Notes) */}
          {!isPaper2 ? (
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
            }} data-paper-actions>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  aria-pressed={showCorrectAnswers}
                  onClick={toggleCorrectAnswers}
                  data-paper-action="answers"
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
                  <span data-paper-icon style={{ fontSize: '1.15rem' }}>{showCorrectAnswers ? '✅' : '⚪'}</span>
                  <span data-paper-label="full">{showCorrectAnswers ? 'Hide correct answers' : 'Show correct answer only'}</span>
                  <span data-paper-label="short">{showCorrectAnswers ? 'Hide answers' : 'Show answers'}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={interactiveMode}
                  onClick={togglePractice}
                  data-paper-action="practice"
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
                  <span data-paper-label="full">{interactiveMode ? '📝 Practice Mode (Active)' : '✏️ Practice & Select Options'}</span>
                  <span data-paper-label="short">{interactiveMode ? 'Practice on' : 'Practice'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuizModalOpen(true)}
                  data-paper-action="quiz"
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
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                📄 {paper.paperCode?.startsWith('CS-') ? 'Digital study version of Paper II — compare with the original document' : 'Exact Digital Copy of Official Paper II Question Booklet (Unanswered Exam Format • 2025 Syllabus Mapped)'}
              </span>
              {(hsscAnnual || /^MTH-(?:IX|X)-(?:201[789]|202[345])-P2$/.test(paper.paperCode || '') || !paper.paperCode?.includes('-P2') || paper.paperCode?.includes('2024') || paper.paperCode?.includes('2025')) && !(paper.paperCode?.startsWith('CHM-') && (paper.examYear === 2021 || paper.examYear === 2022)) ? (
                <Link
                  href={hsscAnnual ? `/resources/physics-xi-${paper.examYear}-emarking` : `/resources/${paper.paperCode?.startsWith('MTH-') ? 'mathematics' : paper.paperCode?.startsWith('CS-') ? 'computer-science' : paper.paperCode?.startsWith('CHM-') ? 'chemistry' : 'physics'}-${isGrade9 ? 'ix' : 'x'}-${paper.examYear}-emarking`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: '#066e4f',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                  }}
                >
                  <Sparkles size={15} />
                  <span>Open Solved E-Marking Notes (Better Responses) →</span>
                </Link>
              ) : null}
            </div>
          )}

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
            <div data-paper-cover style={{
              padding: '2.5rem 2.5rem 1.75rem',
              borderBottom: '2px solid #111827',
              textAlign: 'center',
              background: '#ffffff'
            }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.5px', color: '#111827', marginBottom: '0.35rem' }}>
                AGA KHAN UNIVERSITY EXAMINATION BOARD
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.5px', color: '#111827', marginBottom: '0.35rem' }}>
                {hsscPhysics ? 'HIGHER SECONDARY SCHOOL CERTIFICATE' : 'SECONDARY SCHOOL CERTIFICATE'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>
                {gradeLabel}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '0.4rem' }}>
                {paper.examSession?.toUpperCase().includes('MODEL') ? (hsscPhysics ? `MODEL EXAMINATIONS ${paper.examYear} AND ONWARDS` : 'MODEL EXAMINATIONS') : `ANNUAL EXAMINATIONS (THEORY) ${paper.examYear}`}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.4rem' }}>
                {paper.subject?.name || 'Physics'} {isPaper2 ? 'Paper II' : 'Paper I'}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
                {`Time: ${paper.durationMinutes ?? (isPaper2 ? 110 : 70)} minutes     Marks: ${paper.totalMarks ?? (isPaper2 ? 25 : questions.length)}`}
              </div>

              {/* Authentic AKU-EB Instructions & Rubric Box */}
              {!showCorrectAnswers && (
                <div data-paper-cover-notes style={{
                  marginTop: '1.5rem',
                  borderTop: '1.5px solid #111827',
                  paddingTop: '1.25rem',
                  textAlign: 'left',
                  fontFamily: "'Times New Roman', Times, serif, system-ui"
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', marginBottom: '0.4rem', color: '#111827' }}>
                    INSTRUCTIONS
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '0.6rem', color: '#111827' }}>
                    Please read the following instructions carefully.
                  </div>
                  {isPaper2 ? (
                    <div style={{ fontSize: '0.94rem', color: '#111827', lineHeight: 1.6 }}>
                      <p style={{ margin: '0 0 0.75rem 0' }}>
                        1. &nbsp;&nbsp;Check your name and school information. Sign if it is accurate.
                      </p>
                      <div style={{
                        maxWidth: '460px',
                        margin: '0 auto 1rem auto',
                        border: '1.5px solid #111827',
                        padding: '0.75rem 1.25rem 2.25rem 1.25rem',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '0.92rem'
                      }}>
                        I agree that this is my name and school.<br />
                        Candidate&apos;s Signature
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', marginBottom: '0.25rem' }}>
                        RUBRIC
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0' }}>
                        {paper.rubricInstruction || 'Answer the questions according to the choices specified in the original paper and below each question.'}
                      </p>
                      <p style={{ margin: '0 0 0.5rem 0' }}>
                        3. &nbsp;&nbsp;When answering the questions:<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Read each question carefully.<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Use a black pointer to write your answers. DO NOT write your answers in pencil.<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Use a black pencil for diagrams. DO NOT use coloured pencils.<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DO NOT use staples, paper clips, glue correcting fluid, or ink erasers.<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Complete your answer in the allocated space only. DO NOT write outside the answer box.
                      </p>
                      <p style={{ margin: '0 0 0.35rem 0' }}>
                        4. &nbsp;&nbsp;The marks for the questions are shown in brackets ( ).
                      </p>
                      <p style={{ margin: 0 }}>
                        5. &nbsp;&nbsp;You may use a simple calculator if you wish.
                      </p>
                    </div>
                  ) : (
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.92rem', color: '#111827', lineHeight: 1.6 }}>
                      <li>Read each question carefully.</li>
                      <li>Answer the questions on the separate answer sheet provided. DO NOT write your answers on the question paper.</li>
                      {paper.markScalingNote && <li>{paper.markScalingNote}</li>}
                      <li>There are 100 answer numbers on the answer sheet. Use answer numbers 1 to {questions.length} only.</li>
                      <li>In each question there are four choices A, B, C, D. Choose ONE. On the answer grid black out the circle for your choice with a pencil.</li>
                      <li>If you want to change your answer, ERASE the first answer completely with a rubber, before blacking out a new circle.</li>
                      <li>DO NOT write anything in the answer grid. The computer only records what is in the circles.</li>
                      <li>You may use a simple calculator if you wish.</li>
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Running Sub-header Bar */}
            <div data-paper-subheader style={{
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
              <span>{paper.subject?.name || 'Physics'} {isPaper2 ? 'Paper II' : 'Paper I'} &bull; {gradeLabel} ({paper.examYear})</span>
              <span>
                {showCorrectAnswers ? '⭐ Quick Study Mode: Questions, SLO Mappings & Answer Key' : `Total ${questions.length} Examination Items • SLO Mapped`}
              </span>
            </div>

            {/* Questions Listing */}
            <div data-paper-questions style={{ padding: '2.5rem' }}>
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

                // Historical papers can map to a different current class; link to that reviewed syllabus.
                const mappingLevel = historical && meta.current_syllabus_reviewed && [9, 10, 11, 12].includes(meta.mapping_scope?.grade)
                  ? meta.mapping_scope.grade : paper.academicClass?.level || 9;
                const mapping = questionSyllabus(meta,q.slos,mappingLevel,paper.subject?.name || 'Physics',paper.boardCode || 'AKU-EB',historical);
                const sloCode = mapping.code;
                const topicName = mapping.topic;

                // Correct answer and candidate responses
                const correctKey = paperAnswer(meta, choices) || '';
                const correctOptionText = choices[correctKey] || '';
                const answerLabel = meta.answer_origin === 'PROJECT_SOLVED' ? 'Project-solved answer' : 'Answer key';
                const betterResponse = meta.better_response || meta.model_answer || (
                  isPaper2
                    ? meta.explanation || 'A reviewed model response is not available for this item.'
                    : correctKey ? (meta.explanation || `${answerLabel}: ${correctKey} (${correctOptionText}).`) : 'A reviewed answer key is not available.'
                );
                const optionFeedback: Array<{ key: string; reason: string }> = Array.isArray(meta.option_feedback) ? meta.option_feedback : [];
                const otherOptions = optionFeedback.filter(option => option.reason && option.key !== correctKey);
                const optionReview = otherOptions.length > 0 && (
                  <details>
                    <summary>Reasoning for {correctKey ? 'the other options' : 'each option'}</summary>
                    <ul>
                      {otherOptions.map(option => (
                        <li key={option.key}><strong>{option.key}.</strong> <MathText text={option.reason} /></li>
                      ))}
                    </ul>
                  </details>
                );

                // Interactive practice variables
                const selectedOpt = userAnswers[qNum];
                const isChecked = checkedAnswers[qNum];
                const isCorrect = isChecked && selectedOpt === correctKey;

                return (
                  <div id={"question-"+qNum} key={q.id} style={{
                    marginBottom: showCorrectAnswers ? '2.25rem' : '3rem',
                    paddingBottom: showCorrectAnswers ? '1.75rem' : '2.5rem',
                    borderBottom: idx === questions.length - 1 ? 'none' : '1px solid #e5e7eb'
                  }}>
                    {meta.assessmentSection && (qNum === '1' || qNum === '51') && <h2 style={{ margin: '0 0 1rem' }}>{meta.assessmentSection} ({qNum === '1' ? 'Questions 1–50' : 'Questions 51–65'})</h2>}

                    {/* Question Header & Marks */}
                    <div data-question-head style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexGrow: 1, minWidth: 0 }}>
                        {(() => {
                          const cleanQ = qNum.replace(/^Q\.?\s*/i, '').replace(/\.$/, '');
                          const displayQ = /^[0-9]+$/.test(cleanQ) ? `Q.${cleanQ}.` : `Q.${cleanQ}`;
                          return (
                            <span data-question-number style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', minWidth: '32px' }}>
                              {displayQ}
                            </span>
                          );
                        })()}
                        <div data-question-stem style={{ fontSize: '1.1rem', color: '#1f2937', lineHeight: 1.6, flexGrow: 1, minWidth: 0 }}>
                          <StructuredContent text={q.questionText} />
                        </div>
                      </div>
                      {isPaper2 && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827', background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                          (Total {marks} Marks)
                        </span>
                      )}
                    </div>

                    {/* Current 2025 Syllabus SLO Badge (or Out of 2025 Syllabus Badge) */}
                    <div data-question-block data-slo-badge style={{
                      marginLeft: '2.5rem',
                      marginBottom: '1rem',
                      padding: '0.6rem 0.9rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {meta.mapping_status === 'MOVED_TO_GRADE_X' ? (
                          <Link href={`/akueb/X/mathematics/syllabus#slo-${encodeURIComponent(meta.current_slo || '')}`}>
                            Current syllabus: moved to Class X · SLO {meta.current_slo}
                          </Link>
                        ) : mapping.status === 'mapped' && !meta.out_of_syllabus ? (
                          <Link
                            href={mapping.href!}
                            style={{
                              background: '#ecfdf5',
                              color: '#066e4f',
                              border: '1px solid #a7f3d0',
                              padding: '2px 9px',
                              borderRadius: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              textDecoration: 'none'
                            }}
                          >
                            2025 Syllabus: SLO {sloCode}{topicName ? ` • ${topicName}` : ''} ↗
                          </Link>
                        ) : (
                          <span style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            padding: '2px 9px',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 800
                          }}>
                            {meta.mapping_status === 'NO_DIRECT_OUTCOME' ? 'No direct outcome in current IX–X syllabus' : mapping.status === 'outside' ? 'Out of 2025 Syllabus' : 'SLO mapping awaiting review'}
                          </span>
                        )}
                        {hsscPhysics && mapping.status === 'mapped' && Array.isArray(meta.current_mapping) &&
                          meta.current_mapping.slice(1).map((outcome: { code: string; grade?: number }) => (
                            <Link key={outcome.code} href={(outcome.grade ? `/akueb/${outcome.grade === 12 ? 'XII' : 'XI'}/physics/syllabus` : mapping.href!.split('#')[0]) + '#slo-' + encodeURIComponent(outcome.code)}>
                              SLO {outcome.code} ↗
                            </Link>
                          ))}

                        {(q.difficulty || meta.cognitive_level) && (
                          <span style={{
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 600
                          }}>
                            Cognitive Level: {(q.difficulty || meta.cognitive_level) === 'K' ? 'K (Knowledge)' : (q.difficulty || meta.cognitive_level) === 'U' ? 'U (Understanding)' : (q.difficulty || meta.cognitive_level) === 'A' ? 'A (Application)' : (q.difficulty || meta.cognitive_level)}
                          </span>
                        )}
                      </div>
                    </div>
                    {meta.choice_instruction && <p data-question-block style={{ marginLeft: '2.5rem', fontWeight: 700 }}>{meta.choice_instruction}</p>}
                    {/* Cropped Diagram / Graph / Circuit (if present) */}
                    {(() => {
                      if (q.diagramBased === false || (q as any).isDiagram === false) return null;
                      const diagramSrc = hsscPhysics && isPaper2
                        ? meta.diagramUrl
                        : resolveQuestionDiagram(paper.paperCode || paper.title, qNum, q);
                      if (!diagramSrc) return null;
                      const secondDiagram = hsscPhysics && isPaper2 ? meta.secondDiagramUrl : undefined;
                      return (secondDiagram ? [diagramSrc, secondDiagram] : [diagramSrc]).map((src, index) => (
                        <div key={src} data-question-block style={{ textAlign: 'center', margin: '1.25rem 0', marginLeft: '2.5rem' }}>
                          <img
                            src={src}
                            alt={`Diagram for Question ${qNum}${secondDiagram ? (index === 0 ? 'a' : 'b') : ''}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                      ));
                    })()}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 1: OPTIONS & VERIFIED KEY                      */}
                    {/* ---------------------------------------------------- */}
                    {!isPaper2 && choices && Object.keys(choices).length > 0 && (
                      <div data-question-block style={{ marginLeft: '2.5rem', marginBottom: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

                        {/* Interactive Practice Mode */}
                        {interactiveMode && correctKey ? (
                          <div className={practice.options}>
                            {['A', 'B', 'C', 'D'].map(optKey => {
                              const optText = choices[optKey] || '';
                              if (!optText) return null;
                              const isSelected = selectedOpt === optKey;
                              const isRight = isChecked && optKey === correctKey;
                              const isWrong = isChecked && isSelected && optKey !== correctKey;
                              return (
                                <button
                                  key={optKey}
                                  type="button"
                                  disabled={isChecked}
                                  aria-disabled={isChecked}
                                  onClick={() => handleSelectOption(qNum, optKey)}
                                  className={[
                                    practice.option,
                                    isChecked ? practice.answered : '',
                                    !isChecked && isSelected ? practice.selected : '',
                                    isRight ? practice.correct : '',
                                    isWrong ? practice.wrong : ''
                                  ].filter(Boolean).join(' ')}
                                >
                                  <strong className={practice.key}>{optKey}.</strong>
                                  <span className={practice.text}><MathText text={optText} /></span>
                                  {isRight && <CheckCircle2 size={16} color="#16a34a" className={practice.mark} aria-hidden="true" />}
                                  {isWrong && <XCircle size={16} color="#dc2626" className={practice.mark} aria-hidden="true" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Standard / Quick Study Mode Options */
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '0.65rem' }}>
                            {['A', 'B', 'C', 'D'].map(optKey => {
                              const optText = choices[optKey] || '';
                              if (!optText) return null;
                              const isThisCorrect = meta.official_answer === 'D,A' ? ['D', 'A'].includes(optKey) : optKey === correctKey;

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

                        {/* Feedback appears the moment an option is tapped — no check step */}
                        {interactiveMode && isChecked && (
                          <div
                            role="status"
                            className={`${practice.feedback} ${isCorrect ? practice.feedbackCorrect : practice.feedbackWrong}`}
                            style={{ marginTop: '0.85rem' }}
                          >
                            <div className={practice.feedbackTitle}>
                              {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                              <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                              <span>Correct option ({correctKey}) <MathText text={correctOptionText} /></span>
                            </div>
                            {!isCorrect && selectedOpt && (
                              <div className={practice.reason}>
                                <strong>Why Option ({selectedOpt}) is incorrect: </strong>
                                <MathText text={optionFeedback.find(option => String(option.key).toUpperCase() === selectedOpt)?.reason || 'A reason for this choice is pending review.'} />
                              </div>
                            )}
                            <div className={practice.explanation}>
                              <strong>Why Option ({correctKey}) is correct: </strong>
                              <MathText text={betterResponse} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 1: SOLUTION / REASONING CARD                   */}
                    {/* ---------------------------------------------------- */}
                    {!isPaper2 && (
                      <div data-question-block style={{ marginLeft: '2.5rem', marginTop: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
                                {correctKey ? `Correct Option: ${correctKey}` : meta.answer_status === 'KEY_CONFLICT' ? 'No unique valid answer' : 'Review pending'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                              <MathText text={betterResponse} />
                              {meta.answer_review_note && <p><MathText text={meta.answer_review_note} /></p>}
                              {optionReview}
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
                              {isSolutionRevealed ? 'Hide Solution' : 'View Solution & Key'}
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
                                    {correctKey ? `Correct Option: ${correctKey}` : meta.answer_status === 'KEY_CONFLICT' ? 'No unique valid answer' : 'Review pending'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
                                  <MathText text={betterResponse} />
                                  {meta.answer_review_note && <p role="note"><MathText text={meta.answer_review_note} /></p>}
                                  {optionReview}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* PAPER 2: EXACT DITTO DIGITAL QUESTION BOOKLET LINES  */}
                    {/* (No answers shown in Paper II; solutions are in      */}
                    {/*  the E-Marking Notes Digital Paper)                  */}
                    {/* ---------------------------------------------------- */}
                    {isPaper2 && (
                      <div data-question-block style={{ marginLeft: '2.5rem', marginTop: '0.75rem' }}>
                        {hsscAnnual && meta.emarkingExamples?.map((item: { part: string; solution: string; pdf: string; better: string; weaker: string }) => (
                          <details key={item.part} style={{ marginBottom: '1rem' }}>
                            <summary>Worked solution and board examples · Q{item.part}</summary>
                            <StructuredContent text={item.solution} />
                            <p><a href={item.pdf} target="_blank" rel="noreferrer">Open the board’s checking hints and original reference</a></p>
                            <figure>
                              <figcaption>Stronger response · board example</figcaption>
                              <img src={item.better} alt={`Stronger response for question ${item.part}`} loading="lazy" style={{ maxWidth: '100%' }} />
                            </figure>
                            <figure>
                              <figcaption>Weaker response · board example</figcaption>
                              <img src={item.weaker} alt={`Weaker response for question ${item.part}`} loading="lazy" style={{ maxWidth: '100%' }} />
                            </figure>
                          </details>
                        ))}
                        {meta.model_answer_origin && (
                          <details style={{ marginBottom: '1rem' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{hsscPhysics ? 'Worked solution' : 'Worked solution and e-marking examples'}</summary>
                            <p><strong>Supplementary worked solution</strong> · {meta.model_answer_origin}</p>
                            <StructuredContent text={meta.model_answer || ''} />
                            {meta.answer_review_note && <p role="note"><strong>Source discrepancy:</strong> {meta.answer_review_note}</p>}
                            {meta.original_reference_source && <p><a href={meta.original_reference_source} target="_blank" rel="noreferrer">Original board e-marking notes</a></p>}
                            {(['better', 'weaker'] as const).map(kind => meta[`${kind}_response_image`] && (
                              <figure key={kind}>
                                <figcaption>{kind === 'better' ? 'Better' : 'Weaker'} response · original board example</figcaption>
                                <img src={meta[`${kind}_response_image`]} alt={`${kind} response for question ${qNum}`} style={{ maxWidth: '100%', height: 'auto' }} />
                              </figure>
                            ))}
                          </details>
                        )}
                        {!hsscPhysics && Array.from({ length: ruledLinesCount }).map((_, lIdx) => (
                          <div
                            key={lIdx}
                            style={{
                              height: '32px',
                              borderBottom: '1px solid #111827',
                              width: '100%',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {interactiveMode && !isPaper2 && <div data-paper-summary role="status" style={{padding:'1rem 1.5rem',display:'flex',gap:'1rem',flexWrap:'wrap',alignItems:'center',borderTop:'1px solid var(--border-color)',color:'var(--text-color)'}}><strong>Answered {practiceAnswered} of {practiceTotal} · {practiceCorrect} correct</strong><button onClick={()=>{setUserAnswers({});setCheckedAnswers({});}} style={{padding:'.65rem 1rem',borderRadius:8,border:'1px solid var(--border-color)',background:'var(--card-bg)',color:'var(--text-color)'}}>Reset practice</button></div>}
            {/* Examination Booklet Footer */}
            <div data-paper-footer style={{
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
              <span>{hsscPhysics || paper.paperCode?.startsWith('CS-') || paper.paperCode?.startsWith('CHM-') || paper.paperCode?.startsWith('MTH-') ? paper.paperCode : !isGrade9 ? (isPaper2 ? 'S2502-1721120' : 'S2502-1721110') : paper.examYear === 2024 ? (isPaper2 ? 'S2401-1711120' : 'S2401-1711110') : (isPaper2 ? 'S2501-1711120' : 'S2501-1711110')}</span>
              <span style={{ letterSpacing: '1px' }}>END OF PAPER</span>
              <span>{paper.subject?.name || 'Physics'} {isPaper2 ? 'Paper II' : 'Paper I'}</span>
            </div>
          </div>

          {interactiveMode && !isPaper2 && (
            <PracticeHud total={practiceTotal} answered={practiceAnswered} correct={practiceCorrect} />
          )}
        </>
      )}

      {/* 5-Second Countdown Download Modal */}
      {original && <DownloadCountdownModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        pdfUrl={original}
        paperTitle={paper.title}
        paperCode={paper.paperCode}
      />}

      {/* Full-featured Take A Quiz Modal */}
      <TakeQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        paperTitle={paper.title}
        paperCode={paper.paperCode || 'PHY-IX-P1'}
        questions={hsscPhysics ? questions.filter((question, index) =>
          practiceItems.some(item => item.qNum === (question.questionNumber || String(index + 1)))
        ) : questions}
      />

    </div>
  );
}
