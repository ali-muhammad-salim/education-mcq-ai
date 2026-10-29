import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentViews from '@/components/DocumentViews';
import key from '@/data/physics/ssc1_2025_official_key.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import emarking from '@/data/physics/ssc1_2025_emarking.json';
import emarking2024 from '@/data/physics/ssc1_2024_emarking.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
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

  if (resource === 'physics-x-2025-emarking') {
    const title = 'Physics X · 2025 · E-marking notes';
    return <section className={styles.page}>
      <Link href="/akueb/X/physics/pastpapers">← Physics X past papers</Link>
      <h1>{title}</h1>
      <DocumentViews title={title} original="/materials/ssc/physics/ssc-2/physics-x-2025-emarking.pdf">
        <div className={styles.digital}>
          <p>The original board E-marking document is available in the Original tab. A generated digital solution in the supplied material has conflicting calculations, so the digital commentary is withheld pending educator review.</p>
          <Link href="/past-papers/PHY-X-2025-P2">Open Paper 2 questions →</Link>
        </div>
      </DocumentViews>
    </section>;
  }

  if (resource === 'physics-ix-2025-emarking' || resource === 'physics-ix-2024-emarking') {
    const is2024 = resource === 'physics-ix-2024-emarking';
    const activeEmarking: any = is2024 ? emarking2024 : emarking;
    const yearStr = is2024 ? '2024' : '2025';
    const roman = 'IX';
    const title = `Physics ${roman} · ${yearStr} · E-marking notes`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${roman}/physics/pastpapers`}>← Physics {roman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeEmarking.sourceUrl}>
          <div className={styles.digital} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:10}}>
              <h2 style={{marginTop:0}}>Introduction & General Observations</h2>
              <p>{activeEmarking.introduction}</p>
              <p><strong>General Observations:</strong> {activeEmarking.generalObservations}</p>
            </div>
            {activeEmarking.questions.map((q: any) => (
              <article key={q.questionNumber} style={{padding:'1.25rem',border:'1px solid var(--border-color)',borderRadius:10}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem',marginBottom:'.6rem'}}>
                  <strong>{q.questionNumber} · {q.section}</strong>
                  <span>
                    Original {yearStr} SLO: <code>{q.originalSlo}</code>
                    {q.currentSlo ? <> · <Link href={`/akueb/${roman}/physics/syllabus#slo-${q.currentSlo}`}>Current 2025 SLO {q.currentSlo}{q.currentTopic ? ` (${q.currentTopic})` : ''}</Link></> : ' · Historical 2022–2024 syllabus'}
                    {' · '}{q.maxMarks} Marks · Level {q.cognitiveLevel}
                  </span>
                </div>
                <div style={{marginBottom:'.65rem'}}>
                  <strong>Question:</strong>
                  <div style={{marginTop:'.25rem'}}><StructuredContent text={q.questionText} /></div>
                </div>
                {q.diagramUrl && (
                  <div style={{textAlign:'center',margin:'.75rem 0'}}>
                    <img src={q.diagramUrl} alt={`Diagram for ${q.questionNumber}`} style={{maxWidth:'100%',maxHeight:260,objectFit:'contain',border:'1px solid var(--border-color)',borderRadius:8,padding:6,background:'#fff'}} />
                  </div>
                )}
                <p><strong>Original {yearStr} SLO Text:</strong> {q.sloText}</p>
                {q.currentSloDescription && (
                  <p><strong>Mapped 2025 Syllabus Outcome ({q.currentSlo}):</strong> {q.currentSloDescription}</p>
                )}
                <div>
                  <strong>Checking Hints (Marking Scheme):</strong>
                  <ul>{q.checkingHints.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
                </div>
                <p><strong>Overall Performance:</strong> {q.overallPerformance}</p>
                <p><strong>Better Responses:</strong> {q.betterResponses}</p>
                {q.betterResponseImage && (
                  <div style={{margin:'.65rem 0'}}>
                    <div style={{fontSize:'.82rem',fontWeight:700,marginBottom:'.25rem'}}>Image of Better Candidate Response:</div>
                    <img src={q.betterResponseImage} alt={`Better response for ${q.questionNumber}`} style={{maxWidth:'100%',border:'1px solid var(--border-color)',borderRadius:8,background:'#fff',padding:4}} />
                  </div>
                )}
                <p><strong>Weaker Responses:</strong> {q.weakerResponses}</p>
                {q.weakerResponseImage && (
                  <div style={{margin:'.65rem 0'}}>
                    <div style={{fontSize:'.82rem',fontWeight:700,marginBottom:'.25rem'}}>Image of Weaker Candidate Response:</div>
                    <img src={q.weakerResponseImage} alt={`Weaker response for ${q.questionNumber}`} style={{maxWidth:'100%',border:'1px solid var(--border-color)',borderRadius:8,background:'#fff',padding:4}} />
                  </div>
                )}
                <div>
                  <strong>Suggestions for Improvement:</strong>
                  <ul>{q.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              </article>
            ))}
            <div style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:10}}>
              <h2 style={{marginTop:0}}>Annexure A: Pedagogies Used for Teaching the SLOs</h2>
              <ul>
                {activeEmarking.pedagogies.map((p: any) => (
                  <li key={p.name}><strong>{p.name}:</strong> {p.description}</li>
                ))}
              </ul>
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
