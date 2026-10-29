'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, ShieldCheck, ArrowRight, Layers, Award, Sparkles
} from 'lucide-react';

export interface SubjectData {
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
  featuredLinks?: { label: string; href: string; badge?: string }[];
}

export interface ClassData {
  id: string;
  slug: string;
  name: string;
  level: number;
  levelLabel: string;
  subjectsCount: number;
  subjects: SubjectData[];
}

export interface BoardData {
  id: string;
  name: string;
  shortCode: string;
  status: string;
  description: string;
  classes: ClassData[];
}

interface HierarchyProps {
  initialBoard: BoardData;
}

export default function BoardClassSubjectHierarchy({ initialBoard }: HierarchyProps) {
  const boardSlug = initialBoard.shortCode.toLowerCase() === 'aku-eb' ? 'akueb' : initialBoard.shortCode.toLowerCase();

  return (
    <div style={{ marginTop: '2.5rem', marginBottom: '4rem' }}>
      
      {/* 1. BOARD HEADER BANNER */}
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
        <div style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-30px',
          fontSize: '11rem',
          fontWeight: 900,
          color: 'rgba(255, 255, 255, 0.04)',
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          {initialBoard.shortCode}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <ShieldCheck size={14} color="#8ce99a" /> OFFICIAL BOARD DIRECTORY
            </span>
            <span style={{
              background: '#c9a050',
              color: '#1a1f1d',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {initialBoard.status}
            </span>
          </div>

          <h2 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.6rem 0', letterSpacing: '-0.5px' }}>
            {initialBoard.name} ({initialBoard.shortCode})
          </h2>
          
          <p style={{ fontSize: '1.08rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '850px', lineHeight: 1.6 }}>
            Select an academic class below to explore verified syllabuses, model examination papers, past paper archives, and chapter-wise question banks.
          </p>
        </div>
      </div>

      {/* 2. ACADEMIC CLASSES SECTION - NO SUBJECTS ON THIS PAGE AS REQUESTED */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0b5e4a', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          <Layers size={16} /> Choose Academic Tier
        </div>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a2e26', margin: 0 }}>
          Secondary & Higher Secondary Classes
        </h3>
        <p style={{ color: '#5a7a6f', margin: '0.3rem 0 0 0', fontSize: '0.95rem' }}>
          Each class features a dedicated curriculum directory containing all official subjects, model papers, and archives.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: '1.5rem'
      }}>
        {initialBoard.classes.map((cls) => {
          const roman = cls.level === 9 ? 'IX' : cls.level === 10 ? 'X' : cls.level === 11 ? 'XI' : 'XII';
          const isFlagship = roman === 'IX' || roman === 'X';
          const classUrl = `/${boardSlug}/${roman}`;

          return (
            <div
              key={cls.slug}
              style={{
                background: '#ffffff',
                border: isFlagship ? '2px solid #0b5e4a' : '1px solid #dce5e1',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: isFlagship ? '0 8px 24px rgba(11, 94, 74, 0.08)' : '0 4px 15px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {isFlagship && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#0b5e4a',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderBottomLeftRadius: '8px'
                }}>
                  ACTIVE PAPERS
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isFlagship ? '#e6f0ed' : '#f4f7f6',
                    color: isFlagship ? '#0b5e4a' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 900
                  }}>
                    {roman}
                  </div>
                  <span style={{
                    background: '#eef4f1',
                    color: '#0b5e4a',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    {cls.levelLabel}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.4rem 0' }}>
                  {cls.name}
                </h4>

                <p style={{ fontSize: '0.9rem', color: '#5a7a6f', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
                  {roman === 'IX' 
                    ? 'Secondary School Certificate Part I foundation year covering core sciences, mathematics, and analytical outcomes.'
                    : roman === 'X'
                    ? 'Secondary School Certificate Part II examination year with comprehensive model papers and past papers.'
                    : roman === 'XI'
                    ? 'Higher Secondary School Certificate Part I pre-medical, engineering, and commerce disciplines.'
                    : 'Higher Secondary School Certificate Part II graduation and examination papers.'}
                </p>

                <div style={{
                  background: '#f8faf9',
                  border: '1px solid #eef2f0',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ color: '#5a7a6f', fontWeight: 600 }}>Total Subjects:</span>
                  <span style={{ color: '#0b5e4a', fontWeight: 800 }}>{cls.subjectsCount} Subjects</span>
                </div>
              </div>

              <div>
                <Link
                  href={classUrl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: isFlagship ? '#0b5e4a' : '#1e3a34',
                    color: '#ffffff',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(11, 94, 74, 0.15)'
                  }}
                >
                  <span>Explore {cls.name} Subjects</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
