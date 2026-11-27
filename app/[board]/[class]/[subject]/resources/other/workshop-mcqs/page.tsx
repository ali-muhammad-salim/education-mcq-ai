import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import DocumentViews from '@/components/DocumentViews';
import styles from '@/components/MaterialLayout.module.css';
import { physicsIxWorkshop as workshop } from '@/lib/physicsIxWorkshop';
import WorkshopPractice from './WorkshopPractice';

export default async function Page({ params, searchParams }: {
  params: Promise<{ board: string; class: string; subject: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const scope = await params;
  if ('/' + [scope.board, scope.class, scope.subject].join('/') !== workshop.subjectHref) notFound();
  const { view } = await searchParams;
  return <section className={styles.page}>
    <Breadcrumbs items={[
      { label: 'AKU-EB', href: '/akueb' },
      { label: 'Class IX', href: '/akueb/IX' },
      { label: 'Physics', href: workshop.subjectHref },
      { label: 'Other resources', href: workshop.resourcesHref },
      { label: workshop.title, active: true },
    ]} />
    <h1>{workshop.title}</h1>
    <DocumentViews
      title={workshop.title}
      original={workshop.pdf}
      initialView={view === 'original' ? 'original' : 'digital'}
      continuousPdf
      digitalLabel="Digital MCQs"
      resourceLinks={<Link href={workshop.subjectHref + '/mcqs/chapter-wise'}>Chapter-wise MCQs</Link>}
    >
      <WorkshopPractice />
    </DocumentViews>
  </section>;
}
