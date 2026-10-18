"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SubjectPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('notes');
  const [expandedTopic, setExpandedTopic] = useState<string | null>('t1');

  // Mock data for UI demonstration
  const syllabus = {
    subject: "Physics",
    class: "Class 9",
    topics: [
      {
        id: "t1",
        title: "1. Physical Quantities and Measurement",
        subtopics: [
          {
            id: "st1.1", title: "1.1 Introduction to Physics", slos: [
              { id: "slo1", text: "Describe the crucial role of Physics in Science, Technology, and Society." },
            ]
          },
          {
            id: "st1.2", title: "1.2 Physical Quantities", slos: [
              { id: "slo2", text: "Differentiate between base and derived quantities." }
            ]
          }
        ]
      },
      {
        id: "t2",
        title: "2. Kinematics",
        subtopics: [
          { id: "st2.1", title: "2.1 Rest and Motion", slos: [] }
        ]
      }
    ]
  };

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-brand">MCQs AI</Link>
        <ul className="nav-links">
          <li><Link href="/syllabus" className="nav-link active">Syllabus</Link></li>
          <li><Link href="/resources" className="nav-link">Resources</Link></li>
        </ul>
      </nav>
      
      <main style={{ display: 'flex', gap: '2rem', maxWidth: '1400px' }}>
        
        {/* Left Sidebar: Tree of Knowledge */}
        <div style={{ width: '350px', flexShrink: 0 }} className="glass-panel">
          <Link href="/syllabus" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            ← Back to Syllabus
          </Link>
          <h2 style={{ marginBottom: '0.5rem' }}>{syllabus.subject}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>{syllabus.class} • 2026 Curriculum</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {syllabus.topics.map(topic => (
              <div key={topic.id}>
                <div 
                  onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                  style={{ 
                    padding: '0.75rem', 
                    background: expandedTopic === topic.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderLeft: expandedTopic === topic.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '0 8px 8px 0',
                    fontWeight: expandedTopic === topic.id ? '600' : '400',
                    color: expandedTopic === topic.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  {topic.title}
                </div>
                
                {expandedTopic === topic.id && (
                  <div style={{ padding: '0.5rem 0 0.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {topic.subtopics.map(sub => (
                      <div key={sub.id} style={{ padding: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                           onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                           onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                        {sub.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('notes')}
              style={{ background: 'none', border: 'none', color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'notes' ? '600' : '400', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', position: 'relative' }}
            >
              Study Notes
              {activeTab === 'notes' && <div style={{ position: 'absolute', bottom: '-0.5rem', left: 0, width: '100%', height: '2px', background: 'var(--accent-primary)' }} />}
            </button>
            <button 
              onClick={() => setActiveTab('mcqs')}
              style={{ background: 'none', border: 'none', color: activeTab === 'mcqs' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'mcqs' ? '600' : '400', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', position: 'relative' }}
            >
              Past Paper MCQs
              {activeTab === 'mcqs' && <div style={{ position: 'absolute', bottom: '-0.5rem', left: 0, width: '100%', height: '2px', background: 'var(--accent-primary)' }} />}
            </button>
            <button 
              onClick={() => setActiveTab('crqs')}
              style={{ background: 'none', border: 'none', color: activeTab === 'crqs' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'crqs' ? '600' : '400', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', position: 'relative' }}
            >
              CRQs & ERQs
              {activeTab === 'crqs' && <div style={{ position: 'absolute', bottom: '-0.5rem', left: 0, width: '100%', height: '2px', background: 'var(--accent-primary)' }} />}
            </button>
          </div>

          {/* Content */}
          <div className="glass-panel" style={{ flex: 1 }}>
            
            {activeTab === 'notes' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem' }}>1.2 Physical Quantities</h3>
                  <div className="badge badge-primary">SLO Aligned</div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>Extract from Textbook (Class 9)</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    All measurable quantities are called physical quantities such as length, mass, time and temperature. A physical quantity possesses at least two characteristics in common. One is its numerical magnitude and the other is the unit in which it is measured.
                  </p>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginTop: '1rem' }}>
                    For example, if the length of a student is 104 cm then 104 is its numerical magnitude and centimetre is the unit of measurement.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'mcqs' && (
              <div className="animate-fade-in">
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Past Paper MCQs (1.2 Physical Quantities)</h3>
                
                {/* MCQ 1 */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>FBISE 2023 • Q2</span>
                    <span style={{ color: 'var(--accent-success)', fontSize: '0.85rem' }}>Difficulty: Medium</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Which of the following is a derived quantity?</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {['Mass', 'Length', 'Time', 'Volume'].map((opt, i) => (
                      <div key={i} style={{ 
                        padding: '1rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'crqs' && (
              <div className="animate-fade-in">
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Constructed Response Questions</h3>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>AKU-EB 2022 • Q1(a)</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>3 Marks</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Differentiate between base and derived quantities with at least two examples of each.</p>
                  
                  <button className="btn btn-secondary" style={{ width: '100%' }}>View E-Marking Scheme & Answer</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
