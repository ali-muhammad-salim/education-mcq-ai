'use client';

import { useDialog } from '@/lib/use-dialog';
import React, { useState, useEffect } from 'react';
import { Sparkles, User, Lock, Mail, ShieldCheck, Check, ArrowRight, X, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'STUDENT' | 'TEACHER';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login', initialRole = 'STUDENT' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch('/api/auth/google?check=1')
      .then(res => res.json())
      .then(data => setGoogleConfigured(data.enabled))
      .catch(() => setGoogleConfigured(false));
  }, []);

  // Check if there is an auth_error in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get('auth_error');
      if (authErr) {
        if (authErr === 'google_not_configured') {
          setError('Google Sign-In is not configured yet. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are saved in Dokploy Environment variables and click Redeploy.');
        } else if (authErr === 'csrf_verification_failed') {
          setError('Security session timed out. Please click Continue with Google again to sign in.');
        } else if (authErr === 'access_denied') {
          setError('Google sign-in was canceled.');
        } else if (authErr.includes('redirect_uri_mismatch')) {
          setError('Google OAuth Redirect URI mismatch. Please verify https://riselearner.com/api/auth/google/callback in Google Cloud Console.');
        } else {
          setError(`Sign-in notice: ${decodeURIComponent(authErr)}`);
        }
      }
    }
  }, [isOpen]);

  const dialogProps = useDialog(isOpen, 'Sign in or register', onClose);
  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setLoading(true);
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/google?role=${role}&returnUrl=${returnUrl}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email, password }
        : { email, password, name, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Authentication failed');
      }

      if (onSuccess) { onSuccess(data.user); onClose(); return; }
      onClose();
      if (data.user?.role === 'TEACHER') {
        window.location.href = '/dashboard/teacher';
      } else if (data.user?.role === 'STUDENT') {
        window.location.href = '/dashboard/student';
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div {...dialogProps} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          aria-label="Close dialog" onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img
              src="/logo.png"
              alt="Rise Learner"
              style={{
                height: '42px',
                width: 'auto',
                maxWidth: '220px',
                objectFit: 'contain'
              }}
            />
          </div>
          <span style={{
            background: '#e6f0ed',
            color: '#0b5e4a',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <ShieldCheck size={13} /> SECURE PORTAL AUTHENTICATION
          </span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0.2rem 0' }}>
            {mode === 'login' ? 'Sign In to Your Account' : 'Create an Account'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
            Student accounts are created immediately. Teacher access requires approval from your account page.
          </p>
        </div>

        <a href="/account" style={{ color: '#0b5e4a', display: 'block', marginBottom: '1rem' }}>Password recovery, email verification & teacher access</a>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            lineHeight: 1.4
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Role Selection for Google & Register */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4b5563', marginBottom: '0.35rem' }}>
            Choose Your Profile Role:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              style={{
                background: role === 'STUDENT' ? '#e6f0ed' : '#ffffff',
                border: role === 'STUDENT' ? '2px solid #0b5e4a' : '1px solid #d1d5db',
                color: role === 'STUDENT' ? '#0b5e4a' : '#4b5563',
                borderRadius: '8px',
                padding: '7px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => setRole('TEACHER')}
              style={{
                background: role === 'TEACHER' ? '#e6f0ed' : '#ffffff',
                border: role === 'TEACHER' ? '2px solid #0b5e4a' : '1px solid #d1d5db',
                color: role === 'TEACHER' ? '#0b5e4a' : '#4b5563',
                borderRadius: '8px',
                padding: '7px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              👨‍🏫 Teacher
            </button>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: '#ffffff',
            color: '#1f2937',
            border: '1.5px solid #d1d5db',
            borderRadius: '8px',
            padding: '0.7rem 1rem',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
        >
          {/* Official Google SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ padding: '0 0.65rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
            or with email
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.25rem' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ali Raza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.25rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="your.email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.25rem' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0b5e4a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.7rem',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginTop: '0.25rem',
              boxShadow: '0 4px 12px rgba(11, 94, 74, 0.2)'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem', color: '#6b7280' }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: '#0b5e4a', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#0b5e4a', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
