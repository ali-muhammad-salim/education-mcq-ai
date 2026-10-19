'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, Play, CheckCircle2, AlertCircle, RefreshCw, 
  FileText, BookOpen, Layers, Award, Sparkles, Terminal, 
  Clock, ArrowRight, ExternalLink, Check, Download, ShieldCheck, Lock
} from 'lucide-react';
import MathText from '@/components/MathText';
import Breadcrumbs from '@/components/Breadcrumbs';
import AuthModal from '@/components/AuthModal';

interface IngestProgress {
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  percent: number;
  stage: string;
  message: string;
  logs: string[];
  results: {
    topics?: number;
    slos?: number;
    questions?: number;
    classIX_units?: number;
    classX_units?: number;
    completed_at?: string;
  };
  updated_at?: number;
}

export default function ResourceUploadCenterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [board, setBoard] = useState('Aga Khan University Examination Board');
  const [classLevel, setClassLevel] = useState('auto');
  const [subject, setSubject] = useState('Physics');
  const [resourceType, setResourceType] = useState<'syllabus' | 'model_paper' | 'past_paper' | 'textbook' | 'pacing_guide'>('past_paper');

  // Past / Model Paper specific configurations
  const [examYear, setExamYear] = useState<string>('auto');
  const [paperComponent, setPaperComponent] = useState<string>('auto');
  const [solutionStatus, setSolutionStatus] = useState<string>('auto');
  const [keyFile, setKeyFile] = useState<File | null>(null);

  // Real-time Filename AI Auto-Detection State
  const [detectedBadge, setDetectedBadge] = useState<{
    year?: string;
    classLevel?: string;
    subject?: string;
    paper?: string;
    solution?: string;
    resourceType?: 'syllabus' | 'model_paper' | 'past_paper' | 'textbook' | 'pacing_guide';
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Admin authentication enforcement
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setCurrentUser(data.user);
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  // Live Progress polling state
  const [progress, setProgress] = useState<IngestProgress>({
    status: 'IDLE',
    percent: 0,
    stage: 'Ready',
    message: 'System ready for resource intake.',
    logs: [],
    results: {},
  });

  // Client-Side Smart Filename Analyzer
  const analyzeFilename = (fileName: string) => {
    const fn = fileName.toLowerCase();
    const result: {
      year?: string;
      classLevel?: string;
      subject?: string;
      paper?: string;
      solution?: string;
      resourceType?: 'syllabus' | 'model_paper' | 'past_paper' | 'textbook' | 'pacing_guide';
    } = {};

    // 1. Resource Type
    if (fn.includes('syllabus') || fn.includes('curriculum')) {
      result.resourceType = 'syllabus';
    } else if (fn.includes('model') || fn.includes('sample')) {
      result.resourceType = 'model_paper';
    } else if (fn.includes('past') || fn.includes('annual') || /201\d|202\d/.test(fn)) {
      result.resourceType = 'past_paper';
    } else if (fn.includes('textbook') || fn.includes('book')) {
      result.resourceType = 'textbook';
    } else if (fn.includes('pacing') || fn.includes('guide')) {
      result.resourceType = 'pacing_guide';
    }

    // 2. Exam Year (2015 to 2025)
    const yearMatch = fn.match(/(201\d|202\d)/);
    if (yearMatch) {
      result.year = yearMatch[1];
    }

    // 3. Class Level (Class IX vs Class X)
    if (
      fn.includes('ssc-ii') || fn.includes('ssc2') || fn.includes('ssc_2') ||
      fn.includes('class-10') || fn.includes('class_10') || fn.includes('grade-10') ||
      fn.includes('grade 10') || fn.includes('class 10') || fn.includes('class-x') ||
      fn.includes('class_x') || fn.includes('class x') || /(^|[^a-z0-9])(x|10)($|[^a-z0-9])/.test(fn)
    ) {
      result.classLevel = 'Class X';
    } else if (
      fn.includes('ssc-i') || fn.includes('ssc1') || fn.includes('ssc_1') ||
      fn.includes('class-9') || fn.includes('class_9') || fn.includes('grade-9') ||
      fn.includes('grade 9') || fn.includes('class 9') || fn.includes('class-ix') ||
      fn.includes('class_ix') || fn.includes('class ix') || /(^|[^a-z0-9])(ix|9)($|[^a-z0-9])/.test(fn)
    ) {
      result.classLevel = 'Class IX';
    }

    // 4. Subject Auto-Detection (Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Islamiat)
    if (fn.includes('chem') || fn.includes('chemistry') || fn.includes('kemiya')) {
      result.subject = 'Chemistry';
    } else if (fn.includes('bio') || fn.includes('biology') || fn.includes('hayatiyat')) {
      result.subject = 'Biology';
    } else if (fn.includes('math') || fn.includes('mathematics') || fn.includes('riazi') || fn.includes('algebra')) {
      result.subject = 'Mathematics';
    } else if (fn.includes('comp') || fn.includes('computer') || fn.includes('cs') || fn.includes('it')) {
      result.subject = 'Computer Science';
    } else if (fn.includes('eng') || fn.includes('english')) {
      result.subject = 'English';
    } else if (fn.includes('urdu')) {
      result.subject = 'Urdu';
    } else if (fn.includes('islam') || fn.includes('islamiat')) {
      result.subject = 'Islamiat';
    } else if (fn.includes('phy') || fn.includes('physics') || fn.includes('tabiyat')) {
      result.subject = 'Physics';
    }

    // 5. Paper Component (Paper 1 vs Paper 2)
    if (
      fn.includes('paper-2') || fn.includes('paper_2') || fn.includes('paper 2') ||
      fn.includes('paper-ii') || fn.includes('paper_ii') || fn.includes('paper ii') ||
      fn.includes('p-2') || fn.includes('p2') || fn.includes('crq') || fn.includes('erq') || fn.includes('theory')
    ) {
      result.paper = 'paper_2';
    } else if (
      fn.includes('paper-1') || fn.includes('paper_1') || fn.includes('paper 1') ||
      fn.includes('paper-i') || fn.includes('paper_i') || fn.includes('paper i') ||
      fn.includes('p-1') || fn.includes('p1') || fn.includes('mcq')
    ) {
      result.paper = 'paper_1';
    } else if (fn.includes('both') || fn.includes('composite')) {
      result.paper = 'both';
    }

    // 6. Solution Status
    if (fn.includes('solved') || fn.includes('marking') || fn.includes('scheme') || fn.includes('key') || fn.includes('solution') || fn.includes('with-answers')) {
      result.solution = 'solved_has_key';
    } else if (fn.includes('unsolved') || fn.includes('without-key') || fn.includes('question-paper')) {
      result.solution = 'unsolved_ai_solve';
    }

    return result;
  };

  const handleFileSelection = (newFile: File | null) => {
    setFile(newFile);
    if (!newFile) {
      setDetectedBadge(null);
      return;
    }
    const detected = analyzeFilename(newFile.name);
    setDetectedBadge(detected);

    if (detected.resourceType) setResourceType(detected.resourceType);
    if (detected.classLevel) setClassLevel(detected.classLevel);
    if (detected.subject) setSubject(detected.subject);
    if (detected.year) setExamYear(detected.year);
    if (detected.paper) setPaperComponent(detected.paper);
    if (detected.solution) setSolutionStatus(detected.solution);
  };

  // Polling loop for status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/ingest/status');
        const data = await res.json();
        setProgress(data);
      } catch (e) {
        // quiet error
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setProgress({
      status: 'RUNNING',
      percent: 25,
      stage: 'Uploading',
      message: `Uploading "${file.name}" to server...`,
      logs: [`Uploading "${file.name}"...`],
      results: {}
    });

    const formData = new FormData();
    formData.append('file', file);
    if (keyFile) {
      formData.append('keyFile', keyFile);
    }
    formData.append('board', board);
    formData.append('classLevel', classLevel);
    formData.append('subject', subject);
    formData.append('resourceType', resourceType);
    formData.append('examYear', examYear);
    formData.append('paperComponent', paperComponent);
    formData.append('solutionStatus', keyFile ? 'solved_has_key' : solutionStatus);
    formData.append('autoRun', 'true');

    try {
      const res = await fetch('/api/ingest/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const successMsg = data.paperCode
          ? `🎉 Uploaded "${file.name}" successfully! Registered as ${data.paperCode} (${data.paperTitle || ''}) in the Past Paper Archive.`
          : `Uploaded "${file.name}" ${keyFile ? `with Answer Key "${keyFile.name}"` : ''} successfully! Registered in archive.`;
        setUploadSuccess(successMsg);
        setFile(null);
        setKeyFile(null);
        setDetectedBadge(null);
      } else {
        setUploadError(data.error || 'Failed to upload document.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Network error occurred.');
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerDefaultIntake = async () => {
    try {
      const res = await fetch('/api/ingest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType: 'all_defaults' }),
      });
      if (res.ok) {
        setUploadSuccess('🚀 Launched Complete Physics Intake Pipeline (Syllabus Units 1-20 + Model Papers + AI Solver)!');
      }
    } catch (e: any) {
      setUploadError(e.message || 'Failed to start pipeline.');
    }
  };

  const isRunning = progress.status === 'RUNNING';

  if (checkingAuth) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#0b5e4a', margin: '0 auto 1rem auto' }} />
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div style={{ maxWidth: '580px', margin: '4.5rem auto', padding: '0 1rem' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Lock size={30} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Administrator Access Required
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.75rem 0' }}>
            The Document Ingestion and Resource Upload center is restricted exclusively to platform administrators. Please sign in with an authorized administrator account to continue.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Return to Home
            </Link>
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                background: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(11, 94, 74, 0.25)'
              }}
            >
              Sign In as Administrator
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            setAuthModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '6rem' }}>
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Admin Ingestion Upload Portal', active: true }
        ]}
      />

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0b5e4a 0%, #032b22 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        marginBottom: '2.5rem',
        boxShadow: '0 12px 32px rgba(11, 94, 74, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '850px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1rem',
            letterSpacing: '0.5px'
          }}>
            <Sparkles size={15} /> MULTI-RESOURCE AI EXTRACTION ENGINE
          </div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, margin: '0 0 0.75rem 0', lineHeight: 1.2 }}>
            Resource Ingestion & AI Upload Center
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.95, lineHeight: 1.6, margin: '0 0 2rem 0' }}>
            Upload raw academic documents (Syllabus, Model Papers, Textbooks, Pacing Guides).
            Configure Board, Class, and Subject metadata, then execute dedicated AI vision pipelines with real-time log tracking.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '8px 18px',
            borderRadius: '24px',
            fontSize: '0.92rem',
            color: '#ffffff',
            fontWeight: 500
          }}>
            <span>👇 Attach your Question Paper PDF (and optional Answer Key) in the form below</span>
          </div>
        </div>
      </div>

      {/* Grid: Upload Form (Left) + Live Progress Terminal (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Upload Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e1e8e5',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <UploadCloud size={24} color="#0b5e4a" />
            <h2 style={{ fontSize: '1.4rem', color: '#1a3b32', margin: 0, fontWeight: 700 }}>
              Upload Resource Document
            </h2>
          </div>

          <form onSubmit={handleManualUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* File Dropzone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>
                Select PDF Document
              </label>
              <div style={{
                border: '2px dashed #0b5e4a',
                borderRadius: '12px',
                padding: '1.75rem 1.5rem',
                textAlign: 'center',
                background: '#f8fbf9',
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  accept=".pdf"
                  id="fileUploadInput"
                  onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileUploadInput" style={{ cursor: 'pointer', display: 'block' }}>
                  <UploadCloud size={36} color="#0b5e4a" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#1a3b32' }}>
                    {file ? file.name : 'Click to select or drag PDF file here'}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'All AKU-EB & Board Past Papers supported up to 50MB'}
                  </span>
                </label>
              </div>

              {/* Real-time AI Filename Auto-Detection Badge */}
              {detectedBadge && (
                <div style={{
                  marginTop: '0.75rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Sparkles size={16} color="#2563eb" />
                    <span><strong>AI Auto-Detected:</strong></span>
                    {detectedBadge.subject && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        📚 {detectedBadge.subject}
                      </span>
                    )}
                    {detectedBadge.year && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        Year {detectedBadge.year}
                      </span>
                    )}
                    {detectedBadge.classLevel && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {detectedBadge.classLevel}
                      </span>
                    )}
                    {detectedBadge.paper && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {detectedBadge.paper === 'paper_1' ? 'Paper 1 (MCQs)' : detectedBadge.paper === 'paper_2' ? 'Paper 2 (CRQs/ERQs)' : 'Composite'}
                      </span>
                    )}
                    {detectedBadge.solution && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {detectedBadge.solution === 'solved_has_key' ? 'Marking Key Detected' : 'Unsolved (AI Auto-Solver Active)'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                    Options Synchronized ✓
                  </span>
                </div>
              )}
            </div>

            {/* Board & Subject */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem' }}>
                  Examination Board
                </label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dce5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="Aga Khan University Examination Board">AKU-EB (Aga Khan University)</option>
                  <option value="Federal Board of Intermediate and Secondary Education">FBISE (Federal Board)</option>
                  <option value="Board of Intermediate and Secondary Education, Karachi">Sindh Board (BIEK/BSEK)</option>
                  <option value="Board of Intermediate and Secondary Education, Lahore">Punjab Board (BISE Lahore)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem' }}>
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dce5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="auto">✨ Auto-Detect Subject (Physics, Chemistry, Biology, Math, CS)</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Islamiat">Islamiat</option>
                </select>
              </div>
            </div>

            {/* Class / Grade & Resource Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem' }}>
                  Academic Class / Level
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dce5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="auto">✨ Auto-Detect (Class IX or X from Document)</option>
                  <option value="Class IX">Class IX (Grade 9 • SSC-I)</option>
                  <option value="Class X">Class X (Grade 10 • SSC-II)</option>
                  <option value="Class XI">Class XI (Grade 11 • HSSC-I)</option>
                  <option value="Class XII">Class XII (Grade 12 • HSSC-II)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem' }}>
                  Resource Category
                </label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dce5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="past_paper">📜 Historical Past Examination</option>
                  <option value="model_paper">📝 Official Model Exam Paper</option>
                  <option value="syllabus">📘 Curriculum / Syllabus Standard</option>
                  <option value="textbook">📚 Official Textbook</option>
                  <option value="pacing_guide">⏱️ Teacher Pacing & Instructional Guide</option>
                </select>
              </div>
            </div>

            {/* Specialized Past / Model Paper Controls */}
            {(resourceType === 'past_paper' || resourceType === 'model_paper') && (
              <div style={{
                background: '#fbfcfc',
                border: '1px solid #e1e8e5',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0b5e4a', fontSize: '0.92rem' }}>
                    <Layers size={18} />
                    <span>Past Paper Year, Component & Solution Options</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: '#e6f0ed', color: '#0b5e4a', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Dual-Mode AI Engine
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
                  {/* Examination Year (2015-2025) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.3rem' }}>
                      Exam Year
                    </label>
                    <select
                      value={examYear}
                      onChange={(e) => setExamYear(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dce5e1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                    >
                      <option value="auto">✨ Auto-Detect Year</option>
                      <option value="2025">2025 Annual</option>
                      <option value="2024">2024 Annual</option>
                      <option value="2023">2023 Annual</option>
                      <option value="2022">2022 Annual</option>
                      <option value="2021">2021 Annual</option>
                      <option value="2020">2020 Annual</option>
                      <option value="2019">2019 Annual</option>
                      <option value="2018">2018 Annual</option>
                      <option value="2017">2017 Annual</option>
                      <option value="2016">2016 Annual</option>
                      <option value="2015">2015 Annual</option>
                    </select>
                  </div>

                  {/* Paper Component (Paper 1 vs Paper 2) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.3rem' }}>
                      Paper Component
                    </label>
                    <select
                      value={paperComponent}
                      onChange={(e) => setPaperComponent(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dce5e1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                    >
                      <option value="auto">✨ Auto-Detect (P1 or P2)</option>
                      <option value="paper_1">Paper 1 (MCQs • Multiple Choice)</option>
                      <option value="paper_2">Paper 2 (Theory • CRQs & ERQs)</option>
                      <option value="both">Both / Composite Paper</option>
                    </select>
                  </div>

                  {/* Solution & Answer Key Mode */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.3rem' }}>
                      Solution / Key Status
                    </label>
                    <select
                      value={solutionStatus}
                      onChange={(e) => setSolutionStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dce5e1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                    >
                      <option value="auto">✨ Auto-Detect Key Status</option>
                      <option value="unsolved_ai_solve">Unsolved (AI Solver Active)</option>
                      <option value="solved_has_key">Solved (Official Marking Key)</option>
                    </select>
                  </div>
                </div>

                {/* Separate Official Answer Key PDF (Optional) */}
                <div style={{
                  background: '#ffffff',
                  border: keyFile ? '1.5px solid #22c55e' : '1.5px dashed #10b981',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} color="#16a34a" />
                      Separate Official Answer Key / Marking Scheme PDF (Optional)
                    </label>
                    {keyFile && (
                      <button
                        type="button"
                        onClick={() => setKeyFile(null)}
                        style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Remove Key PDF
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    accept=".pdf"
                    id="keyFileUploadInput"
                    onChange={(e) => {
                      const kf = e.target.files?.[0] || null;
                      setKeyFile(kf);
                      if (kf) setSolutionStatus('solved_has_key');
                    }}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="keyFileUploadInput" style={{ cursor: 'pointer', display: 'block', padding: '0.4rem' }}>
                    <p style={{ margin: '0 0 0.2rem 0', fontWeight: 600, fontSize: '0.86rem', color: keyFile ? '#166534' : '#444' }}>
                      {keyFile ? `🔑 Key Attached: ${keyFile.name} (${(keyFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Click to attach separate Official Answer Key / Marking Scheme PDF'}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                      Supports multiple correct answers (e.g. A or C accepted) and official step-by-step marking rubrics.
                    </span>
                  </label>
                </div>

                {/* Helpful Instruction Banner */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#166534',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  lineHeight: 1.45
                }}>
                  <Sparkles size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#16a34a' }} />
                  <div>
                    <strong>Dual-PDF & Multiple Answer Support:</strong> If your exam has a separate question paper and answer key PDF, attach both above! If an MCQ has two correct answers (e.g. <em>A or C accepted</em>), Gemini preserves both options and awards full marks for either choice.
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || uploading || isRunning}
              className="btn"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                cursor: (!file || uploading || isRunning) ? 'not-allowed' : 'pointer',
                opacity: (!file || uploading || isRunning) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}
            >
              {uploading ? <RefreshCw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              {uploading ? 'Uploading File...' : 'Upload & Trigger Dedicated AI Pipeline'}
            </button>

            {uploadSuccess && (
              <div style={{ background: '#e6f0ed', border: '1px solid #b7dfd2', color: '#0b5e4a', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{uploadError}</span>
              </div>
            )}
          </form>
        </div>

        {/* Live Processing Terminal & Progress Tracker (Right) */}
        <div style={{
          background: '#1a1e24',
          border: '1px solid #2e3440',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #2e3440', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Terminal size={22} color="#61afef" />
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: 0, fontWeight: 700 }}>
                Live Pipeline Terminal
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px',
                background: isRunning ? 'rgba(242, 153, 74, 0.2)' : progress.status === 'COMPLETED' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: isRunning ? '#f2994a' : progress.status === 'COMPLETED' ? '#2ecc71' : '#abb2bf'
              }}>
                {isRunning ? '● RUNNING' : progress.status === 'COMPLETED' ? '✓ COMPLETED' : progress.status}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#abb2bf' }}>
              <span><strong>Stage:</strong> {progress.stage}</span>
              <span><strong>{progress.percent}%</strong></span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#282c34', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${progress.percent}%`,
                height: '100%',
                background: progress.status === 'COMPLETED' ? '#2ecc71' : '#0b5e4a',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#98c379' }}>
              {progress.message}
            </p>
          </div>

          {/* Console Log Stream */}
          <div style={{
            flexGrow: 1,
            background: '#14171c',
            borderRadius: '10px',
            padding: '1rem',
            overflowY: 'auto',
            maxHeight: '260px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: '#abb2bf',
            lineHeight: 1.6,
            border: '1px solid #282c34'
          }}>
            {progress.logs.length === 0 ? (
              <span style={{ color: '#5c6370' }}>Waiting for pipeline execution...</span>
            ) : (
              progress.logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('ERROR') ? '#e06c75' : log.includes('✅') || log.includes('🎉') ? '#98c379' : '#abb2bf' }}>
                  {log}
                </div>
              ))
            )}
          </div>

          {/* Post-Completion Metrics & Navigation */}
          {progress.status === 'COMPLETED' && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #2e3440' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#21252b', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#abb2bf' }}>Units Extracted</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#61afef' }}>20 Units</div>
                </div>
                <div style={{ background: '#21252b', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#abb2bf' }}>Verified SLOs</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#98c379' }}>{progress.results.slos || 299}</div>
                </div>
                <div style={{ background: '#21252b', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#abb2bf' }}>Exam Questions</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e5c07b' }}>{progress.results.questions || 99}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  href="/past-papers"
                  className="btn"
                  style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.8rem', background: '#0b5e4a', color: '#fff', borderRadius: '6px' }}
                >
                  View Past Papers Archive →
                </Link>
                <Link
                  href="/model-papers"
                  className="btn"
                  style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.8rem', background: '#21252b', color: '#fff', border: '1px solid #3e4451', borderRadius: '6px' }}
                >
                  View Model Papers →
                </Link>
                <Link
                  href="/syllabus"
                  className="btn"
                  style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  Syllabus Tracker →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Specialized Pipeline Architectures (Explanation Grid) */}
      <h2 style={{ fontSize: '1.6rem', color: '#0b5e4a', marginBottom: '1.25rem' }}>
        Different Specialized AI Pipelines
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ border: '1px solid #e1e8e5', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#0b5e4a' }}>
            <BookOpen size={20} />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Syllabus Pipeline</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
            <strong>Two-Stage Index Discovery:</strong> First extracts canonical chapter bounds (Units 1-10 for Grade IX, Units 11-20 for Grade X). Then extracts exact subtopics, SLO codes, and Bloom's cognitive taxonomy (Recall, Understanding, Application).
          </p>
          <span style={{ fontSize: '0.75rem', background: '#e6f0ed', color: '#0b5e4a', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Index-First • No Topic Fragmentation
          </span>
        </div>

        <div className="card" style={{ border: '1px solid #e1e8e5', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#27ae60' }}>
            <Award size={20} />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Model & Past Paper Pipeline</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
            <strong>AI Solver & Math Parser:</strong> Extracts full question stems with LaTeX formulas (<MathText text="$1.76\text{ cm}^3$" />), detects diagrams, and solves every question step-by-step to compute the verified answer key (avoiding default fallbacks).
          </p>
          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            AI Answer Solver • KaTeX Rendering
          </span>
        </div>

        <div className="card" style={{ border: '1px solid #e1e8e5', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#2980b9' }}>
            <Layers size={20} />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Textbook Pipeline</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
            <strong>Content Chunking & Solved Numericals:</strong> Parses official publisher textbooks, identifies chapter exercises, scientific laws, definitions, and solved textbook examples.
          </p>
          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Exercise Extraction • Solved Problems
          </span>
        </div>

        <div className="card" style={{ border: '1px solid #e1e8e5', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#8e44ad' }}>
            <Clock size={20} />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Pacing Guide Pipeline</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
            <strong>28-Week Instructional Mapping:</strong> Maps curriculum to academic calendars, weekly teaching targets, laboratory practical dates, and formative assessment milestones.
          </p>
          <span style={{ fontSize: '0.75rem', background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Weekly Periods • Assessment Milestones
          </span>
        </div>
      </div>

      {/* Developer & Demo Utilities (Secondary) */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: '#334155', fontWeight: 700 }}>
            Bundled Demo Data Intake (Developer Utility)
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Re-runs the pre-packaged sample SSC Physics syllabus (Units 1-20) and model papers bundled in the project repo.
          </p>
        </div>
        <button
          onClick={handleTriggerDefaultIntake}
          disabled={isRunning}
          style={{
            background: '#475569',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.6 : 1
          }}
        >
          {isRunning ? 'Processing...' : 'Run Bundled Demo Data'}
        </button>
      </div>
    </div>
  );
}
