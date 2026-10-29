import './globals.css';
import './mobile.css';
import './design-system.css';
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
          <footer style={{borderTop:'1px solid var(--border-color)',padding:'1.2rem 1rem',color:'var(--text-light)',fontSize:'.85rem'}}><div style={{maxWidth:'960px',margin:'auto',display:'flex',flexWrap:'wrap',gap:'1rem'}}><span>© {new Date().getFullYear()} Rise Learner</span><Link href="/">Boards</Link><Link href="/resources">Downloads</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@riselearner.com">Support</a></div></footer>

        </div>
      </body>
    </html>
  );
}
