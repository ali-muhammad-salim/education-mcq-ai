import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, Download, Award, Calendar, ExternalLink, Sparkles, BookOpen } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import prisma from '@/lib/prisma';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import PastPapersArchiveClient from '@/app/past-papers/PastPapersArchiveClient';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export const dynamic = 'force-dynamic';

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

  // Fetch all past papers from database
  let pastPapers: any[] = [];
  let books: any[] = [];
  try {
    pastPapers = await prisma.pastPaper.findMany({
      include: {
        academicClass: true,
        subject: true,
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { examYear: 'desc' }
    });

    books = await prisma.book.findMany({
      orderBy: { publicationYear: 'desc' }
    });
  } catch (err) {
    console.error('Error fetching past papers:', err);
  }

  const initialGrade = classRoman === 'X' ? 'SSC-II' : 'SSC-I';

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1rem 5rem 1rem' }}>
      
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: board.name, href: `/${board.id}` },
          { label: classDef.name, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: `/${board.id}/${classRoman}/${meta.slug}` },
          { label: 'Past Papers Archive', active: true }
        ]}
      />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0b5e4a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
          AKU-EB Examination Archive & Solved Papers
        </h1>
        <p style={{ color: '#5a7a6f', fontSize: '1.05rem', margin: 0, lineHeight: 1.5 }}>
          Explore authentic AKU-EB examination papers, interactive MCQ simulators, and model test solutions aligned with {classDef.name} standards.
        </p>
      </div>

      {/* Main Interactive Archive Client Component */}
      <React.Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#0b5e4a' }}>Loading Archive...</div>}>
        <PastPapersArchiveClient pastPapers={pastPapers as any} initialGrade={initialGrade} />
      </React.Suspense>

      {/* Curriculum Documents & Pacing Guides */}
      {books.length > 0 && (
        <div style={{ marginTop: '3.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '1.25rem', fontWeight: 800 }}>
            Curriculum Documents & Pacing Guides ({books.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {books.map((book) => (
              <div key={book.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5a7a6f', background: '#f0f5f3', padding: '2px 8px', borderRadius: '4px' }}>
                    {book.publicationYear || 'Official'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    {book.edition || 'Teacher Resource'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                  {book.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem', flexGrow: 1, lineHeight: 1.4 }}>
                  {book.author ? `By ${book.author}. ` : ''}
                  Official reference manual aligned with student learning outcomes.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/resources/${encodeURIComponent(book.title)}`}
                    className="btn"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', textAlign: 'center', background: '#f4f7f6', color: '#0b5e4a', border: '1px solid #dce5e1' }}
                  >
                    View Details
                  </Link>
                  {book.fileUrl && (
                    <a
                      href={book.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0b5e4a', color: '#ffffff' }}
                    >
                      <Download size={14} /> PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
