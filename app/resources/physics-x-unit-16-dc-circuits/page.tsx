import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContinuousDocument from '@/components/ContinuousDocument';
import styles from '@/components/MaterialLayout.module.css';
import { physicsUnit16Resource as resource } from '@/lib/physicsUnit16Resource';
import { physicsUnit16ChapterQuestions } from '@/lib/physicsUnit16Questions';

const classPath = '/akueb/X/physics';
const filters = [
  { id: 'notes', label: 'Notes', href: resource.href },
  { id: 'mcqs', label: 'MCQs', href: resource.href + '?view=mcqs' },
  { id: 'original', label: 'Original PDF', href: resource.href + '?view=original' },
] as const;

// Page 13 contains both sections. The break falls in the whitespace above the MCQS heading.
const splitPage = 13;
const splitInset = 487 / 792;

export default async function Unit16ResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  const active = filters.find(filter => filter.id === view) ?? filters[0];
  const section = active.id === 'notes'
    ? { lastPage: splitPage, lastPageInset: 1 - splitInset }
    : active.id === 'mcqs' ? { firstPage: splitPage, firstPageInset: splitInset } : {};

  return (
    <main className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Class 10 Physics', href: classPath },
        { label: 'Chapter-wise notes', href: classPath + '/chapter-notes#unit-16' },
        { label: 'D.C. Circuits', active: true },
      ]} />
      <h1>{resource.title}</h1>
      <nav className={styles.actions} aria-label="D.C. Circuits content">
        {filters.map(filter => (
          <Link
            key={filter.id}
            className={styles.button}
            href={filter.href}
            aria-current={filter.id === active.id ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <div className={styles.actions}>
        <Link className={styles.button} href={'/quizzes/' + resource.quizCode + '/take'}>
          Start {physicsUnit16ChapterQuestions.length}-question practice quiz
        </Link>
        <Link className={styles.button} href={classPath + '/numericals/' + resource.unit}>
          View worked numericals
        </Link>
        <a className={styles.button} href={resource.pdf} target="_blank" rel="noreferrer">Open full PDF</a>
      </div>
      {active.id !== 'original' && (
        <details>
          <summary>Corrections for practice</summary>
          {active.id === 'notes' ? (
            <p>On page 2, the current is the same through each series resistor. On page 3, the voltage is the same across each parallel branch.</p>
          ) : (
            <ul>
              <li>Q16 has a total resistance of 4 Ω. The original choices omit it.</li>
              <li>Q22 in the quiz specifies the battery symbol convention used in these notes.</li>
              <li>Q30 uses zero resistance for an ideal ammeter. A practical ammeter has very low resistance.</li>
            </ul>
          )}
        </details>
      )}
      <ContinuousDocument key={active.id} url={resource.pdf} title={resource.title + ' · ' + active.label} {...section} />
    </main>
  );
}
