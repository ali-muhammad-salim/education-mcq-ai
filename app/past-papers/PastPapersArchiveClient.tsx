'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, Download, Award, ArrowRight, ExternalLink, 
  Sparkles, Filter, CheckCircle2, BookOpen, Layers, List, Grid, ShieldCheck
} from 'lucide-react';

interface PastPaper {
  id: string;
  paperCode?: string;
  examSession?: string;
  examYear: number;
  title: string;
  fileUrl?: string;
  academicClass?: { name: string; level: number };
  subject?: { name: string };
  _count: { questions: number };
}

interface Props {
  pastPapers: PastPaper[];
  initialGrade?: 'SSC-I' | 'SSC-II';
}

export default function PastPapersArchiveClient({ pastPapers, initialGrade = 'SSC-I' }: Props) {
  const searchParams = useSearchParams();
  const paramGrade = searchParams?.get('grade');

  // Active Grade: SSC-I (Class IX) or SSC-II (Class X)
  const [activeGrade, setActiveGrade] = useState<'SSC-I' | 'SSC-II'>(initialGrade);

  useEffect(() => {
    if (paramGrade) {
      const g = paramGrade.toUpperCase();
      if (g.includes('II') || g.includes('10') || g.includes('X')) {
        setActiveGrade('SSC-II');
      } else if (g.includes('I') || g.includes('9') || g.includes('IX')) {
        setActiveGrade('SSC-I');
      }
    }
  }, [paramGrade]);
  
  // View mode: 'directory' (matching user's screenshot) or 'cards'
  const [viewMode, setViewMode] = useState<'directory' | 'cards'>('directory');

  // Years to display (2025 down to 2018)
  const allYears = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  // Filter papers for current active grade
  const gradePapers = pastPapers.filter(paper => {
    const isGrade9 = paper.academicClass?.level === 9 || paper.academicClass?.name?.includes('IX') || (paper.paperCode && paper.paperCode.includes('-IX-'));
    return activeGrade === 'SSC-I' ? isGrade9 : !isGrade9;
  });

  const gradeCode = activeGrade === 'SSC-I' ? 'IX' : 'X';
  const gradeLevelNum = activeGrade === 'SSC-I' ? 9 : 10;

  // Separate Model Papers vs Annual Papers
  const modelPaper1 = gradePapers.find(p => {
    const code = (p.paperCode || '').toUpperCase();
    const title = (p.title || '').toUpperCase();
    return (code === `PHY-${gradeCode}-P1` || title.includes('MODEL PAPER I') || (title.includes('MODEL') && title.includes('MCQ'))) && !code.includes('2025');
  });

  const modelPaper2 = gradePapers.find(p => {
    const code = (p.paperCode || '').toUpperCase();
    const title = (p.title || '').toUpperCase();
    return (code === `PHY-${gradeCode}-P2` || title.includes('MODEL PAPER II') || (title.includes('MODEL') && (title.includes('CRQ') || title.includes('THEORY')))) && !code.includes('2025');
  });

  // Helper to find annual exam paper by year and component
  const getAnnualPaper = (year: string, component: 'P1' | 'P2') => {
    return gradePapers.find(p => {
      const yrMatch = p.examYear.toString() === year;
      if (!yrMatch) return false;
      const code = (p.paperCode || '').toUpperCase();
      const title = (p.title || '').toUpperCase();
      const isModel = code === `PHY-${gradeCode}-P1` || code === `PHY-${gradeCode}-P2` || (title.includes('MODEL') && !code.includes('2025'));
      if (isModel) return false;
      if (component === 'P1') {
        return code.includes('P1') || (title.includes('PAPER I') && !title.includes('PAPER II')) || title.includes('MCQ');
      } else {
        return code.includes('P2') || title.includes('PAPER II') || title.includes('CRQ') || title.includes('THEORY');
      }
    });
  };

  return (
    <div>
      {/* Authentic Subject Banner & Breadcrumb (Matching Screenshot 1 & 2) */}
      <div style={{
        background: '#181b20',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        color: '#ffffff',
        border: '1px solid #282c34',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
      }}>
        {/* Huge Subject Title */}
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          letterSpacing: '0.5px',
          color: '#ffffff'
        }}>
          Physics
        </h1>

        {/* Authentic Breadcrumb (Home » AKUEB Past Papers » SSC-I » Physics) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.95rem',
          color: '#cbd5e1',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          flexWrap: 'wrap'
        }}>
          <Link href="/" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
            Home
          </Link>
          <span>&raquo;</span>
          <Link href="/past-papers" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
            AKUEB Past Papers
          </Link>
          <span>&raquo;</span>
          <button
            type="button"
            onClick={() => setActiveGrade(activeGrade === 'SSC-I' ? 'SSC-II' : 'SSC-I')}
            title="Click to toggle grade"
            style={{
              background: 'none',
              border: 'none',
              color: '#6ee7b7',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 700,
              padding: 0
            }}
          >
            {activeGrade}
          </button>
          <span>&raquo;</span>
          <Link href={`/subjects/${activeGrade === 'SSC-I' ? 'class-9' : 'class-10'}/physics`} style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 700 }}>
            Physics
          </Link>
        </div>

        {/* Grade Tabs & View Mode Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #2e3440',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Grade Selector Pills */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveGrade('SSC-I')}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                background: activeGrade === 'SSC-I' ? '#0b5e4a' : '#282c34',
                color: activeGrade === 'SSC-I' ? '#ffffff' : '#abb2bf',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Award size={15} /> SSC-I (Class IX)
            </button>
            <button
              onClick={() => setActiveGrade('SSC-II')}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                background: activeGrade === 'SSC-II' ? '#0b5e4a' : '#282c34',
                color: activeGrade === 'SSC-II' ? '#ffffff' : '#abb2bf',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Award size={15} /> SSC-II (Class X)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#21252b', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('directory')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                background: viewMode === 'directory' ? '#0b5e4a' : 'transparent',
                color: viewMode === 'directory' ? '#fff' : '#888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <List size={14} /> Official Directory View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                background: viewMode === 'cards' ? '#0b5e4a' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : '#888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Grid size={14} /> Card Previews
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: OFFICIAL DIRECTORY ARCHIVE (MATCHING USER SCREENSHOT 2) */}
      {viewMode === 'directory' && (
        <div style={{
          background: '#23272e',
          borderRadius: '16px',
          padding: '3rem 2.5rem',
          color: '#ffffff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          marginBottom: '3rem'
        }}>
          
          {/* SECTION 1: OFFICIAL MODEL EXAMINATION PAPERS */}
          <div style={{
            textAlign: 'center',
            paddingBottom: '2.5rem',
            marginBottom: '2.5rem',
            borderBottom: '1px solid #3e4451'
          }}>
            <div style={{ 
              display: 'inline-block', 
              background: '#0b5e4a', 
              color: '#ffffff', 
              fontSize: '0.82rem', 
              fontWeight: 800, 
              padding: '3px 12px', 
              borderRadius: '6px', 
              textTransform: 'uppercase', 
              marginBottom: '0.85rem', 
              letterSpacing: '0.5px' 
            }}>
              Curriculum Blueprint • 2025–2028
            </div>
            
            <h2 style={{
              fontSize: '2.6rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 1.25rem 0',
              letterSpacing: '0.5px'
            }}>
              Model Examination Papers
            </h2>

            {/* Vertical Links Group for Model Papers */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              alignItems: 'center'
            }}>
              {/* Model Paper I (MCQs) */}
              <Link
                href={`/past-papers/${modelPaper1?.paperCode || `PHY-${gradeCode}-P1`}`}
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
              >
                Physics-{gradeCode}-Paper-I-Model
              </Link>

              {/* Model Paper II (CRQs & ERQs Theory with Ruled Space) */}
              <Link
                href={`/past-papers/${modelPaper2?.paperCode || `PHY-${gradeCode}-P2`}`}
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
              >
                Physics-{gradeCode}-Paper-II-Model
              </Link>

              {/* Model Paper Keys */}
              <Link
                href={`/past-papers/${modelPaper1?.paperCode || `PHY-${gradeCode}-P1`}?view=answer_key`}
                style={{
                  color: '#8ce99a',
                  textDecoration: 'underline',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#bbf7d0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8ce99a')}
              >
                Physics-{gradeCode}-Keys-Model
              </Link>

              {/* Model E-marking Notes */}
              <Link
                href={`/past-papers/${modelPaper2?.paperCode || `PHY-${gradeCode}-P2`}?view=emarking_notes`}
                style={{
                  color: '#8ce99a',
                  textDecoration: 'underline',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#bbf7d0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8ce99a')}
              >
                E-marking-Notes-Physics-{gradeCode}-Model
              </Link>

              {/* Sample Practical Laboratory Exam */}
              <a
                href={activeGrade === 'SSC-I' 
                  ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
                  : "/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#fbbf24',
                  textDecoration: 'underline',
                  fontSize: '1.15rem',
                  fontWeight: 600
                }}
              >
                Sample-Practical-Laboratory-Exam-Physics-{gradeCode}
              </a>
            </div>
          </div>

          {/* SECTION 2: ANNUAL PAST EXAMINATION PAPERS (2025 down to 2018) */}
          {allYears.map((yr, idx) => {
            const paper1 = getAnnualPaper(yr, 'P1');
            const paper2 = getAnnualPaper(yr, 'P2');

            return (
              <div key={yr} style={{
                textAlign: 'center',
                paddingBottom: '2.5rem',
                marginBottom: '2.5rem',
                borderBottom: idx === allYears.length - 1 ? 'none' : '1px solid #3e4451'
              }}>
                {/* Year Header (e.g. 2025, 2024, 2023) */}
                <h2 style={{
                  fontSize: '2.6rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 1.25rem 0',
                  letterSpacing: '0.5px'
                }}>
                  {yr}
                </h2>

                {/* Vertical Links Group (Identical to User's Screenshot) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  alignItems: 'center'
                }}>
                  
                  {/* Link 1: Paper I (MCQs Exam Paper) */}
                  {paper1 ? (
                    <Link
                      href={`/past-papers/${paper1.paperCode || paper1.id}?view=exam_booklet`}
                      style={{
                        color: '#60a5fa',
                        textDecoration: 'underline',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                    >
                      Physics-{gradeCode}-Paper-I-{yr}
                    </Link>
                  ) : (
                    <Link
                      href={`/upload?year=${yr}&grade=${gradeLevelNum}&comp=paper_1`}
                      style={{ color: '#64748b', fontSize: '1.15rem', textDecoration: 'none' }}
                    >
                      Physics-{gradeCode}-Paper-I-{yr} <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: '6px' }}>[+ Upload PDF]</span>
                    </Link>
                  )}

                  {/* Link 2: Paper II (Theory CRQs & ERQs with Ruled Writing Space) */}
                  {paper2 ? (
                    <Link
                      href={`/past-papers/${paper2.paperCode || paper2.id}?view=exam_booklet`}
                      style={{
                        color: '#60a5fa',
                        textDecoration: 'underline',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                    >
                      Physics-{gradeCode}-Paper-II-{yr}
                    </Link>
                  ) : (
                    <Link
                      href={`/upload?year=${yr}&grade=${gradeLevelNum}&comp=paper_2`}
                      style={{ color: '#64748b', fontSize: '1.15rem', textDecoration: 'none' }}
                    >
                      Physics-{gradeCode}-Paper-II-{yr} <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: '6px' }}>[+ Upload PDF]</span>
                    </Link>
                  )}

                  {/* Link 3: Answer Keys Grid */}
                  {(paper1 || paper2) ? (
                    <Link
                      href={`/past-papers/${(paper1 || paper2)!.paperCode || (paper1 || paper2)!.id}?view=answer_key`}
                      style={{
                        color: '#8ce99a',
                        textDecoration: 'underline',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#bbf7d0')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#8ce99a')}
                    >
                      Physics-{gradeCode}-Keys-{yr}
                    </Link>
                  ) : (
                    <span style={{ color: '#475569', fontSize: '1.15rem' }}>
                      Physics-{gradeCode}-Keys-{yr}
                    </span>
                  )}

                  {/* Link 4: E-Marking Notes (Better Response vs Weak Response) */}
                  {(paper2 || paper1) ? (
                    <Link
                      href={`/past-papers/${(paper2 || paper1)!.paperCode || (paper2 || paper1)!.id}?view=emarking_notes`}
                      style={{
                        color: '#8ce99a',
                        textDecoration: 'underline',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#bbf7d0')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#8ce99a')}
                    >
                      E-marking-Notes-Physics-{gradeCode}-{yr}
                    </Link>
                  ) : (
                    <span style={{ color: '#475569', fontSize: '1.15rem' }}>
                      E-marking-Notes-Physics-{gradeCode}-{yr}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: VISUAL CARD GRID */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
          {gradePapers.map((paper) => {
            const isModel = (paper.paperCode && (paper.paperCode === 'PHY-IX-P1' || paper.paperCode === 'PHY-IX-P2' || paper.paperCode === 'PHY-X-P1' || paper.paperCode === 'PHY-X-P2')) || 
                            (paper.title && paper.title.includes('Model Paper') && !paper.paperCode?.includes('2025'));
            const isP1 = (paper.paperCode && paper.paperCode.includes('P1')) || (paper.title && paper.title.includes('Paper I') && !paper.title.includes('Paper II'));

            return (
              <div key={paper.id} className="card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e1e8e5', padding: '1.5rem', borderRadius: '14px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    color: isModel ? '#3730a3' : '#0b5e4a', 
                    background: isModel ? '#e0e7ff' : '#e6f0ed', 
                    padding: '3px 8px', 
                    borderRadius: '4px' 
                  }}>
                    {isModel ? 'Official Model Paper' : (paper.paperCode || `PHY-${gradeCode}-${paper.examYear}`)}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>
                    {isModel ? '2025–2028 Blueprint' : `${paper.examYear} Annual`}
                  </span>
                </div>

                <h3 style={{ color: '#1a3b32', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 800 }}>
                  {paper.title}
                </h3>

                <div style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.25rem', flexGrow: 1 }}>
                  <p style={{ margin: '0.2rem 0' }}><strong>Type:</strong> {isP1 ? 'Paper 1 (MCQs)' : 'Paper 2 (CRQ & ERQ Theory)'}</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Class:</strong> {activeGrade}</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Questions:</strong> {paper._count.questions} Ingested Items</p>
                </div>

                {/* Action Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link
                    href={`/past-papers/${paper.paperCode || paper.id}?view=exam_booklet`}
                    className="btn"
                    style={{ textAlign: 'center', padding: '0.65rem 0.75rem', fontSize: '0.85rem', background: '#0b5e4a', color: '#ffffff', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FileText size={16} /> 1:1 Exam Paper Booklet &rarr;
                  </Link>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link
                      href={`/past-papers/${paper.paperCode || paper.id}?view=answer_key`}
                      className="btn"
                      style={{ flex: 1, textAlign: 'center', padding: '0.55rem 0.75rem', fontSize: '0.8rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 600 }}
                    >
                      Answer Key &rarr;
                    </Link>
                    <Link
                      href={`/past-papers/${paper.paperCode || paper.id}?view=emarking_notes`}
                      className="btn"
                      style={{ flex: 1, textAlign: 'center', padding: '0.55rem 0.75rem', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600 }}
                    >
                      E-Notes &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
