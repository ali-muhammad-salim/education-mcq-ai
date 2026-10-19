'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, BookOpen, Clock, Award, ArrowRight, Sparkles, 
  Plus, Users, Filter, CheckCircle2, FileText, ChevronRight,
  ShieldAlert, Compass, GraduationCap, Flame, Check
} from 'lucide-react';

export default function QuizzesCatalogPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [userRole, setUserRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN' | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data?.user?.role) setUserRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        setLoading(true);
        const res = await fetch('/api/quizzes?visibility=PUBLIC&status=PUBLISHED');
        const data = await res.json();
        if (data.success && Array.isArray(data.quizzes)) {
          setQuizzes(data.quizzes);
        }
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  const filtered = quizzes.filter(q => {
    const matchSearch = search 
      ? q.title.toLowerCase().includes(search.toLowerCase()) || 
        (q.description && q.description.toLowerCase().includes(search.toLowerCase()))
      : true;

    const matchClass = selectedClass === 'ALL' 
      ? true 
      : (q.classId ? q.classId.toString() === selectedClass : true);

    const matchSubject = selectedSubject === 'ALL'
      ? true
      : (q.subjectId ? q.subjectId.toLowerCase() === selectedSubject.toLowerCase() : true);

    return matchSearch && matchClass && matchSubject;
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color, #f4f7f6)',
      color: 'var(--text-color, #2c3e38)',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '5rem',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      
      {/* Premium Hero Header */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0b5e4a 0%, #084737 50%, #052e24 100%)',
        color: '#ffffff',
        paddingTop: '3.5rem',
        paddingBottom: '4.5rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
        boxShadow: '0 10px 25px -5px rgba(11, 94, 74, 0.3)'
      }}>
        {/* Subtle decorative glowing background shapes */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '30%',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201, 160, 80, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem'
        }}>
          <div style={{ maxWidth: '680px', flex: '1 1 500px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              backgroundColor: 'rgba(201, 160, 80, 0.2)',
              color: '#fef08a',
              border: '1px solid rgba(201, 160, 80, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem'
            }}>
              <Sparkles size={14} color="#fde047" />
              <span>Official AKU-EB Examination Engine</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              margin: '0 0 1rem 0'
            }}>
              Examinations & Practice Tests
            </h1>

            <p style={{
              fontSize: '1rem',
              color: 'rgba(230, 240, 237, 0.9)',
              lineHeight: 1.6,
              margin: '0 0 1.5rem 0'
            }}>
              Curriculum-aligned timed assessments for SSC & HSSC (Classes IX, X, XI, XII). Featuring server-authoritative countdown timing, RAG-grounded curriculum explanations, and real-time score analytics.
            </p>

            {/* Feature Highlights */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.78rem',
              color: '#d1fae5',
              fontWeight: 600
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(6, 78, 59, 0.5)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <Clock size={14} color="#facc15" />
                <span>Timed Exam Engine</span>
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(6, 78, 59, 0.5)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle2 size={14} color="#6ee7b7" />
                <span>Instant Auto-Grading</span>
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(6, 78, 59, 0.5)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldAlert size={14} color="#67e8f9" />
                <span>Proctoring & Anti-Cheat</span>
              </span>
            </div>
          </div>

          {/* Quick CTA Links */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '260px',
            flexShrink: 0
          }}>
            <Link
              href={userRole === 'TEACHER' || userRole === 'ADMIN' ? '/dashboard/teacher' : '/dashboard/student'}
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <GraduationCap size={16} color="#6ee7b7" />
              <span>{userRole === 'TEACHER' || userRole === 'ADMIN' ? 'Teacher Assessment Portal' : 'Student Learning Portal'}</span>
            </Link>

            <Link
              href="/teacher/quizzes/builder"
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: '#c9a050',
                color: '#0f172a',
                border: 'none',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(201, 160, 80, 0.3)'
              }}
            >
              <Plus size={16} color="#0f172a" />
              <span>Create Custom Assessment</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Hub */}
      <div style={{
        maxWidth: '1200px',
        margin: '-1.75rem auto 0 auto',
        padding: '0 1.5rem',
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        
        {/* Search & Filter Toolbar */}
        <div style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #dce5e1)',
          boxShadow: '0 10px 25px -5px rgba(11, 94, 74, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            flex: '1 1 320px',
            minWidth: '260px'
          }}>
            <Search 
              size={18} 
              color="#94a3b8" 
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }} 
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessment by title, topic, or keyword..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(244, 247, 246, 0.7)',
                border: '1px solid var(--border-color, #dce5e1)',
                borderRadius: '10px',
                padding: '0.65rem 1rem 0.65rem 2.6rem',
                fontSize: '0.88rem',
                color: 'var(--text-color, #2c3e38)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              aria-label="Filter by academic class"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #dce5e1)',
                borderRadius: '10px',
                padding: '0.65rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-color, #2c3e38)',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="ALL">All Classes (IX–XII)</option>
              <option value="9">Class IX (SSC I)</option>
              <option value="10">Class X (SSC II)</option>
              <option value="11">Class XI (HSSC I)</option>
              <option value="12">Class XII (HSSC II)</option>
            </select>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter by subject"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #dce5e1)',
                borderRadius: '10px',
                padding: '0.65rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-color, #2c3e38)',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="ALL">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>
        </div>

        {/* Quizzes Grid or States */}
        {loading ? (
          <div style={{
            padding: '5rem 1rem',
            textAlign: 'center',
            color: 'var(--text-light, #5a7a6f)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '4px solid rgba(11, 94, 74, 0.15)',
              borderTopColor: '#0b5e4a',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading verified curriculum examinations...</span>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--border-color, #dce5e1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#e6f0ed',
              color: '#0b5e4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-color, #2c3e38)' }}>
              No assessments found matching filter
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-light, #5a7a6f)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
              Try adjusting your search keywords, or build a custom test using the unified AKU-EB Quiz Builder.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => { setSearch(''); setSelectedClass('ALL'); setSelectedSubject('ALL'); }}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(244, 247, 246, 0.8)',
                  color: 'var(--text-color, #2c3e38)',
                  border: '1px solid var(--border-color, #dce5e1)',
                  cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
              <Link
                href="/teacher/quizzes/builder"
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  backgroundColor: '#0b5e4a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  boxShadow: '0 4px 6px rgba(11, 94, 74, 0.2)'
                }}
              >
                Create New Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.25rem'
          }}>
            {filtered.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color, #dce5e1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backgroundColor: 'var(--primary-light, #e6f0ed)',
                      color: 'var(--primary-color, #0b5e4a)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {q.boardId || 'AKU-EB'}
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-light, #5a7a6f)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontFamily: 'monospace',
                      fontWeight: 700
                    }}>
                      <Clock size={14} color="#d97706" />
                      <span>{q.durationMin} mins</span>
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: 'var(--text-color, #2c3e38)',
                    marginTop: '0.85rem',
                    marginBottom: '0.5rem',
                    lineHeight: 1.35
                  }}>
                    {q.title}
                  </h3>
                  
                  {q.description && (
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-light, #5a7a6f)',
                      lineHeight: 1.5,
                      margin: '0 0 1rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {q.description}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-light, #5a7a6f)',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color, #dce5e1)'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary-color, #0b5e4a)' }}>{q.questionCount} Questions</span>
                    <span>•</span>
                    <span style={{ fontWeight: 700 }}>{q.totalMarks} Marks</span>
                    <span>•</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.teacherName || 'RiseLearner Team'}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/quizzes/${q.id}/take`}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    backgroundColor: '#0b5e4a',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 10px rgba(11, 94, 74, 0.25)',
                    transition: 'background-color 0.2s ease, transform 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#084737';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#0b5e4a';
                  }}
                >
                  <span>Start Timed Assessment</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
