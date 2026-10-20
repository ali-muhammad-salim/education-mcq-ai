'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, BookOpen, Users, CheckCircle2, Clock, ShieldAlert, 
  Settings, ExternalLink, Trash2, Edit3, Eye, Search, 
  Sparkles, Award, ArrowUpRight, Copy, Check, LogIn,
  GraduationCap, LogOut, ArrowRight, ShieldCheck, AlertTriangle,
  FileQuestion, CheckCheck, X
} from 'lucide-react';
import { clearExamCache } from '@/lib/exam-cache';
import { AssessmentActions, ClassroomRoster } from '@/components/AssessmentManagement';
import AuthModal from '@/components/AuthModal';
import ReviewQuestionEditor from '@/components/ReviewQuestionEditor';
import MathText from '@/components/MathText';
import PeopleDirectory from '@/components/PeopleDirectory';

export default function TeacherDashboardPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStudentBlocked, setIsStudentBlocked] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'submissions' | 'classrooms' | 'integrity' | 'ai-review' | 'students'>('quizzes');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // AI Doubt Queue state
  const [resolvingDoubtId, setResolvingDoubtId] = useState<string | null>(null);
  const [doubtFilter, setDoubtFilter] = useState<'PENDING' | 'RESOLVED'>('PENDING');

  // Create classroom modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState(9);
  const [classDesc, setClassDesc] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [page]);

  async function fetchDashboard() {
    try {
      setLoading(true); setLoadError('');
      const res = await fetch('/api/dashboard/teacher?page=' + page);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setAuthRequired(true); setData(null); return; }
        if (res.status === 403) { setIsStudentBlocked(true); setTimeout(() => window.location.replace('/dashboard/student'), 1200); return; }
        throw new Error(typeof json.error === 'string' ? json.error : json.error?.message || 'Unable to load dashboard.');
      }

      // If user is a STUDENT, teacher dashboard is strictly unavailable!
      if (!json.success && json.role === 'STUDENT') {
        setIsStudentBlocked(true);
        setTimeout(() => {
          window.location.replace('/dashboard/student');
        }, 1200);
        return;
      }

      // If unauthenticated, require educator login
      if (!json.success && json.requireAuth) {
        setAuthRequired(true);
        setData(null);
        return;
      }

      if (json.success) {
        setData(json);
        setAuthRequired(false);
        setIsStudentBlocked(false);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      console.error('Failed to fetch teacher dashboard:', err);
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

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Archive this assessment? Existing student responses and grades will be preserved.')) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchDashboard();
      } else {
        alert((typeof json.error === 'string' ? json.error : json.error?.message) || 'Failed to delete assessment');
      }
    } catch (err) {
      alert('Error deleting assessment');
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    try {
      setCreatingClass(true);
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className,
          description: classDesc,
          gradeLevel: classGrade,
          boardId: 'AKU-EB'
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsClassModalOpen(false);
        setClassName('');
        setClassDesc('');
        fetchDashboard();
      } else {
        alert((typeof json.error === 'string' ? json.error : json.error?.message) || 'Failed to create classroom');
      }
    } catch {
      alert('Error creating classroom');
    } finally {
      setCreatingClass(false);
    }
  };

  const copyCode = async (value: string, label = value) => {
    try { await navigator.clipboard.writeText(value);setCopiedCode(label);setTimeout(()=>setCopiedCode(null),2000); }
    catch { alert('Copy is unavailable. Please select and copy this manually:\n'+value); }
  };

  const handleResolveDoubt = async (doubtId: string, resolution: 'APPROVED' | 'DISMISSED', correctedAnswer?: string) => {
    try {
      setResolvingDoubtId(doubtId);
      const res = await fetch('/api/dashboard/teacher/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE',
          doubtId,
          resolution,
          correctedAnswer
        })
      });
      const json = await res.json();
      if (json.success) {
        fetchDashboard();
      } else {
        alert((typeof json.error === 'string' ? json.error : json.error?.message) || 'Failed to update question status');
      }
    } catch {
      alert('Error updating question status');
    } finally {
      setResolvingDoubtId(null);
    }
  };

  if (loadError && !loading) return <main className="dashboard-error" style={{ padding: '3rem', textAlign: 'center' }}><h2>Unable to load your dashboard</h2><p role="alert">{loadError}</p><button className="btn" onClick={fetchDashboard}>Retry</button></main>;

  // 1. STUDENT BLOCKED GUARD SCREEN
  if (isStudentBlocked) {
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
          border: '1.5px solid rgba(239, 68, 68, 0.4)',
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
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)', margin: 0 }}>
            Student Account Detected
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light, #5a7a6f)', margin: 0, lineHeight: 1.6 }}>
            The <strong>Teacher Assessment Portal</strong> is restricted to verified teachers and faculty. As a student, your practice assessments and results are located in the <strong>Student Learning Portal</strong>.
          </p>
          <div style={{
            fontSize: '0.8rem',
            color: '#b91c1c',
            backgroundColor: '#fef2f2',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            fontWeight: 600,
            width: '100%'
          }}>
            Redirecting to Student Dashboard automatically...
          </div>
          <Link
            href="/dashboard/student"
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
            <span>Go to Student Learning Portal Now</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // 2. EDUCATOR AUTHENTICATION REQUIRED SCREEN
  if (authRequired) {
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
          border: '1.5px solid var(--border-color, #dce5e1)',
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
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            backgroundColor: '#e6f0ed',
            color: '#0b5e4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GraduationCap size={40} />
          </div>
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: 'rgba(201, 160, 80, 0.2)',
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Educator Access Required
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)', margin: 0 }}>
            Teacher Assessment Management Portal
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light, #5a7a6f)', margin: 0, lineHeight: 1.6 }}>
            This portal is strictly reserved for verified teachers, examiners, and academic faculty to create assessments, inspect student submissions, and manage classrooms.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                backgroundColor: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(11, 94, 74, 0.25)'
              }}
            >
              <LogIn size={16} />
              <span>Sign In as Verified Teacher</span>
            </button>

            <Link
              href="/dashboard/student"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 700,
                backgroundColor: 'rgba(244, 247, 246, 0.8)',
                color: 'var(--text-color, #2c3e38)',
                border: '1px solid var(--border-color, #dce5e1)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxSizing: 'border-box'
              }}
            >
              <span>Go to Student Learning Portal</span>
            </Link>
          </div>
        </div>

        {/* Teacher Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          initialRole="TEACHER"
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => fetchDashboard()}
        />
      </div>
    );
  }

  // 3. LOADING STATE
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
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Teacher Assessment Portal...</span>
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
    totalQuizzes: 0,
    totalSubmissions: 0,
    pendingGrading: 0,
    flaggedEvents: 0,
    classroomsCount: 0
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color, #f4f7f6)',
      color: 'var(--text-color, #2c3e38)',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '5rem',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      
      {/* Top Banner */}
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
            T
          </div>
          <div>
            <h1 style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-color, #2c3e38)',
              margin: 0,
              lineHeight: 1.2
            }}>
              {data?.teacher?.name || 'Educator Portal'}
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)' }}>
              AKU-EB Assessment Management Hub
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsClassModalOpen(true)}
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
              cursor: 'pointer'
            }}
          >
            <Users size={15} color="#0b5e4a" />
            <span>New Classroom</span>
          </button>

          <Link
            href="/teacher/quizzes/builder"
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
              boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)'
            }}
          >
            <Plus size={15} />
            <span>Create Assessment</span>
          </Link>

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
            title="Sign out of teacher account"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <nav aria-label="Dashboard pages" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem' }}><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous page</button><span>Page {page}</span><button disabled={!Object.values(data?.hasMore || {}).some(Boolean)} onClick={() => setPage(p => p + 1)}>Next page</button></nav>
      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem 0 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>

        {/* Metric Cards Grid */}
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
              Assessments
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)' }}>
              {metrics.totalQuizzes}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#0b5e4a', fontWeight: 600 }}>
              Created assessments
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
              Submissions
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-color, #2c3e38)' }}>
              {metrics.totalSubmissions}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#0b5e4a', fontWeight: 600 }}>
              Student attempts
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
              Pending Grading
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706' }}>
              {metrics.pendingGrading}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
              Written evaluations
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
              Integrity Alerts
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#dc2626' }}>
              {metrics.flaggedEvents}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
              Tab-switch flags
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
              AI Doubt Review
            </span>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>
              {metrics.pendingDoubts !== undefined ? metrics.pendingDoubts : (data?.aiDoubtQueue || []).filter((d: any) => d.status === 'PENDING_REVIEW').length}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
              Awaiting educator review
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
          {[
            { id: 'quizzes', label: 'My Assessments', count: (data?.quizzes || []).length },
            { id: 'submissions', label: 'Submissions & Grades', count: (data?.recentSubmissions || []).length },
            { id: 'classrooms', label: 'Classrooms & Rosters', count: (data?.classrooms || []).length },
            { id: 'students', label: 'Student Progress', count: '↗' },
            { id: 'integrity', label: 'Session Activity', count: (data?.flaggedAttempts || []).length },
            { id: 'ai-review', label: 'AI Doubt Queue', count: (data?.aiDoubtQueue || []).filter((d: any) => d.status === 'PENDING_REVIEW').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
                backgroundColor: activeTab === tab.id ? '#0b5e4a' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-light, #5a7a6f)',
                boxShadow: activeTab === tab.id ? '0 4px 6px rgba(11, 94, 74, 0.2)' : 'none'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                backgroundColor: activeTab === tab.id ? '#084737' : 'var(--surface-muted)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-color, #2c3e38)'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: ASSESSMENTS LIST */}
        {activeTab === 'students' && <PeopleDirectory />}
        {activeTab === 'quizzes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-light, #5a7a6f)' }}>
                Total {data?.quizzes?.length || 0} assessments created
              </span>
              <Link
                href="/teacher/quizzes/builder"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0b5e4a',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Plus size={15} />
                <span>Create with AI or Question Bank</span>
              </Link>
            </div>

            {(data?.quizzes || []).length === 0 ? (
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
                <BookOpen size={48} color="#94a3b8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-color, #2c3e38)' }}>
                  No assessments created yet
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light, #5a7a6f)', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
                  Create your first assessment using our Google Forms-style builder, pull questions from the official AKU-EB Question Bank, or generate with Gemini AI.
                </p>
                <Link
                  href="/teacher/quizzes/builder"
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: '#0b5e4a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    boxShadow: '0 4px 6px rgba(11, 94, 74, 0.2)'
                  }}
                >
                  Open Assessment Builder
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
                gap: '1.25rem'
              }}>
                {data.quizzes.map((q: any) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: q.status === 'PUBLISHED' ? '#e6f0ed' : '#fef3c7',
                            color: q.status === 'PUBLISHED' ? '#0b5e4a' : '#b45309',
                            border: q.status === 'PUBLISHED' ? '1px solid rgba(11, 94, 74, 0.2)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            {q.status}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            backgroundColor: 'rgba(244, 247, 246, 0.8)',
                            color: '#0b5e4a',
                            border: '1px solid var(--border-color, #dce5e1)'
                          }}>
                            Code: {q.code || q.id}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #5a7a6f)' }}>{q.visibility}</span>
                      </div>

                      <h3 style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-color, #2c3e38)',
                        marginTop: '0.85rem',
                        marginBottom: '0.4rem',
                        lineHeight: 1.35
                      }}>
                        {q.title}
                      </h3>
                      <AssessmentActions quizId={q.id} classrooms={data?.classrooms || []} onSaved={fetchDashboard} />
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
                        color: 'var(--text-light, #5a7a6f)'
                      }}>
                        <span style={{ fontWeight: 700, color: '#0b5e4a' }}>{q.questionCount} Questions</span>
                        <span>•</span>
                        <span style={{ fontWeight: 700 }}>{q.totalMarks} Marks</span>
                        <span>•</span>
                        <span>{q.durationMin} Min</span>
                        <span>•</span>
                        <span style={{ color: '#0b5e4a', fontWeight: 700 }}>{q.attemptCount} Attempts</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-color, #dce5e1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const code = q.code || q.id;
                            const url = `${window.location.origin}/?code=${encodeURIComponent(code)}`;
                            void copyCode(url,code);
                          }}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(244, 247, 246, 0.8)',
                            color: '#0b5e4a',
                            border: '1px solid var(--border-color, #dce5e1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Copy size={13} />
                          <span>{copiedCode === (q.code || q.id) ? 'Copied Link!' : 'Share Code'}</span>
                        </button>
                        <Link
                          href={`/teacher/quizzes/builder?id=${q.id}${q.attemptCount > 0 ? '&duplicate=1' : ''}`}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: '#e6f0ed',
                            color: '#0b5e4a',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </Link>
                        <Link
                          href={`/quizzes/${q.id}/take`}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(244, 247, 246, 0.8)',
                            color: 'var(--text-color, #2c3e38)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Eye size={13} color="#0284c7" />
                          <span>Preview</span>
                        </Link>
                      </div>

                      <button
                        onClick={() => handleDeleteQuiz(q.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.35rem'
                        }}
                        title="Archive assessment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBMISSIONS & GRADES */}
        {activeTab === 'submissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--text-light, #5a7a6f)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              Recent Student Submissions ({data?.recentSubmissions?.length || 0})
            </h3>

            {(data?.recentSubmissions || []).length === 0 ? (
              <div style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                fontSize: '0.88rem',
                color: 'var(--text-light, #5a7a6f)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)'
              }}>
                No student submissions recorded yet. Share assessments with your students to collect results.
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
                      <th style={{ padding: '0.9rem 1rem' }}>Student</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Assessment</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Score</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Tab Switches</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSubmissions.map((s: any) => (
                      <tr key={s.attemptId} style={{ borderTop: '1px solid var(--border-color, #dce5e1)' }}>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <strong style={{ color: 'var(--text-color, #2c3e38)', display: 'block' }}>{s.studentName}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light, #5a7a6f)' }}>{s.studentEmail}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: 'var(--text-color, #2c3e38)' }}>
                          {s.quizTitle}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-color, #2c3e38)' }}>{s.score ?? 'Pending'}</span> / {s.maxMarks}
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: s.percentage >= 50 ? '#e6f0ed' : '#fee2e2',
                            color: s.percentage >= 50 ? '#0b5e4a' : '#b91c1c'
                          }}>
                            {s.percentage == null ? 'Awaiting grading' : s.percentage + '%'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: s.status === 'GRADING_PENDING' ? '#fef3c7' : '#e6f0ed',
                            color: s.status === 'GRADING_PENDING' ? '#b45309' : '#0b5e4a'
                          }}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ color: s.tabSwitchCount > 2 ? '#dc2626' : 'var(--text-light, #5a7a6f)', fontWeight: s.tabSwitchCount > 2 ? 800 : 500 }}>
                            {s.tabSwitchCount} {s.tabSwitchCount > 2 ? '⚠️' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <Link
                            href={`/quizzes/${s.quizId}/results?attemptId=${s.attemptId}`}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: '#0b5e4a',
                              color: '#ffffff',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>Inspect & Grade</span>
                            <ArrowUpRight size={13} />
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

        {/* TAB 3: CLASSROOMS */}
        {activeTab === 'classrooms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-light, #5a7a6f)' }}>Classrooms & Student Groups</span>
              <button
                onClick={() => setIsClassModalOpen(true)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Create Classroom</span>
              </button>
            </div>

            {(data?.classrooms || []).length === 0 ? (
              <div style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                fontSize: '0.88rem',
                color: 'var(--text-light, #5a7a6f)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)'
              }}>
                No classrooms created yet. Create a classroom to assign assessments to specific student cohorts.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '1.25rem'
              }}>
                {data.classrooms.map((c: any) => (
                  <div
                    key={c.id}
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
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-light, #5a7a6f)' }}>
                          Class {c.gradeLevel || c.classLevel || 9}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#e6f0ed',
                          color: '#0b5e4a',
                          fontWeight: 700
                        }}>
                          {c.academicYear || c.session || '2025-2026'}
                        </span>
                      </div>
                      <ClassroomRoster id={c.id} onSaved={fetchDashboard} /><h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-color, #2c3e38)', margin: '0.4rem 0' }}>
                        {c.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-light, #5a7a6f)' }}>
                        <span style={{ fontWeight: 700, color: '#0b5e4a' }}>{c.studentCount ?? c._count?.memberships ?? 0} Students</span>
                        <span>•</span>
                        <span>{c.assignmentCount ?? c._count?.quizzes ?? 0} Assignments</span>
                      </div>
                    </div>

                    <div style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(244, 247, 246, 0.7)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color, #dce5e1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-light, #5a7a6f)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Join Code
                        </span>
                        <strong style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#0b5e4a', letterSpacing: '0.08em' }}>
                          {c.code}
                        </strong>
                      </div>
                      <button
                        onClick={() => copyCode(c.code)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'var(--card-bg, #ffffff)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title="Copy student join code"
                      >
                        {copiedCode === c.code ? <Check size={16} color="#059669" /> : <Copy size={16} color="#5a7a6f" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INTEGRITY SENTINEL */}
        {activeTab === 'integrity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              margin: 0
            }}>
              <ShieldAlert size={16} />
              <span>Flagged Anti-Cheating Incidents</span>
            </h3>

            {(data?.flaggedAttempts || []).length === 0 ? (
              <div style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                fontSize: '0.88rem',
                color: 'var(--text-light, #5a7a6f)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #dce5e1)'
              }}>
                No integrity threshold breaches logged. All student assessments completed within acceptable browser focus limits.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.flaggedAttempts.map((f: any) => (
                  <div
                    key={f.attemptId || f.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '14px',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1.5px solid rgba(239, 68, 68, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.9rem'
                      }}>
                        !
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-color, #2c3e38)', display: 'block' }}>
                          {f.studentName || f.student?.name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light, #5a7a6f)' }}>
                          {f.quizTitle || f.quiz?.title}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-light, #5a7a6f)', display: 'block' }}>Tab Switches</span>
                        <strong style={{ fontSize: '0.88rem', color: '#dc2626', fontWeight: 800 }}>
                          {f.tabSwitchCount} switches
                        </strong>
                      </div>
                      <Link
                        href={`/quizzes/${f.quizId || f.quiz?.id || f.attemptId || f.id}/results?attemptId=${f.attemptId || f.id}`}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(244, 247, 246, 0.8)',
                          color: 'var(--text-color, #2c3e38)',
                          border: '1px solid var(--border-color, #dce5e1)',
                          textDecoration: 'none'
                        }}
                      >
                        Audit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AI QUALITY REVIEW & DOUBT QUEUE */}
        {activeTab === 'ai-review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Card */}
            <div style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid var(--border-color, #dce5e1)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-color, #2c3e38)' }}>
                      AI Question Quality & Double-Check Doubt Queue
                    </h2>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-light, #5a7a6f)' }}>
                      Generated questions require educator review before publication.
                    </span>
                  </div>
                </div>

                {/* Sub-Filter Tabs */}
                <div style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-color, #f4f7f6)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #dce5e1)'
                }}>
                  <button
                    onClick={() => setDoubtFilter('PENDING')}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: doubtFilter === 'PENDING' ? '#0b5e4a' : 'transparent',
                      color: doubtFilter === 'PENDING' ? '#ffffff' : 'var(--text-color, #2c3e38)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Pending Review ({((data?.aiDoubtQueue || []).filter((d: any) => d.status === 'PENDING_REVIEW')).length})
                  </button>
                  <button
                    onClick={() => setDoubtFilter('RESOLVED')}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: doubtFilter === 'RESOLVED' ? '#0b5e4a' : 'transparent',
                      color: doubtFilter === 'RESOLVED' ? '#ffffff' : 'var(--text-color, #2c3e38)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Resolved ({((data?.aiDoubtQueue || []).filter((d: any) => d.status !== 'PENDING_REVIEW')).length})
                  </button>
                </div>
              </div>
            </div>

            {/* List of Doubt Cards */}
            {(() => {
              const allDoubts: any[] = data?.aiDoubtQueue || [];
              const filteredDoubts = doubtFilter === 'PENDING'
                ? allDoubts.filter((d: any) => d.status === 'PENDING_REVIEW')
                : allDoubts.filter((d: any) => d.status !== 'PENDING_REVIEW');

              if (filteredDoubts.length === 0) {
                return (
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
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ShieldCheck size={36} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-color, #2c3e38)' }}>
                      {doubtFilter === 'PENDING' ? 'No Questions Awaiting Review' : 'No Resolved Questions Yet'}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-light, #5a7a6f)', maxWidth: '480px', margin: 0, lineHeight: 1.6 }}>
                      {doubtFilter === 'PENDING'
                        ? 'Your review queue is empty. This does not certify the accuracy of all content.'
                        : 'Any questions flagged by the double-check AI that you approve or dismiss will be recorded here.'}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredDoubts.map((doubt: any) => {
                    const isPending = doubt.status === 'PENDING_REVIEW';
                    const confPct = doubt.confidenceScore == null ? null : Math.round(doubt.confidenceScore * 100);

                    return (
                      <div
                        key={doubt.id}
                        style={{
                          backgroundColor: 'var(--card-bg, #ffffff)',
                          borderRadius: '16px',
                          border: isPending ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color, #dce5e1)',
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1.25rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {/* Top Metadata Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(11, 94, 74, 0.1)',
                              color: 'var(--primary-color, #0b5e4a)',
                              textTransform: 'uppercase'
                            }}>
                              {doubt.subject || 'General'}
                            </span>
                            <span style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--bg-color, #f4f7f6)',
                              color: 'var(--text-color, #2c3e38)',
                              border: '1px solid var(--border-color, #dce5e1)'
                            }}>
                              {doubt.classLevel}
                            </span>
                            {doubt.chapter && (
                              <span style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: 'var(--bg-color, #f4f7f6)',
                                color: 'var(--text-light, #5a7a6f)'
                              }}>
                                {doubt.chapter}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              backgroundColor: (confPct ?? 0) >= 90 ? 'rgba(16, 185, 129, 0.15)' : (confPct ?? 0) >= 75 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: (confPct ?? 0) >= 90 ? '#10b981' : (confPct ?? 0) >= 75 ? '#d97706' : '#dc2626'
                            }}>
                              <AlertTriangle size={13} />
                              <span>{confPct == null ? 'Unavailable' : confPct + '%'} AI Confidence</span>
                            </span>

                            {!isPending && (
                              <span style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                backgroundColor: doubt.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: doubt.status === 'APPROVED' ? '#10b981' : '#dc2626'
                              }}>
                                {doubt.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Stem */}
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light, #5a7a6f)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Question Statement
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            lineHeight: 1.5,
                            color: 'var(--text-color, #2c3e38)',
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-color, #f8fafc)',
                            border: '1px solid var(--border-color, #dce5e1)'
                          }}>
                            <MathText text={doubt.stemText} /><ReviewQuestionEditor id={doubt.id} question={doubt.question} onSaved={fetchDashboard} />
                          </div>
                        </div>

                        {/* Options Comparison */}
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light, #5a7a6f)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Options Analysis (Click option to select correct answer)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                            {(doubt.options || []).map((opt: any, optIdx: number) => {
                              const isMarked = opt.isCorrect;
                              const isValidatorRec = doubt.stage2Answer && opt.text && doubt.stage2Answer.toLowerCase().includes(opt.text.toLowerCase());

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => isPending && handleResolveDoubt(doubt.id, 'APPROVED', opt.text)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    border: isMarked
                                      ? '2px solid #0b5e4a'
                                      : isValidatorRec
                                      ? '2px solid #d97706'
                                      : '1px solid var(--border-color, #dce5e1)',
                                    backgroundColor: isMarked
                                      ? 'rgba(11, 94, 74, 0.08)'
                                      : isValidatorRec
                                      ? 'rgba(245, 158, 11, 0.08)'
                                      : 'var(--card-bg, #ffffff)',
                                    cursor: isPending ? 'pointer' : 'default',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isMarked ? '#0b5e4a' : 'var(--text-light, #5a7a6f)' }}>
                                      Option {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    {isMarked && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#0b5e4a', color: '#ffffff' }}>
                                        Current Key
                                      </span>
                                    )}
                                    {isValidatorRec && !isMarked && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#d97706', color: '#ffffff' }}>
                                        Validator Pick
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.88rem', color: 'var(--text-color, #2c3e38)', fontWeight: 600 }}>
                                    <MathText text={opt.text} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* AI Doubt Diagnostic Reason Box */}
                        <div style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '12px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 800, fontSize: '0.8rem' }}>
                            <FileQuestion size={16} />
                            <span>Double-Check AI Quality Analysis:</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-color, #2c3e38)', margin: 0, lineHeight: 1.5 }}>
                            {doubt.doubtReason || 'Stage 2 validator flagged a potential ambiguity or calculation discrepancy between stem and distractors.'}
                          </p>
                          {doubt.suggestedCorrection && (
                            <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginTop: '0.25rem' }}>
                              💡 <strong>Suggested Correction:</strong> {doubt.suggestedCorrection}
                            </div>
                          )}
                        </div>

                        {/* Educator Action Buttons */}
                        {isPending && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color, #dce5e1)' }}>
                            <button
                              type="button"
                              disabled={resolvingDoubtId === doubt.id}
                              onClick={() => handleResolveDoubt(doubt.id, 'DISMISSED')}
                              style={{
                                padding: '0.55rem 1rem',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <X size={15} />
                              <span>Dismiss Question</span>
                            </button>

                            <button
                              type="button"
                              disabled={resolvingDoubtId === doubt.id}
                              onClick={() => handleResolveDoubt(doubt.id, 'APPROVED')}
                              style={{
                                padding: '0.55rem 1.25rem',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                backgroundColor: '#0b5e4a',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <CheckCheck size={16} />
                              <span>{resolvingDoubtId === doubt.id ? 'Updating...' : 'Approve as Verified'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* CREATE CLASSROOM MODAL */}
      {isClassModalOpen && (
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
            onSubmit={handleCreateClassroom}
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #dce5e1)',
              borderRadius: '20px',
              maxWidth: '440px',
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
              <span>Create New Classroom</span>
            </h3>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-light, #5a7a6f)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Classroom Name
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="E.g., Class IX-A Physics (Morning)"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(244, 247, 246, 0.8)',
                  border: '1px solid var(--border-color, #dce5e1)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-color, #2c3e38)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-light, #5a7a6f)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Grade Level
              </label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(244, 247, 246, 0.8)',
                  border: '1px solid var(--border-color, #dce5e1)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-color, #2c3e38)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value={9}>Class IX (9th)</option>
                <option value={10}>Class X (10th)</option>
                <option value={11}>Class XI (11th)</option>
                <option value={12}>Class XII (12th)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-light, #5a7a6f)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Description (Optional)
              </label>
              <textarea
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                rows={2}
                placeholder="Notes for student cohort..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(244, 247, 246, 0.8)',
                  border: '1px solid var(--border-color, #dce5e1)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-color, #2c3e38)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
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
                disabled={creatingClass}
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  backgroundColor: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: creatingClass ? 'not-allowed' : 'pointer',
                  opacity: creatingClass ? 0.6 : 1,
                  boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)'
                }}
              >
                {creatingClass ? 'Creating...' : 'Create Classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auth Modal for Teacher Access */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole="TEACHER"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
