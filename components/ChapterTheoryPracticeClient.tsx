'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import type { SubjectMeta } from '@/lib/subjectMetadata';
import MathText from '@/components/MathText';
import { smartMatch } from '@/lib/smartSearch';

export type TheorySectionMode = 'crqs' | 'erqs' | 'numericals' | 'notes';

export interface ChapterUnitData {
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
              {mode === 'notes' ? 'Select a Chapter (or Browse All Below)' : 'Select a Chapter to Open Its Question Paper'}
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              {mode === 'notes'
                ? 'Click any unit card to filter to that specific chapter, or use the search bar to find any concept, formula, or SLO code.'
                : 'Each chapter opens on its own exam-formatted page with every question, official rubric, and E-Marking script for that unit.'}
            </p>
          </div>

          {mode === 'notes' && (
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
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
          {units.map(u => {
            const count = getUnitItems(u).length;
            const isSelected = selectedUnitNum === u.unitNumber;
            const directoryStyle: React.CSSProperties = {
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
              textDecoration: 'none',
            };
            const unitCardBody = (
              <>
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
              </>
            );
            return mode === 'notes' ? (
              <button
                key={u.unitNumber}
                type="button"
                onClick={() => setSelectedUnitNum(isSelected ? null : u.unitNumber)}
                style={directoryStyle}
              >
                {unitCardBody}
              </button>
            ) : (
              <Link key={u.unitNumber} href={`${baseUrl}/${mode}/${u.unitNumber}`} style={directoryStyle}>
                {unitCardBody}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Chapter-by-Chapter Questions / Numericals / Notes Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {mode === 'notes' && activeUnits.map(unit => {
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
        })}
      </div>
    </div>
  );
}
