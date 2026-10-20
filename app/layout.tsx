import './globals.css';
import './mobile.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, GraduationCap, UploadCloud, ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Rise Learner | AKU-EB Learning Portal | Past Papers, Syllabus & E-Books',
  description: 'AI-Powered Education Platform for AKU-EB Resources. Download Past Papers, Syllabi, Solved MCQs, and access high-quality textual learning material online for SSC and HSSC.',
  keywords: ['AKU-EB', 'Past Papers', 'Syllabus', 'SSC', 'HSSC', 'MCQs', 'Aga Khan University Examination Board', 'Rise Learner'],
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon.png' },
      { url: '/logo-icon.png' }
    ],
    shortcut: '/favicon.ico'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `(function(){try{var m=localStorage.getItem('riselearner_theme')||'system';var d=m==='dark'||(m!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){var d=matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';}})();`}} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning>
        <div className="app-layout">
          
          {/* Global Multi-Board & Subject Navigation */}
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Navbar />

          <main id="main-content" className="main-content">
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                gap: '2.5rem',
                marginBottom: '2.5rem'
              }}
            >
              
              {/* Column 1: Brand & Overview */}
              <div>
                <div style={{
                  background: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  marginBottom: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <img 
                    src="/logo.png" 
                    alt="Rise Learner" 
                    style={{
                      height: '34px',
                      width: 'auto',
                      maxWidth: '180px',
                      objectFit: 'contain'
                    }} 
                  />
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', marginBottom: '1rem' }}>
                  A specialized academic intelligence repository for the Aga Khan University Examination Board (AKU-EB), with examination resources, practice questions and Student Learning Outcome (SLO) references.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#34d399' }}>
                  <ShieldCheck size={14} />
                  <span>Independent learning resource • Check source documents</span>
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Academic Archives & Policies
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                  <li>
                    <Link href="/past-papers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📄 Past Papers Archive
                    </Link>
                  </li>
                  <li>
                    <Link href="/model-papers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📝 Model Examination Papers
                    </Link>
                  </li>
                  <li>
                    <Link href="/syllabus" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📚 Unified Syllabus & SLO Tracker
                    </Link>
                  </li>
                  <li>
                    <Link href="/resources" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                      📦 Books & Downloads
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                      🛡️ Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                      📜 Terms of Service
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

              {/* Column 4: Academic Support & Inquiries */}
              <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Mail size={18} />
                  <span>Support & Inquiries</span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Have questions, feedback, or need academic assistance? Reach out directly to our dedicated support team.
                </p>
                <a 
                  href="mailto:support@riselearner.com" 
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
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(11, 94, 74, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Mail size={15} />
                  <span>support@riselearner.com</span>
                </a>
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
                fontSize: '0.82rem',
                color: '#94a3b8'
              }}
            >
              <div>
                © {new Date().getFullYear()} AKU-EB Unofficial Academic Intelligence Platform. Built for teachers and students.
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <Link href="/privacy" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
                <Link href="/terms" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
                <Link href="/syllabus" style={{ color: '#94a3b8', textDecoration: 'none' }}>Syllabus Standards</Link>
                <Link href="/past-papers" style={{ color: '#94a3b8', textDecoration: 'none' }}>Examination Archives</Link>
              </div>
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
