import React from 'react';
import Link from 'next/link';
import { FileText, Download, Award, ArrowRight, ExternalLink } from 'lucide-react';
import PastPapersArchiveClient from './PastPapersArchiveClient';
import Breadcrumbs from '@/components/Breadcrumbs';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PastPapersPage() {
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Past & Model Papers Archive', active: true }
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, textAlign: 'left', fontSize: '2.4rem' }}>Past & Model Papers Archive</h1>
        </div>
      </div>

      <p style={{ color: '#5a7a6f', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
        Browse verified AKU-EB examination papers, interactive model questions, and official teacher guides with full syllabus alignment.
      </p>

      {/* Quick Subject Highlights */}
      <div style={{
        background: '#e6f0ed',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <strong style={{ color: '#0b5e4a', fontSize: '1.1rem' }}>🔥 Physics 2025/2026 Model Material Ready!</strong>
          <p style={{ color: '#2c3e38', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
            Interactive question simulators and dedicated PDFs are available for both SSC-I (Class 9) and SSC-II (Class 10).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/classes/ssc-i/physics" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Class 9 Physics Hub →
          </Link>
          <Link href="/classes/ssc-ii/physics" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#fff', color: '#0b5e4a', border: '1px solid #0b5e4a' }}>
            Class 10 Physics Hub →
          </Link>
        </div>
      </div>

      {/* Model & Past Papers Section with Year Filtering */}
      <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '1.25rem' }}>
        Official Examination & Model Papers ({pastPapers.length})
      </h2>

      <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#0b5e4a' }}>Loading Archive...</div>}>
        <PastPapersArchiveClient pastPapers={pastPapers as any} />
      </React.Suspense>

      {/* Official Guides & Reference E-Books Section */}
      <h2 style={{ fontSize: '1.5rem', color: '#0b5e4a', marginBottom: '1.25rem' }}>
        Curriculum Documents & Pacing Guides ({books.length})
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {books.map((book) => (
          <div key={book.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5a7a6f', background: '#f0f5f3', padding: '2px 8px', borderRadius: '4px' }}>
                {book.className || 'AKU-EB Resource'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#777' }}>
                {book.publicationYear}
              </span>
            </div>

            <h3 style={{ color: 'var(--primary-color)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              {book.title}
            </h3>

            <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem', flexGrow: 1 }}>
              <p style={{ margin: '0.2rem 0' }}><strong>Publisher:</strong> {book.publisher || 'AKU-EB'}</p>
              <p style={{ margin: '0.2rem 0' }}><strong>Subject:</strong> {book.subject || 'Physics'}</p>
            </div>

            {book.sourceFile ? (
              <a
                href={book.sourceFile}
                download
                className="btn"
                style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
              >
                <Download size={16} /> Download Document
              </a>
            ) : (
              <span style={{ color: '#999', fontSize: '0.85rem', fontStyle: 'italic' }}>Document attached in hub</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
