import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  BookOpen, FileText, Download, Award, 
  FlaskConical, ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectHubPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  const isPhysics = meta.slug === 'physics';
  const isClass9 = classRoman === 'IX';

  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  // Clean, linear list of resources
  const resources = [
    {
      id: 'syllabus',
      title: 'Syllabus',
      desc: 'Official curriculum guidelines, unit breakdown, and Student Learning Outcomes (SLOs).',
      href: `${baseUrl}/syllabus`,
      icon: BookOpen,
      actionText: 'View Syllabus',
      pdfUrl: isClass9 && isPhysics ? '/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf' : null
    },
    {
      id: 'model-paper',
      title: 'Model Paper',
      desc: 'Official model examination papers (Paper I MCQs, Paper II CRQs/ERQs, & Practical Paper III).',
      href: `${baseUrl}/model-papers`,
      icon: Award,
      actionText: 'View Model Papers',
      pdfUrl: isClass9 && isPhysics ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf' : null
    },
    {
      id: 'past-papers',
      title: 'Past Papers',
      desc: 'Annual board past examination papers with verified solutions and interactive practice.',
      href: `${baseUrl}/pastpapers`,
      icon: FileText,
      actionText: 'Open Past Papers',
      pdfUrl: null
    },
    {
      id: 'mcqs',
      title: 'MCQs',
      desc: 'Chapter-wise multiple choice questions with explanations, diagrams, and instant scoring.',
      href: `${baseUrl}/mcqs`,
      icon: CheckCircle2,
      actionText: 'Practice MCQs',
      pdfUrl: null
    },
    {
      id: 'book-pdf',
      title: 'Book PDF',
      desc: 'Prescribed textbooks, curriculum concordance (PCTB, Sindh, CANTAB), and reference books.',
      href: `${baseUrl}/books`,
      icon: Download,
      actionText: 'View Book PDFs',
      pdfUrl: null
    },
    {
      id: 'practicals',
      title: 'Practicals',
      desc: 'Official laboratory experiments, apparatus requirements, observation tables, and rubrics.',
      href: `${baseUrl}/practicals`,
      icon: FlaskConical,
      actionText: 'View Practicals',
      pdfUrl: isClass9 && isPhysics ? '/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf' : null
    }
  ];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, active: true }
        ]}
      />

      {/* Clean, Calming Header */}
      <div style={{ marginTop: '0.75rem', marginBottom: '2rem' }}>
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
          <span style={{ fontSize: '2rem' }}>{meta.icon}</span>
          <h1 className="mobile-page-title" style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--text-color)',
            margin: 0,
            letterSpacing: '-0.4px'
          }}>
            {meta.title}
          </h1>
        </div>

        <p style={{
          color: 'var(--text-light)',
          fontSize: '0.98rem',
          margin: '0.5rem 0 0 0',
          lineHeight: 1.5
        }}>
          Select a resource below to access official study material, practice questions, and past examination papers.
        </p>
      </div>

      {/* The List of Lines (Simple, Stress-Free Resource List) */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        {resources.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === resources.length - 1;

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.15rem 1.4rem',
                borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                transition: 'background-color 0.15s ease'
              }}
              className="resource-list-item"
            >
              {/* Left Column: Icon + Title + Description */}
              <Link
                href={item.href}
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
                  width: '40px',
                  height: '40px',
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
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'var(--text-color)',
                    marginBottom: '0.15rem'
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-light)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.desc}
                  </div>
                </div>
              </Link>

              {/* Right Column: Actions (Optional Direct PDF + Main Arrow Link) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                {item.pdfUrl && (
                  <a
                    href={item.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Download ${item.title} PDF directly`}
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
                  href={item.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
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
                  <span>{item.actionText}</span>
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded CSS for Hover Interactions and Clean Aesthetics */}
      <style dangerouslySetInnerHTML={{ __html: `
        .resource-list-item:hover {
          background-color: var(--surface-muted);
        }
        .resource-list-item:hover .open-link-btn {
          background-color: var(--action-bg);
          color: #ffffff;
        }
        .direct-pdf-btn:hover {
          background-color: var(--surface-muted);
          color: var(--text-color);
        }
        @media (max-width: 640px) {
          .resource-list-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.8rem;
            padding: 1rem !important;
          }
          .resource-list-item > div:last-child {
            width: 100%;
            justify-content: flex-end;
          }
          .resource-list-item .open-link-btn {
            flex: 1;
            justify-content: center;
          }
        }
      ` }} />
    </div>
  );
}
