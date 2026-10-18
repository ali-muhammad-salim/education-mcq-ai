import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, GraduationCap, UploadCloud, ShieldCheck, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'AKU-EB Learning Portal | Past Papers, Syllabus & E-Books',
  description: 'AI-Powered Education Platform for AKU-EB Resources. Download Past Papers, Syllabi, Solved MCQs, and access high-quality textual learning material online for SSC and HSSC.',
  keywords: ['AKU-EB', 'Past Papers', 'Syllabus', 'SSC', 'HSSC', 'MCQs', 'Aga Khan University Examination Board'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-layout">
          
          {/* Global Multi-Board & Subject Navigation */}
          <Navbar />

          <main className="main-content">
            {children}
          </main>

          {/* Clean, Rich Educational Footer with Teacher/Admin Upload Portal */}
          <footer 
            style={{ 
              background: '#0f172a', 
              color: '#94a3b8', 
              borderTop: '1px solid #1e293b', 
              padding: '3.5rem 5% 2rem 5%', 
              marginTop: 'auto' 
            }}
          >
            <div 
              style={{ 
                maxWidth: '1400px', 
                margin: '0 auto', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '2.5rem',
                marginBottom: '2.5rem'
              }}
            >
              
              {/* Column 1: Brand & Overview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', marginBottom: '1rem' }}>
                  <div style={{ background: '#0b5e4a', padding: '6px', borderRadius: '8px', color: '#fff' }}>
                    <BookOpen size={20} />
                  </div>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem' }}>AKU-EB Portal</span>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', marginBottom: '1rem' }}>
                  A specialized academic intelligence repository for the Aga Khan University Examination Board (AKU-EB), aligning examination items with official Student Learning Outcomes (SLOs).
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#34d399' }}>
                  <ShieldCheck size={14} />
                  <span>Curriculum Verified • 2025–2028 Standards</span>
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Academic Archives
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                  <li>
                    <Link href="/past-papers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📄 Past Papers Archive (2025 Annual)
                    </Link>
                  </li>
                  <li>
                    <Link href="/model-papers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📝 Official Model Examination Papers
                    </Link>
                  </li>
                  <li>
                    <Link href="/syllabus" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📚 Unified Syllabus & SLO Tracker
                    </Link>
                  </li>
                  <li>
                    <Link href="/resources" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📦 Official Books & Downloads
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Secondary Classes */}
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Classes & Subjects
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                  <li>
                    <Link href="/subjects/class-9/physics" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      ⚛️ Class IX Physics Complete Hub
                    </Link>
                  </li>
                  <li>
                    <Link href="/subjects/class-10/physics" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      ⚛️ Class X Physics Complete Hub
                    </Link>
                  </li>
                  <li>
                    <Link href="/subjects/class-9/chemistry" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                      🧪 Class IX Chemistry Archive
                    </Link>
                  </li>
                  <li>
                    <Link href="/subjects/class-9/mathematics" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                      📐 Class IX Mathematics Archive
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 4: Teacher & Admin Upload Portal (Requested by user in footer) */}
              <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <UploadCloud size={18} />
                  <span>Teacher & Admin Portal</span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Upload new past paper scans, E-marking examiner notes, answer keys, and curriculum files for automated OCR & AI verification.
                </p>
                <Link 
                  href="/upload" 
                  style={{
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(11, 94, 74, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🚀 Ingest & Upload Papers</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

            </div>

            {/* Bottom Copyright & Disclaimer */}
            <div 
              style={{ 
                maxWidth: '1400px', 
                margin: '0 auto', 
                paddingTop: '1.5rem', 
                borderTop: '1px solid #1e293b', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1rem',
                fontSize: '0.8rem',
                color: '#64748b'
              }}
            >
              <div>
                © {new Date().getFullYear()} AKU-EB Unofficial Academic Intelligence Platform. Built for teachers and students.
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <Link href="/syllabus" style={{ color: '#64748b', textDecoration: 'none' }}>Syllabus Standards</Link>
                <Link href="/past-papers" style={{ color: '#64748b', textDecoration: 'none' }}>Examination Archives</Link>
                <Link href="/upload" style={{ color: '#64748b', textDecoration: 'none' }}>Admin Ingestion</Link>
              </div>
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
