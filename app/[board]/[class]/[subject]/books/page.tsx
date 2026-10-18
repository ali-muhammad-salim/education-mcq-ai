import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  BookOpen, Download, ExternalLink, ArrowLeft, ArrowRight, 
  CheckCircle2, Sparkles, FileText, Layers
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectBooksPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const textbooks = [
    {
      title: "Punjab Curriculum and Textbook Board (PCTB) Physics 9",
      publisher: "Punjab Curriculum & Textbook Board, Lahore",
      badge: "Primary Reference",
      desc: "Official national curriculum textbook covering measurement, kinematics, dynamics, gravitation, work & energy, matter properties, and heat.",
      concordance: "Aligned with AKU-EB Units 1 to 10"
    },
    {
      title: "Sindh Textbook Board (STBB) Physics Grade IX",
      publisher: "Sindh Textbook Board, Jamshoro",
      badge: "Provincial Standard",
      desc: "Curriculum textbook with numerical problem sets, experimental activities, and end-of-chapter conceptual questions.",
      concordance: "Aligned with AKU-EB Units 1 to 10"
    },
    {
      title: "CANTAB Publisher Secondary Physics 9",
      publisher: "CANTAB Research & Publications",
      badge: "SLO Concordance",
      desc: "Modern illustrated guide with diagram questions and structured student learning outcome tables.",
      concordance: "Aligned with Student Learning Outcomes"
    },
    {
      title: "GCE O-Level Physics by Charles Chew & Leong See Cheng",
      publisher: "Federal Publications / Marshall Cavendish",
      badge: "Conceptual Reference",
      desc: "Internationally renowned conceptual physics textbook used by AKU-EB educators for deep understanding and application-level question design.",
      concordance: "Reference for Application Domain"
    }
  ];

  const resourcePdfUrl = '/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-i-physics-dedicated.pdf';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Textbooks & Book PDFs', active: true }
        ]}
      />

      {/* Header */}
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
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <span style={{ background: '#c9a050', color: '#07382c', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              {board.name}
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              {classDef.name} ({classDef.stageLabel})
            </span>
            <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              BOOK REFERENCES & CONCORDANCE
            </span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {meta.title} Textbooks & Official Concordance
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Official textbook chapter concordance guide approved by {board.fullName}. Shows exact chapter mappings between provincial textbooks, national curriculum, and O-Level references.
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
              href={resourcePdfUrl}
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
              <span>Download Resources & Book Concordance PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Textbook Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {textbooks.map((b, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              border: '1.5px solid #dce5e1',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  background: '#e6f0ed',
                  color: '#0b5e4a',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {b.badge}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#5a7a6f', fontWeight: 600 }}>
                  {b.concordance}
                </span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.35rem 0' }}>
                {b.title}
              </h2>

              <div style={{ fontSize: '0.85rem', color: '#0b5e4a', fontWeight: 600, marginBottom: '0.75rem' }}>
                {b.publisher}
              </div>

              <p style={{ fontSize: '0.9rem', color: '#5a7a6f', lineHeight: 1.55, margin: 0 }}>
                {b.desc}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #f0f4f2', paddingTop: '1rem', marginTop: '1.25rem' }}>
              <a
                href={resourcePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#0b5e4a',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none'
                }}
              >
                <span>View Concordance in Resource Guide</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
