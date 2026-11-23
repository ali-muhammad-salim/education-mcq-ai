import Link from 'next/link';
import DocumentViews from './DocumentViews';
import StructuredContent from './StructuredContent';
import StudyResourceQuiz from './StudyResourceQuiz';
import styles from './MaterialLayout.module.css';
import { biologyStudyResourceQuiz, type hsscBiologyStudyResources } from '@/lib/hsscBiologyStudyResources';
import { hsscBiologyOptionFeedback } from '@/lib/hsscBiologyOptionFeedback';

type Resource = (typeof hsscBiologyStudyResources)[number];
const baseUrl = '/akueb/XI/biology';

export default function BiologyStudyResource({ resource, original }: { resource: Resource; original: boolean }) {
  const references = new Map<string, typeof resource.references>();
  for (const reference of resource.references) {
    const group = references.get(reference.href) ?? [];
    group.push(reference);
    references.set(reference.href, group);
  }

  const questionMeta = (question: { slo: string; page: number; year?: number }) => (
    <div className={styles.actions}>
      {question.slo && <Link href={`${baseUrl}/syllabus#slo-${question.slo}`} className={styles.sloLink}>SLO {question.slo}</Link>}
      <span className={styles.muted}>{question.year ? `${question.year} paper excerpt` : 'Practice based on the notes'}</span>
      <a href={`${resource.pdf}#page=${question.page}`}>PDF page {question.page}</a>
    </div>
  );

  return (
    <main className={styles.page}>
      <p><Link href={baseUrl}>Class XI Biology</Link></p>
      <h1>{resource.title}</h1>
      <p>{resource.topics}</p>
      {'author' in resource && <p className={styles.muted}>Slides by {resource.author}</p>}
      <div className={styles.actions}>
        <Link className={styles.button} href={`${baseUrl}/mcqs/chapter-wise/${resource.unit}?quiz=1`}>Start quiz</Link>
        <Link className={styles.button} href={`${baseUrl}/mcqs/chapter-wise/${resource.unit}`}>Chapter-wise MCQs</Link>
        <Link className={styles.button} href={`${baseUrl}/crqs/${resource.unit}`}>Chapter-wise CRQs</Link>
        {resource.written.some(question => question.extended) && (
          <Link className={styles.button} href={`${baseUrl}/erqs/${resource.unit}`}>Chapter-wise ERQs</Link>
        )}
        <a className={styles.button} href={resource.pdf} download>Download PDF ({resource.pages} pages)</a>
      </div>
      <DocumentViews original={resource.pdf} title={resource.title} continuousPdf
        digitalLabel="Questions and answers" initialView={original ? 'original' : 'digital'}>
        <StudyResourceQuiz title={resource.title} code={`BIO-XI-STUDY-${resource.slug.toUpperCase()}`} questions={biologyStudyResourceQuiz(resource)} />
        <h2>Multiple-choice questions</h2>
        {resource.mcqs.map((question, index) => (
          <article className={styles.question} id={`question-${question.id}`} key={question.id}>
            <h3>Q{index + 1}</h3>
            {questionMeta(question)}
            <StructuredContent text={question.stem} />
            <div className={styles.options}>
              {question.options.map((option, i) => (
                <div className={styles.option} key={i}><strong>{'ABCD'[i]}.</strong><StructuredContent text={option} /></div>
              ))}
            </div>
            <details>
              <summary>{question.answers.length ? 'Show answer' : 'Review this question'}</summary>
              {question.answers.length > 0 && <p><strong>{question.answers.join(' or ')}</strong></p>}
              <StructuredContent text={question.explanation} />
              <ul>
                {hsscBiologyOptionFeedback('study', question.id)?.map(({ key, reason }) => (
                  <li key={key}><strong>{key}.</strong> {reason}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
        <h2>Written questions</h2>
        {resource.written.map((question, index) => (
          <article className={styles.question} id={`question-${question.id}`} key={question.id}>
            <h3>Q{resource.mcqs.length + index + 1} · {question.extended ? 'ERQ' : 'CRQ'}</h3>
            {questionMeta(question)}
            <StructuredContent text={question.stem} />
            <details>
              <summary>Show worked answer</summary>
              <StructuredContent text={question.answer} />
            </details>
          </article>
        ))}
        {references.size > 0 && (
          <section>
            <h2>Questions already in the paper archive</h2>
            <ul>
              {[...references].map(([href, entries]) => (
                <li key={href}>
                  <Link href={href}>{[...new Set(entries.map(entry => entry.label))].join(' / ')}</Link>
                  {[...new Set(entries.map(entry => entry.page))].map(page => (
                    <span key={page}> · <a href={`${resource.pdf}#page=${page}`}>PDF page {page}</a></span>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}
      </DocumentViews>
    </main>
  );
}
