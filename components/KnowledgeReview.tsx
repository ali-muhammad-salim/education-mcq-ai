'use client';
import { useEffect, useState } from 'react';
import { pageExtraction } from '@/services/ingestion/trust';
import type { z } from 'zod';
import styles from './KnowledgeReview.module.css';
import SourceEditionReview from './SourceEditionReview';
type Extraction = z.infer<typeof pageExtraction>;
type Outcome = { id: string; code: string | null; description: string };
type BrowserDraft = {id:string;createdAt:string;details:{baseContentHash:string;note:string;extraction:Extraction}};
type Artifact = { id: string; documentId: string; contentHash: string; pageNumber: number; sourceImageKey: string; status: string; data: { extraction: unknown; conflicts?: string[]; crops?: { region: number; storageKey: string }[]; checksComplete?: boolean; extractionModel?: string; verificationModel?: string }; document: { storageKey: string; createdAt: string; resourceType: string; status: string; subject: { name: string; academicClass: { name: string; programme: { board: { shortCode: string } } } } } };
export default function KnowledgeReview() {
  const [structured,setStructured]=useState(''),[structuredError,setStructuredError]=useState('');
  const [browserDraft,setBrowserDraft]=useState<BrowserDraft|null>(null);
  const [items, setItems] = useState<Artifact[]>([]), [selected, setSelected] = useState<Artifact | null>(null), [draft, setDraft] = useState<Extraction | null>(null), [note, setNote] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [cursor, setCursor] = useState<string | null>(null), [filter, setFilter] = useState('PENDING_REVIEW'), [outcomes, setOutcomes] = useState<Outcome[]>([]);
  async function load(after = '', status = filter) {
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/admin/knowledge?status=' + encodeURIComponent(status) + (after ? '&cursor=' + encodeURIComponent(after) : '')); const body = await response.json(); if (!response.ok) throw Error(body.error?.message || 'Unable to load reviews.'); setItems(body.artifacts); setCursor(body.nextCursor); setSelected(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load reviews.'); } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setBrowserDraft(null);
    void fetch('/api/admin/knowledge?artifactId='+encodeURIComponent(selected.id),{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error?.message||'Unable to load the saved page draft.');setBrowserDraft(body.draft);}).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Unable to load the saved page draft.');});
    setOutcomes([]);
    void fetch('/api/admin/knowledge?documentId=' + encodeURIComponent(selected.documentId), { signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error?.message || 'Unable to load learning outcomes.'); setOutcomes(body.outcomes); }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Unable to load learning outcomes.'); });
    return () => controller.abort();
  }, [selected]);
  function open(item: Artifact) {
    const parsed = pageExtraction.safeParse(item.data.extraction);
    if (!parsed.success) { setMessage('This extraction is incomplete. Wait for processing or reprocess its source.'); return; }
    setSelected(item); setDraft(parsed.data); setStructured(JSON.stringify(parsed.data.learning,null,2));setStructuredError('');setNote(''); setMessage('');
  }
  function editRegion(index: number, change: Partial<Extraction['regions'][number]>) {
    setDraft(value => {
      if (!value) return value;
      const old = value.regions[index];
      return { ...value, text: change.text && value.text.includes(old.text) ? value.text.replace(old.text, change.text) : value.text, regions: value.regions.map((r, i) => i === index ? { ...r, ...change } : r) };
    });
  }
  async function saveBrowserDraft(){
    if(!selected||!draft)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,contentHash:selected.contentHash,note,extraction:draft})});
      const body=await response.json();if(!response.ok)throw Error(body.error?.message||'Unable to save this page draft.');
      setBrowserDraft(body.draft);setMessage('Page draft saved in the database. It is awaiting review and has not been published.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to save this page draft.');}finally{setBusy(false);}
  }
  function restoreBrowserDraft(){
    if(!browserDraft||!selected)return;
    if(browserDraft.details.baseContentHash!==selected.contentHash){setMessage('This draft belongs to an older source revision. Compare it with the current source before continuing.');return;}
    const parsed=pageExtraction.safeParse(browserDraft.details.extraction);
    if(!parsed.success){setMessage('The saved draft is incomplete and could not be restored.');return;}
    setDraft(parsed.data);setStructured(JSON.stringify(parsed.data.learning,null,2));setStructuredError('');setNote(browserDraft.details.note);setMessage('Saved draft restored for review.');
  }
  async function review(status: 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW') {
    if (!selected || !draft) return;
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/admin/knowledge', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, contentHash: selected.contentHash, status, note, extraction: draft }) }); const body = await response.json(); if (!response.ok) throw Error(body.error?.message || 'Review failed.'); setItems(items.filter(i => i.id !== selected.id)); setSelected(null); setMessage(status === 'APPROVED' ? 'Source approved and available for retrieval.' : status === 'PENDING_REVIEW' ? 'Source reopened for review and removed from retrieval.' : 'Source rejected. It remains unavailable to students.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed.'); } finally { setBusy(false); }
  }
  return <section className={styles.root}>
    <div className={styles.heading}><div><p>ADMINISTRATION</p><h1>Source review</h1><p>Check original evidence, scientific notation and curriculum mapping before approving AI extraction.</p></div><button onClick={() => void load()} disabled={busy}>Refresh</button></div>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {!selected ? <><label>Review status<select value={filter} onChange={e => { setFilter(e.target.value); void load('', e.target.value); }} disabled={busy}><option value="PENDING_REVIEW">Pending review</option><option value="APPROVED">Approved sources</option><option value="REJECTED">Rejected sources</option></select></label><div className={styles.list}>{items.map(item => <button className={styles.item} key={item.id} onClick={() => open(item)}><strong>{item.document.subject.academicClass.programme.board.shortCode} · {item.document.subject.academicClass.name} · {item.document.subject.name}</strong><span>{item.document.storageKey.split('/').at(-1)?.slice(37)} · Added {new Date(item.document.createdAt).toLocaleString()}</span><span>{item.document.resourceType.replaceAll('_', ' ')} · Page {item.pageNumber}</span><span>{item.data.conflicts?.length || 0} flagged checks · {item.document.status === 'NEEDS_REVIEW' ? 'Ready for review' : 'Processing incomplete'}</span></button>)}</div>{!items.length && !busy && <p>No sources with this review status.</p>}{cursor && <button disabled={busy} onClick={() => void load(cursor)}>Next reviews</button>}</> : draft && <>
      <button className={styles.back} onClick={() => setSelected(null)}>← Back to reviews</button><h2>Page {selected.pageNumber} · {selected.document.subject.name}</h2>
      <p>Extractor: {selected.data.extractionModel || 'Unknown'} · Verifier: {selected.data.verificationModel || 'Unavailable'}</p>
      {selected.document.resourceType==='syllabus'&&<SourceEditionReview key={selected.documentId} documentId={selected.documentId}/>}
      <div className={styles.actions}><button type="button" disabled={busy||Boolean(structuredError)||note.trim().length<10||selected.status!=='PENDING_REVIEW'} onClick={()=>void saveBrowserDraft()}>Save page draft</button>{browserDraft&&<button type="button" disabled={busy} onClick={restoreBrowserDraft}>Restore saved draft</button>}</div><p>A saved draft keeps this page’s progress in the database. Add the Gemini conversation link, model and any unresolved details to the review notes. Approval is a separate action.</p>
      <div className={styles.columns}><div><a href={'/api/assets/' + selected.sourceImageKey} target="_blank" rel="noreferrer">Open original page at full size ↗</a>
        <img className={styles.source} src={'/api/assets/' + selected.sourceImageKey} alt={'Original source page ' + selected.pageNumber}/>
        <div className={styles.crops}>{selected.data.crops?.map(crop => <a key={crop.region} href={'/api/assets/' + crop.storageKey} target="_blank" rel="noreferrer">Original crop · Region {crop.region + 1} ↗</a>)}</div>
      </div><div><h3>Checks requiring attention</h3>{selected.data.conflicts?.length ? <ul>{selected.data.conflicts.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p>Automated checks found no conflicts. Educator approval is still required.</p>}
        <label>Full page transcription<textarea className={styles.editor} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} spellCheck={false}/></label>
        <p>Check the full transcription after correcting an individual region. Original crop boundaries stay unchanged.</p>
        <details className={styles.region}><summary>Structured outcomes, questions & marking notes</summary><p>These records must match the original transcription exactly. Keep generated explanations out of official source text.</p><label>Source records (JSON)<textarea className={styles.editor} value={structured} spellCheck={false} onChange={e=>{setStructured(e.target.value);try{const learning=pageExtraction.shape.learning.parse(JSON.parse(e.target.value));setDraft({...draft,learning});setStructuredError('');}catch{setStructuredError('Invalid source records. Correct the JSON before approving.');}}}/></label>{structuredError&&<p role="alert">{structuredError}</p>}</details>
        {draft.regions.map((region, index) => <RegionEditor key={index} index={index} region={region} outcomes={outcomes} onChange={change => editRegion(index, change)}/>)}
        <label>Review notes<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Explain what you checked and how you resolved any conflicts." maxLength={4000}/></label>
        <p>For uploads marked “Publish after review”, approving every page makes the original PDF and digital text public in its subject. Approval confirms you checked the original source and replaces older approved transcriptions of the same source page and syllabus. Atom balance alone does not prove a chemical reaction is scientifically correct.</p>
        <div className={styles.actions}><button disabled={busy || Boolean(structuredError) || !selected.data.checksComplete || selected.document.status !== 'NEEDS_REVIEW' || note.trim().length < 10 || selected.status !== 'PENDING_REVIEW'} onClick={() => void review('APPROVED')}>Approve source</button><button disabled={busy || !selected.data.checksComplete || note.trim().length < 10 || selected.status === 'REJECTED'} onClick={() => void review('REJECTED')}>Reject source</button>{selected.status !== 'PENDING_REVIEW' && <button disabled={busy || note.trim().length < 10} onClick={() => void review('PENDING_REVIEW')}>Reopen review</button>}</div>
      </div></div>
    </>}
  </section>;
}
function RegionEditor({ index, region, outcomes, onChange }: { index: number; region: Extraction['regions'][number]; outcomes: Outcome[]; onChange: (change: Partial<Extraction['regions'][number]>) => void }) {
  const [expanded, setExpanded] = useState(false), [search, setSearch] = useState('');
  const picked = outcomes.filter(o => region.sloIds.includes(o.id));
  const matching = [...picked, ...outcomes.filter(o => !region.sloIds.includes(o.id) && (o.code + ' ' + o.description).toLowerCase().includes(search.toLowerCase())).slice(0, 40 - picked.length)];
  return <details className={styles.region} onToggle={e => setExpanded(e.currentTarget.open)}><summary>Region {index + 1} · {region.kind.replaceAll('_', ' ').toLowerCase()}{region.questionNumber ? ' · Question ' + region.questionNumber : ''}</summary>{expanded && <>
    <label>Transcription<textarea value={region.text} onChange={e => onChange({ text: e.target.value })}/></label>
    <label>Figure labels (one per line)<textarea value={region.labels.join('\n')} onChange={e => onChange({ labels: e.target.value.split('\n') })}/></label>
    <label>Connections, arrows and bonds (one per line)<textarea value={region.relationships.join('\n')} onChange={e => onChange({ relationships: e.target.value.split('\n') })}/></label>
    <label>Find learning outcomes<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or description"/></label>
    <fieldset><legend>Curriculum mapping</legend>{matching.map(outcome => <label className={styles.mapping} key={outcome.id}><input type="checkbox" checked={region.sloIds.includes(outcome.id)} onChange={e => onChange({ sloIds: e.target.checked ? [...new Set([...region.sloIds, outcome.id])].slice(0, 10) : region.sloIds.filter(id => id !== outcome.id) })}/><span>{outcome.code ? outcome.code + ' · ' : ''}{outcome.description}</span></label>)}{!matching.length && <p>No matching outcomes. Leave unmapped if the evidence is insufficient.</p>}</fieldset>
    <label>Remaining uncertainty<textarea value={region.uncertainty} onChange={e => onChange({ uncertainty: e.target.value })}/></label>
  </>}</details>;
}
