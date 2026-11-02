'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, Download, ChevronDown, ChevronUp,
  ArrowLeft
} from 'lucide-react';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import { filterSyllabus, syllabusLevel, syllabusDisplayText } from '@/lib/syllabusPresentation';
import StructuredContent from '@/components/StructuredContent';
import { SubjectMeta } from '@/lib/subjectMetadata';
import styles from './SyllabusClient.module.css';

interface Props {
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  units: any[];
  originalUrl?: string;
}

export default function SyllabusClient({ board, classDef, meta, baseUrl, units, originalUrl }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<number | 'all'>('all');
  const [cognitiveFilter, setCognitiveFilter] = useState<'all' | 'R' | 'U' | 'A' | 'An' | 'E' | 'FA'>('all');
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true,
    8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true
  });

  useEffect(() => {
    const followHash = () => {
      const unitMatch = window.location.hash.match(/^#unit-(\d+)$/);
      if (unitMatch) {
        const unitNumber = Number(unitMatch[1]);
        setExpandedUnits(old => ({ ...old, [unitNumber]: true }));
        setSelectedUnit('all');
        setSearchQuery('');
        setCognitiveFilter('all');
        requestAnimationFrame(() => document.getElementById(`unit-${unitNumber}`)?.scrollIntoView({ block: 'start' }));
        return;
      }
      const code = decodeURIComponent(window.location.hash.replace('#slo-', ''));
      if (!code) return;
      const unit = units.find(u => u.subtopics.some((t: any) => t.slos.some((o: any) => o.code === code)));
      if (unit) {
        setExpandedUnits(old => ({ ...old, [unit.unitNumber]: true }));
        setSelectedUnit('all');
        setSearchQuery('');
        setCognitiveFilter('all');
        requestAnimationFrame(() => document.getElementById('slo-' + code)?.scrollIntoView({ block: 'center' }));
      }
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [units]);

  const toggleUnit = (uNum: number) => {
    setExpandedUnits(prev => ({ ...prev, [uNum]: !prev[uNum] }));
  };

  const jumpToUnit = (unitNumber: number) => {
    setSelectedUnit('all');
    setSearchQuery('');
    setCognitiveFilter('all');
    setExpandedUnits(old => ({ ...old, [unitNumber]: true }));
    window.history.replaceState(null, '', `#unit-${unitNumber}`);
    requestAnimationFrame(() => document.getElementById(`unit-${unitNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const filteredUnits = filterSyllabus(units, searchQuery, cognitiveFilter, selectedUnit);

  const isCS = meta.slug === 'computer-science';
  const pdfUrl = isCS
    ? (classDef.roman === 'IX'
      ? '/materials/ssc/computer-science/ssc-1/computer-science-ssc-i-syllabus-grade-9-dedicated.pdf'
      : '/materials/ssc/computer-science/ssc-2/computer-science-ssc-ii-syllabus-grade-10-dedicated.pdf')
    : (originalUrl || (classDef.roman === 'IX'
      ? '/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf'
      : '/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf'));

  const hasExamSpecs = units.some(u => u.examSpec);
  const cognitiveOptions = [
    { id: 'all', label: 'All Cognitive Levels' },
    { id: 'R', label: 'Remembering (R)' },
    { id: 'U', label: 'Understanding (U)' },
    { id: 'A', label: 'Application (A)' },
    { id: 'An', label: 'Analysing (An)' },
    { id: 'E', label: 'Evaluation (E)' },
    { id: 'FA', label: 'Formative Assessment (FA)' }
  ];

  return (
    <div>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 60%, #157a62 100%)',
        borderRadius: '20px',
        padding: 'clamp(1.1rem, 3vw, 2.5rem)',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(11, 94, 74, 0.18)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <span style={{ background: '#c9a050', color: '#07382c', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              {board.name}
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              {classDef.name} ({classDef.stageLabel})
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              CURRICULUM SPECIFICATION (2025 EDITION)
            </span>
          </div>

          <h1 className="mobile-page-title" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {meta.title} Official Syllabus & SLOs ({units.length} Units)
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Search learning outcomes or filter by cognitive level. Open Original PDF for the complete source.
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
              <span>Back to {meta.title} Hub</span>
            </Link>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                color: '#0b5e4a',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              <Download size={16} />
              <span>Download Dedicated Syllabus PDF</span>
            </a>
          </div>
        </div>
      </div>

      <div className={styles.levelGuide} aria-label="Cognitive level abbreviations">
        <strong>Cognitive levels</strong>
        <span><b>R</b> Remembering</span><span><b>U</b> Understanding</span>
        <span><b>A</b> Application</span><span><b>An</b> Analysing</span>
        <span><b>E</b> Evaluation</span><span><b>FA</b> Formative Assessment</span>
      </div>

      {/* Exam Specification Summary Bar (when available) */}
      {hasExamSpecs && (
        <details className={styles.scheme}>
          <summary>Scheme of Assessment — {classDef.name} (75 marks)</summary>
          <div className={styles.schemeContent}>
            <div className={styles.schemeFacts}>
              <span>Theory I <strong>40 MCQs · 40 marks</strong></span>
              <span>Theory II <strong>CRQs 13 + ERQs 12 · 25 marks</strong></span>
              <span>Practical III <strong>10 marks</strong></span>
              <span>Cognitive weightage <strong>Remember 0–10% · Understand 30–50% · Apply &amp; beyond 40–60%</strong></span>
            </div>
            <p className={styles.jumpHint}>Tap a topic to jump to its syllabus outcomes.</p>
            <div className={styles.topicGrid}>
            {units.map((u: any) => (
              <button
                type="button"
                key={u.unitNumber}
                className={styles.topicCard}
                onClick={() => jumpToUnit(u.unitNumber)}
                aria-label={`Go to Topic ${u.unitNumber}: ${u.name}`}
              >
                <strong>Topic {u.unitNumber}: {u.name}</strong>
                <span>MCQs: {u.examSpec?.mcqs ?? '—'}</span>
                {u.examSpec?.crqs ? <span>CRQs: {u.examSpec.crqs} ({u.examSpec.crqMarks} marks)</span> : null}
                {u.examSpec?.erqGroup ? <span>ERQ: {u.examSpec.erqGroup}</span> : null}
              </button>
            ))}
            </div>
          </div>
        </details>
      )}

      {/* Search & Cognitive Filter Controls */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #dce5e1',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5a7a6f' }} />
          <input
            type="text"
            placeholder="Search syllabus by topic, unit name, or SLO code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              borderRadius: '10px',
              border: '1.5px solid #dce5e1',
              fontSize: '0.92rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Cognitive Filter */}
        <label className={styles.mobileFilter}>
          Cognitive level
          <select value={cognitiveFilter} onChange={e => setCognitiveFilter(e.target.value as typeof cognitiveFilter)}>
            {cognitiveOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <div className={styles.filterButtons}>
          {cognitiveOptions.map(f => (
            <button
              key={f.id}
              onClick={() => setCognitiveFilter(f.id as any)}
              style={{
                padding: '0.55rem 0.9rem',
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
        </div>
      </div>

      {/* Units Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredUnits.map((unit: any) => {
          const isExpanded = expandedUnits[unit.unitNumber] !== false;
          return (
            <div
              key={unit.unitNumber}
              id={`unit-${unit.unitNumber}`}
              className={styles.unit}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dce5e1',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              {/* Unit Header */}
              <button
                aria-expanded={isExpanded}
                onClick={() => toggleUnit(unit.unitNumber)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  background: '#f8faf9',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}>
                    Unit {unit.unitNumber}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2e26', margin: 0 }}>
                    {unit.name}
                  </h3>
                  {unit.examSpec?.mcqs !== undefined && (
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}>
                      {unit.examSpec.mcqs} MCQs
                      {unit.examSpec.crqs ? ` • ${unit.examSpec.crqs} CRQ (${unit.examSpec.crqMarks}m)` : ''}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={20} color="#0b5e4a" /> : <ChevronDown size={20} color="#0b5e4a" />}
              </button>

              {/* Subtopics & SLOs Table */}
              {isExpanded && (
                <div style={{ padding: '1.5rem' }}>
                  {unit.subtopics && unit.subtopics.map((subtopic: any, sIdx: number) => (
                    <div key={sIdx} style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0b5e4a', margin: '0 0 0.6rem 0' }}>
                        {subtopic.name}
                      </h4>

                      <div className={styles.tableWrap}>
                        <table
                          className={styles.sloTable}
                          tabIndex={0}
                          aria-label="Learning outcomes"
                          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}
                        >
                          <thead>
                            <tr style={{ background: '#f0f5f2', borderBottom: '2px solid #dce5e1', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px', width: '120px', color: '#0b5e4a', fontWeight: 800 }}>SLO Code</th>
                              <th style={{ padding: '8px 12px', color: '#0b5e4a', fontWeight: 800 }}>Student Learning Outcome</th>
                              <th style={{ padding: '8px 12px', width: '90px', color: '#0b5e4a', fontWeight: 800, textAlign: 'center' }}>Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subtopic.slos && subtopic.slos.map((slo: any, sloIdx: number) => {
                              const lv = syllabusLevel(slo.cognitiveLevel) || slo.cognitiveShort || slo.cognitiveLevel;
                              return (
                                <tr id={"slo-" + slo.code} key={sloIdx} style={{ borderBottom: '1px solid #f0f4f2' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-color)', fontFamily: 'monospace' }}>
                                    {slo.code}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-color)', lineHeight: 1.5 }}>
                                    <StructuredContent text={syllabusDisplayText(slo.description)} />
                                    {slo.isPractical && (
                                      <span style={{
                                        marginLeft: '8px',
                                        background: '#ede9fe',
                                        color: '#5b21b6',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                      }}>
                                        Practical Lab
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <span style={{
                                      background:
                                        lv === 'R' ? '#fef3c7' :
                                        lv === 'U' ? '#e0f2fe' :
                                        lv === 'FA' ? '#f3e8ff' :
                                        lv === 'E' || lv === 'An' ? '#fce7f3' : '#dcfce7',
                                      color:
                                        lv === 'R' ? '#92400e' :
                                        lv === 'U' ? '#0369a1' :
                                        lv === 'FA' ? '#6b21a8' :
                                        lv === 'E' || lv === 'An' ? '#9d174d' : '#15803d',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800
                                    }}>
                                      {lv}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
