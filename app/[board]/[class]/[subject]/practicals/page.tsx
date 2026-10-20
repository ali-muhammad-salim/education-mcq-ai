import ContentUnavailable from '@/components/ContentUnavailable';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  FlaskConical, Download, ArrowLeft, ArrowRight, 
  CheckCircle2, Sparkles, Layers, FileText
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import ssc1Practicals from '@/data/physics/ssc1_practicals.json';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectPracticalsPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  if (board.id !== 'akueb' || !['IX', 'X'].includes(classRoman) || meta.slug !== 'physics' || classRoman !== 'IX') return <ContentUnavailable title={classDef.name + ' ' + meta.title + ' resources'} />;
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const practicalPdfUrl = '/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Laboratory Practicals', active: true }
        ]}
      />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #07382c 0%, #0b5e4a 60%, #157a62 100%)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(11, 94, 74, 0.18)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2.5rem'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <span style={{ background: '#c9a050', color: '#07382c', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              {board.name}
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              {classDef.name} ({classDef.stageLabel})
            </span>
            <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              LABORATORY EXAMINATION (15 MARKS)
            </span>
          </div>

          <h1 className="mobile-page-title" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {meta.title} Practical Activities & Lab Paper III
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#e6f0ed', margin: '0 0 1.5rem 0', maxWidth: '820px', lineHeight: 1.6 }}>
            Official laboratory practical specifications for {classDef.name} {meta.title}. Includes apparatus setup, observation tables, least-count determinations, and graph plotting rubrics.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href={baseUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to {meta.title} Hub</span>
            </Link>
            <a
              href={practicalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                color: '#0b5e4a',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              <Download size={16} />
              <span>Download Sample Practical Paper III PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Practical Activities Breakdown */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #dce5e1',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a2e26', margin: '0 0 1rem 0' }}>
          Official Grade 9 Laboratory Activities
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            {
              num: 1,
              title: "Measurement of Length, Diameter and Volume",
              apparatus: "Vernier Callipers, Micrometer Screw Gauge, Solid cylinder, Sphere",
              learning: "Determine zero error, least count, and volume calculation with significant figures."
            },
            {
              num: 2,
              title: "Simple Pendulum Investigation",
              apparatus: "Pendulum bob, Thread, Stop-watch, Meter rod, Clamp stand",
              learning: "Measure time period (T), verify independence of mass and amplitude, calculate acceleration due to gravity (g)."
            },
            {
              num: 3,
              title: "Verification of Principle of Moments",
              apparatus: "Meter rod, Knife edge, Slotted weights with hangers, Thread",
              learning: "Balance clockwise and counter-clockwise moments, determine unknown mass of a body."
            },
            {
              num: 4,
              title: "Cooling Curve of Water & Graph Plotting",
              apparatus: "Calorimeter/Beaker, Thermometer, Stop-watch, Hot water, Stirrer",
              learning: "Record temperature at regular time intervals, plot cooling curve graph, determine cooling rate."
            }
          ].map(act => (
            <div
              key={act.num}
              style={{
                background: '#f8faf9',
                border: '1px solid #eef2f0',
                borderRadius: '12px',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{
                  background: '#0b5e4a',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  Activity {act.num}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a2e26', margin: 0 }}>
                  {act.title}
                </h3>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0b5e4a', fontWeight: 600, marginBottom: '0.35rem' }}>
                Apparatus: {act.apparatus}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#5a7a6f', lineHeight: 1.5 }}>
                {act.learning}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
