import TakeQuizPageClient from './TakeQuizPageClient';
export const dynamic = 'force-dynamic';
export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TakeQuizPageClient paperTitle="Assessment" paperCode={id} questions={[]} />;
}
