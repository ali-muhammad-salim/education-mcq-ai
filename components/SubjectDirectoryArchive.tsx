'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface DirectoryLink {
  title: string;
  href: string;
  type: 'paper' | 'key' | 'notes' | 'practical';
  isExternal?: boolean;
}

interface DirectorySection {
  title: string;
  subtitle?: string;
  links: DirectoryLink[];
}

interface SubjectDirectoryArchiveProps {
  subjectTitle: string;
  classLabel: string;
  levelLabel: string;
  sections?: DirectorySection[];
}

export default function SubjectDirectoryArchive({
  subjectTitle,
  classLabel,
  levelLabel,
  sections
}: SubjectDirectoryArchiveProps) {
  const isClass9 = classLabel.includes('IX') || classLabel.includes('9');
  const isPhysics = subjectTitle.toLowerCase().includes('physics');

  // Default authentic sections matching the uploaded reference image for Physics Class IX / Class X
  const defaultSections: DirectorySection[] = [
    {
      title: 'Model Examination Papers',
      links: [
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-I-Model`,
          href: isPhysics 
            ? (isClass9 ? '/past-papers/PHY-IX-P1' : '/past-papers/PHY-X-P1')
            : `/past-papers?type=model&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-II-Model`,
          href: isPhysics 
            ? (isClass9 ? '/past-papers/PHY-IX-P2' : '/past-papers/PHY-X-P2')
            : `/past-papers?type=model&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Keys-Model`,
          href: isPhysics 
            ? (isClass9 ? '/past-papers/PHY-IX-P1#key' : '/past-papers/PHY-X-P1#key')
            : `/past-papers?type=model&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'key'
        },
        {
          title: `E-marking-Notes-${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Model`,
          href: isPhysics 
            ? (isClass9 ? '/past-papers/PHY-IX-P2#emarking' : '/past-papers/PHY-X-P2#emarking')
            : `/past-papers?type=model&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'notes'
        },
        ...(isPhysics && isClass9 ? [
          {
            title: `Sample-Practical-Laboratory-Exam-${subjectTitle}-IX`,
            href: `/classes/ssc-i/physics#practicals`,
            type: 'practical' as const
          }
        ] : [])
      ]
    },
    {
      title: '2025',
      subtitle: 'Annual Examination Papers',
      links: [
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-I-2025`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2025-P1' 
            : `/past-papers?year=2025&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-II-2025`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2025-P2' 
            : `/past-papers?year=2025&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Keys-2025`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2025-P1#key' 
            : `/past-papers?year=2025&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'key'
        },
        {
          title: `E-marking-Notes-${subjectTitle}-${isClass9 ? 'IX' : 'X'}-2025`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2025-P2#emarking' 
            : `/past-papers?year=2025&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'notes'
        }
      ]
    },
    {
      title: '2024',
      subtitle: 'Annual Examination Papers',
      links: [
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-I-2024`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2024-P1' 
            : `/past-papers?year=2024&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Paper-II-2024`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2024-P2' 
            : `/past-papers?year=2024&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'paper'
        },
        {
          title: `${subjectTitle}-${isClass9 ? 'IX' : 'X'}-Keys-2024`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2024-P1#key' 
            : `/past-papers?year=2024&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'key'
        },
        {
          title: `E-marking-Notes-${subjectTitle}-${isClass9 ? 'IX' : 'X'}-2024`,
          href: isPhysics && isClass9 
            ? '/past-papers/PHY-IX-2024-P2#emarking' 
            : `/past-papers?year=2024&subject=${encodeURIComponent(subjectTitle)}`,
          type: 'notes'
        }
      ]
    }
  ];

  const activeSections = sections || defaultSections;

  return (
    <div style={{
      background: '#23272e',
      color: '#ffffff',
      borderRadius: '16px',
      padding: '3rem 2rem',
      marginBottom: '3rem',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
      border: '1px solid #343a46'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#8ce99a',
          fontSize: '0.8rem',
          fontWeight: 700,
          padding: '4px 14px',
          borderRadius: '20px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}>
          <Sparkles size={14} /> AKU-EB Official Examination Archive
        </span>
        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          {subjectTitle} ({classLabel} • {levelLabel}) Directory
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginTop: '0.4rem' }}>
          Official question papers, verified scoring answer keys, and e-marking response notes.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {activeSections.map((sec, idx) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '1.25rem',
              letterSpacing: '-0.5px'
            }}>
              {sec.title}
            </h2>
            {sec.subtitle && (
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
                {sec.subtitle}
              </p>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem'
            }}>
              {sec.links.map((lnk, lIdx) => {
                let linkColor = '#60a5fa'; // Blue for paper
                if (lnk.type === 'key' || lnk.type === 'notes') {
                  linkColor = '#8ce99a'; // Green for key/notes
                } else if (lnk.type === 'practical') {
                  linkColor = '#fbbf24'; // Orange for practical
                }

                return (
                  <Link
                    key={lIdx}
                    href={lnk.href}
                    style={{
                      color: linkColor,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textUnderlineOffset: '5px',
                      textDecorationThickness: '2px',
                      transition: 'opacity 0.15s ease',
                      display: 'inline-block'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {lnk.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
