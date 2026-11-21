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
import { HubDirectory, HubMasthead, HubShell } from '@/components/rise/McqHub';
import { publishedCurriculum } from '@/services/materials/curriculum';
import past2025 from '@/data/physics/ssc1_2025_past_mcqs.json';
import pastX2025 from '@/data/physics/ssc2_2025_past_mcqs.json';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import { applyAnswerDecision } from '@/lib/legacyAnswerReview';
import { reviewedMathematicsPapers } from '@/lib/mathematicsPapers';
import { hsscComputerScienceResources } from '@/lib/hsscComputerScienceResources';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import { hsscMcqsData } from '@/lib/hsscMcqsData';
import HsscMcqsClient from '@/app/[board]/[class]/[subject]/mcqs/HsscMcqsClient';
import { sscBiologySyllabus } from '@/lib/sscBiologySyllabus';
import type { HsscMcqsData } from '@/lib/hsscMcqsData';
import prisma from '@/lib/prisma';
import { paperAnswer, paperChoices, paperMetadata } from '@/lib/paperPresentation';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';

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
  const hssc = hsscPhysicsResources(boardId, classDef.level, meta.slug) ?? hsscComputerScienceResources(boardId, classDef.level, meta.slug);
  const biology = sscBiologySyllabus(boardId, classDef.level, meta.slug);
  if (hssc || biology) {
    const base = `/${board.id}/${classRoman}/${meta.slug}`;
    let data: HsscMcqsData;
    if (hssc) {
      data = hsscMcqsData(classDef.level, base, meta.slug);
    } else {
      const chapters = await mappedChapterGroups(board.shortCode, classDef.level, meta.title);
      const mapped = chapters.flatMap(group => group.questions);
      const sources = new Map<string, HsscMcqsData['papers'][number]>();
      for (const q of new Map(mapped.map(q => [q.id, q])).values()) {
        const annual = q.examType === 'ANNUAL';
        const paper = sources.get(q.paperCode) ?? {
          code: q.paperCode, title: q.sourceTitle, session: annual ? String(q.examYear) : 'Model',
          year: annual ? q.examYear : null, chapterOnly: q.sourceGrade !== classDef.level,
          paper: 'I', href: '/past-papers/' + q.sourcePaperId, questions: [],
        };
        paper.questions.push({
          id: q.id, questionNumber: q.rawQuestionNumber, questionText: q.stem,
          questionType: 'MULTIPLE_CHOICE', marks: 1, difficulty: q.cognitiveLevel,
          diagramBased: Boolean(q.diagramUrl), sourceRegion: { ...q.sourceRegion, correct_answer: q.correctOption },
          topics: [{ topic: { name: q.unitName, topicNumber: String(q.unitNumber) } }],
        });
        sources.set(q.paperCode, paper);
      }
      const papers = [...sources.values()];
      // A historical Biology question may now belong to the other grade.
      // Chapter pools follow that mapping while full papers retain their original scope.
      const localAnnualPapers = papers.filter(paper => paper.year !== null && !paper.chapterOnly);
      if (localAnnualPapers.length) {
        const crossGrade = await prisma.pastPaperQuestion.findMany({
          where: {
            pastPaper: { paperCode: { in: localAnnualPapers.map(paper => paper.code) }, sourceDocumentId: null },
            syllabusVersion: { isLatest: true, subject: { name: 'Biology', academicClass: { level: { not: classDef.level } } } },
            verified: true, questionType: 'MULTIPLE_CHOICE',
          },
          include: { pastPaper: { select: { paperCode: true } } },
        });
        for (const q of crossGrade) {
          const paper = sources.get(q.pastPaper.paperCode ?? '');
          const region = paperMetadata(q.sourceRegion);
          const correct = paperAnswer(region, paperChoices(region.choices));
          if (paper && correct) paper.questions.push({
            id: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
            questionType: q.questionType, marks: q.marks ?? 1, difficulty: q.difficulty ?? undefined,
            diagramBased: q.diagramBased, sourceRegion: { ...region, correct_answer: correct },
          });
        }
      }
      for (const paper of papers) paper.questions.sort((a, b) => Number(a.questionNumber) - Number(b.questionNumber));
      data = {
        papers,
        totalQuestions: new Set(mapped.map(q => q.id)).size,
        units: biology!.units.map(unit => ({
          topicId: chapters.find(group => group.questions[0]?.unitNumber === unit.unitNumber)?.id,
          unitNumber: unit.unitNumber, name: unit.name, topics: unit.subtopics.map(item => item.name),
          href: base + '/mcqs/chapter-wise/' + unit.unitNumber,
          groups: papers.map(paper => ({
            paperCode: paper.code,
            questionIds: mapped.filter(q => q.paperCode === paper.code && q.unitNumber === unit.unitNumber).map(q => q.id),
          })),
        })),
      };
    }
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
            { label: meta.title, href: base },
            { label: hsscCategory?.label || 'MCQs', href: hsscCategory ? `${base}/mcqs/${hsscCategory.id}` : undefined, active: !chapterUnit },
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
          baseUrl={base}
          theory={biology || meta.slug === 'computer-science' ? ['crqs', 'erqs'] : undefined}
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
  const computerChapterQuestions = isCs && category ? getAllStandardPapers()
    .filter(paper => /^CS-(IX|X)-(?:\d{4}-)?P1$/.test(paper.paperCode))
    .flatMap(({ paperCode }) => {
      const paper = getFallbackPaper(paperCode)!;
      const annual = /-\d{4}-/.test(paperCode);
      return paper.questions.flatMap(q => {
        const region = q.sourceRegion;
        const options = paperChoices(region.choices);
        const correctOption = paperAnswer(region, options);
        if (!correctOption || !region.current_mapping?.some(outcome => outcome.grade === classDef.level)) return [];
        return [{
          id: q.id,
          paperCode,
          sourceTitle: paper.title,
          sourceGrade: paper.academicClass.level,
          examYear: annual ? paper.examYear : undefined,
          questionNumber: q.questionNumber,
          rawQuestionNumber: q.questionNumber,
          stem: q.questionText,
          options,
          correctOption,
          explanation: region.explanation,
          current_slo: region.current_slo,
          cognitiveLevel: ({ K: 'Remembering', R: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.difficulty || ''] || q.difficulty,
          diagramBased: q.diagramBased,
          diagramUrl: region.diagramUrl,
          sourceRegion: region,
        }];
      });
    }) : undefined;
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
          computerChapterQuestions={computerChapterQuestions}
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
