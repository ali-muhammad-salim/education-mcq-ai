'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, Award, Download, CheckCircle2, AlertCircle, 
  HelpCircle, Sparkles, Filter, Check, RotateCcw, Eye, ArrowRight,
  BookOpen, Layers, ShieldCheck, List, Grid
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function ModelPapersPage() {
  const [activeGrade, setActiveGrade] = useState<'SSC-I' | 'SSC-II'>('SSC-I');
  const [viewMode, setViewMode] = useState<'directory' | 'cards'>('directory');

  const gradeCode = activeGrade === 'SSC-I' ? 'IX' : 'X';
  const paper1Id = activeGrade === 'SSC-I' ? 'PHY-IX-P1' : 'PHY-X-P1';
  const paper2Id = activeGrade === 'SSC-I' ? 'PHY-IX-P2' : 'PHY-X-P2';

  const paper1Pdf = activeGrade === 'SSC-I' 
    ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf'
    : '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf';

  const paper2Pdf = activeGrade === 'SSC-I'
    ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf'
    : '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
      
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Past & Model Papers Archive', href: '/past-papers' },
          { label: `Official Model Papers (${activeGrade})`, active: true }
        ]}
      />

      {/* Authentic Subject Banner & Breadcrumb (Matching Past Papers Dark Theme) */}
      <div style={{
        background: '#181b20',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        color: '#ffffff',
        border: '1px solid #282c34',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
      }}>
        {/* Large Subject Title */}
        <h1 className="mobile-page-title" style={{
          fontSize: '3rem',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          letterSpacing: '0.5px',
          color: '#ffffff'
        }}>
          Physics Model Papers
        </h1>

        {/* Authentic Breadcrumb (Home » AKUEB Past Papers » SSC-I » Physics Model Papers) */}
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
          <span style={{ color: '#ffffff', fontWeight: 700 }}>
            Model Papers (2025–2028 Blueprint)
          </span>
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

      {/* VIEW MODE 1: OFFICIAL DIRECTORY ARCHIVE (MATCHING USER SCREENSHOT EXACTLY) */}
      {viewMode === 'directory' && (
        <div style={{
          background: '#23272e',
          borderRadius: '16px',
          padding: '3.5rem 2.5rem',
          color: '#ffffff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          marginBottom: '3rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
              Curriculum Standard • 2025–2028 Blueprint
            </div>
            
            <h2 className="mobile-page-title" style={{
              fontSize: '2.75rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 1.25rem 0',
              letterSpacing: '0.5px'
            }}>
              Model Examination Papers
            </h2>

            {/* Vertical Links Group for Model Papers (Blue and Green Links like screenshot) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.95rem',
              alignItems: 'center',
              marginTop: '1.5rem'
            }}>
              {/* Model Paper I (MCQs) */}
              <Link
                href={`/past-papers/${paper1Id}`}
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  fontSize: '1.3rem',
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
                href={`/past-papers/${paper2Id}`}
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  fontSize: '1.3rem',
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
                href={`/past-papers/${paper1Id}?view=answer_key`}
                style={{
                  color: '#8ce99a',
                  textDecoration: 'underline',
                  fontSize: '1.3rem',
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
                href={`/past-papers/${paper2Id}?view=emarking_notes`}
                style={{
                  color: '#8ce99a',
                  textDecoration: 'underline',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#bbf7d0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8ce99a')}
              >
                E-marking-Notes-Physics-{gradeCode}-Model
              </Link>

              {/* Practical Laboratory Exam */}
              <a
                href={activeGrade === 'SSC-I' 
                  ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
                  : "/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#fbbf24',
                  textDecoration: 'underline',
                  fontSize: '1.2rem',
                  fontWeight: 600
                }}
              >
                Sample-Practical-Laboratory-Exam-Physics-{gradeCode}
              </a>

              {/* Teacher Pacing Guide */}
              <a
                href={activeGrade === 'SSC-I'
                  ? "/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf"
                  : "/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#cbd5e1',
                  textDecoration: 'underline',
                  fontSize: '1.15rem'
                }}
              >
                {activeGrade === 'SSC-I' ? 'Teacher Pacing Guide — Physics IX' : 'Teacher Pacing Guide — Physics X'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: VISUAL CARD PREVIEWS */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '1.75rem', marginBottom: '3.5rem' }}>
          
          {/* Card 1: Model Paper 1 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '14px',
            padding: '1.75rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                  Model Paper I • Multiple Choice Questions
                </span>
                <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 700 }}>
                  {paper1Id}
                </span>
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                Physics {activeGrade} Model Paper 1 (40 MCQs)
              </h3>
              <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                40 Multiple choice items testing Remembering (K), Understanding (U), and Application (A) with full instant score evaluation, verified keys, and original PDF split-view.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>40 Questions</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>40 Marks</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>100% Key Verified</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>PDF Split View</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <Link
                href={`/past-papers/${paper1Id}`}
                style={{
                  flex: 1,
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>🚀 Launch Interactive Model Paper 1</span>
              </Link>
              <a
                href={paper1Pdf}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#f4f7f6',
                  color: '#0b5e4a',
                  border: '1px solid #dce5e1',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Download size={15} />
                <span>PDF</span>
              </a>
            </div>
          </div>

          {/* Card 2: Model Paper 2 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '14px',
            padding: '1.75rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ background: '#fce7f3', color: '#9d174d', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                  Model Paper II • CRQ & ERQ Theory
                </span>
                <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 700 }}>
                  {paper2Id}
                </span>
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                Physics {activeGrade} Model Paper 2 (Theory & Numerical)
              </h3>
              <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Constructed Response Questions (Section B) and Extended Response Questions (Section C) with student notebook ruled answer lines, model responses, rubric points, and PDF split-view.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Ruled Answer Lines</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Model Solutions</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>E-Marking Feedback</span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>PDF Split View</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <Link
                href={`/past-papers/${paper2Id}`}
                style={{
                  flex: 1,
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>🚀 Launch Interactive Model Paper 2</span>
              </Link>
              <a
                href={paper2Pdf}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#f4f7f6',
                  color: '#0b5e4a',
                  border: '1px solid #dce5e1',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Download size={15} />
                <span>PDF</span>
              </a>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
