import Link from 'next/link';
import { questionSyllabus } from '@/lib/questionSyllabus';

export default function QuestionSource({ question, source, board, grade, subject }: { question: Record<string, any>; source: 'model' | 'annual' | 'mapped'; board: string; grade: number; subject: string }) {
  const meta = question.sourceRegion || question;
  const mapping = questionSyllabus(meta, question.slos, grade, subject, board, true);
  const year = question.examYear || 2025;
  const code = question.paperCode || (source === 'annual' ? `PHY-${grade===9?'IX':'X'}-${year}-P1` : source === 'model' ? `PHY-${grade===9?'IX':'X'}-P1` : question.sourcePaperId);
  const label = question.sourceTitle ? `${question.sourceYear && !question.sourceTitle.includes(String(question.sourceYear)) ? question.sourceYear+' · ' : ''}${question.sourceTitle}` : (source === 'annual' ? `${year} · Annual · Paper 1` : source === 'model' ? 'Model paper · Paper 1' : 'Past paper');
  const qDisplayNum = question.rawQuestionNumber || question.originalQuestionNumber || question.questionNumber;
  const isOut = mapping.status === 'outside' || Boolean(meta.out_of_syllabus);

  return (
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'.45rem .85rem',fontSize:'.8rem',lineHeight:1.6,color:'var(--text-light)',marginBottom:'.8rem'}}>
      {code ? <Link href={'/past-papers/'+encodeURIComponent(code)} style={{fontWeight:700}}>{label} · Q{qDisplayNum}</Link> : <span>{label}</span>}
      {mapping.status === 'mapped' ? (
        <Link
          href={mapping.href!}
          title={mapping.description}
          style={{
            background: '#ecfdf5',
            color: '#0b5e4a',
            border: '1px solid #a7f3d0',
            padding: '2px 8px',
            borderRadius: '5px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          2025 Syllabus: SLO {mapping.code} · {mapping.topic} — {mapping.description}
        </Link>
      ) : isOut ? (
        <span
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '2px 8px',
            borderRadius: '5px',
            fontWeight: 800,
          }}
        >
          Out of 2025 Syllabus
        </span>
      ) : (
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>
          2025 Syllabus: Mapping pending
        </span>
      )}
    </div>
  );
}
