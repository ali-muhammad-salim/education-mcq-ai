'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { clearExamCache } from '@/lib/exam-cache';
import AuthModal from '@/components/AuthModal';
import styles from './account.module.css';

type AccountSession = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

type AccountData = {
  user: { id: string; name: string; email: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN'; emailVerified: boolean; createdAt: string };
  teacherRequest?: { action: string; createdAt: string } | null;
  activeSessions: number;
  sessions: AccountSession[];
};

type Tone = 'ok' | 'error';

function describeDevice(userAgent: string | null) {
  if (!userAgent) return 'Unknown device';
  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : 'Browser';
  const platform = /Windows/.test(userAgent) ? 'Windows'
    : /Android/.test(userAgent) ? 'Android'
    : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS'
    : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Linux/.test(userAgent) ? 'Linux'
    : '';
  return platform ? `${browser} on ${platform}` : browser;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('ok');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reason, setReason] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [linkAction, setLinkAction] = useState('');
  const [token, setToken] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/account');
      const json = await response.json().catch(() => null);
      if (response.status === 401) { setData(null); return; }
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to load your account.');
      setData(json);
      setName(json.user.name);
      setEmail(previous => previous || json.user.email);
    } catch {
      setTone('error');
      setMessage('Unable to load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLinkAction(params.get('action') || '');
    setToken(params.get('token') || '');
    const linkedEmail = params.get('email');
    if (linkedEmail) setEmail(linkedEmail);
    void load();
  }, [load]);

  function report(text: string, nextTone: Tone = 'ok') {
    setTone(nextTone);
    setMessage(text);
  }

  async function postAccount(body: Record<string, unknown>) {
    const response = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to complete request.');
    return json;
  }

  async function postRecovery(body: Record<string, unknown>) {
    const response = await fetch('/api/auth/recovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to complete request.');
    return json;
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try { await task(); }
    catch (error) { report(error instanceof Error ? error.message : 'Unable to complete request.', 'error'); }
    finally { setBusy(false); }
  }

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { report('Enter the name you want on your account.', 'error'); return; }
    void run(async () => {
      await postAccount({ action: 'PROFILE', name: trimmed });
      setData(previous => previous ? { ...previous, user: { ...previous.user, name: trimmed } } : previous);
      report('Profile name updated.');
    });
  };

  const changePassword = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) { report('New passwords do not match.', 'error'); return; }
    void run(async () => {
      await postAccount({ action: 'CHANGE_PASSWORD', currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      report('Password updated. Every other device was signed out.');
      await load();
    });
  };

  const revokeSession = (session: AccountSession) => {
    void run(async () => {
      const json = await postAccount({ action: 'REVOKE_SESSION', sessionId: session.id });
      if (json.current) {
        await clearExamCache();
        window.location.replace('/account');
        return;
      }
      report('That device has been signed out.');
      await load();
    });
  };

  const revokeAll = () => {
    void run(async () => {
      await postAccount({ action: 'REVOKE_SESSIONS' });
      await clearExamCache();
      setData(null);
      report('Signed out of every device.');
    });
  };

  const requestTeacher = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await postAccount({ action: 'TEACHER_REQUEST', reason });
      setReason('');
      report('Request sent. An administrator will review it.');
      await load();
    });
  };

  const sendVerification = (action: 'SEND_VERIFY' | 'VERIFY') => {
    void run(async () => {
      const json = await postRecovery({ action, email: data?.user.email || email, token: token || undefined });
      report(json.message || (action === 'VERIFY' ? 'Email verified.' : 'Verification email sent.'));
      if (action === 'VERIFY') { window.history.replaceState(null, '', '/account'); setLinkAction(''); await load(); }
    });
  };

  const resetPassword = (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) { report('Passwords do not match.', 'error'); return; }
    void run(async () => {
      await postRecovery({ action: 'RESET', email, token, password });
      await clearExamCache();
      window.history.replaceState(null, '', '/account');
      setLinkAction('');
      setData(null);
      setPassword(''); setConfirmPassword('');
      report('Password updated. Sign in with your new password.');
    });
  };

  const sendResetLink = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const json = await postRecovery({ action: 'SEND_RESET', email });
      report(json.message || 'If an active account exists, an email has been sent.');
    });
  };

  const role = data?.user.role.toLowerCase() || '';

  return (
    <div className={`rise-ui ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>Rise Learner · Account</span>
          <h1 className={styles.title}>{data ? `Hello, ${data.user.name.split(' ')[0]}.` : 'Your account.'}</h1>
          <p className={styles.lede}>
            {linkAction === 'RESET'
              ? 'Choose a new password for your account. This single-use link expires after 30 minutes.'
              : 'Your profile, password and signed-in devices, kept in one place.'}
          </p>
        </header>

        {message && <p className={tone === 'error' ? styles.error : styles.notice} role={tone === 'error' ? 'alert' : 'status'}>{message}</p>}

        {linkAction === 'RESET' ? (
          <section className={`${styles.panel} ${styles.resetPanel}`} aria-labelledby="reset-title">
            <div className={styles.panelHead}>
              <h2 id="reset-title" className={styles.panelTitle}>Choose a new password</h2>
              <p className={styles.panelNote}>Resetting your password signs out every device, including this one.</p>
            </div>
            <form className={styles.form} onSubmit={resetPassword}>
              <label className={styles.field}>Email address
                <input className={styles.input} required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label className={styles.field}>New password
                <input className={styles.input} required type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={event => setPassword(event.target.value)} />
                <span className={styles.fieldHint}>Use at least 12 characters.</span>
              </label>
              <label className={styles.field}>Confirm new password
                <input className={styles.input} required type="password" autoComplete="new-password" minLength={12} maxLength={256} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              </label>
              <div className={styles.actions}>
                <button className={styles.primary} disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
                <Link className={styles.secondary} href="/account">Back to sign in</Link>
              </div>
            </form>
          </section>
        ) : loading ? (
          <div className={styles.stateWrap} role="status">
            <div className={styles.spinner} />
            <span className={styles.stateText}>Loading your account…</span>
          </div>
        ) : !data ? (
          <div className={styles.guest}>
            <section className={styles.panel} aria-labelledby="guest-title">
              <div className={styles.panelHead}>
                <h2 id="guest-title" className={styles.panelTitle}>Sign in to manage your account</h2>
                <p className={styles.panelNote}>View your profile, change your password and check where you are signed in.</p>
              </div>
              <div className={styles.actions}>
                <button className={styles.primary} onClick={() => setAuthOpen(true)}>Sign in or register</button>
                <Link className={styles.secondary} href="/">Browse study materials</Link>
              </div>
            </section>
            <form className={styles.panel} onSubmit={sendResetLink}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Forgot your password?</h2>
                <p className={styles.panelNote}>We’ll email you a secure, single-use reset link.</p>
              </div>
              <label className={styles.field}>Email address
                <input className={styles.input} required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <div className={styles.actions}>
                <button className={styles.secondary} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.stack}>
              <section className={styles.panel} aria-labelledby="profile-title">
                <div className={styles.panelHead}>
                  <h2 id="profile-title" className={styles.panelTitle}>Profile</h2>
                  <p className={styles.panelNote}>The name shown on your dashboard and marked scripts.</p>
                </div>
                <div className={styles.identity}>
                  <span className={styles.avatar} aria-hidden="true">{data.user.name.slice(0, 1).toUpperCase()}</span>
                  <div className={styles.identityText}>
                    <p className={styles.name}>{data.user.name}</p>
                    <p className={styles.email}>{data.user.email}</p>
                  </div>
                </div>
                <form className={styles.form} onSubmit={saveName}>
                  <label className={styles.field}>Display name
                    <input className={styles.input} required maxLength={160} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
                  </label>
                  <div className={styles.actions}>
                    <button className={styles.primary} disabled={busy || !name.trim() || name.trim() === data.user.name}>{busy ? 'Saving…' : 'Save name'}</button>
                  </div>
                </form>
                <dl className={styles.facts}>
                  <div className={styles.factRow}><dt className={styles.factLabel}>Role</dt><dd className={styles.factValue}>{role.charAt(0).toUpperCase() + role.slice(1)}</dd></div>
                  <div className={styles.factRow}><dt className={styles.factLabel}>Email</dt><dd className={styles.factValue}>{data.user.emailVerified ? 'Verified' : 'Awaiting verification'}</dd></div>
                  <div className={styles.factRow}><dt className={styles.factLabel}>Member since</dt><dd className={styles.factValue}>{formatDate(data.user.createdAt)}</dd></div>
                  <div className={styles.factRow}><dt className={styles.factLabel}>Active devices</dt><dd className={`${styles.factValue} ${styles.factValueAccent}`}>{data.activeSessions}</dd></div>
                </dl>
                {!data.user.emailVerified && (
                  <div className={styles.actions}>
                    <button className={styles.secondary} disabled={busy} onClick={() => sendVerification('SEND_VERIFY')}>Send verification email</button>
                    {linkAction === 'VERIFY' && <button className={styles.primary} disabled={busy} onClick={() => sendVerification('VERIFY')}>Verify email address</button>}
                  </div>
                )}
              </section>

              <section className={styles.panel} aria-labelledby="shortcuts-title">
                <div className={styles.panelHead}>
                  <h2 id="shortcuts-title" className={styles.panelTitle}>Shortcuts</h2>
                </div>
                <nav className={styles.tools} aria-label="Account shortcuts">
                  {data.user.role === 'ADMIN' && <>
                    <Link className={styles.shortcut} href="/admin">Platform overview <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>
                    <Link className={styles.shortcut} href="/admin/users">Students & teachers <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>
                    <Link className={styles.shortcut} href="/admin/knowledge">AI source reviews <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>
                    <Link className={styles.shortcut} href="/admin/study">Book study packs <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>
                  </>}
                  {data.user.role === 'TEACHER' && <Link className={styles.shortcut} href="/dashboard/teacher">Teacher dashboard <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>}
                  {data.user.role === 'STUDENT' && <Link className={styles.shortcut} href="/dashboard/student">Learning progress <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>}
                  <Link className={styles.shortcut} href="/">Browse study materials <span className={styles.shortcutArrow} aria-hidden="true">→</span></Link>
                </nav>
              </section>
            </div>

            <div className={styles.stack}>
              <section className={styles.panel} aria-labelledby="password-title">
                <div className={styles.panelHead}>
                  <h2 id="password-title" className={styles.panelTitle}>Password</h2>
                  <p className={styles.panelNote}>Changing your password signs out every other device but keeps this one signed in.</p>
                </div>
                <form className={styles.form} onSubmit={changePassword}>
                  <label className={styles.field}>Current password
                    <input className={styles.input} required type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
                  </label>
                  <label className={styles.field}>New password
                    <input className={styles.input} required type="password" autoComplete="new-password" minLength={12} maxLength={256} value={newPassword} onChange={event => setNewPassword(event.target.value)} />
                    <span className={styles.fieldHint}>At least 12 characters.</span>
                  </label>
                  <label className={styles.field}>Confirm new password
                    <input className={styles.input} required type="password" autoComplete="new-password" minLength={12} maxLength={256} value={confirmNewPassword} onChange={event => setConfirmNewPassword(event.target.value)} />
                  </label>
                  <div className={styles.actions}>
                    <button className={styles.primary} disabled={busy || !currentPassword || newPassword.length < 12 || !confirmNewPassword}>{busy ? 'Updating…' : 'Update password'}</button>
                  </div>
                </form>
              </section>

              <section className={styles.panel} aria-labelledby="sessions-title">
                <div className={styles.panelHead}>
                  <h2 id="sessions-title" className={styles.panelTitle}>Where you’re signed in</h2>
                  <p className={styles.panelNote}>Active devices with a valid session. Sign out anything you don’t recognise.</p>
                </div>
                {data.sessions.length ? (
                  <ul className={styles.sessions}>
                    {data.sessions.map(session => (
                      <li key={session.id} className={styles.sessionRow}>
                        <div className={styles.sessionMain}>
                          <span className={styles.sessionDevice}>
                            {describeDevice(session.userAgent)}
                            {session.current && <span className={`${styles.chip} ${styles.chipCurrent}`}>This device</span>}
                          </span>
                          <span className={styles.sessionMeta}>
                            Signed in {formatDate(session.createdAt)}
                            {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                          </span>
                        </div>
                        <button
                          className={styles.sessionRevoke}
                          disabled={busy}
                          onClick={() => revokeSession(session)}
                          aria-label={`Sign out ${describeDevice(session.userAgent)}${session.current ? ' (this device)' : ''}`}
                        >
                          Sign out
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptySessions}>No active devices are recorded for this account.</p>
                )}
                <div className={styles.actions}>
                  <button className={`${styles.secondary} ${styles.danger}`} disabled={busy} onClick={revokeAll}>Sign out all devices</button>
                </div>
              </section>

              {data.user.role === 'STUDENT' && (
                <section className={styles.panel} aria-labelledby="teach-title">
                  <div className={styles.panelHead}>
                    <h2 id="teach-title" className={styles.panelTitle}>Teach with Rise Learner</h2>
                    <p className={styles.panelNote}>Tell us about your teaching role and an administrator will review the request.</p>
                  </div>
                  {data.teacherRequest?.action === 'TEACHER_ACCESS_REQUESTED' && <p className={styles.teacherStatus}>Your teacher access request is awaiting review.</p>}
                  <form className={styles.form} onSubmit={requestTeacher}>
                    <label className={styles.field}>Teaching role and reason
                      <textarea className={`${styles.input} ${styles.textarea}`} required minLength={10} maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
                    </label>
                    <div className={styles.actions}>
                      <button className={styles.secondary} disabled={busy || reason.trim().length < 10}>Request teacher access</button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); void load(); }} />
    </div>
  );
}
