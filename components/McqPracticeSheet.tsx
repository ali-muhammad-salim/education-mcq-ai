'use client';

import { paperCropUrl } from '@/lib/paperCropUrl';
import React, { useState } from 'react';
import { ArrowLeft, Award, BookOpen, CheckCircle2, Eye, EyeOff, Pencil, XCircle } from 'lucide-react';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import McqOptionReasons from '@/components/McqOptionReasons';
import styles from './Practice.module.css';

export type PracticeFilter = 'all' | 'Remembering' | 'Understanding' | 'Application' | 'diagram';

export interface PracticeItem {
  key: string;
  anchor?: string;
  stem: string;
  options: Record<string, string>;
  correct?: string;
  correctOptions?: string[];
  unscored?: boolean;
  revealInPreview?: boolean;
  solution: string;
  optionFeedback?: unknown;
  diagram?: string | null;
  meta: React.ReactNode;
}

interface McqPracticeSheetProps {
  title: string;
  items: PracticeItem[];
  onBack: () => void;
  backLabel?: string;
  boardName: string;
  certificate: string;
  paperLine: string;
  filter: PracticeFilter;
  onFilter: (filter: PracticeFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  onTakeQuiz: () => void;
  readOnly?: boolean;
}

const FILTERS: { id: PracticeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Remembering', label: 'Remembering' },
  { id: 'Understanding', label: 'Understanding' },
  { id: 'Application', label: 'Application' },
  { id: 'diagram', label: 'Diagram Items' },
];

function feedbackFor(feedback: unknown, key: string): string {
  if (!Array.isArray(feedback)) return '';
  const match = feedback.find((entry: any) => String(entry?.key ?? entry?.option ?? '').toUpperCase() === key);
  return String(match?.reason ?? match?.feedback ?? '');
}

export default function McqPracticeSheet({
  title,
  items,
  onBack,
  backLabel = 'All Categories',
  boardName,
  certificate,
  paperLine,
  filter,
  onFilter,
  search,
  onSearch,
  onTakeQuiz,
  readOnly = false,
}: McqPracticeSheetProps) {
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});

  const checkedQuestionCount = items.filter(item => checkedAnswers[item.key]).length;
  const practiceCorrect = items.filter(item => checkedAnswers[item.key] &&
    (item.correctOptions ? item.correctOptions.includes(userAnswers[item.key]) : userAnswers[item.key] === item.correct)).length;

  const toggleReveal = (key: string) => setRevealedAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  const selectOption = (key: string, option: string) => {
    if (checkedAnswers[key]) return;
    setUserAnswers(prev => ({ ...prev, [key]: option }));
  };
  const checkAnswer = (key: string) => setCheckedAnswers(prev => ({ ...prev, [key]: true }));
  const resetPractice = () => {
    setUserAnswers({});
    setCheckedAnswers({});
  };

  return (
    <div>
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
            onClick={onBack}
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
            <span>{backLabel}</span>
          </button>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            {title}
          </h2>
        </div>


      </div>

      {!readOnly && <div className={styles.sheetControls} role="group" aria-label="MCQ practice controls">
        <button
          type="button"
          onClick={() => setShowAllAnswers(prev => !prev)}
          className={styles.sheetControl}
          aria-label="Show correct answers"
          aria-pressed={showAllAnswers}
        >
          {showAllAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span className={styles.sheetControlFull}>{showAllAnswers ? 'Hide answers' : 'Show answers'}</span>
          <span className={styles.sheetControlShort}>Answers</span>
        </button>

        <button
          type="button"
          onClick={() => setInteractiveMode(prev => !prev)}
          className={styles.sheetControl}
          aria-pressed={interactiveMode}
        >
          <Pencil size={16} aria-hidden="true" />
          <span>Practice</span>
        </button>

        <button
          type="button"
          disabled={!items.length}
          onClick={onTakeQuiz}
          className={`${styles.sheetControl} ${styles.sheetQuiz}`}
          aria-label="Start quiz"
        >
          <Award size={16} aria-hidden="true" />
          <span className={styles.sheetControlFull}>Start quiz</span>
          <span className={styles.sheetControlShort}>Quiz</span>
        </button>
      </div>}

      {/* Browse filter bar — read-only preview unless Practice Mode is on */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1.5px solid var(--border-color, #dce5e1)',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search questions, typos, synonyms, SLO..."
          style={{
            padding: '0.48rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #dce5e1)',
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--text-color, #111827)',
            fontSize: '0.82rem',
            flex: '1 1 215px',
            minWidth: 0,
            minHeight: '44px'
          }}
        />
        {FILTERS.filter(f => !readOnly || f.id === 'all' || f.id === 'diagram').map(f => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => onFilter(f.id)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: 'none',
              background: filter === f.id ? '#0b5e4a' : 'var(--bg-color, #f0f5f2)',
              color: filter === f.id ? '#ffffff' : 'var(--primary-color, #0b5e4a)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.25rem 0.75rem', fontSize: '0.76rem', color: 'var(--text-light, #4b5563)' }}>
          <strong role="status">Showing {items.length} {items.length === 1 ? 'question' : 'questions'}</strong>
          {!readOnly && <span>{interactiveMode ? 'Select an option, then check your answer' : 'Turn on Practice to answer questions'}</span>}
        </div>
      </div>

      {/* Exam-paper masthead */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1.5px solid var(--text-color, #111827)',
        borderRadius: '4px',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
        fontFamily: "'Times New Roman', Times, serif"
      }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-color, #111827)' }}>
          {boardName}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-light, #374151)', marginTop: '2px' }}>
          {certificate}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-color, #111827)', marginTop: '6px' }}>
          {paperLine}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-light, #4b5563)', marginTop: '2px' }}>
          {title}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {items.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <BookOpen size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
              No questions found for this filter
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
              Try switching back to &quot;All&quot; questions or select another chapter from the directory.
            </p>
            <button
              onClick={() => { onFilter('all'); onSearch(''); }}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#0b5e4a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Show All Questions
            </button>
          </div>
        ) : (
          items.map((item, idx) => {
            const rowKey = item.key;
            const isRevealed = revealedAnswers[rowKey];
            const accepted = item.correctOptions ?? (item.correct ? [item.correct] : []);
            const correctKey = accepted.join(' or ');
            const correctLabel = accepted.length > 1 ? 'Correct options' : 'Correct option';
            const selectedOpt = userAnswers[rowKey];
            const isChecked = Boolean(checkedAnswers[rowKey]);
            const isCorrect = isChecked && accepted.includes(selectedOpt);
            const optionsObj = item.options;
            const solutionText = item.solution;
            const optionReview = <McqOptionReasons accepted={accepted}
              reasons={Object.fromEntries(Object.keys(optionsObj).map(key => [key, feedbackFor(item.optionFeedback, key)]))} />;

            return (
              <div
                key={rowKey}
                id={item.anchor}
                className={styles.questionCard}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #111827',
                  borderRadius: '4px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                  fontFamily: "'Times New Roman', Times, serif, system-ui",
                  color: '#111827'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <div className={styles.questionHeading}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', minWidth: '32px' }}>
                      Q.{idx + 1}.
                    </span>
                    <div style={{ fontSize: '1.1rem', color: '#1f2937', lineHeight: 1.55, minWidth: 0 }}>
                      <StructuredContent text={item.stem} />
                    </div>
                  </div>
                </div>

                {/* Compact provenance + SLO + cognitive row, mirroring the Digital Paper chips */}
                <div className={styles.questionMeta} style={{
                  marginBottom: '0.9rem',
                  padding: '0.4rem 0.7rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.45rem 0.6rem',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  {item.meta}
                  {item.unscored && <span>Unscored</span>}
                </div>

                {item.diagram && (
                  <div className={styles.questionFigure}>
                    <a className="question-figure-link" href={paperCropUrl(item.diagram)} target="_blank" rel="noreferrer" aria-label="Open full-size diagram">
                      <img
                        src={paperCropUrl(item.diagram)}
                        alt={`Diagram for Question ${idx + 1}`}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        loading="lazy"
                      />
                    </a>
                  </div>
                )}

                {/* Options — selectable in Practice Mode, paper layout otherwise */}
                <div className={styles.questionBody} style={{ marginBottom: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {interactiveMode && !item.unscored ? (
                    <div style={{ display: 'grid', gridTemplateColumns: Object.values(optionsObj).some(value => /^\s*\|/m.test(String(value))) ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '0.65rem' }}>
                      {['A', 'B', 'C', 'D'].map(optKey => {
                        const optText = optionsObj[optKey];
                        if (!optText) return null;
                        const isSelected = selectedOpt === optKey;
                        return (
                          <button
                            key={optKey}
                            type="button"
                            disabled={isChecked}
                            onClick={() => selectOption(rowKey, optKey)}
                            style={{
                              textAlign: 'left',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #0b5e4a' : '1px solid #d1d5db',
                              background: isSelected ? '#e6f0ed' : '#ffffff',
                              color: '#1e293b',
                              fontSize: '0.95rem',
                              cursor: isChecked ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem'
                            }}
                          >
                            <strong style={{ color: isSelected ? '#0b5e4a' : '#111827' }}>{optKey}.</strong>
                            <div style={{ flexGrow: 1, minWidth: 0 }}><StructuredContent text={String(optText)} /></div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: Object.values(optionsObj).some(value => /^\s*\|/m.test(String(value))) ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '0.65rem 1.5rem' }}>
                      {['A', 'B', 'C', 'D'].map(optKey => {
                        const optText = optionsObj[optKey];
                        if (!optText) return null;

                        const isAnswerKey = (isRevealed || showAllAnswers) && accepted.includes(optKey);
                        return (
                          <div
                            key={optKey}
                            className={styles.readOption}
                            style={{
                              padding: isAnswerKey ? '8px 12px' : '6px 0',
                              borderRadius: '6px',
                              background: isAnswerKey ? '#dcfce7' : 'transparent',
                              border: isAnswerKey ? '1.5px solid #22c55e' : 'none',
                              color: isAnswerKey ? '#14532d' : '#374151',
                              fontSize: '1rem',
                              lineHeight: 1.5
                            }}
                          >
                            <strong style={{ minWidth: '22px', color: isAnswerKey ? '#166534' : '#111827' }}>
                              {optKey}.
                            </strong>
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <StructuredContent text={String(optText)} />
                            </div>
                            {isAnswerKey && (
                              <span className={styles.correctKey} style={{
                                background: '#16a34a',
                                color: '#fff',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
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

                  {interactiveMode && !item.unscored && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {!isChecked ? (
                        <button
                          type="button"
                          disabled={!selectedOpt || !correctKey}
                          onClick={() => checkAnswer(rowKey)}
                          style={{
                            background: selectedOpt ? '#0b5e4a' : '#e2e8f0',
                            color: selectedOpt ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: selectedOpt ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Check Answer
                        </button>
                      ) : (
                        <div style={{ width: '100%', background: isCorrect ? '#f0fdf4' : '#fff1f2', border: `1.5px solid ${isCorrect ? '#86efac' : '#fecdd3'}`, borderRadius: '10px', padding: '0.9rem 1.1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 800, color: isCorrect ? '#166534' : '#b91c1c', marginBottom: '0.35rem' }}>
                            {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                            <div>{correctLabel} ({correctKey}) {accepted.map(key => <StructuredContent key={key} text={optionsObj[key] || ''} />)}</div>
                          </div>
                          {!isCorrect && selectedOpt && (
                            <div style={{ fontSize: '0.86rem', color: '#b91c1c', marginBottom: '0.35rem', lineHeight: 1.5 }}>
                              <strong>Why Option ({selectedOpt}) is incorrect: </strong>
                              <MathText text={feedbackFor(item.optionFeedback, selectedOpt) || 'A reason for this choice is pending review.'} />
                            </div>
                          )}
                          <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.55 }}>
                            <strong>{correctLabel} ({correctKey}) </strong>
                            <MathText text={solutionText} />
                          </div>
                          {optionReview}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Solution — answer sheet when "Show correct answer only" is on, toggle otherwise */}
                {(!readOnly || item.revealInPreview) && <div className={styles.questionBody} style={{ marginTop: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {showAllAnswers ? (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '8px',
                      padding: '1rem 1.25rem',
                      color: '#14532d'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#166534',
                          background: '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Answer sheet: {correctKey || (item.unscored ? 'No valid option' : 'Review pending')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
                        <MathText text={solutionText} />
                        {optionReview}
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleReveal(rowKey)}
                        aria-expanded={Boolean(isRevealed)}
                        style={{
                          background: isRevealed ? '#e6f0ed' : '#f3f4f6',
                          color: isRevealed ? '#0b5e4a' : '#4b5563',
                          border: '1px solid',
                          borderColor: isRevealed ? '#b7dfd2' : '#d1d5db',
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
                        {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                        {isRevealed ? 'Hide Solution' : 'View Solution & Key'}
                      </button>

                      {isRevealed && (
                        <div style={{
                          marginTop: '0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          color: '#1e293b'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              color: '#166534',
                              background: '#dcfce7',
                              padding: '3px 8px',
                              borderRadius: '4px'
                            }}>
                              {correctLabel}: {correctKey || 'Review pending'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
                            <MathText text={solutionText} />
                            {optionReview}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>}
              </div>
            );
          })
        )}
      </div>

      {interactiveMode && (
        <div role="status" style={{ marginTop: '1rem', padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1.5px solid var(--border-color, #dce5e1)', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', color: 'var(--text-color, #111827)' }}>
          <strong>Practice score: {practiceCorrect} / {checkedQuestionCount} checked</strong>
          <button
            type="button"
            onClick={resetPractice}
            style={{ padding: '.65rem 1rem', borderRadius: 8, border: '1px solid var(--border-color, #dce5e1)', background: 'var(--card-bg, #ffffff)', color: 'var(--text-color, #111827)', fontWeight: 700, cursor: 'pointer' }}
          >
            Reset practice
          </button>
        </div>
      )}
    </div>
  );
}
