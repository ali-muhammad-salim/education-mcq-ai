import Link from 'next/link';
import { questionSyllabus } from '@/lib/questionSyllabus';

export default function QuestionSource({ question, source, board, grade, subject }: { question: Record<string, any>; source: 'model' | 'annual' | 'mapped'; board: string; grade: number; subject: string }) {
  const meta = question.sourceRegion || question;
  const mapping = questionSyllabus(meta, question.slos, grade, subject, board, true);
  const year = question.examYear || 2025;
  const code = question.paperCode || (source === 'annual' ? `PHY-${grade===9?'IX':'X'}-${year}-P1` : source === 'model' ? `PHY-${grade===9?'IX':'X'}-P1` : question.sourcePaperId);
  const label = question.sourceTitle ? `${question.sourceYear && !question.sourceTitle.includes(String(question.sourceYear)) ? question.sourceYear+' · ' : ''}${question.sourceTitle}` : (source === 'annual' ? `${year} · Annual · Paper 1` : source === 'model' ? 'Model paper · Paper 1' : 'Past paper');
  const qDisplayNum = question.rawQuestionNumber || question.originalQuestionNumber || question.questionNumber;
  return <div style={{display:'flex',flexWrap:'wrap',gap:'.4rem 1rem',fontSize:'.8rem',lineHeight:1.6,color:'var(--text-light)',marginBottom:'.8rem'}}>
    {code ? <Link href={'/past-papers/'+encodeURIComponent(code)}>{label} · Q{qDisplayNum}</Link> : <span>{label}</span>}
    {mapping.originalCode && <span>Original SLO: {mapping.originalCode}{meta.original_reference_verified === true ? '' : ' (unverified)'}</span>}
    {mapping.status==='mapped' ? <Link href={mapping.href} title={mapping.description}>Current 2025 SLO {mapping.code} · {mapping.topic} — {mapping.description}</Link> : <span>{mapping.status==='outside'?'Reviewed: outside current 2025 syllabus':'Current syllabus: awaiting verified mapping'}</span>}
    {meta.answer_review_note && <details style={{flexBasis:'100%',color:'var(--text-color)'}}><summary>Official answer requires review</summary>{meta.answer_review_note}</details>}
  </div>;
}
