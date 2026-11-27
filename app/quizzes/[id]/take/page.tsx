import TakeQuizPageClient from './TakeQuizPageClient';
import { physicsUnit16Resource } from '@/lib/physicsUnit16Resource';
import { physicsIxWorkshop } from '@/lib/physicsIxWorkshop';
import { getFallbackPaper } from '@/lib/paperDataService';
import { hsscBiologyModelPapers } from '@/lib/hsscBiologyModelPapers';
export const dynamic = 'force-dynamic';
export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = id.toUpperCase().replace(/^PRACTICE-(.+?)(?:-(?:NOTES-)?[0-9A-F]{16})?$/, '$1');
  const unit16 = code === physicsUnit16Resource.quizCode;
  const workshop = code === physicsIxWorkshop.quizCode;
  const chapter = /^(PHY|CS|CHM|MTH)-(IX|X)-UNIT-\d{1,2}-(ALL|PAST)-(ALL|R|U|A|DIAGRAM)$/.exec(code);
  const chapterSubject = chapter && { PHY: 'physics', CS: 'computer-science', CHM: 'chemistry', MTH: 'mathematics' }[chapter[1]];
  const biologyModel = /^BIO-(XI|XII)-MODEL-(\d{4})-P1$/.exec(code);
  const biologyPaper = biologyModel && hsscBiologyModelPapers('akueb', biologyModel[1] === 'XI' ? 11 : 12, 'biology')
    .find(paper => paper.part === 1 && String(paper.year) === biologyModel[2]);
  const sourcePaper = getFallbackPaper(code.replace(/-(?:SET-[0-9-]+|MCQS-\d+)$/, ''));
  const returnHref = unit16 ? physicsUnit16Resource.href
    : workshop ? physicsIxWorkshop.href
    : chapter && chapterSubject ? `/akueb/${chapter[2]}/${chapterSubject}/mcqs/chapter-wise`
    : biologyPaper ? biologyPaper.href
    : sourcePaper ? '/past-papers/' + encodeURIComponent(sourcePaper.paperCode)
    : undefined;
  return <TakeQuizPageClient
    paperTitle={unit16 ? 'Unit 16 · D.C. Circuits Practice' : workshop ? physicsIxWorkshop.title : 'Assessment'}
    paperCode={id}
    questions={[]}
    returnHref={returnHref}
  />;
}
