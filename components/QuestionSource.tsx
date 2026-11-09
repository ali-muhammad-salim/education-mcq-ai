import Link from 'next/link';
import { questionSyllabus } from '@/lib/questionSyllabus';

type SourceEntry = { label: string; qNum: number | string; code?: string };

export default function QuestionSource({ question, source, board, grade, subject, sources, hideSlo, inline }: { question: Record<string, any>; source: 'model' | 'annual' | 'mapped'; board: string; grade: number; subject: string; sources?: SourceEntry[]; hideSlo?: boolean; inline?: boolean }) {
  const meta = question.sourceRegion || question;
  const mapping = questionSyllabus(meta, question.slos, grade, subject, board, true);
  const year = question.examYear || 2025;
  const code = question.paperCode || (source === 'annual' ? `PHY-${grade===9?'IX':'X'}-${year}-P1` : source === 'model' ? `PHY-${grade===9?'IX':'X'}-P1` : question.sourcePaperId);
  const label = question.sourceTitle ? `${question.sourceYear && !question.sourceTitle.includes(String(question.sourceYear)) ? question.sourceYear+' · ' : ''}${question.sourceTitle}` : (source === 'annual' ? `${year} · Annual · Paper 1` : source === 'model' ? 'Model paper · Paper 1' : 'Past paper');
  const qDisplayNum = question.rawQuestionNumber || question.originalQuestionNumber || question.questionNumber;
  const isOut = mapping.status === 'outside' || Boolean(meta.out_of_syllabus);
  const entries: SourceEntry[] = sources && sources.length ? sources : [{ label, qNum: qDisplayNum, code }];

  return (
    <div style={{display: inline ? 'inline-flex' : 'flex',flexWrap:'wrap',alignItems:'baseline',gap:'.15rem .45rem',fontSize:'.72rem',lineHeight:1.45,color:'var(--text-light)',marginBottom: inline ? 0 : '.45rem'}}>
      <span style={{fontWeight:600}}>
        {entries.map((entry, index) => (
          <span key={`${entry.label}-${entry.qNum}-${index}`}>
            {entry.code ? (
              <Link scroll={false} href={'/past-papers/'+encodeURIComponent(entry.code)+'#question-'+encodeURIComponent(String(entry.qNum))} style={{fontWeight:700}}>Q{entry.qNum} ({entry.label})</Link>
            ) : (
              <span>Q{entry.qNum} ({entry.label})</span>
            )}
            {index < entries.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>
      {!hideSlo && (mapping.status === 'mapped' ? (
        <Link scroll={false} href={mapping.href!} style={{ display:'inline-flex', alignItems:'center', color:'#0b5e4a', background:'#ecfdf5', border:'1px solid #a7f3d0', padding:'0 6px', borderRadius:'5px', fontWeight:700, fontSize:'.7rem' }}>
          SLO {mapping.code} ↗
        </Link>
      ) : isOut ? (
        <span
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '0 6px',
            borderRadius: '5px',
            fontWeight: 800,
            fontSize: '.7rem',
          }}
        >
          Out of 2025 Syllabus
        </span>
      ) : (
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: '5px', fontWeight: 600, fontSize: '.76rem' }}>
          SLO pending
        </span>
      ))}
    </div>
  );
}
