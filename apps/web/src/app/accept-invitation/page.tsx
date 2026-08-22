'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

function AcceptInvitationForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    fetch('http://localhost:3001/auth/csrf', { credentials: 'include' }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing invitation token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const endpoint = type === 'collaborator'
        ? 'http://localhost:3001/auth/invitations/collaborator/accept'
        : 'http://localhost:3001/auth/invitations/accept';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to accept invitation. The token may have expired or already been used.');
      }

      router.push('/login?message=' + encodeURIComponent('Account created successfully! Please log in with your new password.'));
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
          <span style={{ fontWeight: 'bold', display: 'block' }}>Invalid link</span>
          This invitation link is invalid or missing a token.
        </div>
        <Link href="/login" className="nova-btn nova-btn-ghost" style={{ display: 'inline-flex' }}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 6px' }}>
          Accept your invitation
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: 0 }}>
          Set a password to activate your account
        </p>
      </div>

      {error && (
        <div className="nova-alert nova-alert-error text-red-700" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label className="nova-label">Create Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="nova-input"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="nova-label">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="nova-input"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="nova-btn nova-btn-primary"
        style={{ width: '100%', padding: '10px 16px' }}
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}

export default function AcceptInvitationPage() {
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
              <linearGradient id="ai-g" x1="10" y1="5" x2="50" y2="55">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M30 4L54 17.5V44.5L30 58L6 44.5V17.5L30 4Z" stroke="url(#ai-g)" strokeWidth="3" fill="none" />
            <path d="M30 12L48 22V42L30 52L12 42V22L30 12Z" stroke="url(#ai-g)" strokeWidth="2" fill="rgba(14,165,233,0.08)" />
            <circle cx="30" cy="32" r="6" fill="url(#ai-g)" opacity="0.9" />
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--nova-text-primary)', letterSpacing: '0.06em', margin: 0 }}>
            NOVA
          </h1>
        </div>

        <div className="nova-card" style={{ padding: 32 }}>
          <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--nova-text-muted)', padding: 20 }}>Loading…</div>}>
            <AcceptInvitationForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
