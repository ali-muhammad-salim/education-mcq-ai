'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import type { SubjectMeta } from '@/lib/subjectMetadata';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import { smartMatch } from '@/lib/smartSearch';

export type TheorySectionMode = 'crqs' | 'erqs' | 'numericals' | 'notes';

interface ChapterUnitData {
  unitNumber: number;
  name: string;
  subtopics: string[];
  sloCount: number;
  definitions: Array<{
    term: string;
    definition: string;
    slo_code?: string;
    cognitive_level?: string;
    mathematical_form?: string;
    si_unit?: string;
  }>;
  crqs: Array<{
    id: string;
    questionNumber: string;
    sourceTitle: string;
    sourceHref: string;
    examYear: number;
    questionText: string;
    marks: number;
    cognitiveLevel?: string;
    originalSlo?: string;
    originalSloText?: string;
    currentSlo?: string;
    currentSloDescription?: string;
    currentTopic?: string;
    outOfSyllabus?: boolean;
    diagramUrl?: string;
    rubric?: Array<{ marks: number; description: string }>;
    modelAnswer: string;
    betterResponse?: string;
    weakerResponse?: string;
    betterResponseImage?: string;
    weakerResponseImage?: string;
    suggestions?: string;
  }>;
  erqs: Array<{
    id: string;
    questionNumber: string;
    sourceTitle: string;
    sourceHref: string;
    examYear: number;
    questionText: string;
    marks: number;
    cognitiveLevel?: string;
    originalSlo?: string;
    originalSloText?: string;
    currentSlo?: string;
    currentSloDescription?: string;
    currentTopic?: string;
    outOfSyllabus?: boolean;
    diagramUrl?: string;
    rubric?: Array<{ marks: number; description: string }>;
    modelAnswer: string;
    betterResponse?: string;
    weakerResponse?: string;
    betterResponseImage?: string;
    weakerResponseImage?: string;
    suggestions?: string;
  }>;
  numericals: Array<{
    id: string;
    questionNumber: string;
    sourceTitle: string;
    sourceHref: string;
    examYear: number;
    problem: string;
    formula?: string;
    options?: Record<string, string>;
    correctOption?: string;
    marks: number;
    originalSlo?: string;
    currentSlo?: string;
    currentSloDescription?: string;
    diagramUrl?: string;
    rubric?: Array<{ marks: number; description: string }>;
    solution: string;
    betterResponseImage?: string;
    weakerResponseImage?: string;
  }>;
}

interface Props {
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  mode: TheorySectionMode;
  units: ChapterUnitData[];
}

const SECTION_META: Record<
  TheorySectionMode,
  {
    badge: string;
    title: string;
    subtitle: string;
    itemLabel: string;
  }
> = {
  crqs: {
    badge: 'CHAPTER-WISE CRQS • SHORT RESPONSE',
    title: 'Chapter-Wise Constructed Response Questions (CRQs)',
    subtitle:
      'Master 2–3 mark short-answer conceptual questions from 2024 & 2025 Annual Examination Paper II, Model Paper II, and the 2025 syllabus, complete with Checking Hints rubrics, model solutions, and authentic E-Marking candidate scripts.',
    itemLabel: 'CRQ Items',
  },
  erqs: {
    badge: 'CHAPTER-WISE ERQS • EXTENDED RESPONSE',
    title: 'Chapter-Wise Extended Response Questions (ERQs)',
    subtitle:
      'Practice 4–6 mark structured derivations, graph interpretations, and multi-part problems from 2024 & 2025 Annual Paper II, Model Paper II, and curriculum banks with official marking schemes and E-Marking scripts.',
    itemLabel: 'ERQ Items',
  },
  numericals: {
    badge: 'CHAPTER-WISE NUMERICALS & WORKED PROBLEMS',
    title: 'Chapter-Wise Physics Numericals & Formula Applications',
    subtitle:
      'Step-by-step solved numerical word problems from 2024 & 2025 Annual Papers I & II, Model Papers I & II, and chapter formula banks, mapped to 2025 syllabus SLOs with SI units and KaTeX equations.',
    itemLabel: 'Numericals',
  },
  notes: {
    badge: 'CHAPTER-WISE NOTES & SLO OUTCOMES',
    title: 'Chapter-Wise SLO Notes, Definitions & Formula Reference',
    subtitle:
      'Complete chapter-by-chapter 2025 AKU-EB Physics Student Learning Outcomes (SLOs), cognitive command levels, and core concepts.',
    itemLabel: 'SLO Notes',
  },
};

export default function ChapterTheoryPracticeClient({
  board,
  classDef,
  meta,
  baseUrl,
  mode,
  units,
}: Props) {
  const [selectedUnitNum, setSelectedUnitNum] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSolutions, setShowAllSolutions] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [draftResponses, setDraftResponses] = useState<Record<string, string>>({});

  const sectionInfo = SECTION_META[mode];

  const getUnitItems = (u: ChapterUnitData) => {
    if (mode === 'crqs') return u.crqs;
    if (mode === 'erqs') return u.erqs;
    if (mode === 'numericals') return u.numericals;
    return u.definitions;
  };

  const totalItemsCount = units.reduce((acc, u) => acc + getUnitItems(u).length, 0);

  const activeUnits = selectedUnitNum
    ? units.filter(u => u.unitNumber === selectedUnitNum)
    : units;

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navLinks = [
    { href: `${baseUrl}/mcqs/chapter-wise`, label: 'Chapter-wise MCQs', active: false },
    { href: `${baseUrl}/mcqs/past-papers`, label: 'Past-paper MCQs', active: false },
    { href: `${baseUrl}/crqs`, label: 'Chapter-wise CRQs', active: mode === 'crqs' },
    { href: `${baseUrl}/erqs`, label: 'Chapter-wise ERQs', active: mode === 'erqs' },
    { href: `${baseUrl}/numericals`, label: 'Chapter-wise Numericals', active: mode === 'numericals' },
    { href: `${baseUrl}/chapter-notes`, label: 'Chapter Notes & SLOs', active: mode === 'notes' },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 60%, #157a62 100%)',
          borderRadius: '20px',
          padding: '2.25rem 2rem',
          color: '#ffffff',
          boxShadow: '0 12px 30px rgba(11, 94, 74, 0.18)',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={{ background: '#c9a050', color: '#07382c', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            {board.name}
          </span>
          <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
            {classDef.name} ({classDef.stageLabel})
          </span>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            {sectionInfo.badge}
          </span>
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {meta.title} — {sectionInfo.title}
        </h1>
        <p style={{ fontSize: '1rem', color: '#e6f0ed', margin: '0 0 1.35rem 0', maxWidth: '860px', lineHeight: 1.6 }}>
          {sectionInfo.subtitle}
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
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to {meta.title} Subject Hub</span>
          </Link>

          <button
            type="button"
            onClick={() => setSelectedUnitNum(null)}
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
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} />
            <span>View All Chapters ({totalItemsCount} {sectionInfo.itemLabel})</span>
          </button>
        </div>
      </div>

      {/* Cross-Section Navigation Bar */}
      <nav
        aria-label="Chapter-wise practice sections"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '1.5rem' }}
      >
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? 'page' : undefined}
            style={{
              padding: '0.65rem 1rem',
              border: '1px solid var(--border-color, #dce5e1)',
              borderRadius: '8px',
              color: link.active ? '#ffffff' : 'var(--text-color, #1e293b)',
              background: link.active ? '#0b5e4a' : '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              textDecoration: 'none',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Chapter Directory Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Select a Chapter (or Browse All Below)
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Click any unit card to filter to that specific chapter, or use the search bar to find any concept, formula, or SLO code.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search questions, formulas, typos, synonyms, SLO..."
              style={{
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                minWidth: '260px',
                outline: 'none',
              }}
            />
            {mode !== 'notes' && (
              <button
                type="button"
                onClick={() => setShowAllSolutions(!showAllSolutions)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid #0b5e4a',
                  background: showAllSolutions ? '#ecfdf5' : '#ffffff',
                  color: '#0b5e4a',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                {showAllSolutions ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{showAllSolutions ? 'Hide All Solutions (Self-Test)' : 'Show All Solutions & Rubrics'}</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
          {units.map(u => {
            const count = getUnitItems(u).length;
            const isSelected = selectedUnitNum === u.unitNumber;
            return (
              <button
                key={u.unitNumber}
                type="button"
                onClick={() => setSelectedUnitNum(isSelected ? null : u.unitNumber)}
                style={{
                  textAlign: 'left',
                  padding: '1rem 1.15rem',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #0b5e4a' : '1.5px solid #e2e8f0',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ background: '#0b5e4a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '5px' }}>
                    UNIT {u.unitNumber}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b5e4a' }}>
                    {count} {sectionInfo.itemLabel}
                  </span>
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827' }}>{u.name}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
                  {u.subtopics.slice(0, 3).join(' • ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter-by-Chapter Questions / Numericals / Notes Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {activeUnits.map(unit => {
          if (mode === 'notes') {
            const filteredDefs = unit.definitions.filter(d =>
              !searchQuery.trim()
                ? true
                : smartMatch(`${unit.name} ${d.slo_code || ''} ${d.term} ${d.definition}`, searchQuery, d.slo_code)
            );
            if (!filteredDefs.length) return null;
            return (
              <section
                key={unit.unitNumber}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #dce5e1',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                  <div>
                    <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                      UNIT {unit.unitNumber}
                    </span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0 0' }}>
                      Unit {unit.unitNumber}: {unit.name}
                    </h3>
                  </div>
                  <Link
                    href={`${baseUrl}/syllabus`}
                    style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    Open in Full 2025 Syllabus ↗
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '0.9rem' }}>
                  {filteredDefs.map((def, idx) => (
                    <div
                      key={def.slo_code || idx}
                      style={{
                        padding: '1rem 1.15rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <Link
                          href={`${baseUrl}/syllabus#slo-${def.slo_code}`}
                          style={{
                            background: '#0b5e4a',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                          }}
                        >
                          SLO {def.slo_code}
                        </Link>
                        {def.cognitive_level && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            Level: {def.cognitive_level === 'R' ? 'Remembering (K)' : def.cognitive_level === 'U' ? 'Understanding (U)' : def.cognitive_level === 'A' ? 'Application (A)' : def.cognitive_level}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.55, fontWeight: 500 }}>
                        <MathText text={def.definition} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (mode === 'numericals') {
            const filteredNums = unit.numericals.filter(n =>
              !searchQuery.trim()
                ? true
                : smartMatch(
                    `${unit.name} ${n.problem} ${n.solution} ${n.formula || ''} ${n.currentSlo || ''} ${n.originalSlo || ''}`,
                    searchQuery,
                    n.currentSlo || n.originalSlo
                  )
            );
            if (!filteredNums.length) return null;
            return (
              <section
                key={unit.unitNumber}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #dce5e1',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                  <div>
                    <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                      UNIT {unit.unitNumber} • {filteredNums.length} NUMERICAL PROBLEMS
                    </span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0 0' }}>
                      Unit {unit.unitNumber}: {unit.name} — Worked Numericals
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                  {filteredNums.map(item => {
                    const isOpen = showAllSolutions || revealedIds[item.id];
                    return (
                      <article
                        key={item.id}
                        style={{
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.35rem',
                          background: '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ background: '#0b5e4a', color: '#ffffff', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800 }}>
                              {item.questionNumber}
                            </span>
                            <Link
                              href={item.sourceHref}
                              style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                            >
                              {item.sourceTitle} ↗
                            </Link>

                            {item.currentSlo && (
                              <Link
                                href={`${baseUrl}/syllabus#slo-${item.currentSlo}`}
                                title={item.currentSloDescription}
                                style={{ background: '#ecfdf5', color: '#0b5e4a', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none' }}
                              >
                                2025 SLO {item.currentSlo} ↗
                              </Link>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', background: '#f8fafc', padding: '3px 8px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                            {item.marks} {item.marks === 1 ? 'Mark' : 'Marks'}
                          </span>
                        </div>

                        {item.currentSloDescription && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.65rem', background: '#f8fafc', padding: '0.45rem 0.75rem', borderRadius: '6px' }}>
                            <strong>2025 Syllabus Outcome ({item.currentSlo}):</strong> {item.currentSloDescription}
                          </div>
                        )}

                        <div style={{ fontSize: '1.03rem', fontWeight: 600, color: '#111827', lineHeight: 1.6, marginBottom: '0.9rem' }}>
                          <StructuredContent text={item.problem} />
                        </div>

                        {item.diagramUrl && (
                          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                            <img
                              src={item.diagramUrl}
                              alt={`Diagram for ${item.questionNumber}`}
                              style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', background: '#ffffff' }}
                            />
                          </div>
                        )}

                        {item.formula && (
                          <div style={{ marginBottom: '0.75rem', fontSize: '0.88rem', color: '#0369a1', background: '#f0f9ff', padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                            <strong>Key Formula: </strong>
                            <MathText text={item.formula} />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleReveal(item.id)}
                          style={{
                            background: '#f1f5f9',
                            color: '#0b5e4a',
                            border: '1px solid #cbd5e1',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginBottom: isOpen ? '0.85rem' : 0,
                          }}
                        >
                          {isOpen ? 'Hide Worked Solution' : 'Show Worked Solution & Marking Steps'}
                        </button>

                        {isOpen && (
                          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '1.15rem' }}>
                            {item.rubric && item.rubric.length > 0 && (
                              <div style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem' }}>
                                  📋 Official Checking Hints (Marking Scheme):
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', color: '#14532d', lineHeight: 1.5 }}>
                                  {item.rubric.map((r, rIdx) => (
                                    <li key={rIdx}>
                                      <MathText text={r.description} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div style={{ fontSize: '0.94rem', color: '#14532d', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                              <StructuredContent text={item.solution} />
                            </div>
                            {item.betterResponseImage && (
                              <div style={{ marginTop: '0.85rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.3rem' }}>
                                  Authentic E-Marking Better Candidate Calculation Script:
                                </div>
                                <img
                                  src={item.betterResponseImage}
                                  alt={`Better candidate calculation for ${item.questionNumber}`}
                                  style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #86efac', background: '#ffffff', padding: '4px' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          }

          // CRQs or ERQs mode
          const rawList = mode === 'crqs' ? unit.crqs : unit.erqs;
          const filteredList = rawList.filter(item =>
            !searchQuery.trim()
              ? true
              : smartMatch(
                  `${unit.name} ${item.questionText} ${item.modelAnswer} ${item.currentSlo || ''} ${item.originalSlo || ''} ${item.sourceTitle}`,
                  searchQuery,
                  item.currentSlo || item.originalSlo
                )
          );
          if (!filteredList.length) return null;

          return (
            <section
              key={unit.unitNumber}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dce5e1',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                <div>
                  <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 800, fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px' }}>
                    UNIT {unit.unitNumber} • {filteredList.length} {mode === 'crqs' ? 'SHORT QUESTIONS (CRQS)' : 'EXTENDED QUESTIONS (ERQS)'}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0 0' }}>
                    Unit {unit.unitNumber}: {unit.name}
                  </h3>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {filteredList.map(item => {
                  const isOpen = showAllSolutions || revealedIds[item.id];
                  return (
                    <article
                      key={item.id}
                      style={{
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ background: '#0b5e4a', color: '#ffffff', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800 }}>
                            {item.questionNumber}
                          </span>
                          <Link
                            href={item.sourceHref}
                            style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {item.sourceTitle} ↗
                          </Link>

                          {item.currentSlo ? (
                            <Link
                              href={`${baseUrl}/syllabus#slo-${item.currentSlo}`}
                              title={item.currentSloDescription}
                              style={{ background: '#ecfdf5', color: '#0b5e4a', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none' }}
                            >
                              Current 2025 SLO {item.currentSlo} ↗
                            </Link>
                          ) : item.outOfSyllabus ? (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 600 }}>
                              Out of 2025 Syllabus
                            </span>
                          ) : null}
                        </div>

                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', background: '#f3f4f6', padding: '3px 9px', borderRadius: '5px' }}>
                          Total {item.marks} Marks • Level {item.cognitiveLevel || 'U'}
                        </span>
                      </div>

                      {(item.currentSloDescription || item.originalSloText) && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem', background: '#f8fafc', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {item.currentSloDescription && (
                            <div>
                              <strong>2025 Syllabus Outcome ({item.currentSlo}):</strong> {item.currentSloDescription}
                            </div>
                          )}

                        </div>
                      )}

                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111827', lineHeight: 1.6, marginBottom: '1rem' }}>
                        <StructuredContent text={item.questionText} />
                      </div>

                      {item.diagramUrl && (
                        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                          <img
                            src={item.diagramUrl}
                            alt={`Diagram for ${item.questionNumber}`}
                            style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', background: '#ffffff' }}
                          />
                        </div>
                      )}

                      {/* Optional student self-practice scratchpad */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <textarea
                          rows={mode === 'erqs' ? 4 : 2}
                          value={draftResponses[item.id] || ''}
                          onChange={e => setDraftResponses(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Write your practice answer here before comparing with the official Checking Hints and Model Response..."
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.88rem',
                            fontFamily: 'inherit',
                            background: '#fafafa',
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleReveal(item.id)}
                        style={{
                          background: '#f1f5f9',
                          color: '#0b5e4a',
                          border: '1px solid #cbd5e1',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginBottom: isOpen ? '0.85rem' : 0,
                        }}
                      >
                        {isOpen ? 'Hide Solution & E-Marking Notes' : 'Show Solution, Rubric & E-Marking Notes'}
                      </button>

                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {item.rubric && item.rubric.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.9rem 1.15rem' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                                📋 Official Checking Hints (Marking Rubric • {item.marks} Marks)
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                                {item.rubric.map((r, rIdx) => (
                                  <li key={rIdx}>
                                    <MathText text={r.description} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '1.15rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '0.45rem' }}>
                              ✓ MODEL SOLUTION (Full Marks Guidance)
                            </div>
                            <div style={{ fontSize: '0.94rem', color: '#14532d', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                              <StructuredContent text={item.modelAnswer} />
                            </div>
                            {item.betterResponse && item.betterResponse !== item.modelAnswer && (
                              <p style={{ margin: '0.7rem 0 0 0', fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                                <strong>Examiner Commentary (Better Responses):</strong> {item.betterResponse}
                              </p>
                            )}
                            {item.betterResponseImage && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                                  Authentic E-Marking Better Candidate Script:
                                </div>
                                <img
                                  src={item.betterResponseImage}
                                  alt={`Better candidate script for ${item.questionNumber}`}
                                  style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #86efac', background: '#ffffff', padding: '4px' }}
                                />
                              </div>
                            )}
                          </div>

                          {(item.weakerResponse || item.weakerResponseImage) && (
                            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '1.15rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', marginBottom: '0.4rem' }}>
                                ⚠ WEAKER RESPONSE (Common Misconceptions & Lost Marks)
                              </div>
                              {item.weakerResponse && (
                                <div style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.55 }}>
                                  <MathText text={item.weakerResponse} />
                                </div>
                              )}
                              {item.weakerResponseImage && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                                    Authentic E-Marking Weaker Candidate Script:
                                  </div>
                                  <img
                                    src={item.weakerResponseImage}
                                    alt={`Weaker candidate script for ${item.questionNumber}`}
                                    style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #fcd34d', background: '#ffffff', padding: '4px' }}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {item.suggestions && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0f766e', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <Lightbulb size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <strong>Examiner Suggestion for Improvement:</strong> {item.suggestions}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
