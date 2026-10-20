'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, BookOpen, FileText, Award, Calendar, ArrowRight, 
  Sparkles, Layers, ShieldCheck, CheckCircle2, ChevronRight, FlaskConical
} from 'lucide-react';
import { BoardInfo, ClassDefinition } from '@/lib/boardHierarchy';

interface SubjectItem {
  id: string;
  name: string;
  code?: string | null;
  slug: string;
  icon: string;
  description: string;
  chapterCount?: number;
  sloCount?: number;
  papersCount?: number;
  categories: string[];
}

interface Props {
  board: BoardInfo;
  classDef: ClassDefinition;
  initialSubjects: SubjectItem[];
}

export default function ClassSubjectsClient({ board, classDef, initialSubjects }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'science' | 'humanities' | 'languages'>('all');

  const filteredSubjects = initialSubjects.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.categories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'science') {
      const lower = sub.name.toLowerCase();
      return lower.includes('physics') || lower.includes('chemistry') || lower.includes('biology') || lower.includes('math') || lower.includes('computer') || lower.includes('science');
    }
    if (selectedCategory === 'humanities') {
      const lower = sub.name.toLowerCase();
      return lower.includes('business') || lower.includes('economic') || lower.includes('civic') || lower.includes('geography') || lower.includes('history') || lower.includes('pakistan') || lower.includes('account');
    }
    if (selectedCategory === 'languages') {
      const lower = sub.name.toLowerCase();
      return lower.includes('english') || lower.includes('urdu') || lower.includes('islam') || lower.includes('ethic') || lower.includes('literature');
    }

    return true;
  });

  return (
    <div>
      {/* Header Banner */}
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
        {/* Subtle decorative watermark */}
        <div style={{
          position: 'absolute',
          right: '-10px',
          bottom: '-30px',
          fontSize: '11rem',
          fontWeight: 900,
          color: 'rgba(255, 255, 255, 0.04)',
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          {classDef.roman}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <span style={{
              background: '#c9a050',
              color: '#07382c',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              {board.name}
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {classDef.stageLabel}
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {classDef.curriculum}
            </span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {classDef.name} Subjects ({initialSubjects.length})
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Select any subject below to open its dedicated Resource Hub containing verified official syllabuses, model examination papers, chapter-wise MCQs, book PDFs, and complete past paper archives.
          </p>

          {/* Quick Switch Class */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#c9a050', fontWeight: 700 }}>Switch Class:</span>
            {(['IX', 'X', 'XI', 'XII'] as const).map(roman => {
              const isCurrent = roman === classDef.roman;
              const isReady = roman === 'IX' || roman === 'X';

              if (!isReady) {
                return (
                  <span
                    key={roman}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '5px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      opacity: 1,
                      cursor: 'not-allowed',
                      userSelect: 'none'
                    }}
                    title="Class coming soon"
                  >
                    Class {roman} (Soon)
                  </span>
                );
              }

              return (
                <Link
                  key={roman}
                  href={`/${board.id}/${roman}`}
                  style={{
                    background: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                    color: isCurrent ? '#0b5e4a' : '#ffffff',
                    border: isCurrent ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '5px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: isCurrent ? 800 : 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  Class {roman}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #dce5e1',
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
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5a7a6f' }} />
          <input
            type="text"
            placeholder={`Search ${classDef.name} subjects by name or topic...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              borderRadius: '10px',
              border: '1.5px solid #dce5e1',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.15s',
              color: '#1a2e26',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Subjects (${initialSubjects.length})` },
            { id: 'science', label: 'Sciences & Math' },
            { id: 'humanities', label: 'Humanities & Commerce' },
            { id: 'languages', label: 'Languages & Compulsory' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: selectedCategory === tab.id ? '#0b5e4a' : '#f0f5f2',
                color: selectedCategory === tab.id ? '#ffffff' : '#0b5e4a',
                fontWeight: selectedCategory === tab.id ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dce5e1'
        }}>
          <BookOpen size={48} style={{ color: '#9bb8ad', margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#1a2e26', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            No subjects match your search
          </h3>
          <p style={{ color: '#5a7a6f', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
            Try searching for &quot;Physics&quot;, &quot;Chemistry&quot;, &quot;Biology&quot;, or reset your filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            style={{
              background: '#0b5e4a',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {filteredSubjects.map(sub => {
            const isPhysics = sub.slug === 'physics';
            const subjectHubUrl = `/${board.id}/${classDef.roman}/${sub.slug}`;

            return (
              <div
                key={sub.id}
                style={{
                  background: isPhysics ? '#ffffff' : '#f9fafb',
                  border: isPhysics ? '2px solid #0b5e4a' : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  opacity: 1,
                  cursor: isPhysics ? 'default' : 'not-allowed',
                  boxShadow: isPhysics ? '0 6px 20px rgba(11, 94, 74, 0.08)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      fontSize: '2rem',
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: isPhysics ? '#e6f0ed' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {sub.icon}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: isPhysics ? '#1a2e26' : '#4b5563', margin: 0 }}>
                          {sub.name}
                        </h2>
                        <span style={{
                          background: '#f0f5f2',
                          color: '#0b5e4a',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {classDef.stageLabel}
                        </span>
                        {isPhysics ? (
                          <>
                            {sub.papersCount && sub.papersCount > 0 ? (
                              <span style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 800
                              }}>
                                ✓ {sub.papersCount} Papers Live
                              </span>
                            ) : null}
                            <span style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}>
                              ★ Model Papers Live
                            </span>
                          </>
                        ) : (
                          <span style={{
                            background: '#f3f4f6',
                            color: '#6b7280',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            Coming Soon
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.92rem', color: isPhysics ? '#5a7a6f' : '#6b7280', margin: 0, lineHeight: 1.5, maxWidth: '780px' }}>
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div>
                    {isPhysics ? (
                      <Link
                        href={subjectHubUrl}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#0b5e4a',
                          color: '#ffffff',
                          padding: '0.75rem 1.4rem',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          textDecoration: 'none',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(11, 94, 74, 0.15)'
                        }}
                      >
                        <span>Open Resource Hub</span>
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <button
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#e5e7eb',
                          color: '#6b7280',
                          padding: '0.75rem 1.4rem',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          border: 'none',
                          cursor: 'not-allowed',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span>Coming Soon</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories & Quick Jump Links */}
                {isPhysics && (
                  <div style={{
                    borderTop: '1px solid #f0f4f2',
                    paddingTop: '0.9rem',
                    marginTop: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    {/* Category Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#7a968c', fontWeight: 600 }}>Available Resources:</span>
                      {sub.categories.map(cat => (
                        <span
                          key={cat}
                          style={{
                            background: '#f4f7f6',
                            color: '#374151',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Quick Access Direct Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`${subjectHubUrl}/model-papers`}
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📝 Model Papers
                      </Link>
                      <Link
                        href={`${subjectHubUrl}/pastpapers`}
                        style={{
                          background: '#e6f0ed',
                          color: '#0b5e4a',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📑 Past Papers
                      </Link>
                      <Link
                        href={`${subjectHubUrl}/syllabus`}
                        style={{
                          background: '#f4f7f6',
                          color: '#0b5e4a',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📖 Syllabus & SLOs
                      </Link>
                      <Link
                        href={`${subjectHubUrl}/mcqs`}
                        style={{
                          background: '#f4f7f6',
                          color: '#4b5563',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🎯 Chapter MCQs
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
