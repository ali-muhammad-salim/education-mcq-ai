import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  FileText, BookOpen, Award, CheckCircle2, Download,
  Layers, ExternalLink, ArrowRight, Sparkles, Check,
  HelpCircle, Calendar, GraduationCap, ChevronRight, BookMarked
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import SubjectDirectoryArchive from '@/components/SubjectDirectoryArchive';

interface PageProps {
  params: Promise<{ classSlug: string; subjectSlug: string }>;
}

const CLASS_NAMES: Record<string, { name: string; grade: number; levelLabel: string }> = {
  'class-9': { name: 'Class IX', grade: 9, levelLabel: 'SSC-I' },
  'class-10': { name: 'Class X', grade: 10, levelLabel: 'SSC-II' },
  'class-11': { name: 'Class XI', grade: 11, levelLabel: 'HSSC-I' },
  'class-12': { name: 'Class XII', grade: 12, levelLabel: 'HSSC-II' },
};

const SUBJECT_DETAILS: Record<string, { title: string; icon: string; description: string; chapters: string[] }> = {
  'physics': {
    title: 'Physics',
    icon: '⚛️',
    description: 'Fundamental principles of matter, motion, energy, mechanics, thermodynamics, and physical measurement mapped to AKU-EB examination standards.',
    chapters: [
      'Unit 1: Measurement & Significant Figures',
      'Unit 2: Kinematics & Motion Graphs',
      'Unit 3: Dynamics & Momentum',
      'Unit 4: Turning Effect of Forces & Equilibrium',
      'Unit 5: Deformation of Solids & Hooke’s Law',
      'Unit 6: Work, Energy and Power',
      'Unit 7: Pressure & Hydrostatics',
      'Unit 8: Thermal Physics & Evaporation',
      'Unit 9: Transfer of Thermal Energy'
    ]
  },
  'chemistry': {
    title: 'Chemistry',
    icon: '🧪',
    description: 'Structure of atoms, chemical bonding, periodicity, physical states, solutions, and electrochemistry under active national curriculum standards.',
    chapters: [
      'Unit 1: Fundamentals of Chemistry',
      'Unit 2: Structure of Atoms',
      'Unit 3: Periodic Table & Periodicity',
      'Unit 4: Structure of Molecules & Bonding',
      'Unit 5: Physical States of Matter',
      'Unit 6: Solutions & Concentration Units',
      'Unit 7: Electrochemistry',
      'Unit 8: Chemical Reactivity'
    ]
  },
  'biology': {
    title: 'Biology',
    icon: '🧬',
    description: 'Living systems, cellular biology, biodiversity, cell cycle, bioenergetics, nutrition, and transport processes mapped to SLO guidelines.',
    chapters: [
      'Unit 1: Introduction to Biology',
      'Unit 2: Solving a Biological Problem',
      'Unit 3: Biodiversity',
      'Unit 4: Cells and Tissues',
      'Unit 5: Cell Cycle (Mitosis & Meiosis)',
      'Unit 6: Enzymes',
      'Unit 7: Bioenergetics (Photosynthesis & Respiration)',
      'Unit 8: Nutrition',
      'Unit 9: Transport in Plants and Animals'
    ]
  },
  'mathematics': {
    title: 'Mathematics',
    icon: '📐',
    description: 'Real numbers, logarithms, algebraic expressions, linear equations, matrices, geometry, and trigonometry according to AKU-EB exam pattern.',
    chapters: [
      'Unit 1: Real and Complex Numbers',
      'Unit 2: Logarithms',
      'Unit 3: Algebraic Expressions & Formulas',
      'Unit 4: Factorization & Algebraic Manipulation',
      'Unit 5: Linear Equations and Inequalities',
      'Unit 6: Linear Graphs and their Applications',
      'Unit 7: Introduction to Coordinate Geometry',
      'Unit 8: Congruent & Similar Triangles',
      'Unit 9: Practical Geometry'
    ]
  },
  'computer-science': {
    title: 'Computer Science',
    icon: '💻',
    description: 'Computer systems, computational thinking, algorithms, flowcharts, programming fundamentals, and cybersecurity ethics.',
    chapters: [
      'Unit 1: Fundamentals of Computer Systems',
      'Unit 2: Computational Thinking & Algorithms',
      'Unit 3: Programming Fundamentals',
      'Unit 4: Data Communication & Networks',
      'Unit 5: Information Security & Ethics'
    ]
  },
  'english': {
    title: 'English Compulsory',
    icon: '📖',
    description: 'Reading comprehension, writing skills, grammar & syntax, vocabulary, and literary analysis aligned with AKU-EB specifications.',
    chapters: [
      'Section A: Reading Comprehension (Unseen Passages & Poetry)',
      'Section B: Grammar and Syntax in Context',
      'Section C: Creative and Analytical Writing (Essays, Letters, Summaries)'
    ]
  },
  'urdu': {
    title: 'Urdu Compulsory',
    icon: '✍️',
    description: 'Urdu comprehension, prose and poetry explanation, grammar, composition, and thematic writing.',
    chapters: [
      'Hissa-e-Nasar: Asbaaq ki Tashreeh wa Khulasa',
      'Hissa-e-Nazm wa Ghazal: Ash\'aar ki Tashreeh',
      'Qawaid-o-Insha: Mazmoon Nigari, Khatoot wa Khulasa Nigari'
    ]
  },
  'islamiyat': {
    title: 'Islamiyat / Ethics',
    icon: '🕌',
    description: 'Quranic studies, Hadith comprehension, Islamic history, and moral ethical guidelines.',
    chapters: [
      'Bab 1: Quran Majeed wa Hadith Nabvi (SAW)',
      'Bab 2: Imaniyaat wa Ibaadaat',
      'Bab 3: Seerat-e-Tayyiba (SAW)',
      'Bab 4: Akhlaq-o-Adaab'
    ]
  },
  'pakistan-studies': {
    title: 'Pakistan Studies',
    icon: '🇵🇰',
    description: 'Ideological basis of Pakistan, historical evolution, geography, environment, and constitutional development.',
    chapters: [
      'Chapter 1: Ideological Basis of Pakistan',
      'Chapter 2: Making of Pakistan',
      'Chapter 3: Land and Environment of Pakistan',
      'Chapter 4: History of Pakistan (Post-1947)'
    ]
  }
};

export default async function SubjectHubPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const classSlug = resolved.classSlug.toLowerCase();
  const subjectSlug = resolved.subjectSlug.toLowerCase();

  const classInfo = CLASS_NAMES[classSlug] || { name: 'Class IX', grade: 9, levelLabel: 'SSC-I' };
  const subjectInfo = SUBJECT_DETAILS[subjectSlug] || {
    title: subjectSlug.charAt(0).toUpperCase() + subjectSlug.slice(1).replace('-', ' '),
    icon: '📚',
    description: 'Official curriculum resources, past examination papers, model questions, and syllabus tracker.',
    chapters: ['Unit 1: Overview & Fundamentals', 'Unit 2: Core Concepts', 'Unit 3: Applied Principles']
  };

  const isPhysics = subjectSlug === 'physics';
  const isClass9 = classInfo.grade === 9;
  const isClass10 = classInfo.grade === 10;

  // Dedicated past/model paper links
  const pastPaper1Code = isPhysics && isClass9 ? 'PHY-IX-2025-P1' : null;
  const pastPaper2Code = isPhysics && isClass9 ? 'PHY-IX-2025-P2' : null;
  const modelPaper1Code = isPhysics ? (isClass9 ? 'PHY-IX-P1' : 'PHY-X-P1') : null;
  const modelPaper2Code = isPhysics ? (isClass9 ? 'PHY-IX-P2' : 'PHY-X-P2') : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>

      {/* Authentic Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: `${classInfo.name} (${classInfo.levelLabel})` },
          { label: subjectInfo.title, active: true }
        ]}
      />

      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b5e4a 0%, #157a62 100%)',
          borderRadius: '16px',
          padding: '2.5rem 2.5rem',
          color: '#ffffff',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px rgba(11, 94, 74, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
            AKU-EB Board
          </span>
          <span style={{ background: '#c9a050', color: '#111827', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 800 }}>
            {classInfo.name} ({classInfo.levelLabel})
          </span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
            Curriculum Standard 2025–2028
          </span>
        </div>

        <h1 className="mobile-page-title" style={{ fontSize: '2.75rem', color: '#ffffff', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>{subjectInfo.icon}</span>
          <span>{subjectInfo.title} Resource Archive</span>
        </h1>

        <p style={{ fontSize: '1.1rem', color: '#e6f0ed', margin: 0, maxWidth: '850px', lineHeight: 1.6 }}>
          {subjectInfo.description} Access solved past examination papers, verified model questions, interactive chapter-wise MCQs, syllabus tracker, and official guides.
        </p>

        {/* Quick Jump Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          <Link href={`/past-papers?grade=${classInfo.levelLabel}&subject=${encodeURIComponent(subjectInfo.title)}`} style={{ background: '#ffffff', color: '#0b5e4a', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}>
            📄 Past Papers Archive
          </Link>
          <Link href="/model-papers" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            📝 Model Papers Archive
          </Link>
          <a href="#syllabus" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            📚 Syllabus & SLOs
          </a>
          <a href="#mcq-banks" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            🎯 Chapter-Wise MCQs
          </a>
          <a href="#downloads" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            📦 Downloads
          </a>
        </div>
      </div>

      {/* AUTHENTIC DIRECTORY ARCHIVE VIEW MATCHING USER REFERENCE SCREENSHOT */}
      <SubjectDirectoryArchive
        subjectTitle={subjectInfo.title}
        classLabel={classInfo.name}
        levelLabel={classInfo.levelLabel}
      />

      {/* SECTION 1: Solved Past Examination Papers */}
      <section id="past-papers" style={{ marginBottom: '3.5rem', scrollMarginTop: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#0b5e4a', margin: 0 }}>
              📄 Annual Past Examination Papers
            </h2>
            <p style={{ color: '#5a7a6f', fontSize: '0.95rem', margin: '0.2rem 0 0 0' }}>
              Official AKU-EB examination papers with verified answer keys, detailed solutions, and syllabus mapping.
            </p>
          </div>
          <Link href={`/past-papers?grade=${classInfo.levelLabel}&subject=${encodeURIComponent(subjectInfo.title)}`} style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>View Full {subjectInfo.title} ({classInfo.levelLabel}) Archive</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {pastPaper1Code && pastPaper2Code ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '1.5rem' }}>

            {/* Paper 1: MCQs */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce5e1',
              borderRadius: '14px',
              padding: '1.75rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                    Paper 1 • MCQs
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 700 }}>
                    Year 2025 Annual
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                  Physics Class IX Paper 1 (40 MCQs)
                </h3>
                <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Interactive simulator with all 40 multiple-choice items, official board answer key, cognitive level badges (K, U, A), and direct syllabus references.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>40 Questions</span>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>100% Key Verified</span>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Original PDF Included</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <Link
                  href={`/past-papers/${pastPaper1Code}`}
                  style={{
                    flex: 1,
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>🚀 Open Interactive Paper 1</span>
                </Link>
                <a
                  href="/uploads/past_paper_auto_1791881747833_Physics-IX-Paper-I-2025.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#f4f7f6',
                    color: '#0b5e4a',
                    border: '1px solid #dce5e1',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Download size={15} />
                  <span>PDF</span>
                </a>
              </div>
            </div>

            {/* Paper 2: CRQs & ERQs */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce5e1',
              borderRadius: '14px',
              padding: '1.75rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                    Paper 2 • CRQ & ERQ
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 700 }}>
                    Year 2025 Annual
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                  Physics Class IX Paper 2 (Theory & Numerical)
                </h3>
                <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Features student notebook ruled answer lines, model solutions, detailed better vs weaker candidate response text, and official checking hints.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>11 Questions</span>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Ruled Answer Lines</span>
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>E-Marking Feedback</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <Link
                  href={`/past-papers/${pastPaper2Code}`}
                  style={{
                    flex: 1,
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>🚀 Open Interactive Paper 2</span>
                </Link>
                <a
                  href="/uploads/past_paper_Class_IX_1791885389646_Physics-IX-Paper-II-2025.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#f4f7f6',
                    color: '#0b5e4a',
                    border: '1px solid #dce5e1',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Download size={15} />
                  <span>PDF</span>
                </a>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '2.5rem', textAlign: 'center' }}>
            <FileText size={36} style={{ color: '#9ca3af', margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ fontSize: '1.2rem', color: '#374151', margin: '0 0 0.5rem 0' }}>Past Papers for {subjectInfo.title} ({classInfo.name})</h4>
            <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto 1.25rem auto' }}>
              Past examination paper digitizations are currently being verified against syllabus SLOs. Explore our active Physics papers or view general past paper archives.
            </p>
            <Link href="/past-papers" className="btn" style={{ background: '#0b5e4a', color: '#fff', padding: '8px 16px', borderRadius: '8px' }}>
              Browse Available Past Papers Archive →
            </Link>
          </div>
        )}
      </section>

      {/* SECTION 2: Official Model Examination Papers */}
      <section id="model-papers" style={{ marginBottom: '3.5rem', scrollMarginTop: '100px' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#0b5e4a', margin: 0 }}>
            📝 Official AKU-EB Model Examination Papers
          </h2>
          <p style={{ color: '#5a7a6f', fontSize: '0.95rem', margin: '0.2rem 0 0 0' }}>
            Standard examination blueprints showcasing exact mark weightage, cognitive splits, and question difficulty.
          </p>
        </div>

        {modelPaper1Code && modelPaper2Code ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '1.5rem' }}>

            {/* Model Paper 1 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce5e1',
              borderRadius: '14px',
              padding: '1.75rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '0.75rem' }}>
                  Model Paper I • Multiple Choice
                </span>
                <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                  {subjectInfo.title} {classInfo.name} Model Paper I
                </h3>
                <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  40 Multiple Choice items testing Remembering (K), Understanding (U), and Application (A) with full instant score evaluation and question reviews.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <Link
                  href={`/past-papers/${modelPaper1Code}`}
                  style={{
                    flex: 1,
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  🚀 Launch Model Paper 1 Viewer
                </Link>
              </div>
            </div>

            {/* Model Paper 2 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce5e1',
              borderRadius: '14px',
              padding: '1.75rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ background: '#fce7f3', color: '#9d174d', fontSize: '0.82rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '0.75rem' }}>
                  Model Paper II • Constructed & Extended
                </span>
                <h3 style={{ fontSize: '1.35rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                  {subjectInfo.title} {classInfo.name} Model Paper II
                </h3>
                <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Constructed Response Questions (CRQs) and Extended Response Questions (ERQs) with full model answers, rubric points, and notebook ruled lines.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <Link
                  href={`/past-papers/${modelPaper2Code}`}
                  style={{
                    flex: 1,
                    background: '#0b5e4a',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  🚀 Launch Model Paper 2 Viewer
                </Link>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Model examination blueprints for {subjectInfo.title} {classInfo.name} are available via the downloads section.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 3: Chapter-Wise MCQs & Practice Banks */}
      <section id="mcq-banks" style={{ marginBottom: '3.5rem', scrollMarginTop: '100px' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#0b5e4a', margin: 0 }}>
            🎯 Chapter-Wise Question Banks & Practice
          </h2>
          <p style={{ color: '#5a7a6f', fontSize: '0.95rem', margin: '0.2rem 0 0 0' }}>
            Practice questions organized by curriculum topic with immediate feedback and explanation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          {subjectInfo.chapters.map((chap, cIdx) => (
            <div
              key={cIdx}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', color: '#0b5e4a', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Chapter {cIdx + 1}
                </div>
                <h4 style={{ fontSize: '1.05rem', color: '#111827', margin: '0 0 0.75rem 0' }}>
                  {chap}
                </h4>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Includes MCQs & CRQs
                </span>
                <Link
                  href={isPhysics && isClass9 ? `/classes/ssc-i/physics` : `/syllabus`}
                  style={{
                    color: '#0b5e4a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <span>Practice Unit</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: Syllabus & Student Learning Outcomes (SLOs) */}
      <section id="syllabus" style={{ marginBottom: '3.5rem', scrollMarginTop: '100px' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #b7dfd2',
          borderRadius: '14px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(11, 94, 74, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ background: '#e6f0ed', color: '#0b5e4a', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>
                Official Board Syllabus 2025–2028
              </span>
              <h3 style={{ fontSize: '1.5rem', color: '#0b5e4a', margin: '0.5rem 0 0.35rem 0' }}>
                {subjectInfo.title} Student Learning Outcomes (SLO) Tracker
              </h3>
              <p style={{ color: '#4b5563', fontSize: '0.95rem', margin: 0, maxWidth: '750px' }}>
                Every single examinable topic broken down with Cognitive Levels (Knowledge, Understanding, Application), Practical experiment lists, and textbook cross-references.
              </p>
            </div>

            <Link
              href={isPhysics ? `/syllabus/3e6f82ae-95dc-4edb-b806-d75b194a21cd` : `/syllabus`}
              style={{
                background: '#0b5e4a',
                color: '#ffffff',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'normal'
              }}
            >
              <BookOpen size={17} />
              <span style={{minWidth:0,whiteSpace:"normal"}}>Explore Interactive Syllabus Tracker →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 5: Official Downloads & Textbooks */}
      <section id="downloads" style={{ scrollMarginTop: '100px' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#0b5e4a', margin: 0 }}>
            📦 Official Textbooks, Pacing Guides & Document Downloads
          </h2>
          <p style={{ color: '#5a7a6f', fontSize: '0.95rem', margin: '0.2rem 0 0 0' }}>
            Download verified high-resolution PDF materials produced for candidates and teachers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>

          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: '#111827', margin: '0 0 0.35rem 0' }}>
              Dedicated {subjectInfo.title} Curriculum PDF
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
              Full course learning outcomes, scheme of assessment, and exam pattern.
            </p>
            <a
              href="/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf"
              target="_blank"
              style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} /> Download Curriculum PDF (1.6 MB)
            </a>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: '#111827', margin: '0 0 0.35rem 0' }}>
              Official Teacher Pacing Guide (2025)
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
              Weekly breakdown of instructional hours and laboratory experiment sessions.
            </p>
            <a
              href="/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf"
              target="_blank"
              style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} /> Download Pacing Guide PDF
            </a>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: '#111827', margin: '0 0 0.35rem 0' }}>
              Practical Activities & Laboratory Manual
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
              Required student practical demonstrations, apparatus lists, and reporting rubrics.
            </p>
            <a
              href="/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
              target="_blank"
              style={{ color: '#0b5e4a', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} /> Download Practical Guide PDF
            </a>
          </div>

        </div>
      </section>

    </div>
  );
}
