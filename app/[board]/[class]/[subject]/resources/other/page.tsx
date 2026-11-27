import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import MaterialList from '@/components/MaterialList';
import styles from '@/components/MaterialLayout.module.css';
import { physicsIxWorkshop as workshop } from '@/lib/physicsIxWorkshop';

export default async function Page({ params }: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const scope = await params;
  if ('/' + [scope.board, scope.class, scope.subject].join('/') !== workshop.subjectHref) notFound();

  return <section className={styles.page}>
    <Breadcrumbs items={[
      { label: 'AKU-EB', href: '/akueb' },
      { label: 'Class IX', href: '/akueb/IX' },
      { label: 'Physics', href: workshop.subjectHref },
      { label: 'Other resources', active: true },
    ]} />
    <h1>Other resources</h1>
    <MaterialList items={[{ label: workshop.title, href: workshop.href }]} />
  </section>;
}
