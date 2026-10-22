import { notFound } from 'next/navigation';
import SubjectMcqsPage from '@/components/SubjectMcqsPage';
import { mcqCategories } from '@/lib/mcqCategories';
export const dynamic='force-dynamic';

export default async function Page({ params }: { params: Promise<{ board: string; class: string; subject: string; category: string }> }) {
  const values = await params;
  const category = mcqCategories.find(item => item.id === values.category);
  if (!category) notFound();
  return <SubjectMcqsPage params={Promise.resolve(values)} category={category.key} />;
}
