import Link from 'next/link';
import { FileText } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContinuousDocument from '@/components/ContinuousDocument';
import styles from '@/components/MaterialLayout.module.css';
import { physicsUnit16Resource as resource } from '@/lib/physicsUnit16Resource';
import { physicsUnit16ChapterQuestions } from '@/lib/physicsUnit16Questions';
import navigation from '@/components/ResourceNavigation.module.css';

const classPath = '/akueb/X/physics';
const topics = [
  { id: 'notes', label: 'Notes', href: resource.href },
  { id: 'mcqs', label: 'MCQs', href: resource.href + '?view=mcqs' },
] as const;
const original = { id: 'original', label: 'Original PDF', href: resource.href + '?view=original' } as const;

// Page 13 contains both sections. The break falls in the whitespace above the MCQS heading.
const splitPage = 13;
const splitInset = 487 / 792;

export default async function Unit16ResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  const active = view === original.id ? original : topics.find(topic => topic.id === view) ?? topics[0];
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
      <nav className={navigation.topics} aria-label="D.C. Circuits content">
        {topics.map(topic => (
          <Link
            key={topic.id}
            className={`${styles.button} ${navigation.topic}`}
            href={topic.href}
            aria-current={topic.id === active.id ? 'page' : undefined}
          >
            {topic.label}
          </Link>
        ))}
      </nav>
      <nav className={navigation.links} aria-label="Chapter practice and original PDF">
        <Link href={'/quizzes/' + resource.quizCode + '/take'}>
          Start {physicsUnit16ChapterQuestions.length}-question practice quiz
        </Link>
        <Link href={classPath + '/numericals/' + resource.unit}>
          View worked numericals
        </Link>
        <Link className={`${styles.button} ${navigation.pdf}`} href={original.href} aria-current={active.id === original.id ? 'page' : undefined}>
          <FileText size={16} aria-hidden="true" />
          <span>Original PDF</span>
        </Link>
      </nav>
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
