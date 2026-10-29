"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SyllabusExplorer() {
  const [syllabusTree, setSyllabusTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from http://localhost:8000/api/syllabus/tree
    // For now, we mock the data to show the rich UI immediately.
    setTimeout(() => {
      setSyllabusTree([
        {
          id: 'board-1',
          name: 'Federal Board (FBISE)',
          programmes: [
            {
              id: 'prog-1',
              name: 'SSC (Matriculation)',
              academicClasses: [
                {
                  id: 'class-9',
                  name: 'Class 9',
                  subjects: [
                    { id: 'subj-phy', name: 'Physics' },
                    { id: 'subj-math', name: 'Mathematics' },
                    { id: 'subj-bio', name: 'Biology' },
                  ]
                },
                {
                  id: 'class-10',
                  name: 'Class 10',
                  subjects: [
                    { id: 'subj-phy10', name: 'Physics' },
                    { id: 'subj-math10', name: 'Mathematics' },
                  ]
                }
              ]
            },
            {
              id: 'prog-2',
              name: 'HSSC (Intermediate)',
              academicClasses: [
                {
                  id: 'class-11',
                  name: 'Class 11',
                  subjects: []
                }
              ]
            }
          ]
        },
        {
          id: 'board-2',
          name: 'Aga Khan University Examination Board (AKU-EB)',
          programmes: []
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-brand">MCQs AI</Link>
        <ul className="nav-links">
          <li><Link href="/syllabus" className="nav-link active">Syllabus</Link></li>
          <li><Link href="/resources" className="nav-link">Resources</Link></li>
        </ul>
      </nav>
      <main>
        <div style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="text-gradient" style={{ marginBottom: '1rem', fontSize: '3rem' }}>Syllabus Explorer</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
            Select your Board, Class, and Subject to access curated notes, past paper questions, and AI tutoring aligned with the official 2026 curriculum.
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {syllabusTree.map(board => (
                <div key={board.id} className="glass-panel animate-fade-in">
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    {board.name}
                  </h2>
                  
                  {board.programmes.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>Coming soon...</p>
                  ) : (
                    board.programmes.map((prog: any) => (
                      <div key={prog.id} style={{ marginBottom: '2rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{prog.name}</h3>
                        
                        <div className="grid-container">
                          {prog.academicClasses.map((acClass: any) => (
                            <div key={acClass.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{acClass.name}</h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {acClass.subjects.map((sub: any) => (
                                  <Link href={`/syllabus/subject/${sub.id}`} key={sub.id} style={{ 
                                    padding: '0.4rem 0.8rem', 
                                    background: 'rgba(99, 102, 241, 0.1)', 
                                    color: 'var(--accent-primary)', 
                                    borderRadius: '6px', 
                                    fontSize: '0.85rem',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                  >
                                    {sub.name}
                                  </Link>
                                ))}
                                {acClass.subjects.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No subjects added yet</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
}
