'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight,
  RotateCcw, Eye, Sparkles, Filter, BookOpen, Layers,
  Clock, Calendar, Flame, Zap, Check, ChevronRight, FileText
} from 'lucide-react';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import { SubjectMeta } from '@/lib/subjectMetadata';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import past2025 from '@/data/physics/ssc1_2025_past_mcqs.json';
import past2024 from '@/data/physics/ssc1_2024_past_mcqs.json';
import { mcqCategories, type McqCategory } from '@/lib/mcqCategories';
import {
  annualOriginalReference,
  annualCurrentMapping,
  annual2024OriginalReference,
  annual2024CurrentMapping,
} from '@/lib/legacyPaperEvidence';
import QuestionSource from '@/components/QuestionSource';
import TakeQuizModal from '@/components/TakeQuizModal';
import { smartMatch } from '@/lib/smartSearch';

interface Props {
  initialCategory?: McqCategory;
  useReviewedLegacy?: boolean;
  annualQuestions?: any[];
  mappedChapters?:{id:string;name:string;questions:any[]}[];
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  questions: any[];
}

interface ChapterDef {
  unitNumber: number;
  name: string;
  slug: string;
  topics: string;
  qRange: [number, number];
  pastPaperCount: number;
}

const CLASS_IX_UNITS: ChapterDef[] = [
  {
    unitNumber: 1,
    name: 'Measurement',
    slug: 'measurement',
    topics: 'Physical Quantities, SI Units, Prefixes, Scientific Notation, Scalars & Vectors, Vernier Callipers, Screw Gauge, Significant Figures',
    qRange: [1, 5],
    pastPaperCount: 28
  },
  {
    unitNumber: 2,
    name: 'Kinematics',
    slug: 'kinematics',
    topics: 'Rest & Motion, Distance & Displacement, Speed & Velocity, Acceleration, Distance-Time & Speed-Time Graphs, Motion due to Gravity',
    qRange: [6, 9],
    pastPaperCount: 32
  },
  {
    unitNumber: 3,
    name: 'Dynamics',
    slug: 'dynamics',
    topics: 'Mass & Weight, Contact & Non-Contact Forces, Newton Laws of Motion, Momentum & Impulse, Friction, Uniform Circular Motion',
    qRange: [10, 14],
    pastPaperCount: 35
  },
  {
    unitNumber: 4,
    name: 'Turning Effect of Forces',
    slug: 'turning-effect-of-forces',
    topics: 'Parallel Forces, Moment of a Force (Torque), Principle of Moments, Centre of Gravity, Couple, Equilibrium & Stability',
    qRange: [15, 18],
    pastPaperCount: 24
  },
  {
    unitNumber: 5,
    name: 'Deformation of Solids ( & Historical Gravitation)',
    slug: 'deformation-of-solids',
    topics: 'Elasticity, Hooke Law (F = kx), Spring Constant, Load-Extension Graphs & Limit of Proportionality (plus 2023 Model Gravitation items)',
    qRange: [19, 22],
    pastPaperCount: 20
  },
  {
    unitNumber: 6,
    name: 'Work, Energy and Power',
    slug: 'work-energy-and-power',
    topics: 'Work (W = Fd), Kinetic & Gravitational Potential Energy, Conservation of Energy, Renewable & Non-Renewable Sources, Efficiency, Power',
    qRange: [23, 27],
    pastPaperCount: 30
  },
  {
    unitNumber: 7,
    name: 'Pressure',
    slug: 'pressure',
    topics: 'Density, Pressure (P = F/A), Atmospheric Pressure & Barometer, Hydrostatic Pressure in Liquids (P = ρgh), Pascal Law & Hydraulic Lift',
    qRange: [28, 32],
    pastPaperCount: 29
  },
  {
    unitNumber: 8,
    name: 'Thermal Physics',
    slug: 'thermal-physics',
    topics: 'Kinetic Molecular Theory, Internal Energy, Specific Heat Capacity, Latent Heat of Fusion & Vaporisation, Evaporation, Thermometers',
    qRange: [33, 36],
    pastPaperCount: 22
  },
  {
    unitNumber: 9,
    name: 'Transfer of Thermal Energy',
    slug: 'transfer-of-thermal-energy',
    topics: 'Thermal Conduction, Convection Currents, Thermal Radiation, Good & Bad Emitters/Absorbers, Vacuum Flask, Greenhouse Effect',
    qRange: [37, 40],
    pastPaperCount: 20
  },
  {
    unitNumber: 10,
    name: 'Nature of Science',
    slug: 'nature-of-science',
    topics: 'Objectives of Physics, Sub-Fields of Physics, Hypothesis, Theory & Law, Scientific Method, Science, Technology & Engineering',
    qRange: [41, 41],
    pastPaperCount: 5
  }
];

const CLASS_X_UNITS: ChapterDef[] = [
  {
    unitNumber: 11,
    name: 'Wave Motion',
    slug: 'wave-motion',
    topics: 'Oscillatory Motion, Simple Pendulum, Transverse & Longitudinal Waves, Wave Equation (v = fλ), Ripple Tank Reflection, Refraction & Diffraction',
    qRange: [1, 4],
    pastPaperCount: 30
  },
  {
    unitNumber: 12,
    name: 'Sound',
    slug: 'sound',
    topics: 'Nature & Propagation of Sound, Loudness, Pitch, Quality & Intensity, Speed of Sound, Echo Calculations, Ultrasound & Noise Pollution',
    qRange: [5, 8],
    pastPaperCount: 25
  },
  {
    unitNumber: 13,
    name: 'Geometrical Optics',
    slug: 'geometrical-optics',
    topics: 'Reflection & Spherical Mirrors, Refraction & Snell Law, Dispersion, Total Internal Reflection & Optical Fibres, Thin Lenses & Eye Defects',
    qRange: [9, 13],
    pastPaperCount: 36
  },
  {
    unitNumber: 14,
    name: 'Electrostatics',
    slug: 'electrostatics',
    topics: 'Electric Charge, Gold-Leaf Electroscope, Coulomb Law, Electrostatic Induction, Electric Field & Potential, Applications & Lightning',
    qRange: [14, 17],
    pastPaperCount: 32
  },
  {
    unitNumber: 15,
    name: 'Electric Current',
    slug: 'electric-current',
    topics: 'Conventional Current, Potential Difference & e.m.f., Ohm Law, Resistance & Resistivity, Electrical Power & Joule Law, AC & Safety',
    qRange: [15, 20],
    pastPaperCount: 38
  },
  {
    unitNumber: 16,
    name: 'D.C. Circuits',
    slug: 'dc-circuits',
    topics: 'Series & Parallel Resistor Combinations, Equivalent Resistance, Circuit Diagrams, Potential Divider, Thermistor & LDR',
    qRange: [18, 21],
    pastPaperCount: 24
  },
  {
    unitNumber: 17,
    name: 'Magnetism and Electromagnetism',
    slug: 'magnetism-and-electromagnetism',
    topics: 'Domain Theory, Magnetic Field Lines, Field of Straight Conductor & Solenoid, Force on Conductor, Fleming Left-Hand Rule, DC Motor',
    qRange: [23, 26],
    pastPaperCount: 30
  },
  {
    unitNumber: 18,
    name: 'Electromagnetic Induction',
    slug: 'electromagnetic-induction',
    topics: 'Faraday Law, Lenz Law, Fleming Right-Hand Rule, AC Generator, Mutual Induction, Step-Up/Step-Down Transformers & Grid Transmission',
    qRange: [22, 24],
    pastPaperCount: 22
  },
  {
    unitNumber: 19,
    name: 'Electromagnetic Waves and Electronics',
    slug: 'electromagnetic-waves-and-electronics',
    topics: 'Electromagnetic Spectrum, Thermionic Emission, Cathode Ray Oscilloscope (CRO), Analogue & Digital Signals, Logic Gates & Truth Tables',
    qRange: [27, 35],
    pastPaperCount: 22
  },
  {
    unitNumber: 20,
    name: 'Atomic and Nuclear Physics',
    slug: 'atomic-and-nuclear-physics',
    topics: 'Rutherford Nuclear Model, Isotopes, Natural Radioactivity (Alpha, Beta, Gamma), Half-Life, Nuclear Fission & Fusion, Radiation Safety',
    qRange: [36, 40],
    pastPaperCount: 26
  }
];

function belongsToUnit(q: any, unit: ChapterDef, isAnnual: boolean): boolean {
  if (isAnnual) {
    if (Number(q.unitNumber) === unit.unitNumber) return true;
    return String(q.slo || '').startsWith(unit.unitNumber + '.');
  }
  if (typeof q.unitNumber === 'number') {
    return q.unitNumber === unit.unitNumber;
  }
  const qNum = Number(q.questionNumber || 0);
  return qNum >= unit.qRange[0] && qNum <= unit.qRange[1];
}

export default function McqsClient({ board, classDef, meta, baseUrl, questions,mappedChapters=[],initialCategory,useReviewedLegacy=false,annualQuestions=past2025 }: Props) {
  const [mappedChapter,setMappedChapter]=useState<string|null>(null);
  // Navigation Track State: 'hub' (Category Directory) | 'practice'
  const [currentView, setCurrentView] = useState<'hub' | 'practice'>('hub');
  const [hubTab] = useState<'chapter_wise' | 'past_papers' | 'full_book' | 'cognitive'>(initialCategory || (questions.length?'chapter_wise':'past_papers'));
  const [selectedUnit, setSelectedUnit] = useState<ChapterDef | null>(null);
  const [practiceTitle, setPracticeTitle] = useState<string>('All Questions Practice');

  // Interactive Quiz / Practice States
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [cognitiveFilter, setCognitiveFilter] = useState<'all' | 'Remembering' | 'Understanding' | 'Application' | 'diagram'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizModalOpen, setQuizModalOpen] = useState(false);

  const unitsList = questions.length?(classDef.roman === 'IX' ? CLASS_IX_UNITS : CLASS_X_UNITS):[];

  const [practiceSource, setPracticeSource] = useState<'model' | 'annual' | 'annual2024' | 'annual_all'>('model');
  const fullPapers = [
    ...(questions.length?[{ title: 'Physics Model Paper I', desc: 'Practice the available model-paper MCQs with answer feedback and 2025 syllabus SLO mappings.', items: questions.length, time: 'Custom timer', badge: 'MODEL PAPER', source: 'model' as const }]:[]),
    ...(questions.length && classDef.roman === 'IX' ? [
      { title: 'Annual Examination 2025 — Paper I', desc: 'Original 2025 examination MCQs with official answer key and reviewed 2025 syllabus mappings.', items: past2025.length, time: 'Custom timer', badge: 'ANNUAL 2025', source: 'annual' as const },
      { title: 'Annual Examination 2024 — Paper I', desc: 'Original 2024 examination MCQs with official answer key, cropped diagrams, and 2025 syllabus mappings.', items: past2024.length, time: 'Custom timer', badge: 'ANNUAL 2024', source: 'annual2024' as const },
    ] : []),
  ];

  const mapped2025Pool = classDef.roman === 'IX'
    ? annualQuestions.map(q => ({
        ...q,
        ...annualOriginalReference(q.questionNumber),
        ...(q.answer_review_note ? { answer_review_note: q.answer_review_note } : {}),
        ...(useReviewedLegacy ? annualCurrentMapping(q.questionNumber, q.stem) : {}),
        paperCode: 'PHY-IX-2025-P1',
        examYear: 2025,
        questionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const mapped2024Pool = classDef.roman === 'IX'
    ? past2024.map((q: any) => ({
        ...q,
        ...annual2024OriginalReference(q.questionNumber),
        ...(useReviewedLegacy ? annual2024CurrentMapping(q.questionNumber, q.stem) : {}),
        paperCode: 'PHY-IX-2024-P1',
        examYear: 2024,
        questionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  // Filtered Questions for Practice Mode
  const isAnnualSource = practiceSource === 'annual' || practiceSource === 'annual2024' || practiceSource === 'annual_all';
  const questionPool = mappedChapter
    ? mappedChapters.find(c => c.id === mappedChapter)?.questions || []
    : practiceSource === 'annual'
    ? mapped2025Pool
    : practiceSource === 'annual2024'
    ? mapped2024Pool
    : practiceSource === 'annual_all'
    ? [...mapped2025Pool, ...mapped2024Pool.map(q => ({ ...q, displayQuestionNumber: `2024 Q${q.questionNumber}`, questionNumber: 100 + Number(q.questionNumber), rawQuestionNumber: Number(q.questionNumber) }))]
    : questions;
  const activeQuestions = questionPool.filter(q => {
    if (selectedUnit) {
      if (!belongsToUnit(q, selectedUnit, isAnnualSource)) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const optsText = Object.values(q.options || q.choices || {}).join(' ');
      const combined = `${q.stem || q.questionText || ''} ${optsText} ${q.explanation || ''} ${q.unitName || q.chapter || ''} ${q.slo || ''}`;
      if (!smartMatch(combined, searchQuery, q.slo)) return false;
    }
    if (cognitiveFilter === 'all') return true;
    if (cognitiveFilter === 'diagram') return Boolean(q.diagramBased || q.isDiagram || q.diagramUrl);
    return q.cognitiveLevel === cognitiveFilter;
  });

  const handleStartChapterPractice = (unit: ChapterDef, isPastPaper = false) => {
    setMappedChapter(null);
    setPracticeSource(isPastPaper ? 'annual_all' : 'model');
    setSelectedUnit(unit);
    setPracticeTitle(isPastPaper
      ? `Unit ${unit.unitNumber}: ${unit.name} • Past Examination Archive (2024 & 2025)`
      : `Unit ${unit.unitNumber}: ${unit.name} • Chapter Practice`
    );
    setSelectedAnswers({});
    setRevealedAnswers({});
    setCognitiveFilter('all');
    setCurrentView('practice');
  };

  const handleStartFullBookPractice = (title: string, source: 'model' | 'annual' | 'annual2024' = 'model') => {
    setMappedChapter(null);
    setPracticeSource(source);
    setSelectedUnit(null);
    setPracticeTitle(title);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setCognitiveFilter('all');
    setCurrentView('practice');
  };

  const handleStartCognitiveSprint = (level: 'Remembering' | 'Understanding' | 'Application') => {
    setMappedChapter(null);
    setSelectedUnit(null);
    setPracticeSource('model');
    setPracticeTitle(`${level} Cognitive Domain Sprint`);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setCognitiveFilter(level);
    setCurrentView('practice');
  };

  const handleSelect = (qNum: number, opt: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qNum]: opt }));
  };

  const toggleReveal = (qNum: number) => {
    setRevealedAnswers(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setRevealedAnswers({});
  };

  // Score stats
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.entries(selectedAnswers).filter(([qNum, choice]) => {
    const q = questionPool.find(item => Number(item.questionNumber) === Number(qNum));
    const correctKey = q?.correctOption || q?.correctAnswer;
    return q && correctKey === choice;
  }).length;

  return (
    <div>
      {/* ========================================================================= */}
      {/* VIEW 1: MCQ CATEGORIES DIRECTORY HUB (The requested list of pages)        */}
      {/* ========================================================================= */}
      {currentView === 'hub' ? (
        <div>
          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 60%, #157a62 100%)',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(11, 94, 74, 0.18)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '2rem'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                <span style={{ background: '#c9a050', color: '#07382c', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  {board.name}
                </span>
                <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {classDef.name} ({classDef.stageLabel})
                </span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  MCQ EXAMINATION DIRECTORY
                </span>
              </div>

              <h1 className="mobile-page-title" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
                {meta.title} Multiple Choice Practice Hub
              </h1>

              <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
                Select an examination track below to study chapter-by-chapter, master past board examination papers, or attempt full-length timed grand tests with KaTeX mathematical formulas.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  href={baseUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to {meta.title} Subject Hub</span>
                </Link>

                <button
                  onClick={() => handleStartFullBookPractice(`${classDef.name} Complete Question Bank (All 40 Items)`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#ffffff',
                    color: '#0b5e4a',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Practice All Questions ({questions.length})</span>
                </button>
              </div>
            </div>
          </div>

          <nav aria-label="MCQ categories" style={{display:'flex',flexWrap:'wrap',gap:'.6rem',marginBottom:'1.5rem'}}><Link href={baseUrl+'/mcqs'} style={{padding:'.7rem',color:'var(--primary-color)'}}>All categories</Link>{mcqCategories.map(item=><Link key={item.id} href={baseUrl+'/mcqs/'+item.id} aria-current={hubTab===item.key?'page':undefined} style={{padding:'.7rem 1rem',border:'1px solid var(--border-color)',borderRadius:8,color:hubTab===item.key?'#fff':'var(--text-color)',background:hubTab===item.key?'#0b5e4a':'var(--card-bg)',textDecoration:'none'}}>{item.label}</Link>)}</nav>

          {/* TAB 1: CHAPTER WISE MCQS */}
          {hubTab === 'chapter_wise' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                  Chapter-Wise Curriculum Practice Bank
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
                  Practice model question groups mapped to the 2025 AKU-EB Physics syllabus units with instant answer feedback.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                {unitsList.map((unit) => {
                  const unitQCount = questions.filter(q => belongsToUnit(q, unit, false)).length;
                  return (
                    <div
                      key={unit.unitNumber}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{
                            background: '#e6f0ed',
                            color: '#0b5e4a',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            padding: '3px 9px',
                            borderRadius: '6px'
                          }}>
                            UNIT {unit.unitNumber}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            {unitQCount} Model Items
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.4rem 0' }}>
                          {unit.name}
                        </h3>

                        <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                          {unit.topics}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => handleStartChapterPractice(unit, false)}
                          style={{
                            flex: 1,
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            background: '#0b5e4a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <span>Practice Unit {unit.unitNumber}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CHAPTER WISE MCQS (PAST PAPERS) */}
          {hubTab === 'past_papers' && (
            <div>
              {mappedChapters.length>0&&<section style={{marginBottom:'2rem'}}><h2>Current syllabus chapters</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'1rem'}}>{mappedChapters.map(chapter=><button key={chapter.id} onClick={()=>{setMappedChapter(chapter.id);setSelectedUnit(null);setPracticeTitle(chapter.name);setSelectedAnswers({});setRevealedAnswers({});setCognitiveFilter('all');setCurrentView('practice');}} style={{background:'var(--card-bg)',color:'var(--text-color)',border:'1px solid var(--border-color)',borderRadius:12,padding:'1.25rem',minHeight:72,textAlign:'left',cursor:'pointer'}}><strong>{chapter.name}</strong><span style={{display:'block',marginTop:8}}>{chapter.questions.length} past questions →</span></button>)}</div></section>}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                  Original exam-year references (2024 & 2025)
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
                  Original exam-year references from the official 2024 and 2025 answer keys are grouped below alongside reviewed 2025 syllabus mappings.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                {unitsList.map((unit) => {
                  const refCount2025 = past2025.filter(q => belongsToUnit(q, unit, true)).length;
                  const refCount2024 = past2024.filter(q => belongsToUnit(q, unit, true)).length;
                  const totalRefCount = refCount2025 + refCount2024;
                  return (
                  <div
                    key={unit.unitNumber}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #dce5e1',
                      borderRadius: '14px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          padding: '3px 9px',
                          borderRadius: '6px'
                        }}>
                          PAST PAPERS • UNIT {unit.unitNumber}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#0b5e4a', fontWeight: 700 }}>
                          {totalRefCount} Original references
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.4rem 0' }}>
                        {unit.name}
                      </h3>

                      <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                        Questions from the 2024 and 2025 Annual Examination papers, grouped by supplied SLO mappings.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => handleStartChapterPractice(unit, true)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          background: '#0b5e4a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Calendar size={14} />
                        <span>Solve Past Paper MCQs</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* TAB 3: FULL BOOK MCQS & MOCK EXAMS */}
          {hubTab === 'full_book' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                  Full Book Grand Tests & Official Mock Papers
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
                  Choose an available paper for practice or set your own timed assessment.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                {fullPapers.map((paper, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          padding: '3px 9px',
                          borderRadius: '6px'
                        }}>
                          {paper.badge}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={14} color="#d97706" /> {paper.time}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.4rem 0' }}>
                        {paper.title}
                      </h3>

                      <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                        {paper.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => handleStartFullBookPractice(paper.title, paper.source)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          background: '#0b5e4a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Award size={15} />
                        <span>Start Practice</span>
                      </button>

                      <button
                        onClick={() => {
                          handleStartFullBookPractice(paper.title, paper.source);
                          setQuizModalOpen(true);
                        }}
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#0b5e4a',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: '1.5px solid #0b5e4a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Clock size={15} />
                        <span>Timed Exam</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: COGNITIVE DOMAIN SPRINTS */}
          {hubTab === 'cognitive' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                  Practice by Cognitive Learning Domain
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
                  AKU-EB examinations divide marks precisely into Knowledge (Remembering), Conceptual Understanding, and Application.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#ffffff', border: '1.5px solid #fef3c7', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                    K-LEVEL • REMEMBERING
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0.75rem 0 0.4rem 0' }}>
                    Knowledge & Definitions Drill
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Test your recall of scientific units, constants, definitions, and direct facts without numerical calculations.
                  </p>
                  <button
                    onClick={() => handleStartCognitiveSprint('Remembering')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      background: '#92400e',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Start Remembering Drill ➔
                  </button>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #e0f2fe', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                    U-LEVEL • UNDERSTANDING
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0.75rem 0 0.4rem 0' }}>
                    Conceptual Reasoning Practice
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Solve scenario questions, cause-and-effect problems, and qualitative relationships between physical variables.
                  </p>
                  <button
                    onClick={() => handleStartCognitiveSprint('Understanding')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      background: '#0369a1',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Start Understanding Drill ➔
                  </button>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #dcfce7', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                    A-LEVEL • APPLICATION
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0.75rem 0 0.4rem 0' }}>
                    Numericals & Problem Solving
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Apply physics equations (kinematics, work, Newton laws, density, pressure) to calculate numerical values.
                  </p>
                  <button
                    onClick={() => handleStartCognitiveSprint('Application')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      background: '#15803d',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Start Application Drill ➔
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: INTERACTIVE PRACTICE ROOM (For selected chapter/test)             */
        /* ========================================================================= */
        <div>
          {/* Header Bar with Back Button */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #dce5e1',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0 }}>
              <button
                onClick={() => setCurrentView('hub')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#f1f5f9',
                  color: '#0b5e4a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} />
                <span>All Categories</span>
              </button>

              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {practiceTitle}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {activeQuestions.length} Questions Available
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={!activeQuestions.length} onClick={() => setQuizModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(11,94,74,0.2)'
                }}
              >
                <Clock size={15} />
                <span>Take A Timed Quiz</span>
              </button>
            </div>
          </div>

          {/* Score Tracker Bar */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #dce5e1',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 600 }}>Answered:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a2e26' }}>
                  {answeredCount} / {activeQuestions.length}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 600 }}>Correct:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
                  {correctCount}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 600 }}>Score:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b5e4a' }}>
                  {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, typos, synonyms, SLO..."
                style={{
                  padding: '0.48rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #dce5e1',
                  fontSize: '0.82rem',
                  minWidth: '230px',
                  outline: 'none'
                }}
              />
              {[
                { id: 'all', label: `All (${activeQuestions.length})` },
                { id: 'Remembering', label: 'Remembering' },
                { id: 'Understanding', label: 'Understanding' },
                { id: 'Application', label: 'Application' },
                { id: 'diagram', label: 'Diagram Items' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCognitiveFilter(f.id as any)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: cognitiveFilter === f.id ? '#0b5e4a' : '#f0f5f2',
                    color: cognitiveFilter === f.id ? '#ffffff' : '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #dce5e1',
                  background: '#ffffff',
                  color: '#4b5563',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Questions List with KaTeX math rendering */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {activeQuestions.length === 0 ? (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <BookOpen size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                  No questions found for this filter
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Try switching back to &quot;All&quot; questions or select another chapter from the directory.
                </p>
                <button
                  onClick={() => setCognitiveFilter('all')}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#0b5e4a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Show All Questions
                </button>
              </div>
            ) : (
              activeQuestions.map((q, idx) => {
                const qNum = q.questionNumber || idx + 1;
                const rawQNum = q.rawQuestionNumber || qNum;
                const userChoice = selectedAnswers[qNum];
                const isRevealed = revealedAnswers[qNum];
                const isAnswered = !!userChoice;
                const correctKey = q.correctOption || q.correctAnswer;
                const isCorrect = userChoice === correctKey;

                // Extract options map
                const optionsObj = q.options || q.choices || {};

                return (
                  <div
                    key={qNum}
                    style={{
                      background: '#ffffff',
                      border: isAnswered ? (isCorrect ? '2px solid #86efac' : '2px solid #fca5a5') : '1.5px solid #dce5e1',
                      borderRadius: '16px',
                      padding: '1.75rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#0b5e4a',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 800
                        }}>
                          {q.examYear ? `${q.examYear} · Q${rawQNum}` : `Q${rawQNum}`}
                        </span>
                        <span style={{
                          background: q.cognitiveLevel === 'Remembering' ? '#fef3c7' : q.cognitiveLevel === 'Understanding' ? '#e0f2fe' : '#dcfce7',
                          color: q.cognitiveLevel === 'Remembering' ? '#92400e' : q.cognitiveLevel === 'Understanding' ? '#0369a1' : '#15803d',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {q.cognitiveLevel}
                        </span>
                        {(q.unitName || q.chapter) && (
                          <span style={{ background: '#f4f7f6', color: '#4b5563', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {q.unitName || q.chapter}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleReveal(qNum)}
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
                        <Eye size={15} />
                        <span>{isRevealed ? 'Hide Answer' : 'Show Answer'}</span>
                      </button>
                    </div>

                    <QuestionSource question={q} source={mappedChapter?'mapped':isAnnualSource?'annual':'model'} board={board.shortCode} grade={classDef.level} subject={meta.title} />

                    {/* Question Stem rendered with StructuredContent (Tables + KaTeX) */}
                    <div style={{ fontSize: '1.05rem', color: 'var(--text-color, #1a2e26)', fontWeight: 600, lineHeight: 1.6, marginBottom: '1.25rem' }}>
                      <StructuredContent text={q.stem || q.questionText || ''} />
                    </div>

                    {/* Diagram if available */}
                    {(() => {
                      if (q.diagramBased === false || (q as any).isDiagram === false) return null;
                      const paperCodeForDiag = q.paperCode || `PHY-${classDef.roman}${practiceSource === 'annual2024' ? '-2024' : practiceSource === 'annual' ? '-2025' : ''}-P1`;
                      const diagramSrc = resolveQuestionDiagram(paperCodeForDiag, rawQNum, q);
                      if (!diagramSrc) return null;
                      return (
                        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                          <img
                            src={diagramSrc}
                            alt={`Diagram for Question ${rawQNum}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '260px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              border: '1.5px solid var(--border-color, #eef2f0)',
                              padding: '6px',
                              background: '#ffffff',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Options rendered with MathText */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {['A', 'B', 'C', 'D'].map(optKey => {
                        const optText = optionsObj[optKey];
                        if (!optText) return null;

                        const isSelected = userChoice === optKey;
                        const isAnswerKey = correctKey === optKey;

                        let optBg = '#f8faf9';
                        let optBorder = '1.5px solid #eef2f0';
                        let optColor = '#1a2e26';

                        if (isRevealed || isAnswered) {
                          if (isAnswerKey) {
                            optBg = '#dcfce7';
                            optBorder = '1.5px solid #22c55e';
                            optColor = '#15803d';
                          } else if (isSelected && !isAnswerKey) {
                            optBg = '#fee2e2';
                            optBorder = '1.5px solid #ef4444';
                            optColor = '#b91c1c';
                          }
                        } else if (isSelected) {
                          optBg = '#e6f0ed';
                          optBorder = '1.5px solid #0b5e4a';
                          optColor = '#0b5e4a';
                        }

                        return (
                          <button
                            key={optKey}
                            onClick={() => handleSelect(qNum, optKey)}
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: '10px',
                              background: optBg,
                              border: optBorder,
                              color: optColor,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isSelected || (isRevealed && isAnswerKey) ? optColor : '#dce5e1',
                              color: isSelected || (isRevealed && isAnswerKey) ? '#ffffff' : '#4b5563',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {optKey}
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.4, flexGrow: 1 }}>
                              <MathText text={String(optText)} />
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Reveal Explanation Drawer */}
                    {isAnswered&&!isCorrect&&Array.isArray(q.option_feedback)&&<p style={{color:'var(--text-color)'}}><strong>Why your choice is incorrect: </strong><MathText text={q.option_feedback.find((f:any)=>f.key===userChoice)?.reason||'Review the solution below.'}/></p>}
                    {(isRevealed || (isAnswered && !isCorrect)) && q.explanation && (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginTop: '0.75rem',
                        fontSize: '0.88rem',
                        color: '#166534',
                        lineHeight: 1.5
                      }}>
                        <strong>Explanation / Key: </strong>
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Interactive Timed Quiz Modal */}
      <TakeQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        paperTitle={practiceTitle}
        paperCode={mappedChapter?`CURRICULUM:${mappedChapter}:${({all:'ALL',Remembering:'R',Understanding:'U',Application:'A',diagram:'DIAGRAM'} as Record<string,string>)[cognitiveFilter]}`:`PHY-${classDef.roman}${practiceSource === 'annual2024' ? '-2024' : isAnnualSource ? '-2025' : ''}-P1-SET-${activeQuestions.map(q => Number(q.rawQuestionNumber || q.questionNumber)).sort((a, b) => a - b).join('-')}`}
        questions={activeQuestions}
      />
    </div>
  );
}
