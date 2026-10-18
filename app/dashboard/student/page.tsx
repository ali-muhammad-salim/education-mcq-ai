'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, BookOpen, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, Sparkles, Plus, Users, ShieldAlert, FileText, ChevronRight
} from 'lucide-react';

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history' | 'subjects'>('available');

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs font-medium">Loading Student Examination Dashboard...</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Banner */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-950/40">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              {data?.student?.name || 'Student Portal'}
            </h1>
            <span className="text-xs text-slate-400">Class IX–XII Academic Assessment Track</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Join Class by Code</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-8">
        
        {/* Active Timed Exam Banner (If in progress) */}
        {inProgressList.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Active In-Progress Assessment</span>
                <h3 className="text-base font-bold text-white">{inProgressList[0].title}</h3>
                <span className="text-xs text-slate-400">Time is ticking on the authoritative server clock!</span>
              </div>
            </div>

            <Link
              href={`/quizzes/${inProgressList[0].quizId}/take`}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/50 flex items-center gap-2 transition-all shrink-0"
            >
              <span>Resume Assessment Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Available Tests</span>
            <strong className="text-2xl font-black text-white">{metrics.totalQuizzesAvailable}</strong>
            <span className="text-[11px] text-indigo-400 mt-1">Curriculum tests</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Completed</span>
            <strong className="text-2xl font-black text-emerald-400">{metrics.totalAttempts}</strong>
            <span className="text-[11px] text-emerald-300/80 mt-1">Submitted attempts</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Score</span>
            <strong className="text-2xl font-black text-cyan-400">{metrics.avgPercentage}%</strong>
            <span className="text-[11px] text-cyan-300/80 mt-1">Across all tests</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">In-Progress</span>
            <strong className="text-2xl font-black text-amber-400">{metrics.inProgressCount}</strong>
            <span className="text-[11px] text-amber-300/80 mt-1">Active sessions</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'available'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>Available Assessments</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {(data?.availableQuizzes || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>Completed Results & RAG Explanations</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {(data?.completedAttempts || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'subjects'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>Subject Resource Archives</span>
          </button>
        </div>

        {/* TAB 1: AVAILABLE QUIZZES */}
        {activeTab === 'available' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Practice Tests & Model Assessments
            </h3>

            {(data?.availableQuizzes || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                No active public quizzes available right now. Ask your teacher for a classroom code or direct link.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.availableQuizzes.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                          {q.boardId}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{q.durationMin} mins</span>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white mt-2 line-clamp-1">{q.title}</h4>
                      {q.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{q.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>{q.questionCount} Questions</span>
                        <span>•</span>
                        <span>{q.totalMarks} Marks</span>
                        <span>•</span>
                        <span className="text-slate-500">By {q.teacherName}</span>
                      </div>
                    </div>

                    <Link
                      href={`/quizzes/${q.id}/take`}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 transition-all"
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assessment Performance History & RAG Grounding
            </h3>

            {(data?.completedAttempts || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                You have not completed any assessments yet. Take an assessment from the Available tab to see your performance breakdown!
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Assessment Title</th>
                      <th className="p-3.5">Score</th>
                      <th className="p-3.5">Percentage</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.completedAttempts.map((att: any) => (
                      <tr key={att.attemptId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {att.title}
                        </td>
                        <td className="p-3.5">
                          <span className="text-white font-bold">{att.score}</span> / {att.maxMarks}
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            att.percentage >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {att.percentage}%
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Recently'}
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/quizzes/${att.quizId}/results?attemptId=${att.attemptId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 inline-flex items-center gap-1 transition-colors"
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Official AKU-EB Verified Subject Archives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Physics', classSlug: 'class-9', slug: 'physics', desc: 'Model Papers 2025, MCQs & Syllabi', count: 12 },
                { name: 'Chemistry', classSlug: 'class-9', slug: 'chemistry', desc: 'Syllabus SLOs, Notes & Key Papers', count: 9 },
                { name: 'Biology', classSlug: 'class-9', slug: 'biology', desc: 'Past Papers, Diagrams & Chapter MCQs', count: 8 },
                { name: 'Mathematics', classSlug: 'class-9', slug: 'mathematics', desc: 'Formulas, SLOs & Examination Specs', count: 10 },
                { name: 'Computer Science', classSlug: 'class-9', slug: 'computer-science', desc: 'Flowcharts, Algorithms & Model Tests', count: 7 }
              ].map(sub => (
                <Link
                  key={sub.slug}
                  href={`/subjects/${sub.classSlug}/${sub.slug}`}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between shadow-lg group"
                >
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{sub.desc}</p>
                    <span className="text-[10px] text-indigo-400 mt-2 block font-medium">
                      Class IX Archive • {sub.count} Resources
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* JOIN CLASSROOM MODAL */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleJoinClassroom} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Join Teacher's Classroom</span>
            </h3>

            <p className="text-xs text-slate-400">
              Ask your teacher for the 6-character classroom code to access private assigned assessments.
            </p>

            <input
              type="text"
              required
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="E.g. A3B9X1"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-indigo-400 outline-none focus:border-indigo-500"
            />

            {joinMessage && (
              <div className={`p-2.5 rounded-lg text-xs ${
                joinMessage.startsWith('Success') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
              }`}>
                {joinMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining || !joinCode}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
              >
                {isJoining ? 'Joining...' : 'Join Classroom'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
