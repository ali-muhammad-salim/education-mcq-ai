'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Award, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, 
  RotateCcw, Eye, Sparkles, Filter 
} from 'lucide-react';
import { BoardInfo, ClassDefinition } from '@/lib/boardHierarchy';
import { SubjectMeta } from '@/lib/subjectMetadata';

interface Props {
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  questions: any[];
}

export default function McqsClient({ board, classDef, meta, baseUrl, questions }: Props) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'Remembering' | 'Understanding' | 'Application' | 'diagram'>('all');

  const filteredQuestions = questions.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'diagram') return q.isDiagram;
    return q.cognitiveLevel === filter;
  });

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
    const q = questions.find(item => item.questionNumber === parseInt(qNum));
    return q && q.correctAnswer === choice;
  }).length;

  return (
    <div>
      {/* Banner */}
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
              PRACTICE QUESTION BANK
            </span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {meta.title} Interactive MCQs ({questions.length} Items)
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Solve official multiple-choice questions with instant scoring, diagram viewing, detailed rationales, and cognitive level filters (Remembering, Understanding, Application).
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
            <Link
              href={`${baseUrl}/model-papers`}
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
              <span>View Full Model Paper I</span>
              <ArrowRight size={16} />
            </Link>
          </div>
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
              {answeredCount} / {questions.length}
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
          {[
            { id: 'all', label: `All (${questions.length})` },
            { id: 'Remembering', label: 'Remembering' },
            { id: 'Understanding', label: 'Understanding' },
            { id: 'Application', label: 'Application' },
            { id: 'diagram', label: 'Diagram Items' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === f.id ? '#0b5e4a' : '#f0f5f2',
                color: filter === f.id ? '#ffffff' : '#0b5e4a',
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

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredQuestions.map(q => {
          const userChoice = selectedAnswers[q.questionNumber];
          const isRevealed = revealedAnswers[q.questionNumber];
          const isAnswered = !!userChoice;
          const isCorrect = userChoice === q.correctAnswer;

          return (
            <div
              key={q.questionNumber}
              style={{
                background: '#ffffff',
                border: isAnswered ? (isCorrect ? '2px solid #86efac' : '2px solid #fca5a5') : '1.5px solid #dce5e1',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}>
                    Q{q.questionNumber}
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
                  {q.unitName && (
                    <span style={{ background: '#f4f7f6', color: '#4b5563', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {q.unitName}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleReveal(q.questionNumber)}
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

              {/* Question Text */}
              <div style={{ fontSize: '1.05rem', color: '#1a2e26', fontWeight: 600, lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {q.questionText}
              </div>

              {/* Diagram if available */}
              {q.diagramUrl && (
                <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                  <img
                    src={q.diagramUrl}
                    alt={`Diagram for Question ${q.questionNumber}`}
                    style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #eef2f0' }}
                  />
                </div>
              )}

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {['A', 'B', 'C', 'D'].map(optKey => {
                  const optText = q.options ? q.options[optKey] : null;
                  if (!optText) return null;

                  const isSelected = userChoice === optKey;
                  const isAnswerKey = q.correctAnswer === optKey;

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
                      onClick={() => handleSelect(q.questionNumber, optKey)}
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
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.4 }}>
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Reveal Explanation Drawer */}
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
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
