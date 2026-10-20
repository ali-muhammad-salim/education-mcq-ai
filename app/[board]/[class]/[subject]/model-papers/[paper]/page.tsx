import ContentUnavailable from '@/components/ContentUnavailable';
import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  ArrowLeft, Download, Award, FileText, 
  FlaskConical, CheckCircle2, ChevronRight, Eye 
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import PaperViewerClient from '@/components/PaperViewerClient';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import prisma from '@/lib/prisma';
import { getFallbackPaper } from '@/lib/paperDataService';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string; paper: string }>;
}

export default async function ModelPaperSubPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject, paper: rawPaper } = await params;
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
  const modelPapersListUrl = `${baseUrl}/model-papers`;

  // Normalize paper parameter (P1, p1, paper-1, P2, p2, P3, p3, etc.)
  const paperUpper = rawPaper.toUpperCase().replace(/\s+/g, '');
  const isP1 = paperUpper === 'P1' || paperUpper === 'PAPER-1' || paperUpper === '1';
  const isP2 = paperUpper === 'P2' || paperUpper === 'PAPER-2' || paperUpper === '2';
  const isP3 = paperUpper === 'P3' || paperUpper === 'PAPER-3' || paperUpper === '3' || paperUpper === 'PRACTICAL';

  if (isP3 && classRoman === 'X') return <ContentUnavailable title="Class X practical examination material" />;
  if (!isP1 && !isP2 && !isP3) {
    notFound();
  }

  // Determine paper metadata based on P1, P2, or P3
  let paperCode = '';
  let paperTitle = '';
  let paperType = '';
  let marksLabel = '';
  let durationLabel = '';
  let pdfUrl = '';

  if (isP1) {
    paperCode = `${meta.code || 'PHY'}-${classRoman}-P1`;
    paperTitle = `${meta.title} ${classDef.name} Model Paper I (MCQ)`;
    paperType = 'Paper I • Multiple Choice Questions';
    marksLabel = '40 Marks';
    durationLabel = '50 Minutes';
    pdfUrl = isClass9 && isPhysics 
      ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf'
      : (classRoman === 'X' && isPhysics ? '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf' : '');
  } else if (isP2) {
    paperCode = `${meta.code || 'PHY'}-${classRoman}-P2`;
    paperTitle = `${meta.title} ${classDef.name} Model Paper II (CRQ & ERQ)`;
    paperType = 'Paper II • Constructed & Extended Response';
    marksLabel = '25 Marks';
    durationLabel = '1 Hour 40 Minutes';
    pdfUrl = isClass9 && isPhysics 
      ? '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf'
      : (classRoman === 'X' && isPhysics ? '/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf' : '');
  } else {
    paperCode = `${meta.code || 'PHY'}-${classRoman}-P3`;
    paperTitle = `${meta.title} ${classDef.name} Sample Practical Examination Paper III`;
    paperType = 'Paper III • Laboratory Assessment';
    marksLabel = '15 Marks';
    durationLabel = '1 Hour';
    pdfUrl = isClass9 && isPhysics 
      ? '/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf'
      : '';
  }

  // Query Database for Paper I or Paper II questions
  let paper = null;
  let sortedQuestions: any[] = [];

  if (isP1 || isP2) {
    try {
      paper = await prisma.pastPaper.findFirst({
        where: {
          OR: [
            { paperCode: paperCode },
            { paperCode: { contains: isP1 ? 'P1' : 'P2' }, examType: 'MODEL_EXAM', academicClass: { name: { contains: classRoman } } }
          ]
        },
        include: {
          academicClass: true,
          subject: true,
          questions: {
            include: {
              topics: { include: { topic: true } },
              slos: { include: { slo: true } }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error fetching model paper questions:', err);
    }

    if (paper && paper.questions && paper.questions.length > 0) {
      sortedQuestions = [...paper.questions].sort((a, b) => {
        const numA = parseInt(a.questionNumber.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.questionNumber.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    } else {
      // Automatic High-Fidelity Fallback from canonical JSON exports
      const fallback = getFallbackPaper(paperCode);
      if (fallback) {
        paper = fallback as any;
        sortedQuestions = fallback.questions as any;
      }
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Strict Hierarchy Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Model Papers', href: modelPapersListUrl },
          { label: isP1 ? 'Paper I (P1)' : (isP2 ? 'Paper II (P2)' : 'Paper III (P3)'), active: true }
        ]}
      />

      {/* Clean Top Navigation Bar (Only for Paper III Practical Examination Guide) */}
      {isP3 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Link
                href={modelPapersListUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: '#0b5e4a',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: '#e8f5f1',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}
              >
                <ArrowLeft size={14} />
                <span>All Model Papers</span>
              </Link>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                background: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {paperCode}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {marksLabel} • {durationLabel}
              </span>
            </div>

            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.3px'
            }}>
              {paperTitle}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              {paperType} • Official {board.name} Benchmark Examination
            </p>
          </div>

          {/* Action Buttons: Direct PDF Download & Mode */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(11, 94, 74, 0.2)'
                }}
              >
                <Download size={15} />
                <span>Download Official PDF</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Render Content Based on Paper Type */}
      {isP3 ? (
        /* Paper III: Practical Examination Guide & Stages */
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <FlaskConical size={24} color="#0b5e4a" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Laboratory Practical Examination (Paper III) Structure
            </h2>
          </div>

          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            The AKU-EB Grade 9 Practical Examination is a 1-hour assessment conducted in the school laboratory. Students perform hands-on apparatus handling, observation recording, and data graphing according to the following stages:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b5e4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Stage I • Apparatus Setup (3 Marks)
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Equipment Verification & Zero-Error
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Identify apparatus, determine least count of instruments (Vernier calliper / micrometer screw gauge / thermometer), and verify zero errors.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b5e4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Stage II • Measurement Tabulation (6 Marks)
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Systematic Observation Recording
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Record repeated readings with appropriate units, compute mean values, and maintain consistent decimal places adhering to precision rules.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b5e4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Stage III • Graph Plotting & Gradient (6 Marks)
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Cooling Curve / Period Analysis
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Plot temperature vs. time graph, choose suitable scale occupying &gt;50% of grid, draw smooth curve of best fit, and calculate gradient.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                <Download size={16} />
                <span>Open Practical Paper PDF</span>
              </a>
            )}

            <Link
              href={`${baseUrl}/practicals`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#f1f5f9',
                color: '#0b5e4a',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
                border: '1px solid #e2e8f0'
              }}
            >
              <span>Explore All Laboratory Practicals</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        /* Paper I or Paper II: Full Interactive Paper Viewer */
        paper && sortedQuestions.length > 0 ? (
          <Suspense fallback={
            <div style={{ padding: '3rem', textAlign: 'center', color: '#0b5e4a', fontWeight: 600 }}>
              Loading Examination Paper...
            </div>
          }>
            <PaperViewerClient 
              paper={paper as any} 
              questions={sortedQuestions as any} 
              backUrl={modelPapersListUrl}
              pdfUrl={pdfUrl}
            />
          </Suspense>
        ) : (
          /* Fallback if database record is missing */
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <FileText size={40} color="#0b5e4a" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              {paperTitle}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
              The interactive question bank for this paper is being compiled. You can download and study the complete official PDF document directly.
            </p>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none'
                }}
              >
                <Download size={16} />
                <span>Download Official {isP1 ? 'Paper I' : 'Paper II'} PDF</span>
              </a>
            )}
          </div>
        )
      )}
    </div>
  );
}
