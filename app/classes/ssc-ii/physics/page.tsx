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
import MathText from '@/components/MathText';

// Static Data Imports
import ssc2ExactSyllabus from '../../../../data/physics/ssc2_exact_syllabus.json';
import ssc2McqsData from '../../../../data/physics/ssc2_model_mcqs.json';
import ssc2CrqsData from '../../../../data/physics/ssc2_model_crqs.json';
import ssc2PacingData from '../../../../data/physics/ssc2_pacing.json';

export default function SSC2PhysicsPage() {
  const [activeTab, setActiveTab] = useState<'vault' | 'syllabus' | 'mcqs' | 'crqs' | 'pacing' | 'resources'>('syllabus');
  
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

  // Accordion state for syllabus units
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({
    11: true, 12: true, 13: true, 14: true, 15: true, 16: true, 17: true, 18: true, 19: true, 20: true
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
  const filteredMcqs = ssc2McqsData.filter((q: any) => {
    if (mcqFilter === 'all') return true;
    if (mcqFilter === 'diagram') return q.isDiagram;
    if (mcqFilter === 'numerical') return q.isNumerical;
    return q.cognitiveLevel === mcqFilter;
  });

  // Filtered Units for Syllabus (Units 11-20)
  const filteredUnits = ssc2ExactSyllabus.filter((u: any) => {
    if (selectedUnit !== 'all' && u.unitNumber !== selectedUnit) return false;
    if (!syllabusSearch && cognitiveFilter === 'all') return true;
    
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
      title: "Physics Grade X Dedicated Syllabus (2025)",
      badge: "Curriculum Standard",
      pages: "34 Pages",
      size: "1.7 MB",
      desc: "Clean standalone Grade 10 curriculum containing Preface, Introduction, Part II Learning Outcomes (Units 11 to 20), Grade 10 Practical Activities, and Scheme of Assessment.",
      url: "/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf",
      highlight: true
    },
    {
      title: "Model Examination Paper I (40 MCQs)",
      badge: "Official Paper I",
      pages: "12 Pages",
      size: "0.45 MB",
      desc: "40 Multiple Choice Questions covering all Grade 10 units with exact mark distributions, diagram items, circuit layouts, and cognitive level ratios.",
      url: "/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf",
      highlight: true
    },
    {
      title: "Model Examination Paper II (CRQs & ERQs)",
      badge: "Official Paper II",
      pages: "8 Pages",
      size: "0.26 MB",
      desc: "Constructed Response Questions (Section B) and Extended Response Questions (Section C) with sub-questions, calculation spaces, and mark schemes.",
      url: "/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf",
      highlight: true
    },
    {
      title: "Teacher Pacing Guide for Grade X Physics",
      badge: "Instructional Map",
      pages: "38 Pages",
      size: "6.86 MB",
      desc: "28-Week comprehensive teaching calendar (4 periods/week, 40 mins each) with suggested formative assessments, classroom activities, and textbook alignments.",
      url: "/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf",
      highlight: true
    },
    {
      title: "Dedicated Grade X Teaching & Learning Resources",
      badge: "Book References",
      pages: "10 Pages",
      size: "0.52 MB",
      desc: "Official book chapter concordance: PCTB Physics 10, Sindh Textbook Board, CANTAB, O-Level Abbott & Charles Chew, and PhET simulation links.",
      url: "/materials/ssc/physics/ssc-2/resources-guide-2025-ssc-ii-physics-dedicated.pdf",
      highlight: true
    }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 5rem 1rem' }}>
      {/* Navigation Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Class X (SSC-II)', href: '/subjects/class-10/physics' },
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
                SSC PART II • GRADE X
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
              Physics SSC-II (Class 10)
            </h1>
            
            <p style={{ fontSize: '1.05rem', color: '#e2ece8', maxWidth: '820px', lineHeight: 1.6, margin: 0 }}>
              Complete official syllabus (Units 11 to 20 with exact Cognitive Levels R, U, A), Model Paper I (40 authentic MCQs with diagrams), Model Paper II (Section B CRQs & Section C ERQs), and 28-Week Instructional Pacing Guide.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/classes/ssc-i/physics"
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
              ← Switch to Grade 9 Physics
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
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>10 Units (11-20)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c9a050', fontWeight: 700, letterSpacing: '0.05em' }}>Learning Outcomes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>186 SLOs</div>
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
          { id: 'syllabus', label: '📖 Official Syllabus (Units 11-20)', icon: BookOpen },
          { id: 'mcqs', label: '🧠 Model Paper I (40 MCQs)', icon: Award },
          { id: 'crqs', label: '✍️ Model Paper II (CRQs & ERQs)', icon: FileText },
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

      {/* ================= TAB 1: EXACT AKU-EB SYLLABUS (UNITS 11-20) ================= */}
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
                    Student Learning Outcomes (Grade X Physics • Units 11 to 20)
                  </h2>
                </div>
                <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                  Exact curriculum tables matching the printed AKU-EB Syllabus document (Pages 27 to 46).
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
                  placeholder="Search topic name, SLO code (e.g., 16.1.1, D.C. Circuits, Ohm's law)..."
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
                  <option value="all">All 10 Units (Units 11 - 20)</option>
                  {ssc2ExactSyllabus.map((u: any) => (
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
                    Official AKU-EB Syllabus Document Viewer (Class X)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#5a7a6f' }}>
                    Authentic document with exact Aga Khan University typography, tables, and curriculum specifications.
                  </p>
                </div>
                <a
                  href="/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf"
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

              <div style={{
                width: '100%',
                height: '800px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #dce5e1'
              }}>
                <iframe
                  src="/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf#toolbar=1&navpanes=1"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Official AKU-EB Grade 10 Physics Syllabus"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MODEL PAPER I (40 MCQS) ================= */}
      {activeTab === 'mcqs' && (
        <div>
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
                    Official Model Examination Paper I (Grade 10 • 40 MCQs)
                  </h2>
                </div>
                <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                  Time allowed: 1 hour 10 minutes • Total Marks: 40 • Units 11 to 20 with diagrams and circuits.
                </p>
              </div>

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

            {mcqViewMode === 'interactive' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All 40 MCQs' },
                  { id: 'diagram', label: 'Diagram / Circuit Items 🖼️' },
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

          {/* INTERACTIVE MODE */}
          {mcqViewMode === 'interactive' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Exam Booklet Candidate Header */}
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
                      Physics Paper I (Multiple Choice Questions) — Grade X
                    </div>
                  </div>

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

                      <div style={{
                        fontSize: '1.1rem',
                        color: '#1e293b',
                        fontWeight: 500,
                        lineHeight: 1.6,
                        margin: '0 0 1rem 0'
                      }}>
                        <MathText text={q.stem} />
                      </div>

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
                            FIGURE / CIRCUIT REFERENCE (PAGE {q.pageNumber}):
                          </div>
                          <div style={{ maxHeight: '280px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={`/materials/scans/ssc2_p1_page_${q.pageNumber}.png`}
                              alt={`Question ${q.questionNumber} Diagram from Official Exam`}
                              style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          </div>
                        </div>
                      )}

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        {Object.entries((q.options || q.choices || {}) as Record<string, string>).map(([optKey, optVal]: [string, any]) => {
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
                                fontFamily: 'Inter, sans-serif',
                                flexShrink: 0
                              }}>
                                {optKey}
                              </span>
                              <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: isSelected ? 700 : 400, flexGrow: 1 }}>
                                <MathText text={String(optVal)} />
                              </span>
                            </div>
                          );
                        })}
                      </div>

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
                          href={`/materials/scans/ssc2_p1_page_${q.pageNumber}.png`}
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
                          <strong>AKU-EB Verified Key: Option {q.correctOption || 'A'}</strong>
                          {q.explanation && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.86rem', color: '#14532d' }}>
                              <MathText text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* OMR Bubble Sheet */}
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

                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: '#0b5e4a',
                    width: `${(Object.keys(selectedAnswers).length / 40) * 100}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>

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

          {/* SCAN MODE */}
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
                    Official Model Paper I High-DPI Booklet (Grade X • Page {scanPage} of 12)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#5a7a6f' }}>
                    Authentic 300-DPI high-resolution rasterization of the original AKU-EB examination booklet.
                  </p>
                </div>

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

              <div style={{
                textAlign: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                minHeight: '600px'
              }}>
                <img
                  src={`/materials/scans/ssc2_p1_page_${scanPage}.png`}
                  alt={`AKU-EB Physics Model Paper X Page ${scanPage}`}
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
                    Constructed & Extended Response Questions (Grade 10 • CRQs & ERQs)
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
              {ssc2CrqsData.map((q: any) => (
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

                  <div style={{
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    color: '#1e293b',
                    whiteSpace: 'pre-line',
                    marginBottom: '1.25rem'
                  }}>
                    {q.text}
                  </div>

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
                        OFFICIAL DIAGRAM & CIRCUIT REFERENCE (PAPER II, PAGE {q.pageNumber}):
                      </div>
                      <img
                        src={`/materials/scans/ssc2_p2_page_${q.pageNumber}.png`}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((pg) => (
                  <div key={pg} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                    <div style={{ padding: '8px 12px', background: '#0b5e4a', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                      Page {pg} of 8
                    </div>
                    <img
                      src={`/materials/scans/ssc2_p2_page_${pg}.png`}
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

      {/* ================= TAB 4: DOWNLOAD VAULT ================= */}
      {activeTab === 'vault' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '0.35rem', fontWeight: 800 }}>
              Grade 10 Physics Official Document Vault
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0 }}>
              All downloaded files have been verified, logically separated for Class X, and formatted for high-speed direct downloading and browser viewing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
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

      {/* ================= TAB 5: 28-WEEK PACING GUIDE ================= */}
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
              28-Week Instructional Pacing Guide (Grade X Physics)
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0, fontSize: '0.9rem' }}>
              Structured weekly progression for teachers and students (4 periods per week, 40 minutes each) covering all Units 11 through 20.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
            {ssc2PacingData.map((week: any) => (
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

      {/* ================= TAB 6: TEXTBOOKS & RESOURCES ================= */}
      {activeTab === 'resources' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '0.35rem', fontWeight: 800 }}>
              Official Textbook Alignments & Digital Simulations (Class 10)
            </h2>
            <p style={{ color: '#5a7a6f', margin: 0 }}>
              Recommended key textbooks and online interactive resources as documented in the AKU-EB Physics Resource Guide 2025.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#ffffff', border: '2px solid #0b5e4a', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 800, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                PRIMARY KEY TEXTBOOK
              </span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                Physics 10 (Punjab Curriculum and Textbook Board, Lahore)
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#5a7a6f', marginBottom: '1rem', lineHeight: 1.5 }}>
                Official core textbook designated by AKU-EB for Grade X Physics syllabus examination. Covers Units 11 to 20 with worked examples and exercise problems.
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
                <li><strong>Model Textbook of Physics Grade 10</strong> — CANTAB Publisher, Lahore</li>
                <li><strong>The Textbook of Physics Class X</strong> — Sindh Textbook Board, Jamshoro</li>
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
