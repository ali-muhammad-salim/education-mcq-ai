import SubjectTheoryPage from '@/components/SubjectTheoryPage';
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ board: string; class: string; subject: string }> }) {
  return <SubjectTheoryPage params={params} mode="crqs" />;
}
