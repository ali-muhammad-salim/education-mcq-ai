import ContentUnavailable from '@/components/ContentUnavailable';
import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import McqsClient from './McqsClient';
import ssc1Mcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc2Mcqs from '@/data/physics/ssc2_model_mcqs.json';
import {mappedChapterGroups} from '@/services/materials/practice';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
}

export default async function SubjectMcqsPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId);
  if(!board)notFound();
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  const mappedChapters=await mappedChapterGroups(board.shortCode,classDef.level,meta.title);
  const legacy=board.id==='akueb'&&['IX','X'].includes(classRoman)&&meta.slug==='physics';
  if (!legacy&&!mappedChapters.length) return <ContentUnavailable title={classDef.name + ' ' + meta.title + ' resources'} />;
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const mcqsData = legacy?(classRoman === 'IX' ? ssc1Mcqs : ssc2Mcqs):[];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: 'Chapter-Wise MCQs', active: true }
        ]}
      />

      <McqsClient
        board={board}
        classDef={classDef}
        meta={meta}
        baseUrl={baseUrl}
        questions={mcqsData}
        mappedChapters={mappedChapters}
      />
    </div>
  );
}
