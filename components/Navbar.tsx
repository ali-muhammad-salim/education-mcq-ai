'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, ChevronDown, Check, Sparkles, Building2,
  Atom, FlaskConical, Dna, Calculator, Binary, BookText,
  Languages, Moon, Sun, MapPin, Menu, X, FileText, Layers, Download,
  User as UserIcon, LogOut, LayoutDashboard, Award, UploadCloud, ShieldCheck,
  Monitor, KeyRound, Play, AlertCircle, Loader2
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { useDialog } from '@/lib/use-dialog';
import TakeQuizModal from '@/components/TakeQuizModal';


interface SubjectItem {
  name: string;
  slug: string;
  icon: string;
  badge?: string;
  highlight?: boolean;
  isReady?: boolean;
}

const BOARDS = [
  { id: 'akueb', name: 'AKU-EB', fullName: 'Aga Khan University Examination Board', active: true, tag: 'Official Active' },
  { id: 'sindh', name: 'Sindh Board (BSEK/BIEK)', fullName: 'Board of Secondary & Intermediate Education Karachi', active: false, tag: 'Coming Soon' },
  { id: 'fbise', name: 'Federal Board (FBISE)', fullName: 'Federal Board of Intermediate & Secondary Education', active: false, tag: 'Coming Soon' },
  { id: 'punjab', name: 'Punjab Board (BISE)', fullName: 'Board of Intermediate & Secondary Education Lahore', active: false, tag: 'Coming Soon' },
];

const CLASS_SUBJECTS: Record<string, { label: string; subLabel: string; roman: string; isReady: boolean; subjects: SubjectItem[] }> = {
  'class-9': {
    label: 'Class 9',
    subLabel: 'SSC Part I',
    roman: 'IX',
    isReady: true,
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Solved Papers & Model', highlight: true, isReady: true },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Coming Soon', isReady: false },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Coming Soon', isReady: false },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Coming Soon', isReady: false },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'Coming Soon', isReady: false },
      { name: 'English Compulsory', slug: 'english', icon: '📖', badge: 'Coming Soon', isReady: false },
      { name: 'Urdu Compulsory', slug: 'urdu', icon: '✍️', badge: 'Coming Soon', isReady: false },
      { name: 'Islamiyat / Ethics', slug: 'islamiyat', icon: '🕌', badge: 'Coming Soon', isReady: false },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰', badge: 'Coming Soon', isReady: false },
    ]
  },
  'class-10': {
    label: 'Class 10',
    subLabel: 'SSC Part II',
    roman: 'X',
    isReady: true,
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Model Papers & SLOs', highlight: true, isReady: true },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Coming Soon', isReady: false },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Coming Soon', isReady: false },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Coming Soon', isReady: false },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'Coming Soon', isReady: false },
      { name: 'English Compulsory', slug: 'english', icon: '📖', badge: 'Coming Soon', isReady: false },
      { name: 'Urdu Compulsory', slug: 'urdu', icon: '✍️', badge: 'Coming Soon', isReady: false },
      { name: 'Islamiyat / Ethics', slug: 'islamiyat', icon: '🕌', badge: 'Coming Soon', isReady: false },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰', badge: 'Coming Soon', isReady: false },
    ]
  },
  'class-11': {
    label: 'Class 11',
    subLabel: 'HSSC Part I',
    roman: 'XI',
    isReady: false,
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Coming Soon', isReady: false },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Coming Soon', isReady: false },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Coming Soon', isReady: false },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Coming Soon', isReady: false },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'Coming Soon', isReady: false },
      { name: 'English', slug: 'english', icon: '📖', badge: 'Coming Soon', isReady: false },
      { name: 'Urdu', slug: 'urdu', icon: '✍️', badge: 'Coming Soon', isReady: false },
      { name: 'Islamic Education', slug: 'islamic-education', icon: '🕌', badge: 'Coming Soon', isReady: false },
    ]
  },
  'class-12': {
    label: 'Class 12',
    subLabel: 'HSSC Part II',
    roman: 'XII',
    isReady: false,
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Coming Soon', isReady: false },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Coming Soon', isReady: false },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Coming Soon', isReady: false },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Coming Soon', isReady: false },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'Coming Soon', isReady: false },
      { name: 'English', slug: 'english', icon: '📖', badge: 'Coming Soon', isReady: false },
      { name: 'Urdu', slug: 'urdu', icon: '✍️', badge: 'Coming Soon', isReady: false },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰', badge: 'Coming Soon', isReady: false },
    ]
  }
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedBoard, setSelectedBoard] = useState(BOARDS[0]);
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const [openClassDropdown, setOpenClassDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [isDarkEffective, setIsDarkEffective] = useState<boolean>(false);

  // Quiz Code Join Modal States
  const [quizCodeModalOpen, setQuizCodeModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [activeQuizData, setActiveQuizData] = useState<any | null>(null);
  const [pendingQuizCode, setPendingQuizCode] = useState<string | null>(null);

  // URL Query Param Detection (?code=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        setInputCode(codeParam.toUpperCase().trim());
        setQuizCodeModalOpen(true);
      }
    }
  }, [pathname]);

  const handleJoinQuiz = async (codeToJoin?: string) => {
    const code = (codeToJoin || inputCode).trim().toUpperCase();
    if (!code) {
      setCodeError('Please enter a valid Quiz Code.');
      return;
    }

    // Require student signup/login before taking quiz
    if (!authUser) {
      setPendingQuizCode(code);
      setQuizCodeModalOpen(false);
      setAuthModalOpen(true);
      return;
    }

    setCodeLoading(true);
    setCodeError(null);

    try {
      const res = await fetch(`/api/quizzes/by-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success && data.quiz) {
        setActiveQuizData(data.quiz);
        setQuizCodeModalOpen(false);
        setInputCode('');
      } else {
        setCodeError(typeof data.error === 'string' ? data.error : data.error?.message || `Quiz with code "${code}" could not be found.`);
      }
    } catch (err) {
      setCodeError('Unable to connect to quiz service. Please verify your connection.');
    } finally {
      setCodeLoading(false);
    }
  };


  // Apply theme class based on mode
  const applyTheme = (mode: 'system' | 'light' | 'dark') => {
    let shouldBeDark = false;
    if (mode === 'system') {
      shouldBeDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      shouldBeDark = mode === 'dark';
    }

    setIsDarkEffective(shouldBeDark);
    if (typeof document !== 'undefined') {
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let saved = 'system';try{saved=localStorage.getItem('riselearner_theme')||'system';}catch{/* Theme selection still works when browser storage is unavailable. */}
      const initialMode = (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
      setThemeMode(initialMode);
      applyTheme(initialMode);

      // Listen to OS theme changes if in 'system' mode
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        let currentSaved='system';try{currentSaved=localStorage.getItem('riselearner_theme')||'system';}catch{/* Use the system preference. */}
        if (currentSaved === 'system') {
          applyTheme('system');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const cycleTheme = () => {
    let nextMode: 'system' | 'light' | 'dark' = 'system';
    if (themeMode === 'system') nextMode = 'light';
    else if (themeMode === 'light') nextMode = 'dark';
    else nextMode = 'system';

    setThemeMode(nextMode);
    if (typeof window !== 'undefined') {
      try{localStorage.setItem('riselearner_theme', nextMode);}catch{/* Apply the selection for this page even without storage. */}
    }
    applyTheme(nextMode);
  };

  // Sync selected board with current URL
  useEffect(() => {
    if (pathname) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const first = segments[0].toLowerCase();
        const matched = BOARDS.find(b => b.id === first);
        if (matched) {
          setSelectedBoard(matched);
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setAuthUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) return;
    await (await import('@/lib/exam-cache')).clearExamCache().catch(() => undefined);
    setAuthUser(null);
    setProfileDropdownOpen(false);
    window.location.href = '/';
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boardRef.current && !boardRef.current.contains(event.target as Node)) {
        setBoardDropdownOpen(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setOpenClassDropdown(null);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setBoardDropdownOpen(false);
    setOpenClassDropdown(null);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  const codeDialog = useDialog(quizCodeModalOpen, 'Enter assessment code', () => setQuizCodeModalOpen(false));
  return (
    <nav
      style={{
        background: isDarkEffective ? '#0f172a' : '#ffffff',
        borderBottom: isDarkEffective ? '2px solid #1e293b' : '2px solid #e6f0ed',
        boxShadow: isDarkEffective ? '0 2px 12px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        fontFamily: "'Inter', sans-serif",
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >

        {/* Left Section: Brand & Board Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              padding: isDarkEffective ? '3px 10px' : '2px 0',
              background: isDarkEffective ? '#ffffff' : 'transparent',
              borderRadius: isDarkEffective ? '8px' : '0',
              boxShadow: isDarkEffective ? '0 1px 6px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title="Rise Learner - Academic Intelligence Portal"
          >
            <img
              src="/logo.png"
              alt="Rise Learner"
              style={{
                height: isDarkEffective ? '38px' : '44px',
                width: 'auto',
                maxWidth: '230px',
                objectFit: 'contain'
              }}
            />
          </Link>

          {/* Board Selector Dropdown */}
          <div ref={boardRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setBoardDropdownOpen(!boardDropdownOpen);
                setOpenClassDropdown(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f4f7f6',
                border: '1px solid #dce5e1',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0b5e4a',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Select Examination Board"
            >
              <Building2 size={15} style={{ color: '#0b5e4a' }} />
              <span>Board: <strong>{selectedBoard.name}</strong></span>
              <ChevronDown size={14} style={{ color: '#5a7a6f', transform: boardDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>

            {boardDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: '#ffffff',
                  border: '1px solid #dce5e1',
                  borderRadius: '10px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                  minWidth: '320px',
                  zIndex: 2000,
                  overflow: 'hidden',
                  padding: '0.4rem 0'
                }}
              >
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f3f4f6' }}>
                  Select Examination Board
                </div>
                {BOARDS.map((b) => {
                  const isAvailable = b.active;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (!isAvailable) return;
                        setSelectedBoard(b);
                        setBoardDropdownOpen(false);
                        router.push(`/${b.id}`);
                      }}
                      disabled={!isAvailable}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '0.65rem 1rem',
                        background: selectedBoard.id === b.id ? '#e6f0ed' : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.45,
                        transition: 'background 0.15s ease',
                        gap: '0.75rem'
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable && selectedBoard.id !== b.id) e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable && selectedBoard.id !== b.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedBoard.id === b.id ? '#0b5e4a' : '#1f2937' }}>
                          {b.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          {b.tag}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        {!isAvailable && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>
                            Coming Soon
                          </span>
                        )}
                        {selectedBoard.id === b.id && (
                          <Check size={16} style={{ color: '#0b5e4a', marginTop: '2px' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Section: Class Options & Subject Dropdowns */}
        <div ref={classDropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

          {Object.entries(CLASS_SUBJECTS).map(([classKey, classData]) => {
            const isOpen = openClassDropdown === classKey;
            const isClassReady = classData.isReady;

            return (
              <div key={classKey} style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    if (!isClassReady) return;
                    setOpenClassDropdown(isOpen ? null : classKey);
                    setBoardDropdownOpen(false);
                  }}
                  disabled={!isClassReady}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isOpen ? '#e6f0ed' : 'transparent',
                    color: isOpen ? '#0b5e4a' : isClassReady ? '#2c3e38' : '#6b7280',
                    border: isOpen ? '1px solid #b7dfd2' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '6px 11px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: isClassReady ? 'pointer' : 'not-allowed',
                    opacity: isClassReady ? 1 : 0.45,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isOpen && isClassReady) e.currentTarget.style.background = '#f4f7f6';
                  }}
                  onMouseLeave={(e) => {
                    if (!isOpen && isClassReady) e.currentTarget.style.background = 'transparent';
                  }}
                  title={isClassReady ? `Explore ${classData.label}` : `${classData.label} - Coming Soon`}
                >
                  <span>{classData.label}</span>
                  {!isClassReady && (
                    <span style={{ fontSize: '0.62rem', background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      Coming Soon
                    </span>
                  )}
                  {isClassReady && (
                    <ChevronDown
                      size={14}
                      style={{
                        color: isOpen ? '#0b5e4a' : '#6b7280',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  )}
                </button>

                {/* Dropdown Menu listing all Subjects for this Class */}
                {isOpen && isClassReady && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      background: '#ffffff',
                      border: '1px solid #dce5e1',
                      borderRadius: '12px',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
                      width: '320px',
                      zIndex: 2000,
                      overflow: 'hidden',
                      padding: '0.5rem 0'
                    }}
                  >
                    <Link
                      href={`/${selectedBoard.id}/${classData.roman}`}
                      onClick={() => setOpenClassDropdown(null)}
                      style={{
                        padding: '0.65rem 1.15rem',
                        background: '#f9fafb',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textDecoration: 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0b5e4a', textTransform: 'uppercase' }}>
                          {classData.label} Subjects ({classData.subLabel})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#5a7a6f' }}>
                          Click to open Class {classData.roman} directory →
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#0b5e4a', background: '#e6f0ed', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {selectedBoard.name}
                      </span>
                    </Link>

                    <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.35rem 0' }}>
                      {classData.subjects.map((sub) => {
                        const targetHref = `/${selectedBoard.id}/${classData.roman}/${sub.slug}`;
                        const isSubReady = sub.isReady;

                        if (!isSubReady) {
                          return (
                            <div
                              key={sub.slug}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.55rem 1.15rem',
                                color: '#9ca3af',
                                fontSize: '0.88rem',
                                opacity: 0.45,
                                cursor: 'not-allowed',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontSize: '1.1rem', filter: 'grayscale(100%)' }}>{sub.icon}</span>
                                <span>{sub.name}</span>
                              </div>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: '#f3f4f6',
                                color: '#6b7280',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                Coming Soon
                              </span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={sub.slug}
                            href={targetHref}
                            onClick={() => setOpenClassDropdown(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 1.15rem',
                              textDecoration: 'none',
                              color: '#1f2937',
                              fontSize: '0.88rem',
                              fontWeight: sub.highlight ? 700 : 500,
                              background: sub.highlight ? '#f0fdf4' : 'transparent',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#e6f0ed';
                              e.currentTarget.style.color = '#0b5e4a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = sub.highlight ? '#f0fdf4' : 'transparent';
                              e.currentTarget.style.color = '#1f2937';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{ fontSize: '1.1rem' }}>{sub.icon}</span>
                              <span>{sub.name}</span>
                            </div>
                            {sub.badge && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: sub.highlight ? '#0b5e4a' : '#e5e7eb',
                                color: sub.highlight ? '#ffffff' : '#374151',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    <div style={{
                      padding: '0.5rem 1.15rem',
                      borderTop: '1px solid #f3f4f6',
                      background: '#f9fafb',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      <Link
                        href={`/${selectedBoard.id}/${classData.roman}`}
                        onClick={() => setOpenClassDropdown(null)}
                        style={{ color: '#0b5e4a', fontWeight: 700, textDecoration: 'none' }}
                      >
                        Explore all Class {classData.roman} subjects →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}


          {/* Enter Quiz Code Button */}
          <button
            type="button"
            onClick={() => {
              setQuizCodeModalOpen(true);
              setCodeError(null);
            }}
            title="Enter unique Teacher Quiz Code to join assessment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: isDarkEffective ? '#1e293b' : '#f0fdf4',
              border: isDarkEffective ? '1px solid #334155' : '1px solid #bbf7d0',
              color: isDarkEffective ? '#4ade80' : '#15803d',
              borderRadius: '8px',
              padding: '7px 13px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginLeft: '0.25rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <KeyRound size={15} />
            <span>Enter Quiz Code</span>
          </button>

          {/* User Authentication / Profile Avatar Section */}
          {authUser ? (

            <div ref={profileDropdownRef} style={{ position: 'relative', marginLeft: '0.5rem' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                title={authUser.name || 'Account'}
                style={{
                  background: 'none',
                  border: '2px solid #0b5e4a',
                  borderRadius: '50%',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 2px 6px rgba(11, 94, 74, 0.25)'
                }}
              >
                {authUser.avatarUrl ? (
                  <img
                    src={authUser.avatarUrl}
                    alt={authUser.name || 'User'}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.95rem'
                  }}>
                    {authUser.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {/* Active Status Indicator Dot */}
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '10px',
                  height: '10px',
                  background: '#10b981',
                  border: '2px solid #ffffff',
                  borderRadius: '50%'
                }} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.14)',
                  width: '260px',
                  zIndex: 2500,
                  overflow: 'hidden'
                }}>
                  {/* User Profile Header */}
                  <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {authUser.name || 'Authorized Learner'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {authUser.email}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: authUser.role === 'ADMIN' ? '#111827' : authUser.role === 'TEACHER' ? '#0b5e4a' : '#2563eb',
                      color: '#ffffff'
                    }}>
                      {authUser.role}
                    </span>
                  </div>

                  {/* Menu Options */}
                  <div style={{ padding: '0.4rem 0' }}>
                    {/* 1. Dashboard */}
                    <Link
                      href={
                        authUser.role === 'TEACHER'
                          ? '/dashboard/teacher'
                          : authUser.role === 'ADMIN'
                          ? '/admin'
                          : '/dashboard/student'
                      }
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LayoutDashboard size={16} style={{ color: '#0b5e4a' }} />
                      <span>Dashboard</span>
                    </Link>

                    {/* 2. Quiz Portal */}
                    <Link
                      href="/quizzes"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Award size={16} style={{ color: '#d97706' }} />
                      <span>Quiz Portal</span>
                    </Link>

                    {/* 3. Upload & Ingest (Admin only) */}
                    {authUser.role === 'ADMIN' && (
                      <Link
                        href="/upload"
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.65rem 1rem',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          textDecoration: 'none',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <UploadCloud size={16} style={{ color: '#7c3aed' }} />
                        <span>Admin Ingestion Portal</span>
                      </Link>
                    )}

                    {/* 4. Change Theme */}
                    <button
                      type="button"
                      onClick={cycleTheme}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: isDarkEffective ? '#f1f5f9' : '#1f2937',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isDarkEffective ? '#334155' : '#f3f4f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {themeMode === 'system' ? (
                        <Monitor size={16} style={{ color: '#38bdf8' }} />
                      ) : themeMode === 'dark' ? (
                        <Moon size={16} style={{ color: '#fbbf24' }} />
                      ) : (
                        <Sun size={16} style={{ color: '#f59e0b' }} />
                      )}
                      <span>Theme: {themeMode === 'system' ? 'System Default' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <div style={{ borderTop: isDarkEffective ? '1px solid #334155' : '1px solid #f3f4f6', margin: '0.35rem 0' }} />

                    {/* 5. Sign Out */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isDarkEffective ? '#371e22' : '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={16} style={{ color: '#dc2626' }} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                background: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginLeft: '0.5rem',
                boxShadow: '0 2px 8px rgba(11, 94, 74, 0.2)'
              }}
            >
              <UserIcon size={15} />
              <span>Sign In</span>
            </button>
          )}

          <Link href="/account" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)' }}>Account</Link>
          {/* Universal Theme Toggle (System / Light / Dark) - Accessible to ALL users */}
          <button
            type="button"
            onClick={cycleTheme}
            title={`Current Theme: ${themeMode === 'system' ? 'System Default' : themeMode === 'light' ? 'Light Mode' : 'Dark Mode'} (Click to cycle System / Light / Dark)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: isDarkEffective ? '#1e293b' : '#f4f7f6',
              border: isDarkEffective ? '1px solid #334155' : '1px solid #dce5e1',
              borderRadius: '8px',
              padding: '7px 11px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: isDarkEffective ? '#f1f5f9' : '#2c3e38',
              cursor: 'pointer',
              marginLeft: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            {themeMode === 'system' ? (
              <Monitor size={15} style={{ color: isDarkEffective ? '#38bdf8' : '#0b5e4a' }} />
            ) : themeMode === 'dark' ? (
              <Moon size={15} style={{ color: '#fbbf24' }} />
            ) : (
              <Sun size={15} style={{ color: '#f59e0b' }} />
            )}
            <span style={{ fontSize: '0.78rem' }}>
              {themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

        </div>

      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingQuizCode(null);
        }}
        onSuccess={(user) => {
          setAuthUser(user);
          if (!pendingQuizCode && window.location.pathname.startsWith('/dashboard')) { window.location.href = user.role === 'STUDENT' ? '/dashboard/student' : '/dashboard/teacher'; return; }
          if (pendingQuizCode) {
            const code = pendingQuizCode;
            setPendingQuizCode(null);
            handleJoinQuiz(code);
          }
        }}
      />

      {/* 1. Enter Quiz Code Modal Dialog */}
      {quizCodeModalOpen && (
        <div {...codeDialog}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuizCodeModalOpen(false);
          }}
        >
          <div
            style={{
              background: isDarkEffective ? '#151f32' : '#ffffff',
              border: isDarkEffective ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close code dialog" onClick={() => setQuizCodeModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: isDarkEffective ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>

            {/* Header Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: isDarkEffective ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  border: isDarkEffective ? '1px solid #059669' : '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}
              >
                <KeyRound size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: isDarkEffective ? '#f8fafc' : '#0f172a' }}>
                  Join Assessment
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: isDarkEffective ? '#94a3b8' : '#64748b' }}>
                  Enter your teacher's unique quiz code
                </p>
              </div>
            </div>

            {/* If user is not authenticated, alert them that signup/signin is required */}
            {!authUser && (
              <div
                style={{
                  background: isDarkEffective ? 'rgba(234, 179, 8, 0.1)' : '#fefce8',
                  border: isDarkEffective ? '1px solid #854d0e' : '1px solid #fef08a',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={18} style={{ color: '#ca8a04', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: isDarkEffective ? '#fef08a' : '#854d0e', lineHeight: 1.45 }}>
                  <strong>Account Required:</strong> You must sign in or register before starting the quiz so your marks and anti-cheating logs are sent to your teacher.
                </div>
              </div>
            )}

            {/* Code Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: isDarkEffective ? '#94a3b8' : '#475569',
                  marginBottom: '0.5rem'
                }}
              >
                Quiz Code
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinQuiz();
                }}
                placeholder="e.g. TEACH-PHY9-401"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  borderRadius: '10px',
                  border: codeError
                    ? '2px solid #ef4444'
                    : isDarkEffective ? '2px solid #334155' : '2px solid #cbd5e1',
                  background: isDarkEffective ? '#0f172a' : '#f8fafc',
                  color: isDarkEffective ? '#f8fafc' : '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />
              {codeError && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600 }}>
                  {codeError}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setQuizCodeModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: isDarkEffective ? '1px solid #334155' : '1px solid #cbd5e1',
                  background: 'transparent',
                  color: isDarkEffective ? '#94a3b8' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleJoinQuiz()}
                disabled={codeLoading}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0b5e4a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(11, 94, 74, 0.35)'
                }}
              >
                {codeLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading Assessment...</span>
                  </>
                ) : !authUser ? (
                  <>
                    <span>Sign In to Continue</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="#ffffff" />
                    <span>Start Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fullscreen Proctored Take Quiz Modal */}
      {activeQuizData && (
        <TakeQuizModal
          isOpen={!!activeQuizData}
          onClose={() => setActiveQuizData(null)}
          paperTitle={activeQuizData.title}
          paperCode={activeQuizData.code || activeQuizData.id}
          questions={activeQuizData.questions || []}
        />
      )}
    </nav>
  );
}
