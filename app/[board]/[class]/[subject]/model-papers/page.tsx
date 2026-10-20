import ContentUnavailable from '@/components/ContentUnavailable';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  Award, FileText, Download, ArrowLeft, 
  FlaskConical, ChevronRight, Layers, CheckCircle2
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function ModelPapersPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  if (board.id !== 'akueb' || !['IX', 'X'].includes(classRoman) || meta.slug !== 'physics') return <ContentUnavailable title={classDef.name + ' ' + meta.title + ' resources'} />;
  const isPhysics = meta.slug === 'physics';
  const isClass9 = classRoman === 'IX';

  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;
  const modelPapersBase = `${baseUrl}/model-papers`;

  // Clean, linear list of model papers with hierarchical links
  const papers = [
    {
      id: 'P1',
      code: 'Paper I (P1)',
      title: 'Model Examination Paper I — Multiple Choice Questions (40 MCQs)',
      desc: '40 authentic multiple-choice questions covering Units 1 to 10 with diagrams, calculations, and answer explanations.',
      meta: '40 Marks • 50 Mins',
      href: `${modelPapersBase}/P1`,
      icon: Award,
      actionText: 'Open Paper I (P1)',
      pdfUrl: isClass9 && isPhysics 
        ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf' 
        : (classRoman === 'X' && isPhysics ? '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf' : null)
    },
    {
      id: 'P2',
      code: 'Paper II (P2)',
      title: 'Model Examination Paper II — Constructed & Extended Response (CRQs & ERQs)',
      desc: 'Constructed and extended response questions with study guidance. Refer to the original PDF for section choices and marks.',
      meta: 'Theory • See original PDF',
      href: `${modelPapersBase}/P2`,
      icon: FileText,
      actionText: 'Open Paper II (P2)',
      pdfUrl: isClass9 && isPhysics 
        ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf' 
        : (classRoman === 'X' && isPhysics ? '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf' : null)
    },
    {
      id: 'P3',
      code: 'Paper III (P3)',
      title: 'Sample Practical Examination Paper III — Laboratory Assessment',
      desc: '3-Stage lab exam: apparatus setup and zero-error, data tabulation, and cooling graph plotting.',
      meta: '15 Marks • 1 Hour',
      href: `${modelPapersBase}/P3`,
      icon: FlaskConical,
      actionText: 'Open Paper III (P3)',
      pdfUrl: isClass9 && isPhysics ? '/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf' : null
    }
  ];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Model Examination Papers', active: true }
        ]}
      />

      {/* Clean, Calming Header */}
      <div style={{ marginTop: '0.75rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--primary-color)',
            background: 'var(--primary-light)',
            padding: '3px 10px',
            borderRadius: '6px',
            letterSpacing: '0.3px',
            textTransform: 'uppercase'
          }}>
            {board.name}
          </span>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-light)'
          }}>
            {classDef.name} • {classDef.stageLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>📝</span>
          <h1 className="mobile-page-title" style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--text-color)',
            margin: 0,
            letterSpacing: '-0.4px'
          }}>
            {meta.title} Model Examination Papers
          </h1>
        </div>

        <p style={{
          color: 'var(--text-light)',
          fontSize: '0.98rem',
          margin: '0.5rem 0 0 0',
          lineHeight: 1.5
        }}>
          Official benchmark model examination papers showing question formats, mark allocations, and cognitive levels.
        </p>

        {/* Compact, Calm Scheme of Assessment Pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem',
          marginTop: '1rem'
        }}>
          <div style={{
            background: 'var(--surface-muted)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            color: '#334155'
          }}>
            <strong style={{ color: 'var(--primary-color)' }}>Paper I:</strong> 40 MCQs (40 Marks • 50 Mins)
          </div>
          <div style={{
            background: 'var(--surface-muted)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            color: '#334155'
          }}>
            <strong style={{ color: 'var(--primary-color)' }}>Paper II:</strong> CRQs & ERQs (see original PDF)
          </div>
          <div style={{
            background: 'var(--surface-muted)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            color: '#334155'
          }}>
            <strong style={{ color: 'var(--primary-color)' }}>Paper III:</strong> Practical (15 Marks • 1 Hour)
          </div>
          <div style={{
            background: 'var(--primary-light)',
            border: '1px solid #c2e2d7',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            color: 'var(--text-color)',
            fontWeight: 700
          }}>
            Refer to each original paper for examination specifications
          </div>
        </div>
      </div>

      {/* The List of Lines for Model Papers */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        marginBottom: '2rem'
      }}>
        {papers.map((paper, index) => {
          const Icon = paper.icon;
          const isLast = index === papers.length - 1;

          return (
            <div
              key={paper.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.2rem 1.4rem',
                borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                transition: 'background-color 0.15s ease'
              }}
              className="paper-list-item"
            >
              {/* Left Column: Icon + Code + Title + Desc */}
              <Link
                href={paper.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textDecoration: 'none',
                  flex: 1,
                  minWidth: 0,
                  marginRight: '1rem'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: 'var(--surface-muted)',
                  border: '1px solid #e2e8f0',
                  color: 'var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary-color)',
                      background: 'var(--primary-light)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {paper.code}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>
                      {paper.meta}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'var(--text-color)',
                    marginBottom: '0.15rem'
                  }}>
                    {paper.title}
                  </div>

                  <div style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-light)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {paper.desc}
                  </div>
                </div>
              </Link>

              {/* Right Column: Direct PDF + Main Link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                {paper.pdfUrl && (
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Download ${paper.code} PDF`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-color)',
                      background: 'var(--surface-muted)',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.15s ease'
                    }}
                    className="direct-pdf-btn"
                  >
                    <Download size={13} />
                    <span>PDF</span>
                  </a>
                )}

                <Link
                  href={paper.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.5rem 0.95rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: 'var(--primary-color)',
                    background: 'var(--primary-light)',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="open-link-btn"
                >
                  <span>{paper.actionText}</span>
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Back Link to Subject Hub */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href={baseUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-light)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to {meta.title} Hub</span>
        </Link>
      </div>

      {/* Embedded CSS for Hover Interactions */}
      <style dangerouslySetInnerHTML={{ __html: `
        .paper-list-item:hover {
          background-color: var(--surface-muted);
        }
        .paper-list-item:hover .open-link-btn {
          background-color: var(--action-bg);
          color: #ffffff;
        }
        .direct-pdf-btn:hover {
          background-color: var(--surface-muted);
          color: var(--text-color);
        }
        @media (max-width: 640px) {
          .paper-list-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.8rem;
            padding: 1rem !important;
          }
          .paper-list-item > div:last-child {
            width: 100%;
            justify-content: flex-end;
          }
          .paper-list-item .open-link-btn {
            flex: 1;
            justify-content: center;
          }
        }
      ` }} />
    </div>
  );
}
