'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import McqPracticeSheet, { type PracticeFilter } from '@/components/McqPracticeSheet';
import { physicsIxWorkshop as workshop, physicsIxWorkshopQuestions } from '@/lib/physicsIxWorkshop';
import { uniqueQuestions } from '@/lib/uniqueQuestions';

const questions = uniqueQuestions(physicsIxWorkshopQuestions);

export default function WorkshopPractice() {
  const router = useRouter();
  const [filter, setFilter] = useState<PracticeFilter>('all');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const items = questions.filter(question =>
    (filter === 'all' || (filter === 'diagram' ? question.diagramBased : question.cognitiveLevel === filter)) &&
    (!query || `Q${question.questionNumber} ${question.stem} ${Object.values(question.options).join(' ')}`.toLowerCase().includes(query)),
  ).map(question => {
    const meta = question.sourceRegion;
    return {
      key: question.id,
      anchor: 'question-' + question.questionNumber,
      stem: question.stem,
      diagram: question.diagramUrl,
      options: question.options,
      correct: question.correctOption,
      solution: meta.explanation ?? '',
      optionFeedback: meta.option_feedback,
      meta: <span>
        <Link href={workshop.pdf + '#page=' + meta.pageNumber}>Worksheet Q{question.questionNumber}</Link>
        {question.current_slo
          ? <> · <Link href={workshop.subjectHref + '/syllabus#slo-' + question.current_slo}>SLO {question.current_slo}</Link></>
          : <> · Supplementary topic</>}
      </span>,
    };
  });

  return <McqPracticeSheet
    title={workshop.title}
    items={items}
    onBack={() => router.push(workshop.resourcesHref)}
    backLabel="Other resources"
    boardName="AKU-EB syllabus practice"
    certificate="Class IX"
    paperLine="Physics workshop"
    filter={filter}
    onFilter={setFilter}
    search={search}
    onSearch={setSearch}
    onTakeQuiz={() => router.push('/quizzes/' + workshop.quizCode + '/take')}
  />;
}
