import Link from 'next/link';
import { BookOpen, FileText, Award, Calendar, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata = {
  title: 'SSC-I (Grade 9) Study Portal | AKU-EB Resources',
  description: 'Official AKU-EB Class 9 (SSC-I) materials, verified syllabuses, model papers, pacing guides, and interactive question banks.',
};

export default function SSC1Page() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Class IX (SSC-I) Academic Portal', active: true }
        ]}
      />

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0b5e4a 0%, #167a62 100%)',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        color: 'white',
        marginBottom: '2.5rem',
        boxShadow: '0 10px 25px rgba(11, 94, 74, 0.15)'
      }}>
        <div style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
          SECONDARY SCHOOL CERTIFICATE • GRADE 9
        </div>
        <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem' }}>
          AKU-EB SSC-I Academic Portal
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.95, maxWidth: '750px', lineHeight: 1.6 }}>
          Access officially mapped 2025/2026 curricula, teacher pacing guides, model examination papers, and interactive practice tests designed specifically for Aga Khan University Examination Board Grade 9.
        </p>
      </div>

      {/* Featured Subject Spotlight: PHYSICS */}
      <div style={{
        background: '#ffffff',
        border: '2px solid #0b5e4a',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '3rem',
        boxShadow: '0 8px 24px rgba(11, 94, 74, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 700, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⭐ FULL RESOURCE PACK LIVE
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: '#0b5e4a' }}>
              Physics (Class IX • SSC-I)
            </h2>
            <p style={{ color: '#5a7a6f', marginTop: '0.25rem' }}>
              Complete curriculum with SLO mapping, Paper I (40 MCQs), Paper II (CRQs/ERQs), Sample Practical Paper III, and 28-Week Pacing Guide.
            </p>
          </div>
          <Link
            href="/classes/ssc-i/physics"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', fontSize: '1rem', borderRadius: '10px' }}
          >
            Open Physics Portal <ArrowRight size={18} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #eef2f0', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Dedicated Grade 9 Syllabus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>40 Interactive MCQs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Model Paper II (CRQ / ERQ)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Practical Lab Guide (Paper III)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>28-Week Teacher Pacing Guide</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Reference Textbooks & PhET Labs</span>
          </div>
        </div>
      </div>

      {/* Grid of SSC-I Subjects */}
      <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#2c3e38' }}>
        All SSC-I Subjects
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[
          { name: 'Physics', code: 'PHY-IX', desc: 'Syllabus, 40 MCQs, CRQs, Practicals & Pacing Guide', ready: true, href: '/classes/ssc-i/physics' },
          { name: 'Mathematics', code: 'MTH-IX', desc: 'Algebra, Geometry, Trigonometry & Past Papers', ready: false, href: '/syllabus' },
          { name: 'Chemistry', code: 'CHM-IX', desc: 'Atomic Structure, Chemical Bonding & Solutions', ready: false, href: '/syllabus' },
          { name: 'Biology', code: 'BIO-IX', desc: 'Cell Biology, Biodiversity, Bioenergetics', ready: false, href: '/syllabus' },
          { name: 'Computer Science', code: 'CSC-IX', desc: 'Computer Systems, Networks, Programming Logic', ready: false, href: '/syllabus' },
          { name: 'English Compulsory', code: 'ENG-IX', desc: 'Reading Comprehension, Essay & Formal Letters', ready: false, href: '/syllabus' },
          { name: 'Urdu Compulsory', code: 'URD-IX', desc: 'Nazm, Ghazal, Grammar & Creative Writing', ready: false, href: '/syllabus' },
          { name: 'Islamiyat / Ethics', code: 'ISL-IX', desc: 'Quranic Passages, Hadith, Seerah & Islamic History', ready: false, href: '/syllabus' },
        ].map((sub, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5a7a6f', background: '#f0f5f3', padding: '3px 8px', borderRadius: '4px' }}>
                {sub.code}
              </span>
              {sub.ready && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0b5e4a', background: '#d4ebd4', padding: '3px 8px', borderRadius: '12px' }}>
                  ✓ LIVE PACK
                </span>
              )}
            </div>
            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0b5e4a' }}>{sub.name}</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem', flexGrow: 1 }}>{sub.desc}</p>
            <Link
              href={sub.href}
              className="btn"
              style={{
                textAlign: 'center',
                background: sub.ready ? 'var(--primary-color)' : '#fff',
                color: sub.ready ? '#fff' : 'var(--primary-color)',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem'
              }}
            >
              {sub.ready ? 'View Physics Hub →' : 'Browse Syllabus'}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
