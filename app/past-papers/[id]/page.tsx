import React, { Suspense } from 'react';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PaperViewerClient from './PaperViewerClient';

const prisma = new PrismaClient();

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PastPaperDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  // Search by UUID or by paperCode
  let paper = await prisma.pastPaper.findFirst({
    where: {
      OR: [
        { id: id },
        { paperCode: id }
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

  if (!paper) {
    return notFound();
  }

  // Sort questions numerically
  const sortedQuestions = [...paper.questions].sort((a, b) => {
    const numA = parseInt(a.questionNumber.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.questionNumber.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const isGrade9 = paper.academicClass?.level === 9 || paper.academicClass?.name?.includes('IX');
  const gradeLabel = isGrade9 ? 'SSC-I' : 'SSC-II';
  const subjectName = paper.subject?.name || 'Physics';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Authentic Breadcrumb Navigation (Matching User Image 2) */}
      <div style={{
        background: '#181b20',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        border: '1px solid #282c34',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.92rem',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
          color: '#cbd5e1',
          flexWrap: 'wrap'
        }}>
          <Link href="/" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 600 }}>
            Home
          </Link>
          <span style={{ color: '#94a3b8' }}>&raquo;</span>
          <Link href="/past-papers" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 600 }}>
            AKUEB Past Papers
          </Link>
          <span style={{ color: '#94a3b8' }}>&raquo;</span>
          <Link href={`/past-papers?grade=${gradeLabel}`} style={{ color: '#6ee7b7', textDecoration: 'underline', fontWeight: 700 }}>
            {gradeLabel}
          </Link>
          <span style={{ color: '#94a3b8' }}>&raquo;</span>
          <Link href={`/past-papers?grade=${gradeLabel}&subject=${encodeURIComponent(subjectName)}`} style={{ color: '#f8fafc', fontWeight: 800 }}>
            {subjectName}
          </Link>
          <span style={{ color: '#94a3b8' }}>&raquo;</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
            {paper.paperCode || paper.title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {paper.fileUrl && (
            <a
              href={paper.fileUrl}
              download
              className="btn"
              style={{ background: '#0b5e4a', color: '#ffffff', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px' }}
            >
              ⬇ Download Original PDF
            </a>
          )}
        </div>
      </div>

      {/* Render the interactive PDF-Accurate Exam Viewer Client Component */}
      <Suspense fallback={
        <div style={{ padding: '3rem', textAlign: 'center', color: '#0b5e4a', fontWeight: 600 }}>
          Loading Examination Paper...
        </div>
      }>
        <PaperViewerClient paper={paper as any} questions={sortedQuestions as any} />
      </Suspense>
    </div>
  );
}
