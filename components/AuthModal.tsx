'use client';

import React, { useState } from 'react';
import { Sparkles, User, Lock, Mail, ShieldCheck, Check, ArrowRight, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
        throw new Error(data.error || 'Authentication failed');
      }

      if (onSuccess) onSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole: 'student' | 'teacher' | 'admin') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (onSuccess) onSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
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
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{
            background: '#e6f0ed',
            color: '#0b5e4a',
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <ShieldCheck size={13} /> SECURE PORTAL AUTHENTICATION
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.5rem 0 0.2rem 0' }}>
            {mode === 'login' ? 'Sign In to Your Account' : 'Create an Account'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: 0 }}>
            Access personalized student quizzes or teacher management tools.
          </p>
        </div>

        {/* Quick Demo Access Buttons */}
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: '0.5rem' }}>
            ⚡ 1-Click Verification Login:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('student')}
              disabled={loading}
              style={{
                background: '#ffffff',
                border: '1.5px solid #0b5e4a',
                color: '#0b5e4a',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('teacher')}
              disabled={loading}
              style={{
                background: '#0b5e4a',
                border: '1.5px solid #0b5e4a',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👨‍🏫 Teacher
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              disabled={loading}
              style={{
                background: '#111827',
                border: '1.5px solid #111827',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>
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
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>
                  Account Role
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
                      padding: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
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
                      padding: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    👨‍🏫 Teacher
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@akueb.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>
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
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem'
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
              padding: '0.75rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 4px 12px rgba(11, 94, 74, 0.2)'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
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
