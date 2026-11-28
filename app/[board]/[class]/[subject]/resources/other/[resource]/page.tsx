import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContinuousDocument from '@/components/ContinuousDocument';
import StructuredContent from '@/components/StructuredContent';
import styles from '@/components/MaterialLayout.module.css';
import navigation from '@/components/ResourceNavigation.module.css';
import { mathematicsXResources, mathematicsSupplementaryPapers, mathematicsXResourcesHref, mathematicsXSubjectHref } from '@/lib/mathematicsSupplementary';

export default async function Page({ params, searchParams }: {
  params: Promise<{ board: string; class: string; subject: string; resource: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [scope, { view }] = await Promise.all([params, searchParams]);
  if ('/' + [scope.board, scope.class, scope.subject].join('/') !== mathematicsXSubjectHref) notFound();
  const resource = mathematicsXResources.find(item => item.slug === scope.resource);
  if (!resource) notFound();
  const paper = mathematicsSupplementaryPapers.find(item => item.paperCode === resource.paperCode);
  if (!paper) notFound();

  const pdf = view === 'original' ? resource.original : view === 'answers' ? resource.answers : undefined;
  return (
    <section className={styles.page}>
      <Breadcrumbs items={[
        { label: 'AKU-EB', href: '/akueb' },
        { label: 'Class X', href: '/akueb/X' },
        { label: 'Mathematics', href: mathematicsXSubjectHref },
        { label: 'Other resources', href: mathematicsXResourcesHref },
        { label: resource.title, active: true },
      ]} />
      <h1>{resource.title}</h1>
      <nav className={navigation.topics} aria-label="Resource view">
        <Link className={styles.button} href={resource.href} aria-current={!pdf ? 'page' : undefined}>Reviewed questions</Link>
        {resource.original && <Link className={styles.button} href={resource.href + '?view=original'} aria-current={view === 'original' ? 'page' : undefined}>Original PDF</Link>}
        {resource.answers && <Link className={styles.button} href={resource.href + '?view=answers'} aria-current={view === 'answers' ? 'page' : undefined}>Answers PDF</Link>}
      </nav>
      <nav className={navigation.links} aria-label="Chapter practice">
        <Link href={mathematicsXSubjectHref + '/mcqs/chapter-wise'}>Chapter-wise MCQs</Link>
        <Link href={mathematicsXSubjectHref + '/crqs'}>Chapter-wise CRQs</Link>
        <Link href={mathematicsXSubjectHref + '/numericals'}>Chapter-wise numericals</Link>
        {pdf && <a className={navigation.pdf} href={pdf} target="_blank" rel="noreferrer">Open PDF</a>}
      </nav>
      <p>{resource.note}</p>
      {pdf ? <ContinuousDocument key={pdf} url={pdf} title={resource.title} /> : (
        <div className="chapter-theory-sheet">
          {paper.questions.map(question => {
            const meta = question.sourceRegion;
            const grade = meta.mapping_scope?.grade === 9 ? 'IX' : 'X';
            const unit = meta.current_slo?.split('.')[0];
            const multipleChoice = question.questionType === 'MULTIPLE_CHOICE';
            return (
              <article key={question.id} id={'question-' + question.questionNumber} style={{
                border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem', marginBlock: '0.7rem', scrollMarginTop: '6rem',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '.35rem .8rem', marginBottom: '.5rem' }}>
                  <h2 style={{ fontSize: '1rem', margin: 0 }}>
                    {multipleChoice ? 'MCQ' : 'Written'} · Q{question.questionNumber.replace(/^II-/, '')}
                  </h2>
                  {unit && (
                    <Link href={'/akueb/' + grade + '/mathematics/' + (multipleChoice ? 'mcqs/chapter-wise/' : 'crqs/') + unit}>
                      Class {grade} · Unit {unit}
                    </Link>
                  )}
                </div>
                <StructuredContent text={question.questionText} />
                {meta.diagramUrl && (
                  <a className="question-figure-link" href={meta.diagramUrl} target="_blank" rel="noreferrer" aria-label="Open full-size question figure">
                    <img src={meta.diagramUrl} alt={'Figure for question ' + question.questionNumber} loading="lazy" />
                  </a>
                )}
                {meta.choices && <ol type="A" style={{ paddingInlineStart: '1.4rem', marginBlock: '.5rem' }}>
                  {Object.entries(meta.choices).map(([key, value]) => <li key={key}><StructuredContent text={value} /></li>)}
                </ol>}
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Show answer</summary>
                  {meta.correct_answer && <p><strong>Correct option {meta.correct_answer}</strong></p>}
                  <StructuredContent text={meta.explanation ?? ''} />
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
