'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TakeQuizModal from '@/components/TakeQuizModal';
import QuestionSource from '@/components/QuestionSource';
import McqPracticeSheet, { type PracticeFilter, type PracticeItem } from '@/components/McqPracticeSheet';
import { smartMatch } from '@/lib/smartSearch';
import type { McqCategory } from '@/lib/mcqCategories';
import {
  HubDirectory, HubEmpty, HubMasthead, HubRail, HubSection, HubShell, PaperGrid, TierGrid, UnitBrowser,
  type PaperEntry, type TierEntry, type UnitEntry,
} from '@/components/rise/McqHub';
import type { HsscMcqsData, HsscPaperView, HsscQuizQuestion, HsscUnitView } from '@/lib/hsscMcqsData';

interface HsscMcqsClientProps {
  boardName: string;
  boardFullName: string;
  boardCode: string;
  classCode: string;
  classLevel: number;
  className: string;
  classLabel: string;
  subjectTitle: string;
  baseUrl: string;
  category?: McqCategory;
  chapter?: string | null;
  data: HsscMcqsData;
}

interface QuizLaunch {
  title: string;
  code: string;
  questions: HsscQuizQuestion[];
}

type QuizGroup = { paper: HsscPaperView; questions: HsscQuizQuestion[] };

const COGNITIVE_TIERS = [
  {
    key: 'recall',
    code: 'R',
    label: 'Recall',
    note: 'Definitions, statements and remembered facts.',
  },
  {
    key: 'understanding',
    code: 'U',
    label: 'Understanding',
    note: 'Explaining, comparing and interpreting concepts.',
  },
  {
    key: 'application',
    code: 'A',
    label: 'Application',
    note: 'Calculations, diagrams and unfamiliar situations.',
  },
  {
    key: 'higher',
    code: 'E',
    label: 'Evaluation & creation',
    note: 'Judging evidence, designing investigations and justifying answers.',
  },
] as const;

function tierOf(level: string | undefined) {
  const code = (level || '').trim().toUpperCase();
  if (code.startsWith('R') || code.startsWith('K')) return 'recall';
  if (code.startsWith('U')) return 'understanding';
  if (code.startsWith('A') || code.startsWith('F')) return 'application';
  if (code.startsWith('E') || code.startsWith('C')) return 'higher';
  return 'understanding';
}

const LEVEL_FILTER: Record<string, PracticeFilter> = {
  recall: 'Remembering',
  understanding: 'Understanding',
  application: 'Application',
};

const FILTER_TAG: Record<PracticeFilter, string> = {
  all: 'ALL',
  Remembering: 'R',
  Understanding: 'U',
  Application: 'A',
  diagram: 'DIAGRAM',
};

export default function HsscMcqsClient({
  boardName,
  boardFullName,
  boardCode,
  classCode,
  classLevel,
  className,
  classLabel,
  subjectTitle,
  baseUrl,
  category,
  chapter,
  data,
}: HsscMcqsClientProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizLaunch | null>(null);
  const [filter, setFilter] = useState<PracticeFilter>('all');
  const [search, setSearch] = useState('');

  const questionsById = useMemo(() => {
    const map = new Map<string, HsscQuizQuestion>();
    for (const paper of data.papers) {
      for (const question of paper.questions) map.set(question.id, question);
    }
    return map;
  }, [data.papers]);

  const paperByCode = useMemo(
    () => new Map(data.papers.map(paper => [paper.code, paper] as const)),
    [data.papers]
  );

  const chapterUnit = chapter
    ? data.units.find(unit => String(unit.unitNumber) === chapter) || null
    : null;

  const groupsFor = (unit: HsscUnitView): QuizGroup[] =>
    unit.groups.flatMap(group => {
      const paper = paperByCode.get(group.paperCode);
      if (!paper) return [];
      const questions = group.questionIds
        .map(id => questionsById.get(id))
        .filter((question): question is HsscQuizQuestion => Boolean(question));
      return questions.length ? [{ paper, questions }] : [];
    });

  const startupPrefix = classCode + '-CH';
  const launch = (title: string, code: string, questions: HsscQuizQuestion[]) => {
    if (!questions.length) return;
    setQuiz({ title, code, questions });
  };

  const launchUnit = (unit: HsscUnitView, group?: QuizGroup) => {
    const questions = group
      ? group.questions
      : groupsFor(unit).flatMap(item => item.questions);
    const title = group
      ? `${unit.name} — ${group.paper.title}`
      : `${unit.name} — chapter practice`;
    const code = group
      ? `${startupPrefix}-${unit.unitNumber}-${group.paper.session.replace(/\s+/g, '')}-${group.paper.paper}-${questions.length}`
      : `${startupPrefix}-${unit.unitNumber}-ALL-${questions.length}`;
    launch(title, code, questions);
  };

  const launchPaper = (paper: HsscPaperView) =>
    launch(`${paper.title} — MCQs`, `${paper.code}-MCQS-${paper.questions.length}`, paper.questions);

  const paperQuestions = data.papers.filter(paper => paper.questions.length > 0);
  const unitCount = data.units.length;

  const masthead = (() => {
    if (category === 'past_papers') {
      const years = data.papers.filter(paper => paper.year !== null && paper.paper === 'I');
      const mcqs = years.reduce((total, paper) => total + paper.questions.length, 0);
      return {
        stamp: `${boardName} · ${classLabel} · ${subjectTitle}`,
        title: 'Past-paper MCQs',
        lede:
          'Annual Paper I MCQ sections, year by year, with the board key resolved and option feedback for every distractor. Sit a year as a quiz or open the original paper beside it.',
        meta: [
          { key: 'Years', value: String(years.length) },
          { key: 'MCQs', value: String(mcqs) },
          ...(years.length
            ? [{ key: 'Span', value: `${years[years.length - 1].year}–${years[0].year}` }]
            : []),
        ]
      };
    }
    if (category === 'full_book') {
      return {
        stamp: `${boardName} · ${classLabel} · ${subjectTitle}`,
        title: 'Full papers & quizzes',
        lede:
          'Sit a complete model or annual paper. Paper I is multiple choice; Paper II is the written script and opens in the paper reader.',
        meta: [
          { key: 'Papers', value: String(data.papers.length) },
          { key: 'MCQs', value: String(paperQuestions.reduce((total, paper) => total + paper.questions.length, 0)) },
        ]
      };
    }
    if (category === 'cognitive') {
      return {
        stamp: `${boardName} · ${classLabel} · ${subjectTitle}`,
        title: 'Practice by cognitive level',
        lede:
          'The syllabus labels every learning outcome by the thinking it asks for. Choose a level and practice every board MCQ that assesses it.',
        meta: [
          { key: 'Units', value: String(unitCount) },
          { key: 'MCQs', value: String(data.totalQuestions) },
        ]
      };
    }
    return {
      stamp: `${boardName} · ${classLabel} · ${subjectTitle}`,
      title: 'Chapter-wise MCQs',
      lede:
        'The whole board MCQ bank filed under the syllabus units it examines. Open a chapter for its question ledger, or start a quick chapter quiz without signing in.',
      meta: [
        { key: 'Units', value: String(unitCount) },
        { key: 'MCQs', value: String(data.totalQuestions) },
        { key: 'Papers', value: String(paperQuestions.length) },
      ]
    };
  })();

  const directoryNotes: Partial<Record<McqCategory, string>> = {
    chapter_wise: `${unitCount} units · ${data.totalQuestions} MCQs`,
    past_papers: `${data.papers.filter(paper => paper.year !== null && paper.paper === 'I').length} annual Paper I sets`,
    full_book: `${data.papers.length} model and annual papers`,
    cognitive: 'Recall · Understanding · Application · Evaluation',
  };

  const cognitiveQuestions = data.papers.flatMap(paper => paper.questions);
  const cognitiveCounts = COGNITIVE_TIERS.map(tier => ({
    ...tier,
    count: cognitiveQuestions.filter(question => tierOf(question.difficulty) === tier.key).length,
  }));

  const annualPapers = data.papers
    .filter(paper => paper.year !== null && paper.paper === 'I')
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  const unitEntries: UnitEntry[] = data.units.map(unit => {
    const groups = groupsFor(unit);
    const total = groups.reduce((sum, group) => sum + group.questions.length, 0);
    const model = groups
      .filter(group => group.paper.year === null)
      .reduce((sum, group) => sum + group.questions.length, 0);
    return {
      id: `unit-${unit.unitNumber}`,
      number: unit.unitNumber,
      title: unit.name,
      topics: unit.topics.join(' · '),
      total,
      breakdown: [
        { label: 'model', value: model, tone: 'model' },
        { label: 'past-paper', value: total - model, tone: 'past' },
      ],
      action: { label: `Open unit ${unit.unitNumber}`, href: unit.href, icon: 'arrow' },
      secondary: total ? { label: 'Quick quiz', onClick: () => launchUnit(unit), icon: 'play' } : undefined,
      emptyAction: { label: 'Learning outcomes', href: `${baseUrl}/syllabus#unit-${unit.unitNumber}`, icon: 'book' },
    };
  });

  const paperEntry = (paper: HsscPaperView): PaperEntry => ({
    id: paper.code,
    badge: `${paper.year === null ? 'Model' : paper.year} · Paper ${paper.paper}`,
    meta: paper.questions.length ? `${paper.questions.length} MCQs` : 'Written',
    title: paper.title,
    description: paper.questions.length
      ? 'Multiple-choice section with the board key and option-by-option feedback.'
      : 'Written script. Opens in the paper reader.',
    tone: paper.year === null ? 'model' : 'past',
    actions: [
      ...(paper.questions.length ? [{ label: 'Take quiz', icon: 'play' as const, onClick: () => launchPaper(paper) }] : []),
      { label: 'Open paper', icon: 'paper' as const, href: paper.href },
    ],
  });

  const modelPapers = data.papers.filter(paper => paper.year === null);
  const allAnnualPapers = data.papers
    .filter(paper => paper.year !== null)
    .sort((a, b) => (b.year || 0) - (a.year || 0) || a.code.localeCompare(b.code));

  if (chapterUnit) {
    const entries = groupsFor(chapterUnit).flatMap(group => group.questions.map(question => ({ question, paper: group.paper })));
    const visible = entries.filter(({ question }) => {
      const region = question.sourceRegion as Record<string, any>;
      if (search.trim()) {
        const text = [question.questionText, ...Object.values((region.choices || {}) as Record<string, string>), region.explanation || ''].join(' ');
        if (!smartMatch(text, search)) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'diagram') return Boolean(question.diagramBased || region.diagramUrl);
      return LEVEL_FILTER[tierOf(question.difficulty)] === filter;
    });
    const items: PracticeItem[] = visible.map(({ question, paper }) => {
      const region = question.sourceRegion as Record<string, any>;
      const correct = String(region.correct_answer || '');
      const tier = COGNITIVE_TIERS.find(item => item.key === tierOf(question.difficulty));
      return {
        key: question.id,
        stem: question.questionText,
        options: (region.choices || {}) as Record<string, string>,
        correct,
        solution: region.explanation || (correct ? `Answer key: ${correct}.` : 'A reviewed answer key is not available for this question.'),
        optionFeedback: region.option_feedback,
        diagram: typeof region.diagramUrl === 'string' ? region.diagramUrl : null,
        meta: (
          <>
            <QuestionSource
              question={{ questionNumber: question.questionNumber }}
              source={paper.year === null ? 'model' : 'annual'}
              board={boardCode}
              grade={classLevel}
              subject={subjectTitle}
              sources={[{ label: paper.year === null ? `Model · Paper ${paper.paper}` : `${paper.year} · Paper ${paper.paper}`, qNum: question.questionNumber, code: paper.code }]}
              hideSlo
              inline
            />
            <Link
              scroll={false}
              href={`${baseUrl}/syllabus#unit-${chapterUnit.unitNumber}`}
              style={{ background: '#ecfdf5', color: '#066e4f', border: '1px solid #a7f3d0', padding: '2px 9px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none' }}
            >
              Syllabus: Unit {chapterUnit.unitNumber}
            </Link>
            {tier && (
              <span style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 600 }}>
                Cognitive Level: {question.difficulty || tier.code} ({tier.label})
              </span>
            )}
          </>
        ),
      };
    });
    const quizQuestions = visible.map(entry => entry.question);
    const title = `Unit ${chapterUnit.unitNumber}: ${chapterUnit.name} • Chapter-Wise MCQs (Model + Annual Papers)`;
    return (
      <>
        <McqPracticeSheet
          title={title}
          items={items}
          onBack={() => router.push(baseUrl + '/mcqs/chapter-wise')}
          boardName={boardFullName}
          certificate={`HIGHER SECONDARY SCHOOL CERTIFICATE · ${className}`}
          paperLine={`${subjectTitle} · Paper I (Multiple Choice Questions)`}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          onTakeQuiz={() =>
            launch(title, `${startupPrefix}-${chapterUnit.unitNumber}-${FILTER_TAG[filter]}-${quizQuestions.length}`, quizQuestions)
          }
        />
        <TakeQuizModal
          isOpen={Boolean(quiz)}
          onClose={() => setQuiz(null)}
          paperTitle={quiz?.title || ''}
          paperCode={quiz?.code || classCode + '-PRACTICE'}
          questions={quiz?.questions || []}
        />
      </>
    );
  }

  return (
    <HubShell>
      <HubMasthead
        board={boardName}
        classLabel={classLabel}
        title={category ? masthead.title : `${subjectTitle} MCQs`}
        lede={
          category
            ? masthead.lede
            : 'Choose how you want to practise: by syllabus unit, by board paper, as a full timed test, or by the thinking a question asks for.'
        }
        stats={category ? masthead.meta.map(item => ({ label: item.key, value: item.value })) : []}
        back={{ href: baseUrl, label: `Back to ${subjectTitle} subject hub` }}
        primary={
          category && cognitiveQuestions.length
            ? {
                label: `Practice all questions (${cognitiveQuestions.length})`,
                onClick: () =>
                  launch(
                    `${subjectTitle} — complete question bank`,
                    `${classCode}-ALL-${cognitiveQuestions.length}`,
                    cognitiveQuestions
                  ),
              }
            : undefined
        }
      />

      <HubRail baseUrl={baseUrl} active={category} />

      {!category && <HubDirectory baseUrl={baseUrl} notes={directoryNotes} />}

      {category === 'chapter_wise' && (
        <HubSection title="Syllabus units" note={`${unitCount} units · ${data.totalQuestions} MCQs`}>
          {unitEntries.length ? (
            <UnitBrowser units={unitEntries} />
          ) : (
            <HubEmpty
              title="No syllabus units found"
              body={`The Class ${classCode} ${subjectTitle} syllabus has not been published yet.`}
            />
          )}
        </HubSection>
      )}

      {category === 'past_papers' && (
        <HubSection title="Annual Paper I" note="Newest first">
          {annualPapers.length ? (
            <PaperGrid papers={annualPapers.map(paperEntry)} />
          ) : (
            <HubEmpty
              title="No annual papers archived yet"
              body="Annual Paper I MCQs for this class have not been added. The model paper and chapter practice are available now."
              action={{ label: 'Chapter-wise MCQs', href: baseUrl + '/mcqs/chapter-wise', icon: 'arrow' }}
            />
          )}
        </HubSection>
      )}

      {category === 'full_book' && (
        <>
          <HubSection title="Model papers" note={`${modelPapers.length} papers`}>
            <PaperGrid papers={modelPapers.map(paperEntry)} />
          </HubSection>
          {allAnnualPapers.length > 0 && (
            <HubSection title="Annual papers" note={`${allAnnualPapers.length} papers`}>
              <PaperGrid papers={allAnnualPapers.map(paperEntry)} />
            </HubSection>
          )}
        </>
      )}

      {category === 'cognitive' && (
        <HubSection title="Cognitive levels" note={`${cognitiveQuestions.length} MCQs`}>
          <TierGrid
            tiers={cognitiveCounts.map(
              (tier): TierEntry => ({
                id: tier.key,
                code: tier.code,
                label: tier.label,
                title: `${tier.label} drill`,
                note: tier.note,
                count: tier.count,
                tone: tier.key,
                action: {
                  label: `Practice ${tier.label.toLowerCase()}`,
                  icon: 'play',
                  onClick: () => {
                    const questions = cognitiveQuestions.filter(question => tierOf(question.difficulty) === tier.key);
                    launch(
                      `${tier.label} — ${subjectTitle} MCQs`,
                      `${classCode}-COG-${tier.key.toUpperCase()}-${questions.length}`,
                      questions
                    );
                  },
                },
              })
            )}
          />
        </HubSection>
      )}

      <TakeQuizModal
        isOpen={Boolean(quiz)}
        onClose={() => setQuiz(null)}
        paperTitle={quiz?.title || ''}
        paperCode={quiz?.code || classCode + '-PRACTICE'}
        questions={quiz?.questions || []}
      />
    </HubShell>
  );
}
