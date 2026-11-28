import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import MaterialList from '@/components/MaterialList';
import styles from '@/components/MaterialLayout.module.css';
import { physicsIxWorkshop as workshop } from '@/lib/physicsIxWorkshop';
import { mathematicsXResources, mathematicsXSubjectHref } from '@/lib/mathematicsSupplementary';

export default async function Page({ params }: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const scope = await params;
  const path = '/' + [scope.board, scope.class, scope.subject].join('/');
  const maths = path === mathematicsXSubjectHref;
  if (!maths && path !== workshop.subjectHref) notFound();
  const items = maths ? mathematicsXResources.map(resource => ({ label: resource.title, href: resource.href }))
    : [{ label: workshop.title, href: workshop.href }];

  return <section className={styles.page}>
    <Breadcrumbs items={[
      { label: 'AKU-EB', href: '/akueb' },
      { label: maths ? 'Class X' : 'Class IX', href: maths ? '/akueb/X' : '/akueb/IX' },
      { label: maths ? 'Mathematics' : 'Physics', href: path },
      { label: 'Other resources', active: true },
    ]} />
    <h1>Other resources</h1>
    <MaterialList items={items} />
  </section>;
}
