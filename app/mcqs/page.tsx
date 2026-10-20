import { getFallbackPaper } from '@/lib/paperDataService';
import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { Award, CheckCircle2, Download, Sparkles, ArrowRight, HelpCircle } from 'lucide-react';
import MathText from '@/components/MathText';
import Breadcrumbs from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function McqBankPage() {
  const mcqs: any[] = await prisma.pastPaperQuestion.findMany({
    where: { questionType: { in: ['MCQ_SINGLE', 'MULTIPLE_CHOICE'] } },
    include: {
      pastPaper: {
        include: { academicClass: true }
      }
    },
    orderBy: [
      { pastPaper: { paperCode: 'asc' } },
      { questionNumber: 'asc' }
    ]
  });

  if (!mcqs.length) for (const code of ['PHY-IX-P1', 'PHY-X-P1']) { const paper = getFallbackPaper(code); if (paper) mcqs.push(...paper.questions.map(q => ({ ...q, pastPaper: paper }))); }
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'MCQ Practice Bank', active: true }
        ]}
      />

      <div style={{
        background: 'linear-gradient(135deg, #0b5e4a 0%, #15803d 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        marginBottom: '2.5rem',
        boxShadow: '0 12px 32px rgba(11, 94, 74, 0.15)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '4px 14px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '1rem'
        }}>
          <Sparkles size={14} /> OFFICIAL AI-EXTRACTED MODEL EXAMINATION ITEMS
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>
          Official Physics MCQ Question Bank ({mcqs.length} Items)
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.95, lineHeight: 1.6, margin: '0 0 2rem 0', maxWidth: '800px' }}>
          Practice the available Physics multiple-choice questions for Class IX and X.
          Complete with LaTeX formulas, option sets, answer keys, and step-by-step working.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/model-papers"
            className="btn"
            style={{
              background: '#ffffff',
              color: '#0b5e4a',
              fontWeight: 800,
              padding: '0.75rem 1.5rem',
              borderRadius: '10px'
            }}
          >
            Launch Interactive Exam Simulator →
          </Link>

          <a
            href="/api/model-papers?download=csv"
            download
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              fontWeight: 700,
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Download size={16} /> Export All MCQs to CSV
          </a>
        </div>
      </div>

      {/* MCQs Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {mcqs.map((q, idx) => {
          const src: any = q.sourceRegion || {};
          const choices: Record<string, string> = src.choices || {};
          const paper = q.pastPaper;

          return (
            <div
              key={q.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8e5',
                borderRadius: '14px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {paper?.paperCode || 'EXAM'} • Q.{q.questionNumber}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Class {paper?.academicClass?.name || 'Secondary'}
                  </span>
                </div>

                {q.difficulty && (
                  <span style={{ fontSize: '0.75rem', background: '#eaf2f8', color: '#2980b9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Domain: {q.difficulty}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '1.05rem', color: '#222', lineHeight: 1.5, margin: '0 0 1.25rem 0', fontWeight: 600 }}>
                <MathText text={q.questionText} />
              </div>

              {/* Options */}
              {choices && Object.keys(choices).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {Object.entries(choices).map(([key, text]) => (
                    <div
                      key={key}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#f8faf9',
                        border: '1px solid #e1e8e5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <strong style={{ color: '#0b5e4a' }}>{key}.</strong>
                      <span><MathText text={text} /></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation / Solution */}
              {src.explanation && (
                <div style={{
                  padding: '0.85rem 1rem',
                  background: '#f4fbf7',
                  borderLeft: '4px solid #0b5e4a',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#1a3b32',
                  lineHeight: 1.5
                }}>
                  <strong>Answer & Explanation:</strong> <MathText text={src.explanation} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
