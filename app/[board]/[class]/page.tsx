import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getClassSubjects, normalizeBoardId, normalizeClassRoman } from '@/lib/boardHierarchy';
import ClassSubjectsClient from './ClassSubjectsClient';

interface PageProps {
  params: Promise<{ board: string; class: string }>;
}

export default async function ClassPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const data = await getClassSubjects(boardId, classRoman);

  if (!data || !data.board || !data.classDef) {
    notFound();
  }

  const { board, classDef, subjects } = data;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, active: true }
        ]}
      />

      <ClassSubjectsClient
        board={board}
        classDef={classDef}
        initialSubjects={subjects}
      />
    </div>
  );
}
