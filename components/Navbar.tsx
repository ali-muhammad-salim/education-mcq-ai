'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, ChevronDown, Check, Sparkles, Building2, 
  Atom, FlaskConical, Dna, Calculator, Binary, BookText, 
  Languages, Moon, MapPin, Menu, X, FileText, Layers, Download,
  User as UserIcon, LogOut, LayoutDashboard
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';

interface SubjectItem {
  name: string;
  slug: string;
  icon: string;
  badge?: string;
  highlight?: boolean;
}

const BOARDS = [
  { id: 'akueb', name: 'AKU-EB', fullName: 'Aga Khan University Examination Board', active: true, tag: 'Official Active' },
  { id: 'fbise', name: 'Federal Board (FBISE)', fullName: 'Federal Board of Intermediate & Secondary Education', active: false, tag: 'National Curriculum' },
  { id: 'sindh', name: 'Sindh Board (BSEK/BIEK)', fullName: 'Board of Secondary & Intermediate Education Karachi', active: false, tag: 'Curriculum Synced' },
  { id: 'punjab', name: 'Punjab Board (BISE)', fullName: 'Board of Intermediate & Secondary Education Lahore', active: false, tag: 'Curriculum Synced' },
];

const CLASS_SUBJECTS: Record<string, { label: string; subLabel: string; roman: string; subjects: SubjectItem[] }> = {
  'class-9': {
    label: 'Class 9',
    subLabel: 'SSC Part I',
    roman: 'IX',
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Solved Papers & Model', highlight: true },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Syllabus & Bank' },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Syllabus & Bank' },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Syllabus & Bank' },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'New SLOs' },
      { name: 'English Compulsory', slug: 'english', icon: '📖' },
      { name: 'Urdu Compulsory', slug: 'urdu', icon: '✍️' },
      { name: 'Islamiyat / Ethics', slug: 'islamiyat', icon: '🕌' },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰' },
    ]
  },
  'class-10': {
    label: 'Class 10',
    subLabel: 'SSC Part II',
    roman: 'X',
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Model Papers & SLOs', highlight: true },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪', badge: 'Syllabus & Bank' },
      { name: 'Biology', slug: 'biology', icon: '🧬', badge: 'Syllabus & Bank' },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐', badge: 'Syllabus & Bank' },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻', badge: 'New SLOs' },
      { name: 'English Compulsory', slug: 'english', icon: '📖' },
      { name: 'Urdu Compulsory', slug: 'urdu', icon: '✍️' },
      { name: 'Islamiyat / Ethics', slug: 'islamiyat', icon: '🕌' },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰' },
    ]
  },
  'class-11': {
    label: 'Class 11',
    subLabel: 'HSSC Part I',
    roman: 'XI',
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Curriculum Standard' },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪' },
      { name: 'Biology', slug: 'biology', icon: '🧬' },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐' },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻' },
      { name: 'English', slug: 'english', icon: '📖' },
      { name: 'Urdu', slug: 'urdu', icon: '✍️' },
      { name: 'Islamic Education', slug: 'islamic-education', icon: '🕌' },
    ]
  },
  'class-12': {
    label: 'Class 12',
    subLabel: 'HSSC Part II',
    roman: 'XII',
    subjects: [
      { name: 'Physics', slug: 'physics', icon: '⚛️', badge: 'Curriculum Standard' },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪' },
      { name: 'Biology', slug: 'biology', icon: '🧬' },
      { name: 'Mathematics', slug: 'mathematics', icon: '📐' },
      { name: 'Computer Science', slug: 'computer-science', icon: '💻' },
      { name: 'English', slug: 'english', icon: '📖' },
      { name: 'Urdu', slug: 'urdu', icon: '✍️' },
      { name: 'Pakistan Studies', slug: 'pakistan-studies', icon: '🇵🇰' },
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
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthUser(null);
    window.location.href = '/';
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boardRef.current && !boardRef.current.contains(event.target as Node)) {
        setBoardDropdownOpen(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setOpenClassDropdown(null);
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
  }, [pathname]);

  return (
    <nav 
      style={{
        background: '#ffffff',
        borderBottom: '2px solid #e6f0ed',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        fontFamily: "'Inter', sans-serif"
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
              padding: '2px 0'
            }}
            title="Rise Learner - Academic Intelligence Portal"
          >
            <img 
              src="/logo.png" 
              alt="Rise Learner" 
              style={{
                height: '44px',
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
                {BOARDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBoard(b);
                      setBoardDropdownOpen(false);
                      router.push(`/${b.id}`);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      background: selectedBoard.id === b.id ? '#e6f0ed' : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedBoard.id !== b.id) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedBoard.id !== b.id) e.currentTarget.style.background = 'transparent';
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
                    {selectedBoard.id === b.id && (
                      <Check size={16} style={{ color: '#0b5e4a', flexShrink: 0, marginTop: '2px' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Section: Class Options & Subject Dropdowns */}
        <div ref={classDropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {Object.entries(CLASS_SUBJECTS).map(([classKey, classData]) => {
            const isOpen = openClassDropdown === classKey;
            return (
              <div key={classKey} style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setOpenClassDropdown(isOpen ? null : classKey);
                    setBoardDropdownOpen(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isOpen ? '#e6f0ed' : 'transparent',
                    color: isOpen ? '#0b5e4a' : '#2c3e38',
                    border: isOpen ? '1px solid #b7dfd2' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '6px 11px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = '#f4f7f6';
                  }}
                  onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{classData.label}</span>
                  <ChevronDown 
                    size={14} 
                    style={{ 
                      color: isOpen ? '#0b5e4a' : '#6b7280', 
                      transform: isOpen ? 'rotate(180deg)' : 'none', 
                      transition: 'transform 0.2s ease' 
                    }} 
                  />
                </button>

                {/* Dropdown Menu listing all Subjects for this Class */}
                {isOpen && (
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


          {/* Quiz Portal Link */}
          <Link
            href="/quizzes"
            style={{
              padding: '6px 12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#0b5e4a',
              background: '#e6f0ed',
              textDecoration: 'none',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>🎯 Quiz Portal</span>
          </Link>

          {/* User Authentication / Dashboard Section */}
          {authUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <Link
                href={
                  authUser.role === 'TEACHER' 
                    ? '/dashboard/teacher' 
                    : authUser.role === 'ADMIN' 
                    ? '/admin' 
                    : '/dashboard/student'
                }
                style={{
                  background: authUser.role === 'TEACHER' ? '#0b5e4a' : authUser.role === 'ADMIN' ? '#111827' : '#2563eb',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {authUser.avatarUrl ? (
                  <img 
                    src={authUser.avatarUrl} 
                    alt={authUser.name || 'User'} 
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      border: '1.5px solid rgba(255,255,255,0.8)' 
                    }} 
                  />
                ) : (
                  <LayoutDashboard size={14} />
                )}
                <span>
                  {authUser.name ? authUser.name.split(' ')[0] : (authUser.role === 'TEACHER' ? 'Teacher Portal' : authUser.role === 'ADMIN' ? 'Admin Hub' : 'My Dashboard')}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  color: '#4b5563',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <LogOut size={14} />
              </button>
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

        </div>

      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => setAuthUser(user)}
      />
    </nav>
  );
}
