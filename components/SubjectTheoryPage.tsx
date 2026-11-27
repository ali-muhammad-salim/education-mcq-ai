import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import ContentUnavailable from '@/components/ContentUnavailable';
import ChapterTheoryPracticeClient, { type TheorySectionMode } from '@/components/ChapterTheoryPracticeClient';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { sscComputerScienceTheory } from '@/lib/sscComputerScienceTheory';
import { hsscBiologyChapterTheory } from '@/lib/hsscBiologyChapterQuestions';
import { mappedChapterGroups, mappedTheoryUnits } from '@/services/materials/practice';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
  mode: TheorySectionMode;
}

const MODE_LABELS: Record<TheorySectionMode, string> = {
  crqs: 'Chapter-wise CRQs',
  erqs: 'Chapter-wise ERQs',
  numericals: 'Chapter-wise Numericals & Algorithms',
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

  const seniorBiology = mode === 'crqs' || mode === 'erqs' ? hsscBiologyChapterTheory(boardId, classDef.level, meta.slug) : null;
  const isSupportedSubject = seniorBiology || (
    board.id === 'akueb' &&
    (['IX', 'X'].includes(classRoman) || (meta.slug === 'computer-science' && ['XI', 'XII'].includes(classRoman) && mode !== 'notes')) &&
    (['physics', 'computer-science'].includes(meta.slug) || (['mathematics', 'chemistry', 'biology'].includes(meta.slug) && mode !== 'notes')));

  if (!isSupportedSubject) {
    return <ContentUnavailable title={`${classDef.name} ${meta.title} ${MODE_LABELS[mode]}`} />;
  }

  const [units, mathematicsGroups] = await Promise.all([
    seniorBiology ?? (['mathematics', 'chemistry', 'biology'].includes(meta.slug) || (meta.slug === 'computer-science' && ['XI', 'XII'].includes(classRoman))
      ? mappedTheoryUnits(board.shortCode, classDef.level, meta.title)
      : meta.slug === 'computer-science'
        ? sscComputerScienceTheory(classRoman === 'IX' ? 9 : 10)
        : (physicsChapterBank as any)[classRoman === 'IX' ? '9' : '10'] || []),
    meta.slug === 'mathematics' ? mappedChapterGroups(board.shortCode, classDef.level, meta.title) : undefined,
  ]);

  return (
    <div className={mode === 'notes' ? 'rise-ui' : undefined} style={{ maxWidth: '1280px', margin: '0 auto', padding: mode === 'notes' ? '0 0.25rem' : '1rem 1rem 0 1rem' }}>
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
        mcqUnits={mathematicsGroups?.flatMap(group => group.questions.slice(0, 1).map(question => question.unitNumber))}
      />
    </div>
  );
}
