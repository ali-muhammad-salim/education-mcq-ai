'use client';
import { useEffect, useState } from 'react';
import AuthModal from '@/components/AuthModal';
import { clearExamCache } from '@/lib/exam-cache';
import Link from 'next/link';
import styles from './account.module.css';
export default function AccountPage() {
  const [profile,setProfile] = useState<{ user: { name:string;email:string;role:string;emailVerified:boolean };teacherRequest?:{action:string};activeSessions:number } | null>(null), [message,setMessage] = useState(''), [email,setEmail] = useState(''), [password,setPassword] = useState(''), [reason,setReason] = useState(''), [auth,setAuth] = useState(false), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [linkAction,setLinkAction] = useState(''), [failed,setFailed] = useState(false);
  const load = () => { void fetch('/api/account').then(async r => { const d=await r.json(); if(r.ok) { setProfile(d); setEmail(new URLSearchParams(window.location.search).get('email') || d.user.email); } }).catch(()=>{setFailed(true);setMessage('Unable to load your account. Please try again.');}).finally(()=>setLoading(false)); };
  useEffect(()=>{ const target=new URLSearchParams(window.location.search).get('email'); if(target)setEmail(target); setLinkAction(new URLSearchParams(window.location.search).get('action') || ''); load(); },[]);
  async function act(action:string) { setBusy(true);setMessage('');setFailed(false);try { const params=new URLSearchParams(window.location.search), recovery=['SEND_RESET','RESET','SEND_VERIFY','VERIFY'].includes(action); const response=await fetch(recovery?'/api/auth/recovery':'/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(recovery?{email, token:params.get('token')||undefined,password:password||undefined}:action==='TEACHER_REQUEST'?{reason}:{} )})}); const d=await response.json();if(!response.ok)throw new Error(d.error?.message||'Unable to complete request.');setMessage(d.message||'Saved.');if(action==='RESET'||action==='REVOKE_SESSIONS'){await clearExamCache();setProfile(null);}if(action==='VERIFY'||action==='RESET'){window.history.replaceState(null,'','/account');setLinkAction('');setPassword('');if(action==='VERIFY')load();}else load(); }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Unable to complete request.');}finally{setBusy(false);} }
  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.eyebrow}>RISE LEARNER · ACCOUNT</span><h1>Your learning, your account</h1><p>Manage your profile, account security and teaching access.</p></header>
    {message && <p className={failed ? styles.error : styles.notice} role={failed ? 'alert' : 'status'}>{message}</p>}
    {loading ? <p role="status">Loading your account…</p> : <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="profile-title"><h2 id="profile-title">Profile & access</h2>
        {profile ? <><div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{profile.user.name.slice(0,1).toUpperCase()}</span><div><h3>{profile.user.name}</h3><p className={styles.email}>{profile.user.email}</p></div></div>
        <dl className={styles.facts}><div><dt>Account role</dt><dd>{profile.user.role.toLowerCase()}</dd></div><div><dt>Email status</dt><dd>{profile.user.emailVerified?'Verified':'Awaiting verification'}</dd></div><div><dt>Active sessions</dt><dd>{profile.activeSessions}</dd></div></dl>
        {!profile.user.emailVerified && <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={()=>void act('SEND_VERIFY')}>Send verification email</button>{linkAction==='VERIFY' && <button className="btn" disabled={busy} onClick={()=>void act('VERIFY')}>Verify email address</button>}</div>}
        {profile.user.role==='ADMIN' && <Link className="btn" href="/admin/users">Manage students & teachers →</Link>}
        {profile.user.role==='TEACHER' && <Link className="btn" href="/dashboard/teacher">Open teacher dashboard →</Link>}
        {profile.user.role==='STUDENT' && <Link className="btn" href="/dashboard/student">View learning progress →</Link>}
        <div className={styles.security}><h3>Session security</h3><p>Sign out every device, including this one. You can sign in again whenever you need.</p><button className={styles.secondary} disabled={busy} onClick={()=>void act('REVOKE_SESSIONS')}>Sign out all devices</button></div></> : <><p>Sign in to view your profile and manage your learning account.</p><button className="btn" onClick={()=>setAuth(true)}>Sign in to your account</button></>}
      </section>
      <section className={styles.panel} aria-labelledby="security-title"><span className={styles.eyebrow}>SECURE ACCESS</span><h2 id="security-title">{linkAction==='RESET'?'Choose a new password':'Password recovery'}</h2><p>{linkAction==='RESET'?'This single-use link expires after 30 minutes. Resetting your password signs out all devices.':'We’ll send a secure reset link to your email. For a Google account, you can continue signing in with Google.'}</p>
      <form className={styles.form} onSubmit={e=>{e.preventDefault();void act(linkAction==='RESET'?'RESET':'SEND_RESET');}}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
      {linkAction==='RESET' && <label>New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} /><small>Use at least 12 characters.</small></label>}
      <button className="btn" disabled={busy}>{busy?'Please wait…':linkAction==='RESET'?'Save new password':'Send password reset link'}</button></form>
      {profile?.user.role==='STUDENT' && <div className={styles.security}><h3>Teach with Rise Learner</h3><p>{profile.teacherRequest?.action==='TEACHER_ACCESS_REQUESTED'?'Your teacher access request is awaiting review.':'Tell us about your teaching role. An administrator will review your request.'}</p><form className={styles.form} onSubmit={e=>{e.preventDefault();void act('TEACHER_REQUEST');}}><label>Teaching role and reason<textarea required minLength={10} maxLength={2000} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className={styles.secondary} disabled={busy||reason.trim().length<10}>Request teacher access</button></form></div>}
      </section></div>}
    <AuthModal isOpen={auth} onClose={()=>setAuth(false)} onSuccess={load}/>
  </main>;
}
