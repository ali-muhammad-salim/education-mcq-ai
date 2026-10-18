'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, BookOpen, Users, CheckCircle2, Clock, ShieldAlert, 
  Settings, ExternalLink, Trash2, Edit3, Eye, Search, 
  Sparkles, Award, ArrowUpRight, Copy, Check
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'submissions' | 'classrooms' | 'integrity'>('quizzes');
  
  // Create classroom modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState(9);
  const [classDesc, setClassDesc] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/teacher');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch teacher dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This will also remove associated student responses.')) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchDashboard();
      } else {
        alert(json.error || 'Failed to delete assessment');
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
        alert(json.error || 'Failed to create classroom');
      }
    } catch {
      alert('Error creating classroom');
    } finally {
      setCreatingClass(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs font-medium">Loading Teacher Assessment Portal...</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Banner */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
            T
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              {data?.teacher?.name || 'Educator Portal'}
            </h1>
            <span className="text-xs text-slate-400">AKU-EB Assessment Management Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClassModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">New Classroom</span>
          </button>

          <Link
            href="/teacher/quizzes/builder"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-8">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Assessments</span>
            <strong className="text-2xl font-black text-white">{metrics.totalQuizzes}</strong>
            <span className="text-[11px] text-indigo-400 mt-1">Ready for testing</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Submissions</span>
            <strong className="text-2xl font-black text-white">{metrics.totalSubmissions}</strong>
            <span className="text-[11px] text-emerald-400 mt-1">Student attempts</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pending Grading</span>
            <strong className="text-2xl font-black text-amber-400">{metrics.pendingGrading}</strong>
            <span className="text-[11px] text-amber-300/80 mt-1">Written evaluations</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Integrity Alerts</span>
            <strong className="text-2xl font-black text-rose-400">{metrics.flaggedEvents}</strong>
            <span className="text-[11px] text-rose-300/80 mt-1">Tab-switch flags</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'quizzes', label: 'My Assessments', count: (data?.quizzes || []).length },
            { id: 'submissions', label: 'Submissions & Grades', count: (data?.recentSubmissions || []).length },
            { id: 'classrooms', label: 'Classrooms & Rosters', count: (data?.classrooms || []).length },
            { id: 'integrity', label: 'Anti-Cheating Sentinel', count: (data?.flaggedAttempts || []).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: ASSESSMENTS LIST */}
        {activeTab === 'quizzes' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total {data?.quizzes?.length || 0} assessments created</span>
              <Link
                href="/teacher/quizzes/builder"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create with AI or Question Bank</span>
              </Link>
            </div>

            {(data?.quizzes || []).length === 0 ? (
              <div className="py-16 text-center bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center gap-4">
                <BookOpen className="w-12 h-12 text-slate-600" />
                <h3 className="text-base font-bold text-white">No assessments created yet</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Create your first assessment using our Google Forms-style builder, pull questions from the official AKU-EB Question Bank, or generate with Gemini AI.
                </p>
                <Link
                  href="/teacher/quizzes/builder"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                >
                  Open Assessment Builder
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.quizzes.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          q.status === 'PUBLISHED' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {q.status}
                        </span>
                        <span className="text-[11px] text-slate-500">{q.visibility}</span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-2 line-clamp-1">{q.title}</h3>
                      {q.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{q.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>{q.questionCount} Questions</span>
                        <span>•</span>
                        <span>{q.totalMarks} Marks</span>
                        <span>•</span>
                        <span>{q.durationMin} Min</span>
                        <span>•</span>
                        <span className="text-indigo-400">{q.attemptCount} Attempts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/teacher/quizzes/builder?id=${q.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                        <Link
                          href={`/quizzes/${q.id}/take`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 transition-colors"
                          title="Preview student experience"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Preview</span>
                        </Link>
                      </div>

                      <button
                        onClick={() => handleDeleteQuiz(q.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Delete assessment"
                      >
                        <Trash2 className="w-4 h-4" />
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
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Student Submissions ({data?.recentSubmissions?.length || 0})
            </h3>

            {(data?.recentSubmissions || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                No student submissions recorded yet. Share assessments with your students to collect results.
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Student</th>
                      <th className="p-3.5">Assessment</th>
                      <th className="p-3.5">Score</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Tab Switches</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.recentSubmissions.map((s: any) => (
                      <tr key={s.attemptId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5">
                          <strong className="text-white block">{s.studentName}</strong>
                          <span className="text-[10px] text-slate-500">{s.studentEmail}</span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-medium">
                          {s.quizTitle}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-white">{s.score}</span> / {s.maxMarks}
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            s.percentage >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            s.status === 'GRADING_PENDING' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={s.tabSwitchCount > 2 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            {s.tabSwitchCount} {s.tabSwitchCount > 2 ? '⚠️' : ''}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/quizzes/${s.quizId}/results?attemptId=${s.attemptId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Inspect & Grade</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Classrooms & Student Groups</span>
              <button
                onClick={() => setIsClassModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Classroom</span>
              </button>
            </div>

            {(data?.classrooms || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                No classrooms created yet. Create a classroom to assign assessments to specific student cohorts.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.classrooms.map((c: any) => (
                  <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 shadow-lg">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Class {c.gradeLevel}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400">{c.academicYear}</span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">{c.name}</h4>
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>{c.studentCount} Students</span>
                        <span>•</span>
                        <span>{c.assignmentCount} Assignments</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Join Code</span>
                        <strong className="text-sm font-mono text-indigo-400 tracking-wider">{c.code}</strong>
                      </div>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        title="Copy student join code"
                      >
                        {copiedCode === c.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Flagged Anti-Cheating Incidents</span>
            </h3>

            {(data?.flaggedAttempts || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                No integrity threshold breaches logged. All student assessments completed within acceptable browser focus limits.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.flaggedAttempts.map((f: any) => (
                  <div key={f.attemptId} className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/30">
                        !
                      </div>
                      <div>
                        <strong className="text-xs text-white block">{f.studentName}</strong>
                        <span className="text-[11px] text-slate-400">{f.quizTitle}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Tab Switches</span>
                        <strong className="text-xs text-rose-400 font-bold">{f.tabSwitchCount} switches</strong>
                      </div>
                      <Link
                        href={`/quizzes/${f.attemptId}/results?attemptId=${f.attemptId}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
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
      </div>

      {/* CREATE CLASSROOM MODAL */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateClassroom} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Create New Classroom</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Classroom Name</label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="E.g., Class IX-A Physics (Morning)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Grade Level</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value={9}>Class IX (9th)</option>
                <option value={10}>Class X (10th)</option>
                <option value={11}>Class XI (11th)</option>
                <option value={12}>Class XII (12th)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Description (Optional)</label>
              <textarea
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                rows={2}
                placeholder="Notes for student cohort..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingClass}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
              >
                {creatingClass ? 'Creating...' : 'Create Classroom'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
