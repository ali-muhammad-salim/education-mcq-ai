'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BookOpen, FileText, Download, CheckCircle2, HelpCircle, 
  Layers, Calendar, Award, ExternalLink, ChevronDown, ChevronUp, 
  FlaskConical, ArrowLeft, Filter, Sparkles, AlertCircle, Eye,
  Maximize2, ZoomIn, Check, RotateCcw
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

// Static Data Imports
import ssc1ExactSyllabus from '../../../../data/physics/ssc1_exact_syllabus.json';
import ssc1McqsData from '../../../../data/physics/ssc1_model_mcqs.json';
import ssc1CrqsData from '../../../../data/physics/ssc1_model_crqs.json';
import ssc1PacingData from '../../../../data/physics/ssc1_pacing.json';
import ssc1PracticalsData from '../../../../data/physics/ssc1_practicals.json';

export default function SSC1PhysicsPage() {
  const [activeTab, setActiveTab] = useState<'vault' | 'syllabus' | 'mcqs' | 'crqs' | 'practicals' | 'pacing' | 'resources'>('syllabus');
  
  // Syllabus View Mode
  const [syllabusViewMode, setSyllabusViewMode] = useState<'table' | 'scan'>('table');
  const [selectedUnit, setSelectedUnit] = useState<number | 'all'>('all');
  const [syllabusSearch, setSyllabusSearch] = useState('');
  const [cognitiveFilter, setCognitiveFilter] = useState<'all' | 'R' | 'U' | 'A'>('all');

  // MCQ State
  const [mcqViewMode, setMcqViewMode] = useState<'interactive' | 'scan'>('interactive');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [mcqFilter, setMcqFilter] = useState<'all' | 'Remembering' | 'Understanding' | 'Application' | 'diagram' | 'numerical'>('all');
  const [scanPage, setScanPage] = useState<number>(2);

  // CRQ View Mode
  const [crqViewMode, setCrqViewMode] = useState<'interactive' | 'scan'>('interactive');

  // Accordion state for syllabus units in table view
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true
  });

  const toggleUnit = (uNum: number) => {
    setExpandedUnits(prev => ({ ...prev, [uNum]: !prev[uNum] }));
  };

  const handleSelectOption = (qnum: number, opt: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qnum]: opt }));
  };

  const handleToggleReveal = (qnum: number) => {
    setRevealedAnswers(prev => ({ ...prev, [qnum]: !prev[qnum] }));
  };

  // Filtered MCQs
  const filteredMcqs = ssc1McqsData.filter((q: any) => {
    if (mcqFilter === 'all') return true;
    if (mcqFilter === 'diagram') return q.isDiagram;
    if (mcqFilter === 'numerical') return q.isNumerical;
    return q.cognitiveLevel === mcqFilter;
  });

  // Filtered Units for Syllabus
  const filteredUnits = ssc1ExactSyllabus.filter((u: any) => {
    if (selectedUnit !== 'all' && u.unitNumber !== selectedUnit) return false;
    if (!syllabusSearch && cognitiveFilter === 'all') return true;
    
    // Check search and cognitive filter within subtopics
    const matchesSearch = u.name.toLowerCase().includes(syllabusSearch.toLowerCase()) ||
      u.subtopics.some((s: any) => 
        s.name.toLowerCase().includes(syllabusSearch.toLowerCase()) ||
        s.slos.some((slo: any) => 
          slo.code.toLowerCase().includes(syllabusSearch.toLowerCase()) ||
          slo.description.toLowerCase().includes(syllabusSearch.toLowerCase())
        )
      );

    const matchesCognitive = cognitiveFilter === 'all' ||
      u.subtopics.some((s: any) => s.slos.some((slo: any) => slo.cognitiveLevel === cognitiveFilter));

    return matchesSearch && matchesCognitive;
  });

  const downloadableFiles = [
    {
      title: "Physics Grade IX Dedicated Syllabus (2025)",
      badge: "Curriculum Standard",
      pages: "32 Pages",
      size: "1.6 MB",
      desc: "Clean standalone Grade 9 curriculum containing Preface, Introduction, Part I Learning Outcomes (Units 1-10), Grade 9 Practical Activities, and Scheme of Assessment.",
      url: "/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf",
      highlight: true
    },
    {
      title: "Model Examination Paper I (40 MCQs)",
      badge: "Official Paper I",
      pages: "12 Pages",
      size: "0.38 MB",
      desc: "40 Multiple Choice Questions covering all Grade 9 units with exact mark distributions, diagram items, and cognitive level ratios (Remembering, Understanding, Application).",
      url: "/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf",
      highlight: true
    },
    {
      title: "Model Examination Paper II (CRQs & ERQs)",
      badge: "Official Paper II",
      pages: "8 Pages",
      size: "0.30 MB",
      desc: "Constructed Response Questions (Section B) and Extended Response Questions (Section C) with sub-questions, calculation spaces, and mark schemes.",
      url: "/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf",
      highlight: true
    },
    {
      title: "Sample Practical Paper III (Model 2026)",
      badge: "Laboratory Exam",
      pages: "4 Pages",
      size: "0.71 MB",
      desc: "Three-stage practical examination paper: Stage I (Apparatus collection), Stage II (Observation recording table), Stage III (Temperature-time graph plotting).",
      url: "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf",
      highlight: true
    },
    {
      title: "Teacher Pacing Guide for Grade IX Physics",
      badge: "Instructional Map",
      pages: "33 Pages",
      size: "4.71 MB",
      desc: "28-Week comprehensive teaching calendar (4 periods/week, 40 mins each) with suggested formative assessments, classroom activities, and textbook alignments.",
      url: "/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf",
      highlight: true
    },
    {
      title: "Dedicated Grade IX Teaching & Learning Resources",
      badge: "Book References",
      pages: "10 Pages",
      size: "0.52 MB",
      desc: "Official book chapter concordance: PCTB Physics 9, Sindh Textbook Board, CANTAB, O-Level Abbott & Charles Chew, and PhET simulation links.",
      url: "/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-i-physics-dedicated.pdf",
      highlight: true
    }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 5rem 1rem' }}>
      {/* Navigation Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Class IX (SSC-I)', href: '/subjects/class-9/physics' },
          { label: 'Physics Complete Hub', active: true }
        ]}
      />

      {/* Official AKU-EB Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #074032 0%, #0b5e4a 60%, #11785f 100%)',
        borderRadius: '16px',
        padding: '2.5rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(11, 94, 74, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative background watermark */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-30px',
          fontSize: '12rem',
          fontWeight: 900,
          color: 'rgba(255, 255, 255, 0.04)',
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          AKU-EB
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#c9a050',
                color: '#074032',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                AGA KHAN UNIVERSITY EXAMINATION BOARD
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                SSC PART I • GRADE IX
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                SYLLABUS 2025
              </span>
            </div>
            
            <h1 style={{ color: '#ffffff', fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Physics SSC-I (Class 9)
            </h1>
            
            <p style={{ fontSize: '1.05rem', color: '#e2ece8', maxWidth: '820px', lineHeight: 1.6, margin: 0 }}>
              Complete official syllabus (Units 1 to 10 with exact Cognitive Levels R, U, A), Model Paper I (40 authentic MCQs with diagrams), Model Paper II (Section B CRQs & Section C ERQs), Sample Practical Paper III, and 28-Week Instructional Pacing Guide.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/classes/ssc-ii/physics"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '0.75rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              Switch to Grade 10 Physics →
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginTop: '2rem',
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(8px)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c9a050', fontWeight: 700, letterSpacing: '0.05em' }}>Syllabus Units</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>10 Units</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c9a050', fontWeight: 700, letterSpacing: '0.05em' }}>Learning Outcomes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>151 SLOs</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c9a050', fontWeight: 700, letterSpacing: '0.05em' }}>Model Paper I</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>40 MCQs (40 M)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c9a050', fontWeight: 700, letterSpacing: '0.05em' }}>Model Paper II</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>7 CRQs/ERQs (25 M)</div>
          </div>
        </div>
      </div>

      {/* Canonical Architecture Notice & Model Papers Spotlight */}
      <div style={{
        background: '#fef3c7',
        border: '1.5px solid #f59e0b',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🎯</span>
          <div>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.98rem' }}>
              Official Model Papers & New Academic URL Scheme
            </div>
            <div style={{ color: '#78350f', fontSize: '0.88rem' }}>
              Looking for Model Papers or Past Paper Archives? Visit the new canonical URL: <Link href="/akueb/IX/physics" style={{ fontWeight: 800, color: '#0b5e4a', textDecoration: 'underline' }}>http://localhost:3000/akueb/IX/physics</Link>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/akueb/IX/physics/model-papers"
            style={{
              background: '#0b5e4a',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            Open Model Papers Page →
          </Link>
          <Link
            href="/akueb/IX/physics/pastpapers"
            style={{
              background: '#ffffff',
              color: '#0b5e4a',
              border: '1px solid #0b5e4a',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Past Papers Archive →
          </Link>
        </div>
      </div>

      {/* Prominent Model Papers Showcase Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: '#ffffff', border: '1.5px solid #dce5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>MODEL PAPER I</span>
            <span style={{ fontSize: '0.78rem', color: '#5a7a6f', fontWeight: 600 }}>40 MCQs • 40 M</span>
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.75rem 0' }}>Multiple Choice Exam</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('mcqs')}
              style={{
                flex: 1,
                background: '#0b5e4a',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Solve Tab Below
            </button>
            <a
              href="/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f4f7f6',
                color: '#0b5e4a',
                border: '1px solid #dce5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              PDF
            </a>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #dce5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>MODEL PAPER II</span>
            <span style={{ fontSize: '0.78rem', color: '#5a7a6f', fontWeight: 600 }}>7 CRQs • 25 M</span>
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.75rem 0' }}>Constructed & Extended</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('crqs')}
              style={{
                flex: 1,
                background: '#0b5e4a',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Solve Tab Below
            </button>
            <a
              href="/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f4f7f6',
                color: '#0b5e4a',
                border: '1px solid #dce5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              PDF
            </a>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #dce5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>PRACTICAL III</span>
            <span style={{ fontSize: '0.78rem', color: '#5a7a6f', fontWeight: 600 }}>Lab Exam • 15 M</span>
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.75rem 0' }}>Sample Lab Examination</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('practicals')}
              style={{
                flex: 1,
                background: '#0b5e4a',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              View Lab Tab Below
            </button>
            <a
              href="/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f4f7f6',
                color: '#0b5e4a',
                border: '1px solid #dce5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e2ece8',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'syllabus', label: '📖 Official Syllabus (Units 1-10)', icon: BookOpen },
          { id: 'mcqs', label: '🧠 Model Paper I (40 MCQs)', icon: Award },
          { id: 'crqs', label: '✍️ Model Paper II (CRQs & ERQs)', icon: FileText },
          { id: 'practicals', label: '🔬 Practical Labs (Paper III)', icon: FlaskConical },
          { id: 'vault', label: '📥 PDF Download Vault', icon: Download },
          { id: 'pacing', label: '📅 28-Week Pacing Guide', icon: Calendar },
          { id: 'resources', label: '📚 Textbooks & PhET Links', icon: ExternalLink },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid #0b5e4a' : '3px solid transparent',
                color: isActive ? '#0b5e4a' : '#5a7a6f',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: EXACT AKU-EB SYLLABUS ================= */}
      {activeTab === 'syllabus' && (
        <div>
          {/* Header & Controls */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#0b5e4a', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    OFFICIAL SPECIFICATION
                  </span>
                  <h2 style={{ fontSize: '1.4rem', color: '#0b5e4a', margin: 0, fontWeight: 800 }}>
                    Student Learning Outcomes (Grade IX Physics)
                  </h2>
                </div>
                <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                  Exact curriculum tables matching the printed AKU-EB Syllabus document (Pages 10 to 26).
                </p>
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: '#eef4f1', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button
                  onClick={() => setSyllabusViewMode('table')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: syllabusViewMode === 'table' ? '#0b5e4a' : 'transparent',
                    color: syllabusViewMode === 'table' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <BookOpen size={16} /> Official Table View
                </button>
                <button
                  onClick={() => setSyllabusViewMode('scan')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: syllabusViewMode === 'scan' ? '#0b5e4a' : 'transparent',
                    color: syllabusViewMode === 'scan' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={16} /> Official PDF Document View
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px' }}>
                <input
                  type="text"
                  placeholder="Search topic name, SLO code (e.g., 1.1.1, Hooke's law)..."
                  value={syllabusSearch}
                  onChange={(e) => setSyllabusSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #dce5e1',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Unit Dropdown */}
              <div>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #dce5e1',
                    fontSize: '0.9rem',
                    background: '#fff',
                    color: '#2c3e38',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All 10 Units (Units 1 - 10)</option>
                  {ssc1ExactSyllabus.map((u: any) => (
                    <option key={u.unitNumber} value={u.unitNumber}>
                      Unit {u.unitNumber}. {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cognitive Level Filter */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 700, marginRight: '4px' }}>Cognitive:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'R', label: 'R (Remember)' },
                  { id: 'U', label: 'U (Understand)' },
                  { id: 'A', label: 'A (Apply)' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCognitiveFilter(c.id as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: cognitiveFilter === c.id ? '#0b5e4a' : '#dce5e1',
                      background: cognitiveFilter === c.id ? '#e6f0ed' : '#ffffff',
                      color: cognitiveFilter === c.id ? '#0b5e4a' : '#5a7a6f',
                      fontWeight: cognitiveFilter === c.id ? 800 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: OFFICIAL TABLE VIEW */}
          {syllabusViewMode === 'table' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {filteredUnits.map((unit: any) => {
                const isExpanded = expandedUnits[unit.unitNumber] !== false;
                const unitTotalSlos = unit.subtopics.reduce((acc: number, s: any) => acc + s.slos.length, 0);

                return (
                  <div
                    key={unit.unitNumber}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0b5e4a',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Unit Accordion Header */}
                    <div
                      onClick={() => toggleUnit(unit.unitNumber)}
                      style={{
                        background: '#0b5e4a',
                        color: '#ffffff',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          background: '#c9a050',
                          color: '#074032',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.05em'
                        }}>
                          UNIT {unit.unitNumber}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                          {unit.name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#d1fae5', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '12px' }}>
                          {unit.subtopics.length} Subtopics • {unitTotalSlos} SLOs • Page {unit.page}
                        </span>
                        {isExpanded ? <ChevronUp size={22} color="#ffffff" /> : <ChevronDown size={22} color="#ffffff" />}
                      </div>
                    </div>

                    {/* Table Body (Official AKU-EB Syllabus Format) */}
                    {isExpanded && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.9rem',
                          color: '#1e293b',
                          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                        }}>
                          <thead>
                            <tr style={{ background: '#f1f7f4', borderBottom: '2px solid #0b5e4a' }}>
                              <th style={{
                                width: '28%',
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: 800,
                                color: '#0b5e4a',
                                borderRight: '1px solid #dce5e1'
                              }}>
                                Topics and Sub-Topics
                              </th>
                              <th style={{
                                width: '52%',
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: 800,
                                color: '#0b5e4a',
                                borderRight: '1px solid #dce5e1'
                              }}>
                                Student Learning Outcomes
                                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#5a7a6f', marginTop: '2px', fontStyle: 'italic' }}>
                                  Students should be able to:
                                </div>
                              </th>
                              <th colSpan={3} style={{
                                width: '20%',
                                padding: '8px 12px',
                                textAlign: 'center',
                                fontWeight: 800,
                                color: '#0b5e4a',
                                borderBottom: '1px solid #dce5e1'
                              }}>
                                Cognitive level¹
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr 1.6fr',
                                  marginTop: '6px',
                                  paddingTop: '6px',
                                  borderTop: '1px solid #dce5e1',
                                  fontSize: '0.8rem',
                                  fontWeight: 800
                                }}>
                                  <span style={{ color: '#0b5e4a' }} title="Remembering">R</span>
                                  <span style={{ color: '#0b5e4a' }} title="Understanding">U</span>
                                  <span style={{ color: '#0b5e4a' }} title="Apply and beyond">A & beyond</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {unit.subtopics.map((sub: any, sIdx: number) => {
                              return sub.slos.map((slo: any, sloIdx: number) => {
                                const isFirstInSub = sloIdx === 0;
                                return (
                                  <tr
                                    key={slo.code}
                                    style={{
                                      borderBottom: '1px solid #e2ece8',
                                      background: sloIdx % 2 === 0 ? '#ffffff' : '#fafcfb'
                                    }}
                                  >
                                    {/* Subtopic Column - Rendered on first row with rowspan */}
                                    {isFirstInSub ? (
                                      <td
                                        rowSpan={sub.slos.length}
                                        style={{
                                          padding: '14px 16px',
                                          verticalAlign: 'top',
                                          borderRight: '1px solid #dce5e1',
                                          background: '#fcfdfd'
                                        }}
                                      >
                                        <div style={{ fontWeight: 800, color: '#0b5e4a', fontSize: '0.95rem', marginBottom: '4px' }}>
                                          {sub.subNumber} {sub.name}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#777', fontWeight: 600 }}>
                                          {sub.slos.length} Outcome{sub.slos.length > 1 ? 's' : ''}
                                        </span>
                                      </td>
                                    ) : null}

                                    {/* SLO Outcome Description Column */}
                                    <td style={{
                                      padding: '10px 16px',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid #dce5e1'
                                    }}>
                                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{
                                          fontFamily: 'monospace',
                                          fontWeight: 800,
                                          fontSize: '0.82rem',
                                          color: '#0b5e4a',
                                          background: '#e6f0ed',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {slo.code}
                                        </span>
                                        <div style={{ flexGrow: 1, lineHeight: 1.55 }}>
                                          {slo.description}
                                          {slo.isPractical && (
                                            <span style={{
                                              marginLeft: '8px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              fontSize: '0.72rem',
                                              fontWeight: 700,
                                              background: '#fef3c7',
                                              color: '#92400e',
                                              padding: '1px 6px',
                                              borderRadius: '3px'
                                            }}>
                                              🔬 Practical Activity
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Cognitive Level R */}
                                    <td style={{
                                      width: '6.5%',
                                      padding: '10px 4px',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      borderRight: '1px solid #e2ece8',
                                      fontWeight: 800,
                                      fontSize: '1.2rem',
                                      color: '#0b5e4a'
                                    }}>
                                      {slo.levelR ? '*' : ''}
                                    </td>

                                    {/* Cognitive Level U */}
                                    <td style={{
                                      width: '6.5%',
                                      padding: '10px 4px',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      borderRight: '1px solid #e2ece8',
                                      fontWeight: 800,
                                      fontSize: '1.2rem',
                                      color: '#0b5e4a'
                                    }}>
                                      {slo.levelU ? '*' : ''}
                                    </td>

                                    {/* Cognitive Level A & Beyond */}
                                    <td style={{
                                      width: '7%',
                                      padding: '10px 4px',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      fontWeight: 800,
                                      fontSize: slo.levelA ? (slo.cognitiveDetailed !== 'A' && slo.cognitiveDetailed !== '*' ? '0.85rem' : '1.2rem') : '0.85rem',
                                      color: slo.levelA ? '#c9a050' : '#888'
                                    }}>
                                      {slo.levelA ? (slo.cognitiveDetailed || '*') : ''}
                                    </td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>

                        {/* Official Footnotes Matching PDF */}
                        <div style={{
                          padding: '10px 16px',
                          background: '#f8faf9',
                          borderTop: '1px solid #dce5e1',
                          fontSize: '0.78rem',
                          color: '#5a7a6f',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '1.5rem',
                          lineHeight: 1.4
                        }}>
                          <div>
                            <strong>¹ Cognitive Legend:</strong> <strong>R</strong> = Remember, <strong>U</strong> = Understand, <strong>A</strong> = Apply and beyond [Apply (A), Analyse (An), Evaluate (E), Create (C)]
                          </div>
                          <div>
                            <strong>² FA:</strong> Formative Assessment, not assessed under examination conditions.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: OFFICIAL PDF SCAN EMBED */}
          {syllabusViewMode === 'scan' && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #0b5e4a',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0b5e4a', fontSize: '1.2rem', fontWeight: 800 }}>
                    Official AKU-EB Syllabus Document Viewer (Class IX)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#5a7a6f' }}>
                    Authentic document with exact Aga Khan University typography, tables, and curriculum specifications.
                  </p>
                </div>
                <a
                  href="/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#0b5e4a',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Maximize2 size={16} /> Open PDF in New Window
                </a>
              </div>

              {/* Embedded Document Frame */}
              <div style={{
                width: '100%',
                height: '800px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #dce5e1'
              }}>
                <iframe
                  src="/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf#toolbar=1&navpanes=1"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Official AKU-EB Grade 9 Physics Syllabus"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MODEL PAPER I (40 MCQS) ================= */}
      {activeTab === 'mcqs' && (
        <div>
          {/* Header & Mode Switcher */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#0b5e4a', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    PAPER I
                  </span>
                  <h2 style={{ fontSize: '1.4rem', color: '#0b5e4a', margin: 0, fontWeight: 800 }}>
                    Official Model Examination Paper I (40 MCQs)
                  </h2>
                </div>
                <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                  Time allowed: 1 hour 10 minutes • Total Marks: 40 • Exact mathematical symbols and diagram questions.
                </p>
              </div>

              {/* View Switcher */}
              <div style={{ display: 'flex', background: '#eef4f1', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button
                  onClick={() => setMcqViewMode('interactive')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mcqViewMode === 'interactive' ? '#0b5e4a' : 'transparent',
                    color: mcqViewMode === 'interactive' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Award size={16} /> Interactive Practice Mode
                </button>
                <button
                  onClick={() => setMcqViewMode('scan')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mcqViewMode === 'scan' ? '#0b5e4a' : 'transparent',
                    color: mcqViewMode === 'scan' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={16} /> High-DPI Exam Booklet View
                </button>
              </div>
            </div>

            {/* MCQ Filter Buttons */}
            {mcqViewMode === 'interactive' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All 40 MCQs' },
                  { id: 'diagram', label: 'Diagram Items 🖼️' },
                  { id: 'numerical', label: 'Numericals 🔢' },
                  { id: 'Remembering', label: 'Remembering (R)' },
                  { id: 'Understanding', label: 'Understanding (U)' },
                  { id: 'Application', label: 'Application (A)' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setMcqFilter(f.id as any)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: mcqFilter === f.id ? '#0b5e4a' : '#dce5e1',
                      background: mcqFilter === f.id ? '#0b5e4a' : '#fff',
                      color: mcqFilter === f.id ? '#fff' : '#2c3e38',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INTERACTIVE MODE: AKU-EB OFFICIAL EXAM BOOKLET STYLING */}
          {mcqViewMode === 'interactive' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1.5rem', alignItems: 'start' }}>
              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Official Exam Paper Candidate Header Box */}
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #0b5e4a',
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem',
                  fontFamily: 'Georgia, "Times New Roman", serif'
                }}>
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.08em', color: '#0b5e4a' }}>
                      AGA KHAN UNIVERSITY EXAMINATION BOARD
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                      SECONDARY SCHOOL CERTIFICATE EXAMINATION 2024
                    </div>
                    <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#475569' }}>
                      Physics Paper I (Multiple Choice Questions) — Grade IX
                    </div>
                  </div>

                  {/* Candidate Instructions Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    lineHeight: 1.5
                  }}>
                    <strong>INSTRUCTIONS TO CANDIDATES:</strong>
                    <ol style={{ margin: '4px 0 0 0', paddingLeft: '1.25rem' }}>
                      <li>Read each question carefully.</li>
                      <li>Answer the questions on the separate answer sheet provided (or use the interactive sheet on the right).</li>
                      <li>Mark only ONE answer choice for each question.</li>
                      <li>Scientific calculators and mathematical tables are allowed.</li>
                    </ol>
                  </div>
                </div>

                {/* Question Cards */}
                {filteredMcqs.map((q: any) => {
                  const selected = selectedAnswers[q.questionNumber];
                  const isRevealed = revealedAnswers[q.questionNumber];

                  return (
                    <div
                      key={q.questionNumber}
                      id={`question-${q.questionNumber}`}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        fontFamily: 'Georgia, "Times New Roman", serif'
                      }}
                    >
                      {/* Question Meta Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            background: '#0b5e4a',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            minWidth: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'Inter, sans-serif'
                          }}>
                            {q.questionNumber}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#0b5e4a',
                            background: '#e6f0ed',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'Inter, sans-serif'
                          }}>
                            {q.cognitiveLevel}
                          </span>
                          {q.isNumerical && (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#92400e',
                              background: '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                              Numerical
                            </span>
                          )}
                          {q.isDiagram && (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#1e40af',
                              background: '#dbeafe',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                              Diagram Item
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                          Page {q.pageNumber} • 1.0 Mark
                        </span>
                      </div>

                      {/* Question Stem (Dicto Same Typography) */}
                      <p style={{
                        fontSize: '1.1rem',
                        color: '#1e293b',
                        fontWeight: 500,
                        lineHeight: 1.6,
                        margin: '0 0 1rem 0'
                      }}>
                        {q.stem}
                      </p>

                      {/* Embedded Vector Diagram Crop if this is a Diagram Question */}
                      {q.isDiagram && (
                        <div style={{
                          margin: '0.75rem 0 1.25rem 0',
                          padding: '0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                            FIGURE / DIAGRAM REFERENCE (PAGE {q.pageNumber}):
                          </div>
                          {/* Display the high-DPI page scan snippet */}
                          <div style={{ maxHeight: '280px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={`/materials/scans/ssc1_p1_page_${q.pageNumber}.png`}
                              alt={`Question ${q.questionNumber} Diagram from Official Exam`}
                              style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Multiple Choice Options (A, B, C, D) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        {Object.entries(q.choices || {}).map(([optKey, optVal]: [string, any]) => {
                          const isSelected = selected === optKey;
                          return (
                            <div
                              key={optKey}
                              onClick={() => handleSelectOption(q.questionNumber, optKey)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                                background: isSelected ? '#e6f0ed' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: isSelected ? '#0b5e4a' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#0b5e4a',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'Inter, sans-serif'
                              }}>
                                {optKey}
                              </span>
                              <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: isSelected ? 700 : 400 }}>
                                {optVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer: Toggle Explanation / Reveal Key */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.75rem',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        <button
                          onClick={() => handleToggleReveal(q.questionNumber)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0b5e4a',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <HelpCircle size={16} />
                          {isRevealed ? 'Hide Explanation & Key' : 'Reveal Answer Key'}
                        </button>

                        <a
                          href={`/materials/scans/ssc1_p1_page_${q.pageNumber}.png`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#64748b',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={14} /> View Original Scan (Page {q.pageNumber})
                        </a>
                      </div>

                      {/* Answer Key Reveal Banner */}
                      {isRevealed && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          color: '#166534',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          <strong>AKU-EB Examination Key:</strong> Practice selection saved. Reference Chapter from PCTB Physics 9 & Student Learning Outcomes standard.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sticky OMR Bubble Sheet Simulator on Right */}
              <div style={{
                position: 'sticky',
                top: '20px',
                background: '#ffffff',
                border: '1.5px solid #0b5e4a',
                borderRadius: '10px',
                padding: '1.25rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ borderBottom: '1px solid #e2ece8', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a', letterSpacing: '0.05em' }}>
                    AKU-EB RESPONSE SHEET
                  </div>
                  <h4 style={{ margin: '2px 0 0 0', fontSize: '1rem', color: '#1e293b', fontWeight: 800 }}>
                    OMR Answer Bubbles
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {Object.keys(selectedAnswers).length} of 40 Answered
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: '#0b5e4a',
                    width: `${(Object.keys(selectedAnswers).length / 40) * 100}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>

                {/* Scrollable Bubble Rows (1 to 40) */}
                <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
                    const sel = selectedAnswers[num];
                    return (
                      <div
                        key={num}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 0',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <a
                          href={`#question-${num}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: sel ? '#0b5e4a' : '#64748b',
                            textDecoration: 'none',
                            width: '24px'
                          }}
                        >
                          {num}.
                        </a>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleSelectOption(num, opt)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: sel === opt ? '2px solid #0b5e4a' : '1px solid #cbd5e1',
                                background: sel === opt ? '#0b5e4a' : '#ffffff',
                                color: sel === opt ? '#ffffff' : '#475569',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => setSelectedAnswers({})}
                  style={{
                    width: '100%',
                    marginTop: '1rem',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #dce5e1',
                    background: '#f8faf9',
                    color: '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={14} /> Reset Answer Sheet
                </button>
              </div>
            </div>
          )}

          {/* SCAN MODE: HIGH-DPI PAGE-BY-PAGE BOOKLET VIEWER */}
          {mcqViewMode === 'scan' && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #0b5e4a',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0b5e4a', fontSize: '1.25rem', fontWeight: 800 }}>
                    Official Model Paper I High-DPI Booklet (Page {scanPage} of 12)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#5a7a6f' }}>
                    Authentic 300-DPI high-resolution rasterization of the original AKU-EB examination booklet.
                  </p>
                </div>

                {/* Page Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    disabled={scanPage <= 1}
                    onClick={() => setScanPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #dce5e1',
                      background: scanPage <= 1 ? '#f5f5f5' : '#ffffff',
                      color: '#0b5e4a',
                      fontWeight: 700,
                      cursor: scanPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Previous Page
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0b5e4a' }}>
                    Page {scanPage} / 12
                  </span>
                  <button
                    disabled={scanPage >= 12}
                    onClick={() => setScanPage(p => Math.min(12, p + 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #dce5e1',
                      background: scanPage >= 12 ? '#f5f5f5' : '#ffffff',
                      color: '#0b5e4a',
                      fontWeight: 700,
                      cursor: scanPage >= 12 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next Page →
                  </button>
                </div>
              </div>

              {/* Display High-DPI Page Image */}
              <div style={{
                textAlign: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                minHeight: '600px'
              }}>
                <img
                  src={`/materials/scans/ssc1_p1_page_${scanPage}.png`}
                  alt={`AKU-EB Physics Model Paper IX Page ${scanPage}`}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: MODEL PAPER II (CRQS & ERQS) ================= */}
      {activeTab === 'crqs' && (
        <div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#0b5e4a', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    PAPER II
                  </span>
                  <h2 style={{ fontSize: '1.4rem', color: '#0b5e4a', margin: 0, fontWeight: 800 }}>
                    Constructed & Extended Response Questions (CRQs & ERQs)
                  </h2>
                </div>
                <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                  Time allowed: 1 hour 50 minutes • Total Marks: 25 • Section B (Short CRQs) & Section C (Extended ERQs).
                </p>
              </div>

              <div style={{ display: 'flex', background: '#eef4f1', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button
                  onClick={() => setCrqViewMode('interactive')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: crqViewMode === 'interactive' ? '#0b5e4a' : 'transparent',
                    color: crqViewMode === 'interactive' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Interactive Questions
                </button>
                <button
                  onClick={() => setCrqViewMode('scan')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: crqViewMode === 'scan' ? '#0b5e4a' : 'transparent',
                    color: crqViewMode === 'scan' ? '#fff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Official Paper Scans (8 Pages)
                </button>
              </div>
            </div>
          </div>

          {crqViewMode === 'interactive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {ssc1CrqsData.map((q: any) => (
                <div
                  key={q.questionNumber}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        background: '#0b5e4a',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Q. {q.questionNumber}
                      </span>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#0b5e4a',
                        background: '#e6f0ed',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        {q.section}
                      </span>
                    </div>

                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: '#0b5e4a',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      (Total {q.marks} Marks)
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <div style={{
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    color: '#1e293b',
                    whiteSpace: 'pre-line',
                    marginBottom: '1.25rem'
                  }}>
                    {q.text}
                  </div>

                  {/* Embedded Page Scan for Diagram Reference */}
                  {q.isDiagram && (
                    <div style={{
                      margin: '1rem 0',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                        OFFICIAL DIAGRAM & APPARATUS REFERENCE (PAPER II, PAGE {q.pageNumber}):
                      </div>
                      <img
                        src={`/materials/scans/ssc1_p2_page_${q.pageNumber}.png`}
                        alt={`Question ${q.questionNumber} Diagram from Paper II`}
                        style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.8rem',
                    color: '#64748b'
                  }}>
                    <span>Referenced from Page {q.pageNumber} of Official Model Paper II</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {crqViewMode === 'scan' && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce5e1',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#0b5e4a', fontSize: '1.2rem', fontWeight: 800 }}>
                Complete Official Paper II Scan Book (All 8 Pages)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((pg) => (
                  <div key={pg} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                    <div style={{ padding: '8px 12px', background: '#0b5e4a', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                      Page {pg} of 8
                    </div>
                    <img
                      src={`/materials/scans/ssc1_p2_page_${pg}.png`}
                      alt={`Paper II Page ${pg}`}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: PRACTICAL LABS (PAPER III) ================= */}
      {activeTab === 'practicals' && (
        <div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0b5e4a', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              Official Practical Examination (Paper III) • Grade IX Physics
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0, fontSize: '0.9rem' }}>
              Three-stage laboratory assessment standard: Apparatus Collection & Inspection, Observation Recording, and Temperature-Time Graphical Analysis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {ssc1PracticalsData.map((prac: any) => (
              <div
                key={prac.pageNumber}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #0b5e4a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{
                  background: '#0b5e4a',
                  color: '#fff',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{prac.title}</span>
                  <span>Paper III</span>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', textAlign: 'center' }}>
                  <img
                    src={prac.pageScanUrl}
                    alt={prac.title}
                    style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: DOWNLOAD VAULT ================= */}
      {activeTab === 'vault' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '0.35rem', fontWeight: 800 }}>
              Grade 9 Physics Official Document Vault
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0 }}>
              All downloaded files have been verified, logically separated for Class IX, and formatted for high-speed direct downloading and browser viewing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {downloadableFiles.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: doc.highlight ? '1.5px solid #0b5e4a' : '1px solid #dce5e1',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: doc.highlight ? '#0b5e4a' : '#666',
                    background: doc.highlight ? '#e6f0ed' : '#f0f0f0',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    {doc.badge}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#777' }}>
                    {doc.pages} • {doc.size}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 700 }}>
                  {doc.title}
                </h3>
                
                <p style={{ fontSize: '0.9rem', color: '#5a7a6f', marginBottom: '1.5rem', flexGrow: 1, lineHeight: 1.5 }}>
                  {doc.desc}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                  <a
                    href={doc.url}
                    download
                    className="btn"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1rem',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      background: '#0b5e4a',
                      color: '#fff',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={16} /> Download
                  </a>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.6rem 1rem',
                      fontSize: '0.9rem',
                      border: '1px solid #dce5e1',
                      borderRadius: '8px',
                      color: '#0b5e4a',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={16} /> Preview
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 6: 28-WEEK PACING GUIDE ================= */}
      {activeTab === 'pacing' && (
        <div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              28-Week Instructional Pacing Guide (Grade IX Physics)
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0, fontSize: '0.9rem' }}>
              Structured weekly progression for teachers and students (4 periods per week, 40 minutes each) covering all Units 1 through 10.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {ssc1PacingData.map((week: any) => (
              <div
                key={week.weekNumber}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dce5e1',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{
                    background: '#0b5e4a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    WEEK {week.weekNumber}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 600 }}>
                    {week.periods} Periods
                  </span>
                </div>

                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: 700 }}>
                  {week.topic}
                </h4>

                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <strong>SLOs:</strong> {Array.isArray(week.slos) ? week.slos.join(', ') : week.slos}
                </div>

                {week.activities && (
                  <div style={{ fontSize: '0.82rem', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px' }}>
                    <strong>Activities:</strong> {week.activities}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 7: TEXTBOOKS & RESOURCES ================= */}
      {activeTab === 'resources' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '0.35rem', fontWeight: 800 }}>
              Official Textbook Alignments & Digital Simulations
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0 }}>
              Recommended key textbooks and online interactive resources as documented in the AKU-EB Physics Resource Guide 2025.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#ffffff', border: '2px solid #0b5e4a', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 800, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                PRIMARY KEY TEXTBOOK
              </span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                Physics 9 (Punjab Curriculum and Textbook Board, Lahore)
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#5a7a6f', marginBottom: '1rem', lineHeight: 1.5 }}>
                Official core textbook designated by AKU-EB for Grade IX Physics syllabus examination. Covers all standard units with worked examples.
              </p>
              <div style={{ fontSize: '0.85rem', color: '#333', background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
                Edition: 2023 Revision • Available across all affiliated schools
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #dce5e1', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ background: '#fdf8ec', color: '#c9a050', fontWeight: 800, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                ADDITIONAL RECOMMENDED BOOKS
              </span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                O-Level & Secondary Reference Works
              </h3>
              <ul style={{ fontSize: '0.9rem', color: '#444', paddingLeft: '1.2rem', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                <li><strong>The World of Physics (2nd Ed)</strong> — John Avison (Nelson)</li>
                <li><strong>Physics A Course of O Level (2nd Ed)</strong> — Charles Chew (Marshall Cavendish)</li>
                <li><strong>Physics</strong> — A. F. Abbott (Heinemann Educational)</li>
                <li><strong>Model Textbook of Physics Grade 9</strong> — CANTAB Publisher, Lahore</li>
                <li><strong>The Textbook of Physics Class IX</strong> — Sindh Textbook Board, Jamshoro</li>
              </ul>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #dce5e1', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ background: '#edf6ff', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                INTERACTIVE LABS & SIMULATIONS
              </span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                Online Simulation Tools
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                <a
                  href="https://phet.colorado.edu/en/simulations/filter?subjects=physics&type=html"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: '#f5f9fc', borderRadius: '6px', color: '#0b5e4a', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <span>PhET Interactive Simulations (Colorado)</span>
                  <ExternalLink size={16} />
                </a>
                <a
                  href="https://www.physicsclassroom.com/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: '#f5f9fc', borderRadius: '6px', color: '#0b5e4a', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <span>The Physics Classroom Tutorials</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
