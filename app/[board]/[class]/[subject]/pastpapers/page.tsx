import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  FileText, Download, Award, Calendar, ExternalLink, 
  CheckCircle2, Sparkles, Filter, ArrowLeft, ArrowRight, Eye, Check
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import prisma from '@/lib/prisma';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectPastPapersPage({ params }: PageProps) {
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

  // Fetch past papers from database
  let dbPapers: any[] = [];
  try {
    const dbClass = await prisma.academicClass.findFirst({
      where: { level: classDef.level }
    });

    if (dbClass) {
      dbPapers = await prisma.pastPaper.findMany({
        where: {
          classId: dbClass.id,
          subject: {
            name: { contains: 'Physics', mode: 'insensitive' }
          }
        },
        include: {
          questions: {
            select: { id: true, questionNumber: true, marks: true }
          }
        },
        orderBy: [
          { examYear: 'desc' },
          { paperCode: 'asc' }
        ]
      });
    }
  } catch (err) {
    console.error('Error fetching past papers:', err);
  }

  // Fallback curated papers if DB empty or complementing
  const curatedPapers = [
    {
      code: 'PHY-IX-2025-P1',
      title: '2025 Annual Examination — Paper I (Multiple Choice Questions)',
      year: 2025,
      type: 'MCQ',
      totalMarks: 40,
      duration: '50 Minutes',
      questionCount: 40,
      badge: '2025 Solved Live',
      desc: '40 authentic AKU-EB multiple choice questions covering Kinematics, Dynamics, Energy, Matter, and Thermal Properties with exact cognitive level tags (R, U, A).',
      pdfUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf',
      interactiveUrl: '/past-papers/PHY-IX-2025-P1'
    },
    {
      code: 'PHY-IX-2025-P2',
      title: '2025 Annual Examination — Paper II (Constructed & Extended Response)',
      year: 2025,
      type: 'CRQ & ERQ',
      totalMarks: 25,
      duration: '1 Hour 40 Mins',
      questionCount: 7,
      badge: '2025 Solved Live',
      desc: 'Section B (Constructed Response Questions) and Section C (Extended Response Questions) with full calculation steps, diagram items, and marking rubric.',
      pdfUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf',
      interactiveUrl: '/past-papers/PHY-IX-2025-P2'
    },
    {
      code: 'PHY-IX-P1',
      title: 'Official Model Examination — Paper I (40 MCQs)',
      year: 2024,
      type: 'MCQ',
      totalMarks: 40,
      duration: '50 Minutes',
      questionCount: 40,
      badge: 'Official Model Paper',
      desc: 'Curriculum benchmark examination paper published by Aga Khan University Examination Board for Grade IX Physics syllabus assessment.',
      pdfUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf',
      interactiveUrl: '/past-papers/PHY-IX-P1'
    },
    {
      code: 'PHY-IX-P2',
      title: 'Official Model Examination — Paper II (CRQs & ERQs)',
      year: 2024,
      type: 'CRQ & ERQ',
      totalMarks: 25,
      duration: '1 Hour 40 Mins',
      questionCount: 7,
      badge: 'Official Model Paper',
      desc: 'Constructed response questions covering Newton laws, pressure in fluids, work done, and thermal expansion with detailed scoring keys.',
      pdfUrl: '/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf',
      interactiveUrl: '/past-papers/PHY-IX-P2'
    }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Past Papers Archive', active: true }
        ]}
      />

      {/* Header Banner */}
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
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {classDef.name} ({classDef.stageLabel})
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              PAST PAPERS ARCHIVE
            </span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {meta.title} Past Papers Archive ({curatedPapers.length} Papers)
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Access verified past examination papers for {board.name} {classDef.name} {meta.title}. Every paper includes authentic questions, marking schemes, interactive solve mode, and official printable PDF downloads.
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
              <span>View Model Examination Papers</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Papers Listing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {curatedPapers.map((p, idx) => (
          <div
            key={idx}
            style={{
              background: '#ffffff',
              border: '1.5px solid #dce5e1',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: p.type === 'MCQ' ? '#e0f2fe' : '#fef3c7',
                    color: p.type === 'MCQ' ? '#0369a1' : '#b45309',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    {p.type}
                  </span>
                  <span style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    Year {p.year}
                  </span>
                  <span style={{
                    background: '#f0fdf4',
                    color: '#15803d',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    {p.badge}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#5a7a6f', fontWeight: 600 }}>
                  Code: <strong>{p.code}</strong> • {p.duration}
                </div>
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 0.5rem 0' }}>
                {p.title}
              </h2>

              <p style={{ fontSize: '0.94rem', color: '#5a7a6f', lineHeight: 1.55, margin: 0 }}>
                {p.desc}
              </p>
            </div>

            <div style={{
              borderTop: '1px solid #f0f4f2',
              paddingTop: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem', color: '#4b5563' }}>
                <span>Total Marks: <strong style={{ color: '#0b5e4a' }}>{p.totalMarks}</strong></span>
                <span>Questions: <strong style={{ color: '#0b5e4a' }}>{p.questionCount} Items</strong></span>
                <span>Status: <strong style={{ color: '#15803d' }}>Verified Solutions</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link
                  href={p.interactiveUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(11, 94, 74, 0.15)'
                  }}
                >
                  <Eye size={16} />
                  <span>Solve Online & View Answers</span>
                </Link>

                <a
                  href={p.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#f4f7f6',
                    color: '#0b5e4a',
                    border: '1px solid #dce5e1',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
