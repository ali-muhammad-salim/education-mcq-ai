import TakeQuizPageClient from './TakeQuizPageClient';
import { physicsUnit16Resource } from '@/lib/physicsUnit16Resource';
export const dynamic = 'force-dynamic';
export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = id.toUpperCase();
  const unit16 = code === physicsUnit16Resource.quizCode || code.startsWith('PRACTICE-' + physicsUnit16Resource.quizCode + '-');
  return <TakeQuizPageClient
    paperTitle={unit16 ? 'Unit 16 · D.C. Circuits Practice' : 'Assessment'}
    paperCode={id}
    questions={[]}
    returnHref={unit16 ? physicsUnit16Resource.href : undefined}
  />;
}
