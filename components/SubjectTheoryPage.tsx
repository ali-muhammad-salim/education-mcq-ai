import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import ContentUnavailable from '@/components/ContentUnavailable';
import ChapterTheoryPracticeClient, { type TheorySectionMode } from '@/components/ChapterTheoryPracticeClient';
import chapterBank from '@/data/physics/chapter_wise_theory_bank.json';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
  mode: TheorySectionMode;
}

const MODE_LABELS: Record<TheorySectionMode, string> = {
  crqs: 'Chapter-wise CRQs',
  erqs: 'Chapter-wise ERQs',
  numericals: 'Chapter-wise Numericals',
  notes: 'Chapter-wise Notes & SLOs',
};

export default async function SubjectTheoryPage({ params, mode }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);
  if (!classRoman) notFound();

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId);
  if (!board) notFound();

  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const isSupportedPhysics = board.id === 'akueb' && ['IX', 'X'].includes(classRoman) && meta.slug === 'physics';
  if (!isSupportedPhysics) {
    return <ContentUnavailable title={`${classDef.name} ${meta.title} ${MODE_LABELS[mode]}`} />;
  }

  const units = (classRoman === 'IX' ? (chapterBank as any)['9'] : (chapterBank as any)['10']) || [];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1rem 0 1rem' }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: MODE_LABELS[mode], active: true },
        ]}
      />
      <ChapterTheoryPracticeClient
        board={board}
        classDef={classDef}
        meta={meta}
        baseUrl={baseUrl}
        mode={mode}
        units={units}
      />
    </div>
  );
}
