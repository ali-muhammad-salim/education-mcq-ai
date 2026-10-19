'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, BookOpen, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, Sparkles, Plus, Users, ShieldAlert, FileText, ChevronRight, LogIn,
  GraduationCap, TrendingUp, CheckSquare, Compass
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history' | 'subjects'>('available');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Join Classroom Modal
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/student');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
        <span className="text-xs font-semibold">Loading Student Examination Dashboard...</span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      
      {/* Top Navigation & Profile Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b5e4a] to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-950/20">
            {data?.student?.name ? data.student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              {data?.student?.name || 'Student Learning Portal'}
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              AKU-EB Academic Assessment Track • Class IX–XII
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-sm"
          >
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Join Class by Code</span>
          </button>

          <Link
            href="/quizzes"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] text-white transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse All Quizzes</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 flex flex-col gap-8">
        
        {/* Guest Learner Welcome Banner */}
        {data?.isGuest && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/20 via-teal-900/10 to-transparent border border-emerald-600/30 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-600/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Previewing in Guest Candidate Mode</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  You can attempt official AKU-EB benchmark tests below. Sign in to save permanent score transcripts and join teacher classrooms.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] text-white shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}

        {/* Active Timed Exam Banner (If session in progress) */}
        {inProgressList.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Active In-Progress Assessment
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{inProgressList[0].title}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Timer is ticking on the authoritative server clock!
                </span>
              </div>
            </div>

            <Link
              href={`/quizzes/${inProgressList[0].quizId}/take`}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20 flex items-center gap-2 transition-all shrink-0"
            >
              <span>Resume Assessment Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Available Tests</span>
            <strong className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalQuizzesAvailable}</strong>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">Curriculum tests</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Completed</span>
            <strong className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{metrics.totalAttempts}</strong>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-1 font-medium">Submitted attempts</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Average Score</span>
            <strong className="text-2xl font-black text-[#c9a050]">{metrics.avgPercentage}%</strong>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">Across all tests</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">In-Progress</span>
            <strong className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.inProgressCount}</strong>
            <span className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1 font-medium">Active sessions</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'available'
                ? 'bg-[#0b5e4a] text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Available Assessments</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'available' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {(data?.availableQuizzes || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-[#0b5e4a] text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Completed Results & RAG Explanations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'history' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {(data?.completedAttempts || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'subjects'
                ? 'bg-[#0b5e4a] text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Subject Resource Archives</span>
          </button>
        </div>

        {/* TAB 1: AVAILABLE ASSESSMENTS */}
        {activeTab === 'available' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Practice Tests & Model Assessments
              </h3>
              <Link
                href="/quizzes"
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(data?.availableQuizzes || []).length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                No active public quizzes available right now. Ask your teacher for a classroom code or explore past papers.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.availableQuizzes.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 hover:shadow-lg transition-all flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                          {q.boardId || 'AKU-EB'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{q.durationMin} mins</span>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2.5 line-clamp-1">{q.title}</h4>
                      {q.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{q.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{q.questionCount} Questions</span>
                        <span>•</span>
                        <span>{q.totalMarks} Marks</span>
                        <span>•</span>
                        <span className="truncate">By {q.teacherName || 'RiseLearner'}</span>
                      </div>
                    </div>

                    <Link
                      href={`/quizzes/${q.id}/take`}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#0b5e4a] hover:bg-[#084737] text-white shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Start Timed Assessment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMPLETED RESULTS & REVIEWS */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Assessment Performance History & RAG Grounding
            </h3>

            {(data?.completedAttempts || []).length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                You have not completed any assessments yet. Take an assessment from the Available tab to see your performance breakdown!
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Assessment Title</th>
                      <th className="p-3.5">Score</th>
                      <th className="p-3.5">Percentage</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.completedAttempts.map((att: any) => (
                      <tr key={att.attemptId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {att.title}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 dark:text-white">{att.score}</span> / {att.maxMarks}
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            att.percentage >= 50 
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' 
                              : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400'
                          }`}>
                            {att.percentage}%
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Recently'}
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/quizzes/${att.quizId}/results?attemptId=${att.attemptId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Review Explanations</span>
                            <ArrowRight className="w-3 h-3" />
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
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Official AKU-EB Verified Subject Archives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 hover:shadow-lg transition-all flex items-center justify-between shadow-sm group"
                >
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{sub.desc}</p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-2 block font-semibold">
                      Class {sub.classRoman} Archive • {sub.count} Resources
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* JOIN CLASSROOM MODAL */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleJoinClassroom} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Join Teacher's Classroom</span>
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ask your teacher for the 6-character classroom code to access private assigned assessments.
            </p>

            <input
              type="text"
              required
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="E.g. A3B9X1"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-emerald-700 dark:text-emerald-400 outline-none focus:border-emerald-600"
            />

            {joinMessage && (
              <div className={`p-2.5 rounded-lg text-xs ${
                joinMessage.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                {joinMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining || !joinCode}
                className="px-4 py-2 text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] disabled:opacity-50 text-white rounded-lg shadow-sm"
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
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
