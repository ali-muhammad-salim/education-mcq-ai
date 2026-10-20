'use client';
import { useEffect, useState } from 'react';

const box = { padding: '1rem', border: '1px solid var(--border-color, #dce5e1)', borderRadius: '12px', background: 'var(--card-bg, white)', color: 'var(--text-color, #263e35)' };
const field = { padding: '0.55rem', border: '1px solid var(--border-color, #dce5e1)', borderRadius: '8px', background: 'var(--card-bg, white)', color: 'inherit', maxWidth: '100%' };
async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Unable to save.');
  return data;
}
export function QuestionMarker({ quizId, answerId, maximum, score, feedback }: { quizId: string; answerId?: string; maximum: number; score: number | null; feedback?: string }) {
  const [marks, setMarks] = useState(score == null ? '' : String(score)), [comment, setComment] = useState(feedback || ''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  if (!answerId) return null;
  return <form className="assessment-management" style={box} onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { await send('/api/quizzes/' + quizId + '/grade', 'POST', { quizAnswerId: answerId, awardedMarks: Number(marks), feedback: comment }); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save grade.'); } finally { setBusy(false); } }}>
    <strong>Teacher marking</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.7rem', alignItems: 'end' }}><label>Marks (out of {maximum})<br /><input aria-label="Awarded marks" style={field} type="number" min={0} max={maximum} step="any" required value={marks} onChange={e => setMarks(e.target.value)} /></label><label style={{ flex: '1 1 240px' }}>Feedback<br /><textarea aria-label="Teacher feedback" style={{ ...field, width: '100%' }} value={comment} maxLength={20000} onChange={e => setComment(e.target.value)} /></label><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save grade'}</button></div><p role="status">{message}</p>
  </form>;
}
export function AssessmentActions({ quizId, classrooms, onSaved }: { quizId: string; classrooms: { id: string; name: string }[]; onSaved: () => void }) {
  const [classId, setClassId] = useState(''), [deadline, setDeadline] = useState(''), [releaseAt, setReleaseAt] = useState(''), [keys, setKeys] = useState(false), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function act(release: boolean) {
    setBusy(true); setMessage('');
    try { await send(release ? '/api/quizzes/' + quizId + '/release' : '/api/classrooms/' + classId, release ? 'POST' : 'PATCH', release ? { releaseAt: releaseAt ? new Date(releaseAt).toISOString() : undefined, showCorrectAnswers: keys } : { action: 'ASSIGN', quizId, deadline: deadline ? new Date(deadline).toISOString() : null }); setMessage(release ? 'Release policy saved.' : 'Assessment assigned.'); onSaved(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); } finally { setBusy(false); }
  }
  return <details className="assessment-management" style={box}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Assignments & result release</summary><div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.8rem' }}>
    <label>Assign to classroom <select style={field} value={classId} onChange={e => setClassId(e.target.value)}><option value="">Select classroom</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Assignment deadline (optional) <input style={field} type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></label><button className="btn" disabled={busy || !classId} onClick={() => void act(false)}>Assign assessment</button>
    <hr /><label>Release date (leave empty to release now) <input style={field} type="datetime-local" value={releaseAt} onChange={e => setReleaseAt(e.target.value)} /></label><label><input type="checkbox" checked={keys} onChange={e => setKeys(e.target.checked)} /> Include correct answers</label><button className="btn" disabled={busy} onClick={() => void act(true)}>Save result release</button><p role="status">{message}</p>
  </div></details>;
}
type Roster = { status: string; memberships: { status: string; student: { id: string; name: string; email: string } }[]; quizzes: { quizId: string; deadline: string | null; quiz: { title: string } }[] };
export function ClassroomRoster({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [roster, setRoster] = useState<Roster | null>(null), [message, setMessage] = useState(''), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) return; let alive = true; void fetch('/api/classrooms/' + id).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error?.message || 'Unable to load roster.'); if (alive) setRoster(data.classroom); }).catch(error => { if (alive) setMessage(error.message); }); return () => { alive = false; }; }, [id, open, busy]);
  async function update(body: unknown) { setBusy(true); setMessage(''); try { await send('/api/classrooms/' + id, 'PATCH', body); onSaved(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); } finally { setBusy(false); } }
  return <details className="assessment-management" style={box} onToggle={e => setOpen(e.currentTarget.open)}><summary style={{ cursor: 'pointer' }}>Manage roster & assignments</summary>{roster && <div><p>Classroom: {roster.status}</p><button disabled={busy} onClick={() => void update({ action: 'STATUS', status: roster.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}>{roster.status === 'ACTIVE' ? 'Archive classroom' : 'Activate classroom'}</button><ul>{roster.memberships.map(m => <li key={m.student.id}>{m.student.name} — {m.student.email} ({m.status}) <button disabled={busy} onClick={() => void update({ action: 'MEMBERSHIP', studentId: m.student.id, status: m.status === 'ENROLLED' ? 'REMOVED' : 'ENROLLED' })}>{m.status === 'ENROLLED' ? 'Remove enrollment' : 'Restore enrollment'}</button></li>)}</ul>{!roster.memberships.length && <p>No students enrolled.</p>}<h4>Assignments</h4><ul>{roster.quizzes.map(a => <li key={a.quizId}>{a.quiz.title} {a.deadline && '— ' + new Date(a.deadline).toLocaleString()} <button disabled={busy} onClick={() => void update({ action: 'UNASSIGN', quizId: a.quizId })}>Unassign</button></li>)}</ul></div>}<p role="status">{message}</p></details>;
}
