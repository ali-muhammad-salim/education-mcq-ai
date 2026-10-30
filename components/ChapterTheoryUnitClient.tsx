'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Lightbulb } from 'lucide-react';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import type { SubjectMeta } from '@/lib/subjectMetadata';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import type { ChapterUnitData, TheorySectionMode } from '@/components/ChapterTheoryPracticeClient';

type UnitSectionMode = Exclude<TheorySectionMode, 'notes'>;

interface Props {
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  mode: UnitSectionMode;
  unit: ChapterUnitData;
}

const SECTION_META: Record<UnitSectionMode, { paperLine: string; kind: string }> = {
  crqs: {
    paperLine: 'Physics — Paper II · Constructed Response Questions (CRQs)',
    kind: 'CRQ',
  },
  erqs: {
    paperLine: 'Physics — Paper II · Extended Response Questions (ERQs)',
    kind: 'ERQ',
  },
  numericals: {
    paperLine: 'Physics · Numericals & Formula Applications',
    kind: 'Numerical',
  },
};

const SERIF = "'Times New Roman', Times, serif";
const SANS = "'Inter', sans-serif";

export default function ChapterTheoryUnitClient({ board, classDef, meta, baseUrl, mode, unit }: Props) {
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [draftResponses, setDraftResponses] = useState<Record<string, string>>({});
  const [showAllSolutions, setShowAllSolutions] = useState(false);

  const sectionInfo = SECTION_META[mode];
  const items =
    mode === 'crqs' ? unit.crqs : mode === 'erqs' ? unit.erqs : unit.numericals;
  const totalMarks = items.reduce((acc, i) => acc + (i.marks || 0), 0);
  const examYears = [...new Set(items.map(i => i.examYear).filter(Boolean))].sort();

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const crqErqItems = mode === 'numericals' ? [] : (items as typeof unit.crqs);
  const numericalItems = mode === 'numericals' ? (items as typeof unit.numericals) : [];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: SANS }}>
      {/* Exam-paper masthead */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '2px solid var(--text-color, #111827)',
          borderRadius: '4px',
          padding: '1.75rem 2rem 1.25rem 2rem',
          marginBottom: '1.25rem',
          textAlign: 'center',
          fontFamily: SERIF,
          color: 'var(--text-color, #111827)',
        }}
      >
        <h1 style={{ fontFamily: SERIF, color: 'var(--text-color, #111827)', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, lineHeight: 1.35 }}>
          {board.fullName}
        </h1>
        <div style={{ fontSize: '0.9rem', marginTop: '3px' }}>
          SECONDARY SCHOOL CERTIFICATE · {classDef.name}
        </div>
        <div style={{ fontSize: '0.9rem', marginTop: '3px' }}>
          {examYears.length > 1
            ? `ANNUAL EXAMINATIONS ${examYears[0]} & ${examYears[examYears.length - 1]} (THEORY)`
            : examYears.length === 1
              ? `ANNUAL EXAMINATIONS ${examYears[0]} (THEORY)`
              : 'EXAMINATION PREPARATION MATERIAL (THEORY)'}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '6px' }}>
          {sectionInfo.paperLine}
        </div>
        <div
          style={{
            marginTop: '0.9rem',
            paddingTop: '0.65rem',
            borderTop: '1.5px solid var(--text-color, #111827)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h2 style={{ fontFamily: SERIF, color: 'var(--text-color, #111827)', fontSize: '0.9rem', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
            Unit {unit.unitNumber}: {unit.name}
          </h2>
          <span style={{ fontFamily: SANS, fontSize: '0.78rem', fontWeight: 700, color: '#0b5e4a' }}>
            {items.length} {sectionInfo.kind} Items · {totalMarks} Marks Total
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        <Link
          href={`${baseUrl}/${mode}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--card-bg, #ffffff)',
            color: '#0b5e4a',
            border: '1.5px solid #0b5e4a',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={15} />
          <span>All Chapters — {meta.title} {sectionInfo.kind}s</span>
        </Link>

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
      </div>

      {/* Question sheets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', fontFamily: SERIF }}>
        {mode === 'numericals'
          ? numericalItems.map(item => {
              const isOpen = showAllSolutions || revealedIds[item.id];
              return (
                <article
                  key={item.id}
                  style={{
                    background: 'var(--card-bg, #ffffff)',
                    border: '1.5px solid var(--text-color, #111827)',
                    borderRadius: '4px',
                    padding: '1.5rem 1.75rem',
                  }}
                >
                  {/* Exam header: question number box + source paper + marks */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      borderBottom: '1.5px solid var(--text-color, #111827)',
                      paddingBottom: '0.7rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          border: '1.5px solid var(--text-color, #111827)',
                          borderRadius: '3px',
                          minWidth: '54px',
                          textAlign: 'center',
                          padding: '1px 8px',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--text-color, #111827)',
                        }}
                      >
                        {item.questionNumber}
                      </span>
                      {item.sourceHref ? (
                        <Link
                          href={item.sourceHref}
                          style={{
                            fontFamily: SANS,
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          {item.sourceTitle} ↗
                        </Link>
                      ) : (
                        <span style={{ fontFamily: SANS, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-light, #475569)' }}>
                          {item.sourceTitle}
                        </span>
                      )}
                      {item.currentSlo && (
                        <Link
                          href={`${baseUrl}/syllabus#slo-${item.currentSlo}`}
                          title={item.currentSloDescription}
                          style={{
                            fontFamily: SANS,
                            background: '#ecfdf5',
                            color: '#0b5e4a',
                            border: '1px solid #a7f3d0',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                          }}
                        >
                          2025 SLO {item.currentSlo} ↗
                        </Link>
                      )}
                    </div>

                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color, #111827)' }}>[{item.marks}]</span>
                  </div>

                  {item.currentSloDescription && (
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: '0.8rem',
                        color: '#475569',
                        marginBottom: '0.85rem',
                        background: '#f8fafc',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                      }}
                    >
                      <strong>2025 Syllabus Outcome ({item.currentSlo}):</strong> {item.currentSloDescription}
                    </div>
                  )}

                  <div style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-color, #1f2937)', lineHeight: 1.7, marginBottom: '0.9rem' }}>
                    <StructuredContent text={item.problem} />
                  </div>

                  {item.diagramUrl && (
                    <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                      <img
                        src={item.diagramUrl}
                        alt={`Diagram for ${item.questionNumber}`}
                        style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', background: '#ffffff' }}
                      />
                    </div>
                  )}

                  {item.formula && (
                    <div style={{ fontFamily: SANS, marginBottom: '0.85rem', fontSize: '0.88rem', color: '#0369a1', background: '#f0f9ff', padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      <strong>Key Formula: </strong>
                      <MathText text={item.formula} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleReveal(item.id)}
                    style={{
                      fontFamily: SANS,
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
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '6px', padding: '1.15rem' }}>
                      {item.rubric && item.rubric.length > 0 && (
                        <div style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #bbf7d0' }}>
                          <div style={{ fontFamily: SANS, fontSize: '0.82rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem' }}>
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
                      <div style={{ fontSize: '0.98rem', color: '#14532d', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                        <StructuredContent text={item.solution} />
                      </div>
                      {item.betterResponseImage && (
                        <div style={{ marginTop: '0.85rem' }}>
                          <div style={{ fontFamily: SANS, fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.3rem' }}>
                            Authentic E-Marking Better Candidate Calculation Script:
                          </div>
                          <img
                            src={item.betterResponseImage}
                            alt={`Better candidate calculation for ${item.questionNumber}`}
                            style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #86efac', background: '#ffffff', padding: '4px' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          : crqErqItems.map(item => {
              const isOpen = showAllSolutions || revealedIds[item.id];
              return (
                <article
                  key={item.id}
                  style={{
                    background: 'var(--card-bg, #ffffff)',
                    border: '1.5px solid var(--text-color, #111827)',
                    borderRadius: '4px',
                    padding: '1.5rem 1.75rem',
                  }}
                >
                  {/* Exam header: question number box + source paper + marks */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      borderBottom: '1.5px solid var(--text-color, #111827)',
                      paddingBottom: '0.7rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          border: '1.5px solid var(--text-color, #111827)',
                          borderRadius: '3px',
                          minWidth: '54px',
                          textAlign: 'center',
                          padding: '1px 8px',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--text-color, #111827)',
                        }}
                      >
                        {item.questionNumber}
                      </span>
                      {item.sourceHref ? (
                        <Link
                          href={item.sourceHref}
                          style={{
                            fontFamily: SANS,
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          {item.sourceTitle} ↗
                        </Link>
                      ) : (
                        <span style={{ fontFamily: SANS, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-light, #475569)' }}>
                          {item.sourceTitle}
                        </span>
                      )}
                      {item.currentSlo ? (
                        <Link
                          href={`${baseUrl}/syllabus#slo-${item.currentSlo}`}
                          title={item.currentSloDescription}
                          style={{
                            fontFamily: SANS,
                            background: '#ecfdf5',
                            color: '#0b5e4a',
                            border: '1px solid #a7f3d0',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                          }}
                        >
                          Current 2025 SLO {item.currentSlo} ↗
                        </Link>
                      ) : item.outOfSyllabus ? (
                        <span style={{ fontFamily: SANS, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 600 }}>
                          Out of 2025 Syllabus
                        </span>
                      ) : null}
                    </div>

                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color, #111827)' }}>
                      [{item.marks}] · Level {item.cognitiveLevel || 'U'}
                    </span>
                  </div>

                  {item.currentSloDescription && (
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: '0.8rem',
                        color: '#475569',
                        marginBottom: '0.85rem',
                        background: '#f8fafc',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                      }}
                    >
                      <strong>2025 Syllabus Outcome ({item.currentSlo}):</strong> {item.currentSloDescription}
                    </div>
                  )}

                  <div style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-color, #1f2937)', lineHeight: 1.7, marginBottom: '1rem' }}>
                    <StructuredContent text={item.questionText} />
                  </div>

                  {item.diagramUrl && (
                    <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                      <img
                        src={item.diagramUrl}
                        alt={`Diagram for ${item.questionNumber}`}
                        style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', background: '#ffffff' }}
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
                        borderRadius: '6px',
                        border: '1px dashed #94a3b8',
                        fontSize: '0.88rem',
                        fontFamily: SANS,
                        background: '#fafafa',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleReveal(item.id)}
                    style={{
                      fontFamily: SANS,
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
                        <div style={{ fontFamily: SANS, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.9rem 1.15rem' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-color, #0f172a)', marginBottom: '0.35rem' }}>
                            📋 Official Checking Hints (Marking Rubric · {item.marks} Marks)
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', color: 'var(--text-light, #334155)', lineHeight: 1.5 }}>
                            {item.rubric.map((r, rIdx) => (
                              <li key={rIdx}>
                                <MathText text={r.description} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '6px', padding: '1.15rem' }}>
                        <div style={{ fontFamily: SANS, fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '0.45rem' }}>
                          ✓ MODEL SOLUTION (Full Marks Guidance)
                        </div>
                        <div style={{ fontSize: '0.98rem', color: '#14532d', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                          <StructuredContent text={item.modelAnswer} />
                        </div>
                        {item.betterResponse && item.betterResponse !== item.modelAnswer && (
                          <p style={{ fontFamily: SANS, margin: '0.7rem 0 0 0', fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                            <strong>Examiner Commentary (Better Responses):</strong> {item.betterResponse}
                          </p>
                        )}
                        {item.betterResponseImage && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ fontFamily: SANS, fontSize: '0.76rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                              Authentic E-Marking Better Candidate Script:
                            </div>
                            <img
                              src={item.betterResponseImage}
                              alt={`Better candidate script for ${item.questionNumber}`}
                              style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #86efac', background: '#ffffff', padding: '4px' }}
                            />
                          </div>
                        )}
                      </div>

                      {(item.weakerResponse || item.weakerResponseImage) && (
                        <div style={{ fontFamily: SANS, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '6px', padding: '1.15rem' }}>
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
                                style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #fcd34d', background: '#ffffff', padding: '4px' }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {item.suggestions && (
                        <div style={{ fontFamily: SANS, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0f766e', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
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
    </div>
  );
}
