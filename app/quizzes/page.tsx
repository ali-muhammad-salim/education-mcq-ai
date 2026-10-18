'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, BookOpen, Clock, Award, ArrowRight, Sparkles, 
  Plus, Users, Filter, CheckCircle2, FileText, ChevronRight
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
      ? q.title.toLowerCase().includes(search.toLowerCase()) || (q.description && q.description.toLowerCase().includes(search.toLowerCase()))
      : true;
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 px-4 sm:px-8 pt-10 pb-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Official AKU-EB Testing Engine
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Examinations & Practice Tests
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Curriculum-aligned timed assessments for Classes IX, X, XI, and XII. Server-authoritative timing, instant grading, and verified RAG-grounded explanations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard/student"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center transition-all"
            >
              Student Portal
            </Link>
            <Link
              href="/teacher/quizzes/builder"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 text-center flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 flex flex-col gap-6">
        
        {/* Search & Filters */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by assessment title, concept, or topic..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
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
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
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
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span className="text-xs">Loading published examinations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center gap-4">
            <BookOpen className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-bold text-white">No assessments found matching filter</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Try adjusting your search keywords, or build a custom test using the unified Quiz Builder.
            </p>
            <Link
              href="/teacher/quizzes/builder"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
            >
              Create New Assessment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-indigo-950/20 transition-all flex flex-col justify-between gap-5 shadow-lg group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                      {q.boardId || 'AKU-EB'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{q.durationMin}m</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {q.title}
                  </h3>
                  
                  {q.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {q.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-4 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                    <span>{q.questionCount} Questions</span>
                    <span>•</span>
                    <span>{q.totalMarks} Marks</span>
                    <span>•</span>
                    <span className="text-slate-500 truncate">{q.teacherName}</span>
                  </div>
                </div>

                <Link
                  href={`/quizzes/${q.id}/take`}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 transition-all group-hover:bg-indigo-500"
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
