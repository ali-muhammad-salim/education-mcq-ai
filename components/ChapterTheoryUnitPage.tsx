import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import ContentUnavailable from '@/components/ContentUnavailable';
import ChapterTheoryUnitClient from '@/components/ChapterTheoryUnitClient';
import type { TheorySectionMode } from '@/components/ChapterTheoryPracticeClient';
import chapterBank from '@/data/physics/chapter_wise_theory_bank.json';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string; unit: string }>;
  mode: Exclude<TheorySectionMode, 'notes'>;
}

const MODE_LABELS: Record<Exclude<TheorySectionMode, 'notes'>, string> = {
  crqs: 'Chapter-wise CRQs',
  erqs: 'Chapter-wise ERQs',
  numericals: 'Chapter-wise Numericals',
};

export default async function ChapterTheoryUnitPage({ params, mode }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject, unit: rawUnit } = await params;
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
  const unitMatch = /^(\d+)/.exec(rawUnit);
  const unitNumber = unitMatch ? Number(unitMatch[1]) : NaN;
  const unit = units.find((u: any) => u.unitNumber === unitNumber);
  if (!unit) notFound();

  const chapterLabel = `Unit ${unit.unitNumber}: ${unit.name}`;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1rem 0 1rem' }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: MODE_LABELS[mode], href: `${baseUrl}/${mode}` },
          { label: chapterLabel, active: true },
        ]}
      />
      <ChapterTheoryUnitClient
        board={board}
        classDef={classDef}
        meta={meta}
        baseUrl={baseUrl}
        mode={mode}
        unit={unit}
      />
    </div>
  );
}
