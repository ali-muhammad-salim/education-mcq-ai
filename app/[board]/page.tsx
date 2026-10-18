import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  GraduationCap, BookOpen, ShieldCheck, ChevronRight, 
  ArrowRight, Award, CheckCircle2, Building2, Sparkles, Layers
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getBoardClasses, SUPPORTED_BOARDS, normalizeBoardId } from '@/lib/boardHierarchy';

interface PageProps {
  params: Promise<{ board: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { board: rawBoard } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const data = await getBoardClasses(boardId);

  if (!data || !data.board) {
    notFound();
  }

  const { board, classes } = data;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, active: true }
        ]}
      />

      {/* Hero Board Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 60%, #157a62 100%)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(11, 94, 74, 0.18)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2.5rem'
      }}>
        {/* Subtle decorative watermark */}
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
          {board.shortCode}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <ShieldCheck size={14} color="#8ce99a" /> OFFICIAL BOARD DIRECTORY
            </span>
            <span style={{
              background: '#c9a050',
              color: '#07382c',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              {board.status}
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {board.tag}
            </span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.75rem 0', letterSpacing: '-0.5px' }}>
            {board.fullName} ({board.shortCode})
          </h1>

          <p style={{ fontSize: '1.1rem', color: '#e6f0ed', margin: 0, maxWidth: '840px', lineHeight: 1.6 }}>
            {board.description} Select an academic class below to access all curriculum subjects, model papers, syllabus breakdowns, and past paper archives.
          </p>

          {/* Quick Board Selector Switcher */}
          <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#c9a050', fontWeight: 700 }}>Switch Board:</span>
            {SUPPORTED_BOARDS.map((b) => {
              const isCurrent = b.id === board.id;
              const isAvailable = b.id === 'akueb';

              if (!isAvailable) {
                return (
                  <span
                    key={b.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      opacity: 0.5,
                      cursor: 'not-allowed',
                      userSelect: 'none'
                    }}
                    title="Board coming soon"
                  >
                    {b.name} (Soon)
                  </span>
                );
              }

              return (
                <Link
                  key={b.id}
                  href={`/${b.id}`}
                  style={{
                    background: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                    color: isCurrent ? '#0b5e4a' : '#ffffff',
                    border: isCurrent ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: isCurrent ? 800 : 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {b.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class Selector Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0b5e4a', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            <Layers size={16} /> Academic Tiers
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1a2e26', margin: 0 }}>
            Select Academic Class
          </h2>
          <p style={{ color: '#5a7a6f', margin: '0.35rem 0 0 0', fontSize: '0.98rem' }}>
            Choose a secondary or higher secondary class to view its dedicated subject directory.
          </p>
        </div>
      </div>

      {/* Classes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {classes.map((cls) => {
          const isClassReady = board.id === 'akueb' && (cls.roman === 'IX' || cls.roman === 'X');

          if (!isClassReady) {
            return (
              <div
                key={cls.roman}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '2rem 1.75rem',
                  opacity: 0.45,
                  cursor: 'not-allowed',
                  userSelect: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '12px',
                      background: '#f3f4f6',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 900
                    }}>
                      {cls.roman}
                    </div>
                    <span style={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      Coming Soon
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#4b5563', margin: '0 0 0.5rem 0' }}>
                    {cls.name}
                  </h3>

                  <p style={{ fontSize: '0.92rem', color: '#6b7280', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
                    {cls.description}
                  </p>
                </div>

                <div>
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '10px',
                      background: '#e5e7eb',
                      color: '#6b7280',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'not-allowed'
                    }}
                  >
                    Curriculum Ingestion Pending
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={cls.roman}
              style={{
                background: '#ffffff',
                border: '2px solid #0b5e4a',
                borderRadius: '16px',
                padding: '2rem 1.75rem',
                boxShadow: '0 10px 25px rgba(11, 94, 74, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#0b5e4a',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderBottomLeftRadius: '10px',
                letterSpacing: '0.05em'
              }}>
                ACTIVE PAPERS & SYLLABUS
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#e6f0ed',
                    color: '#0b5e4a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 900
                  }}>
                    {cls.roman}
                  </div>
                  <span style={{
                    background: '#eef4f1',
                    color: '#0b5e4a',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}>
                    {cls.stageLabel}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.5rem 0' }}>
                  {cls.name}
                </h3>

                <p style={{ fontSize: '0.92rem', color: '#5a7a6f', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
                  {cls.description}
                </p>

                <div style={{
                  background: '#f8faf9',
                  border: '1px solid #eef2f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 600 }}>Total Curriculum Subjects:</span>
                  <span style={{ fontSize: '0.95rem', color: '#0b5e4a', fontWeight: 800 }}>
                    {cls.subjectsCount} Subjects
                  </span>
                </div>
              </div>

              <div>
                <Link
                  href={`/${board.id}/${cls.roman}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    transition: 'background 0.2s, transform 0.15s',
                    boxShadow: '0 4px 12px rgba(11, 94, 74, 0.15)'
                  }}
                >
                  <span>Open {cls.name} Subjects</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Information Banner */}
      <div style={{
        background: '#f4f8f6',
        border: '1px solid #dce8e3',
        borderRadius: '14px',
        padding: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#0b5e4a', color: '#fff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#0b5e4a', fontSize: '1.05rem', fontWeight: 800 }}>
              Curriculum Standard & Verified SLO Mapping
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', color: '#5a7a6f', fontSize: '0.88rem' }}>
              All secondary examination content is verified against Aga Khan University Examination Board national curriculum guidelines.
            </p>
          </div>
        </div>
        <Link
          href={`/${board.id}/IX`}
          style={{
            background: '#ffffff',
            color: '#0b5e4a',
            border: '1px solid #0b5e4a',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          Go directly to Class IX →
        </Link>
      </div>
    </div>
  );
}
