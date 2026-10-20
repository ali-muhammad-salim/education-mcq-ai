'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, BookOpen, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, Sparkles, Plus, Users, ShieldAlert, FileText, ChevronRight, LogIn,
  GraduationCap, TrendingUp, CheckSquare, Compass, LogOut
} from 'lucide-react';
import { clearExamCache } from '@/lib/exam-cache';
import AuthModal from '@/components/AuthModal';

export default function StudentDashboardPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTeacherBlocked, setIsTeacherBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'history' | 'subjects'>('available');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Join Classroom Modal
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [page]);

  async function fetchDashboard() {
    try {
      setLoading(true); setLoadError('');
      const res = await fetch('/api/dashboard/student?page=' + page);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setData({ isGuest: true }); return; }
        if (res.status === 403) { setIsTeacherBlocked(true); setTimeout(() => window.location.replace('/dashboard/teacher'), 1200); return; }
        throw new Error(typeof json.error === 'string' ? json.error : json.error?.message || 'Unable to load dashboard.');
      }
      
      // If user is a TEACHER or ADMIN, student dashboard is unavailable!
      if (!json.success && json.redirect) {
        setIsTeacherBlocked(true);
        setTimeout(() => {
          window.location.replace(json.redirect);
        }, 1200);
        return;
      }

      if (json.success) {
        setData(json);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await clearExamCache().catch(() => undefined);
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/dashboard/student';
    } catch {
      window.location.reload();
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    if (data?.isGuest) {
      setJoinMessage('Please sign in or register as a student to enroll in teacher classrooms.');
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setAuthModalOpen(true);
      }, 1200);
      return;
    }

    try {
      setIsJoining(true);
      setJoinMessage(null);
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode })
      });
      const json = await res.json();
      if (json.success) {
        setJoinMessage(`Success: ${json.message}`);
        setTimeout(() => {
          setIsJoinModalOpen(false);
          setJoinCode('');
          setJoinMessage(null);
          fetchDashboard();
        }, 1500);
      } else {
        setJoinMessage(`Error: ${json.error || 'Failed to join'}`);
      }
    } catch {
      setJoinMessage('Error connecting to server.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loadError && !loading) return <main className="dashboard-error" style={{ padding: '3rem', textAlign: 'center' }}><h2>Unable to load your dashboard</h2><p role="alert">{loadError}</p><button className="btn" onClick={fetchDashboard}>Retry</button></main>;

  // 1. TEACHER BLOCKED GUARD SCREEN
  if (isTeacherBlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color, #f4f7f6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '24px',
          padding: '2.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)', margin: 0 }}>
            Teacher Account Detected
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light, #5a7a6f)', margin: 0, lineHeight: 1.6 }}>
            The <strong>Student Learning Portal</strong> is reserved for students. As a verified teacher, your assessment builder, student gradebook, and classroom rosters are located in the <strong>Teacher Assessment Portal</strong>.
          </p>
          <div style={{
            fontSize: '0.8rem',
            color: '#b45309',
            backgroundColor: '#fffbeb',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            fontWeight: 600,
            width: '100%'
          }}>
            Redirecting to Teacher Dashboard automatically...
          </div>
          <Link
            href="/dashboard/teacher"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 800,
              backgroundColor: '#0b5e4a',
              color: '#ffffff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(11, 94, 74, 0.25)'
            }}
          >
            <span>Go to Teacher Dashboard Now</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // 2. LOADING STATE
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color, #f4f7f6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--text-light, #5a7a6f)',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '4px solid rgba(11, 94, 74, 0.15)',
          borderTopColor: '#0b5e4a',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Student Examination Dashboard...</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalAttempts: 0,
    inProgressCount: 0,
    avgPercentage: 0,
    totalQuizzesAvailable: 0
  };

  const inProgressList = data?.inProgressAttempts || [];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color, #f4f7f6)',
      color: 'var(--text-color, #2c3e38)',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '5rem',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      
      {/* Top Navigation & Profile Bar */}
      <header className="assessment-header" style={{ flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'var(--card-bg, #ffffff)',
        borderBottom: '1px solid var(--border-color, #dce5e1)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0b5e4a 0%, #10b981 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: '0 4px 6px rgba(11, 94, 74, 0.2)'
          }}>
            {data?.student?.name ? data.student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h1 style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-color, #2c3e38)',
              margin: 0,
              lineHeight: 1.2
            }}>
              {data?.student?.name || 'Student Learning Portal'}
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)' }}>
              AKU-EB Academic Assessment Track • Class IX–XII
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: '#e6f0ed',
              color: '#0b5e4a',
              border: '1px solid rgba(11, 94, 74, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={15} color="#0b5e4a" />
            <span>Join Class by Code</span>
          </button>

          <Link
            href="/quizzes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: '#0b5e4a',
              color: '#ffffff',
              border: 'none',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)',
              transition: 'background-color 0.2s ease'
            }}
          >
            <BookOpen size={15} />
            <span>Browse All Quizzes</span>
          </Link>

          {!data?.isGuest && (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                cursor: 'pointer'
              }}
              title="Sign out of student account"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </header>
      {!data?.isGuest && <nav aria-label="Dashboard pages" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem' }}><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous page</button><span>Page {page}</span><button disabled={!data?.hasMore} onClick={() => setPage(p => p + 1)}>Next page</button></nav>}

      {/* Main Container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem 0 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        
        {/* Guest Learner Welcome Banner */}
        {data?.isGuest && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(11, 94, 74, 0.08) 0%, rgba(201, 160, 80, 0.08) 100%)',
            border: '1px solid rgba(11, 94, 74, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#e6f0ed',
                color: '#0b5e4a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--text-color, #2c3e38)' }}>
                  Previewing in Guest Candidate Mode
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-light, #5a7a6f)', margin: 0 }}>
                  Browse benchmark assessments below. Sign in to begin an attempt, save results and join teacher classrooms.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                backgroundColor: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(11, 94, 74, 0.2)'
              }}
            >
              <LogIn size={15} />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}

        {/* Active Timed Exam Banner (If session in progress) */}
        {data?.classrooms?.length > 0 && <section style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: 12 }}><h3>Your classrooms</h3><ul>{data.classrooms.map((c: {id: string; name: string}) => <li key={c.id}>{c.name}</li>)}</ul><p>Assigned assessments appear in the Available tab.</p></section>}
        {inProgressList.length > 0 && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(201, 160, 80, 0.08) 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 6px 15px -3px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={24} />
              </div>
              <div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#b45309',
                  display: 'block'
                }}>
                  Active In-Progress Assessment
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0.2rem 0', color: 'var(--text-color, #2c3e38)' }}>
                  {inProgressList[0].title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light, #5a7a6f)' }}>
                  Timer is ticking on the authoritative server clock!
                </span>
              </div>
            </div>

            <Link
              href={`/quizzes/${inProgressList[0].quizId}/take`}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.85rem',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
              }}
            >
              <span>Resume Assessment Now</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* KPI Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #dce5e1)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Available Tests
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)' }}>
              {metrics.totalQuizzesAvailable}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#0b5e4a', fontWeight: 600 }}>
              Curriculum tests ready
            </span>
          </div>

          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #dce5e1)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Completed
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0b5e4a' }}>
              {metrics.totalAttempts}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', fontWeight: 600 }}>
              Submitted attempts
            </span>
          </div>

          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #dce5e1)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Average Score
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c9a050' }}>
              {metrics.avgPercentage}%
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
              Recent released results
            </span>
          </div>

          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #dce5e1)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              In-Progress
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706' }}>
              {metrics.inProgressCount}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)', fontWeight: 600 }}>
              Active timer sessions
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '2px solid var(--border-color, #dce5e1)',
          paddingBottom: '0.5rem',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'available' ? '#0b5e4a' : 'transparent',
              color: activeTab === 'available' ? '#ffffff' : 'var(--text-light, #5a7a6f)',
              boxShadow: activeTab === 'available' ? '0 4px 6px rgba(11, 94, 74, 0.2)' : 'none'
            }}
          >
            <BookOpen size={15} />
            <span>Available Assessments</span>
            <span style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'available' ? '#084737' : 'var(--surface-muted)',
              color: activeTab === 'available' ? '#ffffff' : 'var(--text-color, #2c3e38)'
            }}>
              {(data?.availableQuizzes || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'history' ? '#0b5e4a' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-light, #5a7a6f)',
              boxShadow: activeTab === 'history' ? '0 4px 6px rgba(11, 94, 74, 0.2)' : 'none'
            }}
          >
            <Award size={15} />
            <span>Completed Results & Explanations</span>
            <span style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'history' ? '#084737' : 'var(--surface-muted)',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-color, #2c3e38)'
            }}>
              {(data?.completedAttempts || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'subjects' ? '#0b5e4a' : 'transparent',
              color: activeTab === 'subjects' ? '#ffffff' : 'var(--text-light, #5a7a6f)',
              boxShadow: activeTab === 'subjects' ? '0 4px 6px rgba(11, 94, 74, 0.2)' : 'none'
            }}
          >
            <Compass size={15} />
            <span>Subject Resource Archives</span>
          </button>
        </div>

        {/* TAB 1: AVAILABLE ASSESSMENTS */}
        {activeTab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--text-light, #5a7a6f)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Practice Tests & Model Assessments
              </h3>
              <Link
                href="/quizzes"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0b5e4a',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>View Full Catalog</span>
                <ChevronRight size={15} />
              </Link>
            </div>

            {(data?.availableQuizzes || []).length === 0 ? (
              <div style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                fontSize: '0.88rem',
                color: 'var(--text-light, #5a7a6f)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)'
              }}>
                {data?.isGuest ? 'Sign in to load your assessments, or browse the public catalog.' : 'No assessments are available on this page. Explore the catalog or ask your teacher for a classroom code.'}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
                gap: '1.25rem'
              }}>
                {data.availableQuizzes.map((q: any) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '16px',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color, #dce5e1)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1.25rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: '#e6f0ed',
                          color: '#0b5e4a',
                          border: '1px solid rgba(11, 94, 74, 0.2)',
                          textTransform: 'uppercase'
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

                      <h4 style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-color, #2c3e38)',
                        marginTop: '0.85rem',
                        marginBottom: '0.4rem',
                        lineHeight: 1.35
                      }}>
                        {q.title}
                      </h4>

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
                        fontSize: '0.78rem',
                        color: 'var(--text-light, #5a7a6f)',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-color, #dce5e1)'
                      }}>
                        <span style={{ fontWeight: 700, color: '#0b5e4a' }}>{q.questionCount} Questions</span>
                        <span>•</span>
                        <span style={{ fontWeight: 700 }}>{q.totalMarks} Marks</span>
                        <span>•</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          By {q.teacherName || 'RiseLearner'}
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
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 8px rgba(11, 94, 74, 0.25)',
                        transition: 'background-color 0.2s ease'
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
        )}

        {/* TAB 2: COMPLETED RESULTS & REVIEWS */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--text-light, #5a7a6f)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              Assessment History & Submission Receipts
            </h3>

            {(data?.completedAttempts || []).length === 0 ? (
              <div style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                fontSize: '0.88rem',
                color: 'var(--text-light, #5a7a6f)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)'
              }}>
                You have not completed any assessments yet. Take an assessment from the Available tab to see your performance breakdown!
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead style={{
                    backgroundColor: 'rgba(244, 247, 246, 0.8)',
                    color: 'var(--text-light, #5a7a6f)',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: '0.05em'
                  }}>
                    <tr>
                      <th style={{ padding: '0.9rem 1rem' }}>Assessment Title</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Score</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Percentage</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Date</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Review Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.completedAttempts.map((att: any) => (
                      <tr key={att.attemptId} style={{ borderTop: '1px solid var(--border-color, #dce5e1)' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-color, #2c3e38)' }}>
                          {att.title}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-color, #2c3e38)' }}>{att.released ? att.score : 'Held'}</span> / {att.maxMarks}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: att.percentage >= 50 ? '#e6f0ed' : '#fee2e2',
                            color: att.percentage >= 50 ? '#0b5e4a' : '#b91c1c'
                          }}>
                            {att.percentage == null ? (att.released ? 'Awaiting grading' : 'Awaiting release') : att.percentage + '%'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-light, #5a7a6f)', fontSize: '0.78rem' }}>
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Recently'}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <Link
                            href={`/quizzes/${att.quizId}/results?attemptId=${att.attemptId}`}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: '#e6f0ed',
                              color: '#0b5e4a',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>View Submission</span>
                            <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBJECT RESOURCE HUBS */}
        {activeTab === 'subjects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--text-light, #5a7a6f)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              Official AKU-EB Verified Subject Archives
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '1.25rem'
            }}>
              {[
                { name: 'Physics', classRoman: 'IX', slug: 'physics', desc: 'Model Papers 2025, Chapter MCQs & Syllabi', count: 12 },
                { name: 'Chemistry', classRoman: 'IX', slug: 'chemistry', desc: 'Syllabus SLOs, Notes & Key Papers', count: 9 },
                { name: 'Biology', classRoman: 'IX', slug: 'biology', desc: 'Past Papers, Diagrams & Chapter MCQs', count: 8 },
                { name: 'Mathematics', classRoman: 'IX', slug: 'mathematics', desc: 'Formulas, SLOs & Examination Specs', count: 10 },
                { name: 'Computer Science', classRoman: 'IX', slug: 'computer-science', desc: 'Flowcharts, Algorithms & Model Tests', count: 7 }
              ].map(sub => (
                <Link
                  key={sub.slug}
                  href={`/akueb/${sub.classRoman}/${sub.slug}`}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color, #dce5e1)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-color, #2c3e38)' }}>
                      {sub.name}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light, #5a7a6f)', margin: 0 }}>
                      {sub.desc}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: '#0b5e4a', marginTop: '0.5rem', display: 'block', fontWeight: 700 }}>
                      Class {sub.classRoman} Archive • {sub.count} Resources
                    </span>
                  </div>
                  <ChevronRight size={18} color="#0b5e4a" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* JOIN CLASSROOM MODAL */}
      {isJoinModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <form
            onSubmit={handleJoinClassroom}
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #dce5e1)',
              borderRadius: '20px',
              maxWidth: '400px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
          >
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-color, #2c3e38)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              <Users size={20} color="#0b5e4a" />
              <span>Join Teacher's Classroom</span>
            </h3>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-light, #5a7a6f)', margin: 0, lineHeight: 1.5 }}>
              Ask your teacher for the 6–8 character classroom code to access private assigned assessments.
            </p>

            <input
              type="text"
              required
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="E.g. A3B9X1"
              style={{
                width: '100%',
                backgroundColor: 'rgba(244, 247, 246, 0.8)',
                border: '1.5px solid var(--border-color, #dce5e1)',
                borderRadius: '12px',
                padding: '0.85rem',
                textAlign: 'center',
                fontSize: '1.3rem',
                fontFamily: 'monospace',
                letterSpacing: '0.15em',
                fontWeight: 800,
                color: '#0b5e4a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {joinMessage && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: joinMessage.startsWith('Success') ? '#e6f0ed' : '#fee2e2',
                color: joinMessage.startsWith('Success') ? '#0b5e4a' : '#b91c1c'
              }}>
                {joinMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-light, #5a7a6f)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining || !joinCode}
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  backgroundColor: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isJoining ? 'not-allowed' : 'pointer',
                  opacity: isJoining || !joinCode ? 0.6 : 1,
                  boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)'
                }}
              >
                {isJoining ? 'Joining...' : 'Join Classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auth Modal for guest users */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole="STUDENT"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
