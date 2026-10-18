import React from 'react';
import Link from 'next/link';
import { BookOpen, FileText, Award, Calendar, ArrowRight, Sparkles, CheckCircle2, FlaskConical } from 'lucide-react';
import prisma from '@/lib/prisma';
import BoardClassSubjectHierarchy, { BoardData, ClassData, SubjectData } from '@/components/BoardClassSubjectHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';

export const revalidate = 60; // Cache for 60 seconds

async function getHierarchyData(): Promise<BoardData> {
  try {
    const board = await prisma.board.findFirst({
      where: { shortCode: 'AKU-EB' },
      include: {
        programmes: {
          include: {
            academicClasses: {
              orderBy: { level: 'asc' },
              include: {
                subjects: {
                  include: {
                    pastPapers: {
                      select: { id: true, paperCode: true, examYear: true, examType: true, title: true }
                    },
                    syllabusVersions: {
                      select: { id: true, versionName: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (board) {
      // Gather classes from all programmes
      const classesMap = new Map<number, ClassData>();

      for (const prog of board.programmes) {
        for (const cls of prog.academicClasses) {
          const classSlug = `class-${cls.level}`;
          const levelLabel = cls.level === 9 ? 'SSC-I' : cls.level === 10 ? 'SSC-II' : cls.level === 11 ? 'HSSC-I' : 'HSSC-II';

          const subjects: SubjectData[] = cls.subjects.map(sub => {
            const meta = getSubjectMeta(sub.name);
            const isPhysics = meta.slug === 'physics';
            const isClass9 = cls.level === 9;
            const isClass10 = cls.level === 10;

            const featuredLinks = [];
            if (isPhysics && isClass9) {
              featuredLinks.push(
                { label: '2025 Paper I', href: '/past-papers/PHY-IX-2025-P1', badge: 'MCQ' },
                { label: '2025 Paper II', href: '/past-papers/PHY-IX-2025-P2', badge: 'CRQ' },
                { label: 'Model Paper I', href: '/past-papers/PHY-IX-P1' },
                { label: 'Syllabus & SLOs', href: '/classes/ssc-i/physics' }
              );
            } else if (isPhysics && isClass10) {
              featuredLinks.push(
                { label: 'Model Paper I', href: '/past-papers/PHY-X-P1', badge: 'MCQ' },
                { label: 'Model Paper II', href: '/past-papers/PHY-X-P2', badge: 'CRQ' },
                { label: 'Syllabus & SLOs', href: '/classes/ssc-ii/physics' }
              );
            }

            return {
              id: sub.id,
              name: sub.name,
              code: sub.code,
              slug: meta.slug,
              icon: meta.icon,
              description: meta.description,
              chapterCount: meta.chapterCount,
              sloCount: meta.sloCount,
              papersCount: sub.pastPapers.length,
              categories: meta.categories,
              featuredLinks
            };
          });

          // Sort so physics and science subjects appear first
          subjects.sort((a, b) => {
            if ((b.papersCount || 0) !== (a.papersCount || 0)) {
              return (b.papersCount || 0) - (a.papersCount || 0);
            }
            return a.name.localeCompare(b.name);
          });

          classesMap.set(cls.level, {
            id: cls.id,
            slug: classSlug,
            name: cls.name,
            level: cls.level,
            levelLabel,
            subjectsCount: subjects.length,
            subjects
          });
        }
      }

      const sortedClasses = Array.from(classesMap.values()).sort((a, b) => a.level - b.level);

      return {
        id: board.id,
        name: board.name,
        shortCode: board.shortCode,
        status: board.status,
        description: board.description || 'Official Aga Khan University Examination Board portal.',
        classes: sortedClasses
      };
    }
  } catch (err) {
    console.error('Error fetching hierarchy data from Prisma:', err);
  }

  // Fallback if database query fails
  return {
    id: 'akueb-default',
    name: 'Aga Khan University Examination Board',
    shortCode: 'AKU-EB',
    status: 'ACTIVE',
    description: 'Aga Khan University Examination Board official curriculum repository.',
    classes: [
      {
        id: 'class-9-id',
        slug: 'class-9',
        name: 'Class IX',
        level: 9,
        levelLabel: 'SSC-I',
        subjectsCount: 9,
        subjects: [
          {
            id: 'phy-9',
            name: 'Physics',
            slug: 'physics',
            icon: '⚛️',
            description: 'Fundamental principles of matter, motion, energy, mechanics, thermodynamics, and physical measurement.',
            chapterCount: 8,
            sloCount: 145,
            papersCount: 4,
            categories: ['Official Syllabus', 'Model Papers', '2025 Past Papers', 'Interactive MCQs', 'E-Marking Notes', 'Practicals'],
            featuredLinks: [
              { label: '2025 Paper I', href: '/past-papers/PHY-IX-2025-P1', badge: 'MCQ' },
              { label: '2025 Paper II', href: '/past-papers/PHY-IX-2025-P2', badge: 'CRQ' },
              { label: 'Model Paper I', href: '/past-papers/PHY-IX-P1' },
              { label: 'Syllabus Hub', href: '/classes/ssc-i/physics' }
            ]
          }
        ]
      }
    ]
  };
}

export default async function Home() {
  const hierarchyData = await getHierarchyData();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <div className="hero">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '6px 16px',
          borderRadius: '30px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}>
          <Sparkles size={16} /> OFFICIAL AKU-EB 2025/2026 ACADEMIC REPOSITORY
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
          Master Your AKU-EB Board Exams
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.95, maxWidth: '750px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Verified syllabuses, teacher pacing guides, official model papers with interactive MCQ practice, and laboratory practical frameworks.
        </p>

        <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/akueb/IX/physics/pastpapers" className="btn" style={{ background: '#ffffff', color: '#0b5e4a', fontWeight: 800, padding: '0.85rem 1.75rem', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
            📄 Past Papers Archive (2025 Annual) →
          </Link>
          <Link href="/akueb/IX/physics/model-papers" className="btn" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, padding: '0.85rem 1.65rem', borderRadius: '10px' }}>
            📝 Model Examination Papers →
          </Link>
          <Link href="/akueb/IX/physics" className="btn" style={{ background: '#27ae60', color: '#ffffff', fontWeight: 700, padding: '0.85rem 1.65rem', borderRadius: '10px' }}>
            ⚡ Class IX Physics Hub →
          </Link>
          <Link href="/akueb/X/physics" className="btn" style={{ background: '#f2994a', color: '#ffffff', fontWeight: 700, padding: '0.85rem 1.65rem', borderRadius: '10px' }}>
            ⚡ Class X Physics Hub →
          </Link>
        </div>
      </div>

      {/* CORE REQUIREMENT: HIERARCHICAL UI (BOARD -> CLASSES IX, X, XI, XII -> SUBJECT CARDS) */}
      <BoardClassSubjectHierarchy initialBoard={hierarchyData} />

      {/* Featured Resource Spotlight: Physics Manual Ingestion */}
      <div style={{
        background: '#ffffff',
        border: '2px solid var(--primary-color)',
        borderRadius: '16px',
        padding: '2.5rem',
        marginBottom: '3rem',
        boxShadow: '0 8px 24px rgba(11, 94, 74, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontWeight: 700, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔥 NEWLY INGESTED & ORGANIZED
            </span>
            <h2 style={{ fontSize: '1.9rem', marginTop: '0.5rem', color: '#0b5e4a' }}>
              Physics SSC (Classes IX & X) Complete Academic Resource Pack
            </h2>
            <p style={{ color: '#5a7a6f', marginTop: '0.25rem', maxWidth: '800px' }}>
              All manual downloads have been audited, separated into dedicated Grade 9 and Grade 10 files, and loaded into interactive web simulators.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* Class IX Card */}
          <div style={{ background: '#f4fbf7', border: '1px solid #dce5e1', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: '#0b5e4a', fontSize: '0.85rem' }}>GRADE 9 • SSC-I</span>
              <span style={{ fontSize: '0.75rem', background: '#e6f0ed', color: '#0b5e4a', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>8 Units • 145 SLOs</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', color: '#2c3e38', marginBottom: '0.75rem' }}>Physics Class IX Portal</h3>
            <ul style={{ fontSize: '0.88rem', color: '#555', paddingLeft: '1.2rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              <li>Dedicated Grade 9 Syllabus (32 Pages)</li>
              <li>Interactive Model Paper I (40 MCQs with keys)</li>
              <li>Model Paper II (7 CRQs & ERQs)</li>
              <li>Sample Practical Paper III (3-Stage Lab Exam)</li>
              <li>28-Week Teacher Pacing Guide (33 Pages)</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Link href="/past-papers/PHY-IX-2025-P1" className="btn" style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', textAlign: 'center', background: '#0b5e4a', color: '#fff', borderRadius: '6px' }}>
                  📄 2025 Paper I (MCQ)
                </Link>
                <Link href="/past-papers/PHY-IX-2025-P2" className="btn" style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', textAlign: 'center', background: '#7c2d12', color: '#fff', borderRadius: '6px' }}>
                  📄 2025 Paper II (Theory)
                </Link>
              </div>
              <Link href="/akueb/IX/physics" className="btn" style={{ width: '100%', textAlign: 'center', display: 'block', background: '#ffffff', color: '#0b5e4a', border: '1.5px solid #0b5e4a', fontSize: '0.86rem' }}>
                Access Grade 9 Complete Hub →
              </Link>
            </div>
          </div>

          {/* Class X Card */}
          <div style={{ background: '#f4fbf7', border: '1px solid #dce5e1', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: '#0b5e4a', fontSize: '0.85rem' }}>GRADE 10 • SSC-II</span>
              <span style={{ fontSize: '0.75rem', background: '#e6f0ed', color: '#0b5e4a', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>9 Units • 176 SLOs</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', color: '#2c3e38', marginBottom: '0.75rem' }}>Physics Class X Portal</h3>
            <ul style={{ fontSize: '0.88rem', color: '#555', paddingLeft: '1.2rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              <li>Dedicated Grade 10 Syllabus (34 Pages)</li>
              <li>Interactive Model Paper I (40 MCQs with keys)</li>
              <li>Model Paper II (7 CRQs & ERQs)</li>
              <li>28-Week Teacher Pacing Guide (43 Pages)</li>
              <li>Official Textbook Chapter Alignments</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Link href="/past-papers/PHY-X-P1" className="btn" style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', textAlign: 'center', background: '#0b5e4a', color: '#fff', borderRadius: '6px' }}>
                  📄 Model Paper I (MCQ)
                </Link>
                <Link href="/past-papers/PHY-X-P2" className="btn" style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', textAlign: 'center', background: '#7c2d12', color: '#fff', borderRadius: '6px' }}>
                  📄 Model Paper II (Theory)
                </Link>
              </div>
              <Link href="/akueb/X/physics" className="btn" style={{ width: '100%', textAlign: 'center', display: 'block', background: '#ffffff', color: '#0b5e4a', border: '1.5px solid #0b5e4a', fontSize: '0.86rem' }}>
                Access Grade 10 Complete Hub →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Core Platform Modules */}
      <h2 style={{ fontSize: '1.8rem', color: '#0b5e4a', marginBottom: '1.5rem', textAlign: 'center' }}>
        Explore Educational Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#e6f0ed', color: '#0b5e4a', padding: '10px', borderRadius: '10px' }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', margin: 0 }}>Syllabus Tracker</h3>
          </div>
          <p style={{ color: '#666', marginBottom: '1.5rem', flexGrow: 1, lineHeight: 1.5 }}>
            Browse officially mapped AKU-EB curriculum topics, subtopics, and Student Learning Outcomes (SLOs) with cognitive level tags.
          </p>
          <Link href="/syllabus" className="btn" style={{ textAlign: 'center' }}>
            Explore Syllabus
          </Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#fdf8ec', color: '#b38e45', padding: '10px', borderRadius: '10px' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', margin: 0 }}>Past Papers Archive</h3>
          </div>
          <p style={{ color: '#666', marginBottom: '1.5rem', flexGrow: 1, lineHeight: 1.5 }}>
            Search historical examination papers and model papers with download links and complete question breakdowns.
          </p>
          <Link href="/past-papers" className="btn" style={{ textAlign: 'center' }}>
            View Past Papers
          </Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#edf6ff', color: '#2196f3', padding: '10px', borderRadius: '10px' }}>
              <Award size={24} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', margin: 0 }}>MCQ Practice Bank</h3>
          </div>
          <p style={{ color: '#666', marginBottom: '1.5rem', flexGrow: 1, lineHeight: 1.5 }}>
            Practice verified MCQs categorized by cognitive level (Knowledge, Understanding, Application) and numerical problem sets.
          </p>
          <Link href="/mcqs" className="btn" style={{ textAlign: 'center' }}>
            Start Practicing
          </Link>
        </div>
      </div>
    </div>
  );
}
