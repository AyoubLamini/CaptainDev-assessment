'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/csrf`, { credentials: 'include' })
      .then(() => setIsReady(true))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, newPassword: password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="nova-alert nova-alert-error text-red-700" style={{ marginBottom: 20, justifyContent: 'center' }}>
          This password reset link is invalid or missing a token.
        </div>
        <Link href="/login" className="nova-btn nova-btn-ghost" style={{ display: 'inline-flex' }}>
          Go to login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 8px' }}>
          Password reset successful
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: '0 0 24px' }}>
          Your password has been changed. You can now log in with your new password.
        </p>
        <Link href="/login" className="nova-btn nova-btn-primary" style={{ display: 'inline-flex' }}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 6px' }}>
          Set new password
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: 0 }}>
          Choose a strong password for your account
        </p>
      </div>

      {error && (
        <div className="nova-alert nova-alert-error text-red-700" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label className="nova-label">New Password</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="nova-input"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="nova-label">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          className="nova-input"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !isReady}
        className="nova-btn nova-btn-primary"
        style={{ width: '100%', padding: '10px 16px', marginBottom: 16 }}
      >
        {loading ? 'Saving…' : 'Reset password'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <Link href="/login" style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', textDecoration: 'none' }}>
          ← Back to login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--nova-bg-base)',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 12px' }}>
            <defs>
              <linearGradient id="rp-g" x1="10" y1="5" x2="50" y2="55">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M30 4L54 17.5V44.5L30 58L6 44.5V17.5L30 4Z" stroke="url(#rp-g)" strokeWidth="3" fill="none" />
            <path d="M30 12L48 22V42L30 52L12 42V22L30 12Z" stroke="url(#rp-g)" strokeWidth="2" fill="rgba(14,165,233,0.08)" />
            <circle cx="30" cy="32" r="6" fill="url(#rp-g)" opacity="0.9" />
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--nova-text-primary)', letterSpacing: '0.06em', margin: 0 }}>
            NOVA
          </h1>
        </div>

        <div className="nova-card" style={{ padding: 32 }}>
          <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--nova-text-muted)', padding: 20 }}>Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
