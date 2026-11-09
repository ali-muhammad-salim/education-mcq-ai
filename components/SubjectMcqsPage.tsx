import ContentUnavailable from '@/components/ContentUnavailable';
import React from 'react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { normalizeBoardId, normalizeClassRoman, CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import McqsClient from '@/app/[board]/[class]/[subject]/mcqs/McqsClient';
import ssc1Mcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc2Mcqs from '@/data/physics/ssc2_model_mcqs.json';
import cs1Mcqs from '@/data/computer-science/ssc1_model_mcqs.json';
import cs2Mcqs from '@/data/computer-science/ssc2_model_mcqs.json';
import chem1Mcqs from '@/data/chemistry/ssc1_model_mcqs.json';
import chem2Mcqs from '@/data/chemistry/ssc2_model_mcqs.json';
import mth1Mcqs from '@/data/mathematics/ssc1_model_mcqs.json';
import chem1Past2025 from '@/data/chemistry/ssc1_2025_past_mcqs.json';
import chem2Past2025 from '@/data/chemistry/ssc2_2025_past_mcqs.json';
import csPast2025 from '@/data/computer-science/ssc1_2025_past_mcqs.json';
import csXPast2025 from '@/data/computer-science/ssc2_2025_past_mcqs.json';
import { mappedChapterGroups, mappedTheoryUnits } from '@/services/materials/practice';
import { mcqCategories, type McqCategory } from '@/lib/mcqCategories';
import { HubDirectory, HubMasthead, HubRail, HubShell } from '@/components/rise/McqHub';
import { publishedCurriculum } from '@/services/materials/curriculum';
import past2025 from '@/data/physics/ssc1_2025_past_mcqs.json';
import pastX2025 from '@/data/physics/ssc2_2025_past_mcqs.json';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import { applyAnswerDecision } from '@/lib/legacyAnswerReview';
import { reviewedMathematicsPapers } from '@/lib/mathematicsPapers';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import { hsscMcqsData } from '@/lib/hsscMcqsData';
import HsscMcqsClient from '@/app/[board]/[class]/[subject]/mcqs/HsscMcqsClient';

interface PageProps {
  params: Promise<{ board: string; class: string; subject: string }>;
  category?: McqCategory;
  chapter?: string;
}

export default async function SubjectMcqsPage({ params, category, chapter }: PageProps) {
  const { board: rawBoard, class: rawClass, subject: rawSubject } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const board = SUPPORTED_BOARDS.find(b => b.id === boardId);
  if (!board) notFound();
  const classDef = CLASS_DEFINITIONS[classRoman];
  const meta = getSubjectMeta(rawSubject);
  const hssc = hsscPhysicsResources(boardId, classDef.level, meta.slug);
  if (hssc) {
    const data = hsscMcqsData(classDef.level, hssc.base);
    const chapterUnit = chapter ? data.units.find(unit => String(unit.unitNumber) === chapter) : undefined;
    if (chapter && !chapterUnit) notFound();
    const hsscCategory = category ? mcqCategories.find(item => item.key === category) : undefined;
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem' }}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: board.name, href: `/${board.id}` },
            { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
            { label: meta.title, href: hssc.base },
            { label: hsscCategory?.label || 'MCQs', href: hsscCategory ? `${hssc.base}/mcqs/${hsscCategory.id}` : undefined, active: !chapterUnit },
            ...(chapterUnit ? [{ label: chapterUnit.name, active: true }] : []),
          ]}
        />
        <HsscMcqsClient
          boardName={board.name}
          boardFullName={board.fullName}
          boardCode={board.shortCode}
          classCode={classRoman}
          classLevel={classDef.level}
          className={classDef.name}
          classLabel={`${classDef.name} (${classDef.stageLabel})`}
          subjectTitle={meta.title}
          baseUrl={hssc.base}
          category={category}
          chapter={chapter ?? null}
          data={data}
        />
      </div>
    );
  }
  const mappedChapters = category ? await mappedChapterGroups(board.shortCode, classDef.level, meta.title) : [];
  const isPhysics = board.id === 'akueb' && ['IX', 'X'].includes(classRoman) && meta.slug === 'physics';
  const isCs = board.id === 'akueb' && ['IX', 'X'].includes(classRoman) && meta.slug === 'computer-science';
  const isChem = board.id === 'akueb' && ['IX', 'X'].includes(classRoman) && meta.slug === 'chemistry';
  const isMath = board.id === 'akueb' && ['IX', 'X'].includes(classRoman) && meta.slug === 'mathematics';
  const mathTheory = isMath || isChem ? await mappedTheoryUnits(board.shortCode, classDef.level, meta.title) : [];
  const availableTheorySections = (isMath || isChem)
    ? (['crqs', 'erqs', 'numericals'] as const).filter(section => mathTheory.some(unit => unit[section].length > 0))
    : undefined;
  const legacy = isPhysics || isCs || isChem || isMath;
  if (category && !legacy && !mappedChapters.length) return <ContentUnavailable title={classDef.name + ' ' + meta.title + ' resources'} />;
  const baseUrl = `/${board.id}/${classRoman}/${meta.slug}`;

  const mcqsData = isCs ? (classRoman === 'IX' ? cs1Mcqs : cs2Mcqs) : isChem ? (classRoman === 'IX' ? chem1Mcqs : chem2Mcqs) : isMath ? (classRoman === 'IX' ? mth1Mcqs : []) : isPhysics ? (classRoman === 'IX' ? ssc1Mcqs : ssc2Mcqs) : [];
  const answerDecisions = category && isPhysics && classDef.level === 9 ? await publishedAnswerDecisions() : [];
  const categoryDef = category ? mcqCategories.find(item => item.key === category) : undefined;
  const chapterLabel = chapter
    ? decodeURIComponent(chapter).replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    : null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem', fontFamily: "'Inter', sans-serif" }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: board.name, href: `/${board.id}` },
          { label: `${classDef.name} (${classDef.stageLabel})`, href: `/${board.id}/${classRoman}` },
          { label: meta.title, href: baseUrl },
          { label: categoryDef?.label || 'MCQs', href: categoryDef ? `${baseUrl}/mcqs/${categoryDef.id}` : undefined, active: !chapterLabel },
          ...(chapterLabel ? [{ label: chapterLabel, active: true }] : []),
        ]}
      />

      {!category ? (
        <HubShell>
          <HubMasthead
            board={board.name}
            classLabel={`${classDef.name} (${classDef.stageLabel})`}
            title={`${meta.title} MCQs`}
            lede="Choose how you want to practise: by syllabus unit, by board paper, as a full timed test, or by the thinking a question asks for."
            back={{ href: baseUrl, label: `Back to ${meta.title} subject hub` }}
          />
          <HubRail baseUrl={baseUrl} theory={availableTheorySections ?? (legacy ? ['crqs', 'erqs', 'numericals', 'chapter-notes'] : [])} />
          <HubDirectory baseUrl={baseUrl} />
        </HubShell>
      ) : (
        <McqsClient
          board={board}
          classDef={classDef}
          meta={meta}
          baseUrl={baseUrl}
          questions={mcqsData}
          annualQuestions={
            isCs
              ? classDef.level === 9
                ? csPast2025
                : csXPast2025
              : isChem
                ? classDef.level === 9
                  ? chem1Past2025
                  : chem2Past2025
                : isMath
                  ? []
                  : isPhysics
                  ? classDef.level === 9
                    ? past2025.map(q => ({ ...q, ...applyAnswerDecision({}, q.questionNumber, q.stem, q.options, answerDecisions) }))
                    : pastX2025
                  : []
          }
          mappedChapters={mappedChapters}
          availableTheorySections={availableTheorySections}
          reviewedPapers={isMath ? reviewedMathematicsPapers.filter(p => p.academicClass.level === classDef.level && p.paperCode.endsWith('-P1')).sort((a,b) => b.examYear-a.examYear).map(p => ({ paperCode: p.paperCode, title: p.title, examYear: p.examYear, count: p.questions.length })) : []}
          initialCategory={category}
          initialChapter={chapter}
          useReviewedLegacy={isPhysics && !(await publishedCurriculum(board.shortCode, classDef.level, meta.title))}
        />
      )}
    </div>
  );
}
