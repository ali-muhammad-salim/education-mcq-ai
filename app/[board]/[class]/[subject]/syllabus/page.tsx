import ContentUnavailable from '@/components/ContentUnavailable';
import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardHierarchy';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import SyllabusClient from './SyllabusClient';
import ssc1ExactSyllabus from '@/data/physics/ssc1_exact_syllabus.json';
import ssc2ExactSyllabus from '@/data/physics/ssc2_exact_syllabus.json';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectSyllabusPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  if (board.id !== 'akueb' || !['IX', 'X'].includes(classRoman) || meta.slug !== 'physics') return <ContentUnavailable title={classDef.name + ' ' + meta.title + ' resources'} />;
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const syllabusData = classRoman === 'IX' ? ssc1ExactSyllabus : ssc2ExactSyllabus;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Official Syllabus & SLOs', active: true }
        ]}
      />

      <SyllabusClient
        board={board}
        classDef={classDef}
        meta={meta}
        baseUrl={baseUrl}
        units={syllabusData}
      />
    </div>
  );
}
