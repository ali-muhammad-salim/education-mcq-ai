import Link from 'next/link';
import { FileText } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContinuousDocument from '@/components/ContinuousDocument';
import styles from '@/components/MaterialLayout.module.css';
import { physicsUnit17Resource as resource } from '@/lib/physicsUnit17Resources';
import navigation from '@/components/ResourceNavigation.module.css';

export default async function Unit17ResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { topic } = await searchParams;
  const selected = resource.topics.find(item => item.id === topic) ?? resource.topics[0];

  return (
    <main className={styles.page}>
      <Breadcrumbs items={[
        { label: 'AKU-EB', href: '/akueb' },
        { label: 'Class X', href: '/akueb/X' },
        { label: 'Physics', href: resource.chapterHref },
        { label: 'Chapter-wise notes', href: resource.chapterHref + '/chapter-notes#unit-17' },
        { label: resource.title, active: true },
      ]} />
      <h1>Unit 17 · {resource.title}</h1>
      <nav className={navigation.topics} aria-label="Unit 17 topics">
        {resource.topics.map(item => (
          <Link
            key={item.id}
            className={`${styles.button} ${navigation.topic}`}
            href={resource.href + '?topic=' + item.id}
            aria-current={item.id === selected.id ? 'page' : undefined}
          >
            {item.id} {item.title}
          </Link>
        ))}
      </nav>
      <nav className={navigation.links} aria-label="Chapter practice and original PDF">
        <Link href={resource.mcqsHref}>Chapter-wise MCQs</Link>
        <Link href={resource.chapterHref + '/crqs/17'}>Chapter-wise CRQs</Link>
        <Link href={resource.chapterHref + '/numericals/17'}>Worked numericals</Link>
        <a className={`${styles.button} ${navigation.pdf}`} href={selected.pdf} target="_blank" rel="noreferrer">
          <FileText size={16} aria-hidden="true" />
          Original PDF
        </a>
      </nav>
      <ContinuousDocument key={selected.id} url={selected.pdf} title={selected.id + ' · ' + selected.title} />
    </main>
  );
}
