import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentViews from '@/components/DocumentViews';
import key from '@/data/physics/ssc1_2025_official_key.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import emarking from '@/data/physics/ssc1_2025_emarking.json';
import emarking2024 from '@/data/physics/ssc1_2024_emarking.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
import emarkingX2025 from '@/data/physics/ssc2_2025_emarking.json';
import rg9 from '@/data/physics/ssc1_resource_guide.json';
import rg10 from '@/data/physics/ssc2_resource_guide.json';
import pacing9 from '@/data/physics/ssc1_pacing.json';
import pacing10 from '@/data/physics/ssc2_pacing.json';
import styles from '@/components/MaterialLayout.module.css';
import { annualAnswerReviews, annual2024AnswerReviews, annualX2025AnswerReviews } from '@/lib/legacyPaperEvidence';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import StructuredContent from '@/components/StructuredContent';
export const dynamic='force-dynamic';

const SUPPORTED_RESOURCES = [
  'physics-ix-2025-key',
  'physics-ix-2024-key',
  'physics-ix-2025-emarking',
  'physics-ix-2024-emarking',
  'physics-x-2025-key',
  'physics-x-2025-emarking',
  'physics-ix-resource-guide',
  'physics-x-resource-guide',
  'physics-ix-pacing-guide',
  'physics-x-pacing-guide',
] as const;

export default async function Page({params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;
  if (!SUPPORTED_RESOURCES.includes(resource as any)) notFound();

  if (resource === 'physics-ix-2025-key') {
    const title = 'Physics IX · 2025 · Official answer key';
    const decisions = await publishedAnswerDecisions();
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/physics/pastpapers">← Physics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={key.sourceUrl}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official exam-year references · current syllabus mappings are separate</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {key.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-IX-2025-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        {row.answer}
                        {decisions.find(item=>item.number===row.questionNumber&&item.status==='APPROVE_CORRECTION')&&(
                          <p>Admin-approved correction: {decisions.find(item=>item.number===row.questionNumber)?.answer}. The answer sheet remains {row.answer}.</p>
                        )}
                        {annualAnswerReviews[row.questionNumber] && (
                          <details><summary>Answer review</summary>{annualAnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href="/past-papers/PHY-IX-2025-P1?view=solved">Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
        <nav className={styles.actions}>
          <Link className={styles.button} href="/past-papers/PHY-IX-2025-P1">Paper 1</Link>
          <Link className={styles.button} href="/past-papers/PHY-IX-2025-P2">Paper 2</Link>
        </nav>
      </section>
    );
  }

  if (resource === 'physics-ix-2024-key') {
    const title = 'Physics IX · 2024 · Official answer key';
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/physics/pastpapers">← Physics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={key2024.sourceUrl}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official 2024 exam-year references · current 2025 syllabus mappings are separate</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {key2024.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-IX-2024-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        <strong>{row.answer}</strong>
                        {annual2024AnswerReviews[row.questionNumber] && (
                          <details><summary>Source key note</summary>{annual2024AnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href="/past-papers/PHY-IX-2024-P1?view=solved">2024 Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
        <nav className={styles.actions}>
          <Link className={styles.button} href="/past-papers/PHY-IX-2024-P1">2024 Paper 1</Link>
          <Link className={styles.button} href="/past-papers/PHY-IX-2024-P2">2024 Paper 2</Link>
          <Link className={styles.button} href="/resources/physics-ix-2024-emarking">2024 E-marking notes</Link>
        </nav>
      </section>
    );
  }

  if (resource === 'physics-x-2025-key') {
    const title = 'Physics X · 2025 · Official answer key';
    return (
      <section className={styles.page}>
        <Link href="/akueb/X/physics/pastpapers">← Physics X past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={keyX2025.sourceUrl}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official 2025 SSC-II exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyX2025.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-X-2025-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        <strong>{row.answer}</strong>
                        {annualX2025AnswerReviews[row.questionNumber] && (
                          <details><summary>Educator review note</summary>{annualX2025AnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href="/past-papers/PHY-X-2025-P1?view=solved">2025 Class X Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
        <nav className={styles.actions}>
          <Link className={styles.button} href="/past-papers/PHY-X-2025-P1">2025 Paper 1</Link>
          <Link className={styles.button} href="/past-papers/PHY-X-2025-P2">2025 Paper 2</Link>
          <Link className={styles.button} href="/resources/physics-x-2025-emarking">2025 E-marking notes</Link>
        </nav>
      </section>
    );
  }

  if (resource === 'physics-ix-2025-emarking' || resource === 'physics-ix-2024-emarking' || resource === 'physics-x-2025-emarking') {
    const isX = resource === 'physics-x-2025-emarking';
    const is2024 = resource === 'physics-ix-2024-emarking';
    const activeEmarking: any = isX ? emarkingX2025 : is2024 ? emarking2024 : emarking;
    const yearStr = is2024 ? '2024' : '2025';
    const roman = isX ? 'X' : 'IX';
    const title = `Physics ${roman} · ${yearStr} · E-Marking Notes (Questions & Solved Better Responses)`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${roman}/physics/pastpapers`}>← Physics {roman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeEmarking.sourceUrl}>
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #111827',
              borderRadius: '6px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              color: '#111827',
              overflow: 'hidden',
            }}
          >
            {/* Official E-Marking Digital Cover Header */}
            <div
              style={{
                padding: '2.25rem 2rem 1.5rem',
                borderBottom: '2px solid #111827',
                textAlign: 'center',
                background: '#ffffff',
                fontFamily: "'Times New Roman', Times, serif, system-ui",
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px', color: '#4b5563', marginBottom: '0.25rem' }}>
                AGA KHAN UNIVERSITY EXAMINATION BOARD
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginBottom: '0.3rem' }}>
                Notes from E-Marking Centre on SSC-{isX ? 'II' : 'I'} Physics Annual Examinations {yearStr}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#066e4f' }}>
                Digital Edition: Questions, Marking Schemes & Solved Better Responses (2025 Syllabus Aligned)
              </div>
            </div>

            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {activeEmarking.questions.map((q: any) => {
                const isOut = Boolean(q.outOfSyllabus) || !q.currentSlo;
                return (
                  <article
                    key={q.questionNumber}
                    style={{
                      padding: '1.5rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      background: '#ffffff',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Top Question Metadata & Current 2025 Syllabus Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        paddingBottom: '0.85rem',
                        marginBottom: '1rem',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                          }}
                        >
                          {q.questionNumber}
                        </span>
                        <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                          {q.section}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!isOut && q.currentSlo ? (
                          <Link
                            href={`/akueb/${roman}/physics/syllabus#slo-${q.currentSlo}`}
                            style={{
                              background: '#ecfdf5',
                              color: '#066e4f',
                              border: '1px solid #a7f3d0',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              textDecoration: 'none',
                            }}
                          >
                            2025 Syllabus: SLO {q.currentSlo}{q.currentTopic ? ` • ${q.currentTopic}` : ''} ↗
                          </Link>
                        ) : (
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                            }}
                          >
                            Out of 2025 Syllabus
                          </span>
                        )}
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {q.maxMarks} Marks • Level {q.cognitiveLevel}
                        </span>
                      </div>
                    </div>

                    {/* 2025 Syllabus Outcome Description (or Out of Syllabus explanation) */}
                    {!isOut && q.currentSloDescription && (
                      <div
                        style={{
                          marginBottom: '1rem',
                          padding: '0.55rem 0.9rem',
                          background: '#f8fafc',
                          borderLeft: '3px solid #066e4f',
                          borderRadius: '4px',
                          fontSize: '0.84rem',
                          color: '#334155',
                        }}
                      >
                        <strong>2025 Syllabus Outcome ({q.currentSlo}):</strong> {q.currentSloDescription}
                      </div>
                    )}

                    {/* Question Stem */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '0.35rem' }}>
                        Question Text
                      </div>
                      <div style={{ fontSize: '1.05rem', lineHeight: 1.65, color: '#111827', fontFamily: "'Times New Roman', Times, serif, system-ui" }}>
                        <StructuredContent text={q.questionText} />
                      </div>
                    </div>

                    {/* 300-DPI Cropped Question Diagram */}
                    {q.diagramUrl && (
                      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                        <img
                          src={q.diagramUrl}
                          alt={`Diagram for ${q.questionNumber}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            objectFit: 'contain',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: 8,
                            padding: 8,
                            background: '#ffffff',
                          }}
                        />
                      </div>
                    )}

                    {/* Checking Hints (Marking Scheme) */}
                    {Array.isArray(q.checkingHints) && q.checkingHints.length > 0 && (
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.9rem 1.15rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                          Checking Hints (Marking Scheme • {q.maxMarks} Marks)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
                          {q.checkingHints.map((h: string, i: number) => (
                            <li key={i}>
                              <StructuredContent text={h} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Better Response (Typeset in Clean Digital Text with LaTeX Equations — No Handwriting) */}
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        borderRadius: '10px',
                        padding: '1.15rem 1.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span
                          style={{
                            background: '#066e4f',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                          }}
                        >
                          ✓ BETTER RESPONSE (SOLVED MODEL ANSWER)
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                          Full Marks ({q.maxMarks}/{q.maxMarks})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.96rem', lineHeight: 1.7, color: '#14532d' }}>
                        <StructuredContent text={q.modelAnswer || q.betterResponses} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </DocumentViews>
        <nav className={styles.actions}>
          <Link className={styles.button} href={`/past-papers/PHY-${roman}-${yearStr}-P1`}>{yearStr} Paper 1</Link>
          <Link className={styles.button} href={`/past-papers/PHY-${roman}-${yearStr}-P2`}>{yearStr} Paper 2</Link>
          <Link className={styles.button} href={`/resources/physics-${roman.toLowerCase()}-${yearStr}-key`}>{yearStr} Official answer key</Link>
        </nav>
      </section>
    );
  }

  if (resource === 'physics-ix-resource-guide' || resource === 'physics-x-resource-guide') {
    const isIX = resource === 'physics-ix-resource-guide';
    const guide = isIX ? rg9 : rg10;
    const roman = isIX ? 'IX' : 'X';
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${roman}/physics`}>← Physics {roman}</Link>
        <h1>{guide.title}</h1>
        <DocumentViews title={guide.title} original={guide.sourceUrl}>
          <div className={styles.digital}>
            <p><strong>Recommended Key Textbook:</strong> {guide.recommendedKeyTextbook}</p>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {['Unit','Topic Title','Reference Books & Chapters','Websites & Simulations'].map(h => (
                      <th key={h} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.units.map((u) => (
                    <tr key={u.topicNumber} style={{borderBottom:'1px solid var(--border-color)'}}>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{u.topicNumber}</strong></td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{u.topicTitle}</strong></td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}>
                        <ul style={{margin:0,paddingLeft:'1.1rem'}}>
                          {u.references.map((r, i) => <li key={i}>{r.book} — <em>{r.topic}</em></li>)}
                        </ul>
                      </td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}>
                        <ul style={{margin:0,paddingLeft:'1.1rem'}}>
                          {u.websites.map((w, i) => <li key={i}><a href={w} target="_blank" rel="noreferrer">{w}</a></li>)}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{marginTop:'1rem',fontSize:'.9rem'}}>{guide.note}</p>
          </div>
        </DocumentViews>
      </section>
    );
  }

  const isPacingIX = resource === 'physics-ix-pacing-guide';
  const pacing = isPacingIX ? pacing9 : pacing10;
  const roman = isPacingIX ? 'IX' : 'X';
  const pacingTitle = `Physics ${roman} · 2025 · 28-Week Instructional Pacing Guide`;
  const pacingOriginal = isPacingIX
    ? '/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf'
    : '/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf';

  return (
    <section className={styles.page}>
      <Link href={`/akueb/${roman}/physics`}>← Physics {roman}</Link>
      <h1>{pacingTitle}</h1>
      <DocumentViews title={pacingTitle} original={pacingOriginal}>
        <div className={styles.digital}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Weeks','Unit & Topic','Periods','SLOs Covered','Suggested Activities & Resources'].map(h => (
                    <th key={h} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pacing.map((row) => (
                  <tr key={row.unitNumber} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{row.week}</strong></td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.topic}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.periods}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.slos.join(', ')}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>
                      <p style={{margin:'0 0 .35rem 0'}}>{row.activities}</p>
                      <small><strong>Resources:</strong> {row.resources}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocumentViews>
    </section>
  );
}
