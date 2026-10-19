'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, BookOpen, Clock, Award, ArrowRight, Sparkles, 
  Plus, Users, Filter, CheckCircle2, FileText, ChevronRight,
  ShieldAlert, Compass, GraduationCap, Flame
} from 'lucide-react';

export default function QuizzesCatalogPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

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
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      
      {/* Premium Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b5e4a] via-[#094d3c] to-[#052e24] text-white pt-12 pb-16 px-4 sm:px-8 border-b border-emerald-800/40 shadow-xl">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-96 h-96 rounded-full bg-[#c9a050]/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#c9a050]/20 text-amber-200 border border-[#c9a050]/30 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Official AKU-EB Examination Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-serif">
              Examinations & Practice Tests
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/80 mt-3 leading-relaxed">
              Curriculum-aligned timed assessments for SSC & HSSC (Classes IX, X, XI, XII). Featuring server-authoritative countdown timing, RAG-grounded curriculum explanations, and real-time score analytics.
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-emerald-200/90 font-medium">
              <span className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/50">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Timed Exam Engine</span>
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Instant Auto-Grading</span>
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/50">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-300" />
                <span>Proctoring & Anti-Cheat</span>
              </span>
            </div>
          </div>

          {/* Quick CTA Links */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full sm:w-auto shrink-0">
            <Link
              href="/dashboard/student"
              className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm text-center flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Student Performance Portal</span>
            </Link>

            <Link
              href="/teacher/quizzes/builder"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#c9a050] hover:bg-[#b58e42] text-slate-950 shadow-lg shadow-black/20 text-center flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Create Custom Assessment</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Hub */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 flex flex-col gap-8 relative z-20">
        
        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessment by title, concept, or topic..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              aria-label="Filter by academic class"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-600"
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
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-600"
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

        {/* Quizzes Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
            <span className="text-xs font-semibold">Loading verified examinations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No assessments found matching filter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Try adjusting your search keywords, or build a custom test using the unified AKU-EB Quiz Builder.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setSearch(''); setSelectedClass('ALL'); setSelectedSubject('ALL'); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Reset Filters
              </button>
              <Link
                href="/teacher/quizzes/builder"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b5e4a] hover:bg-[#084737] text-white shadow-md"
              >
                Create New Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 hover:shadow-xl hover:shadow-emerald-950/5 transition-all flex flex-col justify-between gap-5 shadow-sm group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                      {q.boardId || 'AKU-EB'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{q.durationMin} mins</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {q.title}
                  </h3>
                  
                  {q.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {q.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold">{q.questionCount} Questions</span>
                    <span>•</span>
                    <span className="font-semibold">{q.totalMarks} Marks</span>
                    <span>•</span>
                    <span className="truncate">{q.teacherName || 'RiseLearner Team'}</span>
                  </div>
                </div>

                <Link
                  href={`/quizzes/${q.id}/take`}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-[#0b5e4a] hover:bg-[#084737] text-white shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all group-hover:bg-[#084737]"
                >
                  <span>Start Timed Assessment</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
