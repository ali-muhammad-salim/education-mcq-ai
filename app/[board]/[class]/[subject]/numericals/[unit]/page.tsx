import ChapterTheoryUnitPage from '@/components/ChapterTheoryUnitPage';
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ board: string; class: string; subject: string; unit: string }> }) {
  return <ChapterTheoryUnitPage params={params} mode="numericals" />;
}
