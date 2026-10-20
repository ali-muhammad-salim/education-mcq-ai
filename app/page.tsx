import React from 'react';
import Link from 'next/link';
import { 
  Building2, Sparkles, ShieldCheck, ArrowRight, 
  Layers, Clock, FileText, BookOpen, Atom, CheckCircle2 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BoardDefinition {
  id: string;
  name: string;
  shortCode: string;
  fullName: string;
  isReady: boolean;
  tag: string;
  description: string;
}

const ALL_BOARDS: BoardDefinition[] = [
  {
    id: 'akueb',
    name: 'AKU-EB',
    shortCode: 'AKU-EB',
    fullName: 'Aga Khan University Examination Board',
    isReady: true,
    tag: 'Official Active Board',
    description: 'SLO-based conceptual curriculum, cognitive domain assessments (Remembering, Understanding, Application), and full past paper archives.'
  },
  {
    id: 'sindh',
    name: 'Sindh Board (BSEK / BIEK)',
    shortCode: 'BISE Karachi',
    fullName: 'Board of Secondary & Intermediate Education Karachi',
    isReady: false,
    tag: 'Coming Soon',
    description: 'Sindh provincial examination board curriculum and metric/intermediate examinations.'
  },
  {
    id: 'fbise',
    name: 'Federal Board (FBISE)',
    shortCode: 'FBISE',
    fullName: 'Federal Board of Intermediate & Secondary Education Islamabad',
    isReady: false,
    tag: 'Coming Soon',
    description: 'Federal educational board administering secondary and intermediate examinations across Pakistan.'
  },
  {
    id: 'punjab',
    name: 'Punjab Board (BISE)',
    shortCode: 'BISE Punjab',
    fullName: 'Board of Intermediate & Secondary Education Lahore / Rawalpindi',
    isReady: false,
    tag: 'Coming Soon',
    description: 'Punjab provincial secondary curriculum and examinations board.'
  },
  {
    id: 'kpk',
    name: 'KPK Board (BISE)',
    shortCode: 'BISE KPK',
    fullName: 'Board of Intermediate & Secondary Education Peshawar',
    isReady: false,
    tag: 'Coming Soon',
    description: 'Khyber Pakhtunkhwa provincial examination board curriculum and past papers.'
  },
  {
    id: 'balochistan',
    name: 'Balochistan Board (BISE)',
    shortCode: 'BISE Quetta',
    fullName: 'Board of Intermediate & Secondary Education Quetta',
    isReady: false,
    tag: 'Coming Soon',
    description: 'Balochistan provincial secondary examination board curriculum.'
  }
];

export default function Home() {
  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 55%, #157a62 100%)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        color: '#ffffff',
        textAlign: 'center',
        boxShadow: '0 16px 36px rgba(11, 94, 74, 0.16)',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.18)',
          padding: '6px 18px',
          borderRadius: '30px',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '1.25rem',
          letterSpacing: '0.5px'
        }}>
          <Sparkles size={16} color="#8ce99a" /> OFFICIAL PAKISTAN ACADEMIC BOARDS REPOSITORY
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, margin: '0 0 1rem 0', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Pakistan Examination Boards Portal
        </h1>

        <p style={{ fontSize: '1.15rem', color: '#e6f0ed', maxWidth: '780px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Select your board and academic class to explore official syllabuses, SLO frameworks, model examination papers, and verified past paper archives.
        </p>

        {/* Quick Highlights Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link 
            href="/akueb/IX/physics/pastpapers" 
            style={{ 
              background: '#ffffff', 
              color: '#0b5e4a', 
              fontWeight: 800, 
              padding: '0.75rem 1.6rem', 
              borderRadius: '10px', 
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FileText size={16} /> Past Papers Archive (2025 Annual) →
          </Link>
          <Link 
            href="/akueb/IX/physics/model-papers" 
            style={{ 
              background: '#fef3c7', 
              color: '#92400e', 
              fontWeight: 800, 
              padding: '0.75rem 1.5rem', 
              borderRadius: '10px', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BookOpen size={16} /> Model Examination Papers →
          </Link>
        </div>
      </div>

      {/* TOP REQUIREMENT: LIST OF ALL BOARDS (AKU-EB only clickable, rest Coming Soon with readable status labels) */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={22} color="#0b5e4a" /> Examination Boards
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
              Only ready boards are accessible. Additional educational boards will unlock soon.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
          gap: '1rem'
        }}>
          {ALL_BOARDS.map((board) => {
            const isClickable = board.isReady;

            if (isClickable) {
              return (
                <Link
                  key={board.id}
                  href={`/${board.id}`}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #0b5e4a',
                    borderRadius: '14px',
                    padding: '1.25rem 1.15rem',
                    boxShadow: '0 6px 18px rgba(11, 94, 74, 0.1)',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', background: '#e6f0ed', color: '#0b5e4a', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                        ● {board.tag}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b5e4a' }}>
                        {board.shortCode}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2937', margin: '0 0 0.4rem 0' }}>
                      {board.fullName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.45, margin: 0 }}>
                      {board.description}
                    </p>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0b5e4a', fontWeight: 800, fontSize: '0.85rem' }}>
                    <span>Access Board Resources</span>
                    <ArrowRight size={15} />
                  </div>
                </Link>
              );
            }

            // Non-ready board: readable disabled state & Coming Soon badge
            return (
              <div
                key={board.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '1.25rem 1.15rem',
                  opacity: 1,
                  cursor: 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  userSelect: 'none',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      Coming Soon
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)' }}>
                      {board.shortCode}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.4rem 0' }}>
                    {board.fullName}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.45, margin: 0 }}>
                    {board.description}
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.82rem' }}>
                  <Clock size={14} />
                  <span>Curriculum Ingestion Pending</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* ================================================== */}
      {/* 1. AKU-EB BOARD HEADING & CLASSES CARDS (9, 10, 11, 12) */}
      {/* ================================================== */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e6f0ed',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ background: '#0b5e4a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px' }}>
                ACTIVE REPOSITORY
              </span>
              <span style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.85rem' }}>
                Flagship Curriculum
              </span>
            </div>
            <h2 className="mobile-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: '#0b5e4a', margin: 0 }}>
              Aga Khan University Examination Board (AKU-EB)
            </h2>
            <p style={{ color: 'var(--text-light)', margin: '0.35rem 0 0 0', fontSize: '1rem' }}>
              Official SLO-based syllabus, cognitive domain distribution, model examination papers, and annual solved past papers.
            </p>
          </div>

          <Link
            href="/akueb"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#e6f0ed',
              color: '#0b5e4a',
              fontWeight: 800,
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.88rem'
            }}
          >
            <span>View Full AKU-EB Hub</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* AKU-EB Classes Cards: 9, 10 (Active), 11, 12 (Coming Soon) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))',
          gap: '1.5rem'
        }}>
          {/* Class IX (SSC-I) - Active */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #0b5e4a',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            boxShadow: '0 8px 24px rgba(11, 94, 74, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', background: '#e6f0ed', color: '#0b5e4a', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  SSC Part I • Grade 9
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 800 }}>
                  ✓ Available Now
                </span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.5rem 0' }}>
                Class IX (Grade 9)
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Physics SSC-I resources: syllabus and SLO directory, Model Paper I & II, Practical Paper III, and available 2025 examination papers.
              </p>

              {/* Subject Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  ⚛️ Physics (Active)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  🧪 Chemistry (Soon)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  🧬 Biology (Soon)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  📐 Maths (Soon)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href="/akueb/IX/physics"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Access Class IX Physics Hub →
              </Link>
              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <Link
                  href="/akueb/IX/physics/pastpapers"
                  style={{
                    textAlign: 'center',
                    background: '#f4fbf7',
                    color: '#0b5e4a',
                    border: '1px solid #dce5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  Past Papers
                </Link>
                <Link
                  href="/akueb/IX/physics/model-papers"
                  style={{
                    textAlign: 'center',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  Model Papers
                </Link>
              </div>
            </div>
          </div>

          {/* Class X (SSC-II) - Active */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #0b5e4a',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            boxShadow: '0 8px 24px rgba(11, 94, 74, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', background: '#e6f0ed', color: '#0b5e4a', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  SSC Part II • Grade 10
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 800 }}>
                  ✓ Available Now
                </span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.5rem 0' }}>
                Class X (Grade 10)
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Physics SSC-II resources: syllabus and SLO directory, interactive Model Paper I (MCQs), and Model Paper II theory items.
              </p>

              {/* Subject Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  ⚛️ Physics (Active)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  🧪 Chemistry (Soon)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  🧬 Biology (Soon)
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  📐 Maths (Soon)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href="/akueb/X/physics"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Access Class X Physics Hub →
              </Link>
              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <Link
                  href="/akueb/X/physics/pastpapers"
                  style={{
                    textAlign: 'center',
                    background: '#f4fbf7',
                    color: '#0b5e4a',
                    border: '1px solid #dce5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  Past Papers
                </Link>
                <Link
                  href="/akueb/X/physics/model-papers"
                  style={{
                    textAlign: 'center',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  Model Papers
                </Link>
              </div>
            </div>
          </div>

          {/* Class XI (HSSC-I) - Coming Soon with readable status labels */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            opacity: 1,
            cursor: 'not-allowed',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  HSSC Part I • Grade 11
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700 }}>
                  Coming Soon
                </span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                Class XI (Grade 11)
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Higher Secondary School Certificate curriculum: Pre-Medical, Pre-Engineering, and Computer Science streams.
              </p>
            </div>

            <button
              disabled
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#e5e7eb',
                color: 'var(--text-light)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'not-allowed'
              }}
            >
              Curriculum Coming Soon
            </button>
          </div>

          {/* Class XII (HSSC-II) - Coming Soon with readable status labels */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            opacity: 1,
            cursor: 'not-allowed',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  HSSC Part II • Grade 12
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700 }}>
                  Coming Soon
                </span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                Class XII (Grade 12)
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Higher Secondary School Certificate Part II college exit standards, past papers, and university prep.
              </p>
            </div>

            <button
              disabled
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#e5e7eb',
                color: 'var(--text-light)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'not-allowed'
              }}
            >
              Curriculum Coming Soon
            </button>
          </div>
        </div>
      </section>


      {/* ================================================== */}
      {/* 2. SINDH BOARD HEADING & CLASSES CARDS (Coming Soon) */}
      {/* ================================================== */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #f3f4f6',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ background: 'var(--bg-color)', color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                COMING SOON
              </span>
              <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>
                Provincial Examination Board
              </span>
            </div>
            <h2 className="mobile-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-light)', margin: 0 }}>
              Sindh Board (BSEK / BIEK Karachi)
            </h2>
            <p style={{ color: 'var(--text-light)', margin: '0.35rem 0 0 0', fontSize: '1rem' }}>
              Board of Secondary Education Karachi & Board of Intermediate Education Karachi syllabuses and past examination archives.
            </p>
          </div>

          <span style={{
            background: 'var(--card-bg)',
            color: 'var(--text-light)',
            border: '1px solid #e5e7eb',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            Curriculum Ingestion in Progress
          </span>
        </div>

        {/* Sindh Board Classes Cards (All with low opacity and Coming Soon) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '1.5rem'
        }}>
          {['Class IX (SSC Part I)', 'Class X (SSC Part II)', 'Class XI (HSSC Part I)', 'Class XII (HSSC Part II)'].map((className, idx) => (
            <div
              key={className}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '1.75rem 1.5rem',
                opacity: 1,
                cursor: 'not-allowed',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Grade {idx + 9}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700 }}>
                    Coming Soon
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                  {className}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: 0 }}>
                  Sindh Board syllabus alignment, model papers, and solved 5-year past papers.
                </p>
              </div>

              <button
                disabled
                style={{
                  marginTop: '1.5rem',
                  width: '100%',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  background: '#e5e7eb',
                  color: 'var(--text-light)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'not-allowed'
                }}
              >
                Coming Soon
              </button>
            </div>
          ))}
        </div>
      </section>


      {/* ================================================== */}
      {/* 3. FEDERAL BOARD (FBISE) HEADING & CLASSES CARDS */}
      {/* ================================================== */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #f3f4f6',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ background: 'var(--bg-color)', color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                COMING SOON
              </span>
              <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>
                National Curriculum
              </span>
            </div>
            <h2 className="mobile-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-light)', margin: 0 }}>
              Federal Board (FBISE Islamabad)
            </h2>
            <p style={{ color: 'var(--text-light)', margin: '0.35rem 0 0 0', fontSize: '1rem' }}>
              Federal Board of Intermediate & Secondary Education Islamabad standard SLO framework and exams.
            </p>
          </div>

          <span style={{
            background: 'var(--card-bg)',
            color: 'var(--text-light)',
            border: '1px solid #e5e7eb',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            Curriculum Ingestion Pending
          </span>
        </div>

        {/* Federal Board Classes Cards (Low Opacity, Coming Soon) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '1.5rem'
        }}>
          {['Class IX (SSC Part I)', 'Class X (SSC Part II)', 'Class XI (HSSC Part I)', 'Class XII (HSSC Part II)'].map((className, idx) => (
            <div
              key={className}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '1.75rem 1.5rem',
                opacity: 1,
                cursor: 'not-allowed',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Grade {idx + 9}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700 }}>
                    Coming Soon
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                  {className}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: 0 }}>
                  Federal National Curriculum examination rubrics, question banks, and annual past papers.
                </p>
              </div>

              <button
                disabled
                style={{
                  marginTop: '1.5rem',
                  width: '100%',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  background: '#e5e7eb',
                  color: 'var(--text-light)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'not-allowed'
                }}
              >
                Coming Soon
              </button>
            </div>
          ))}
        </div>
      </section>


      {/* ================================================== */}
      {/* 4. PUNJAB BOARD (BISE) HEADING & CLASSES CARDS */}
      {/* ================================================== */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #f3f4f6',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ background: 'var(--bg-color)', color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                COMING SOON
              </span>
              <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>
                Provincial Board
              </span>
            </div>
            <h2 className="mobile-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-light)', margin: 0 }}>
              Punjab Board (BISE Lahore / Rawalpindi)
            </h2>
            <p style={{ color: 'var(--text-light)', margin: '0.35rem 0 0 0', fontSize: '1rem' }}>
              Boards of Intermediate and Secondary Education across Punjab aligned with PCTB textbooks.
            </p>
          </div>

          <span style={{
            background: 'var(--card-bg)',
            color: 'var(--text-light)',
            border: '1px solid #e5e7eb',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            Curriculum Ingestion Pending
          </span>
        </div>

        {/* Punjab Board Classes Cards (Low Opacity, Coming Soon) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '1.5rem'
        }}>
          {['Class IX (SSC Part I)', 'Class X (SSC Part II)', 'Class XI (HSSC Part I)', 'Class XII (HSSC Part II)'].map((className, idx) => (
            <div
              key={className}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '1.75rem 1.5rem',
                opacity: 1,
                cursor: 'not-allowed',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', background: 'var(--bg-color)', color: 'var(--text-light)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Grade {idx + 9}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700 }}>
                    Coming Soon
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 0.5rem 0' }}>
                  {className}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5, margin: 0 }}>
                  Punjab Curriculum and Textbook Board model papers, MCQs bank, and past examinations.
                </p>
              </div>

              <button
                disabled
                style={{
                  marginTop: '1.5rem',
                  width: '100%',
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  background: '#e5e7eb',
                  color: 'var(--text-light)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'not-allowed'
                }}
              >
                Coming Soon
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
