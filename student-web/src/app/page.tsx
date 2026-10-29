import Link from 'next/link';

export default function Home() {
  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="url(#paint2_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
              <linearGradient id="paint1_linear" x1="2" y1="17" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
              <linearGradient id="paint2_linear" x1="2" y1="12" x2="22" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1"/>
                <stop offset="1" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
          MCQs AI
        </Link>
        <ul className="nav-links">
          <li><Link href="/syllabus" className="nav-link">Syllabus 2026</Link></li>
          <li><Link href="/past-papers" className="nav-link">Past Papers</Link></li>
          <li><Link href="/resources" className="nav-link">Study Notes</Link></li>
        </ul>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary">Sign In</button>
          <button className="btn btn-primary">Get Started</button>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="badge badge-primary animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            Updated for 2026 Syllabus
          </div>
          <h1 className="hero-title animate-fade-in delay-1">
            Master your exams with <br/>
            <span className="text-gradient">precision & purpose.</span>
          </h1>
          <p className="hero-subtitle animate-fade-in delay-2">
            The ultimate AI-powered student dashboard. Access meticulously organized past papers, verified study notes, and an exact mapping to your curriculum SLOs.
          </p>
          
          <div className="search-container animate-fade-in delay-3" style={{ marginBottom: '3rem' }}>
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" className="search-input" placeholder="Search for 'Mitochondria', 'Newton', or any topic..." />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }} className="animate-fade-in delay-3">
            <Link href="/syllabus" className="btn btn-primary">
              Explore 2026 Curriculum
            </Link>
            <Link href="/past-papers" className="btn btn-secondary">
              Browse Past Papers
            </Link>
          </div>
        </section>

        <section style={{ padding: '4rem 0' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Everything you need to excel</h2>
          <div className="grid-container">
            <div className="glass-panel">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <h3 style={{ marginBottom: '0.75rem' }}>Intelligent Notes</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Over 30 textbooks fully digitized, chunked, and directly linked to every Student Learning Outcome (SLO).</p>
            </div>
            
            <div className="glass-panel">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ marginBottom: '0.75rem' }}>Decades of Questions</h3>
              <p style={{ color: 'var(--text-secondary)' }}>MCQs, CRQs, and ERQs from over 40 past papers mapped with AI precision to your current syllabus.</p>
            </div>
            
            <div className="glass-panel">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3 style={{ marginBottom: '0.75rem' }}>Performance Analytics</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Track your understanding of every topic and subtopic with real-time feedback and AI tutoring.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
