import Link from 'next/link';
import { BookOpen, FileText, Award, Calendar, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata = {
  title: 'SSC-II (Grade 10) Study Portal | AKU-EB Resources',
  description: 'Official AKU-EB Class 10 (SSC-II) materials, verified syllabuses, model papers, pacing guides, and interactive question banks.',
};

export default function SSC2Page() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Class X (SSC-II) Academic Portal', active: true }
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
          SECONDARY SCHOOL CERTIFICATE • GRADE 10
        </div>
        <h1 className="mobile-page-title" style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem' }}>
          AKU-EB SSC-II Academic Portal
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.95, maxWidth: '750px', lineHeight: 1.6 }}>
          Explore official 2025/2026 examination resources, syllabuses, teacher pacing guides, model examination papers, and interactive practice tests designed for Aga Khan University Examination Board Grade 10 candidates.
        </p>
      </div>

      {/* Featured Subject Spotlight: PHYSICS 10 */}
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
            <h2 className="mobile-page-title" style={{ fontSize: '2rem', marginTop: '0.5rem', color: '#0b5e4a' }}>
              Physics (Class X • SSC-II)
            </h2>
            <p style={{ color: '#5a7a6f', marginTop: '0.25rem' }}>
              Complete curriculum with SLO mapping, Paper I (40 MCQs), Paper II (CRQs/ERQs), and 28-Week Pacing Guide.
            </p>
          </div>
          <Link
            href="/classes/ssc-ii/physics"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', fontSize: '1rem', borderRadius: '10px' }}
          >
            Open Physics Portal <ArrowRight size={18} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #eef2f0', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Dedicated Grade 10 Syllabus</span>
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
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>28-Week Teacher Pacing Guide</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>Reference Textbooks & PhET Labs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#0b5e4a" />
            <span style={{ fontSize: '0.95rem', color: '#2c3e38' }}>High-Yield Board Topics</span>
          </div>
        </div>
      </div>

      {/* Grid of SSC-II Subjects */}
      <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#2c3e38' }}>
        All SSC-II Subjects
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
        {[
          { name: 'Physics', code: 'PHY-X', desc: 'Syllabus, 40 MCQs, CRQs, Pacing Guide & References', ready: true, href: '/classes/ssc-ii/physics' },
          { name: 'Mathematics', code: 'MTH-X', desc: 'Matrices, Sets, Statistics, Practical Geometry', ready: false, href: '/syllabus' },
          { name: 'Chemistry', code: 'CHM-X', desc: 'Chemical Equilibrium, Acids & Bases, Hydrocarbons', ready: false, href: '/syllabus' },
          { name: 'Biology', code: 'BIO-X', desc: 'Gaseous Exchange, Homeostasis, Genetics & Biotechnology', ready: false, href: '/syllabus' },
          { name: 'Computer Science', code: 'CSC-X', desc: 'C / Python Programming, Algorithms, Database Systems', ready: false, href: '/syllabus' },
          { name: 'English Compulsory', code: 'ENG-X', desc: 'Critical Reading, Argumentative Writing & Synthesis', ready: false, href: '/syllabus' },
          { name: 'Urdu Compulsory', code: 'URD-X', desc: 'Literature Comprehension, Grammar & Essays', ready: false, href: '/syllabus' },
          { name: 'Pakistan Studies', code: 'PKS-X', desc: 'Ideology of Pakistan, History, Geography & Economy', ready: false, href: '/syllabus' },
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
