'use client';
import { useEffect, useState } from 'react';
import styles from '@/app/account/account.module.css';

export default function EmailCodeSignIn({ onSuccess }: { onSuccess: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(action: 'send' | 'verify') {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const response = await fetch('/api/auth/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, identifier: email, ...(action === 'verify' ? { otp: code } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to sign in. Please try again.');
      if (action === 'verify') { onSuccess(data.user); return; }
      setSent(true); setCode(''); setCooldown(60);
      setMessage('Check your inbox and spam folder. Your code expires in 10 minutes.');
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); void submit(sent ? 'verify' : 'send'); }}>
    <p>Sign in with a single-use email code. New email addresses create a student account.</p>
    {message && <p className={failed ? styles.error : styles.notice} role={failed ? 'alert' : 'status'}>{message}</p>}
    <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} readOnly={sent} onChange={event => setEmail(event.target.value)} /></label>
    {sent && <label>Six-digit code<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></label>}
    <button className={styles.primary} disabled={busy}>{busy ? 'Please wait…' : sent ? 'Verify & sign in' : 'Send sign-in code'}</button>
    {sent && <div className={styles.actions}><button className={styles.secondary} type="button" disabled={busy || cooldown > 0} onClick={() => void submit('send')}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button><button className={styles.secondary} type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setMessage(''); }}>Use another email</button></div>}
  </form>;
}
