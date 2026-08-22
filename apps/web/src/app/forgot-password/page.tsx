'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
    setLoading(true);

    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/forgot-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

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
              <linearGradient id="fp-g" x1="10" y1="5" x2="50" y2="55">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M30 4L54 17.5V44.5L30 58L6 44.5V17.5L30 4Z" stroke="url(#fp-g)" strokeWidth="3" fill="none" />
            <path d="M30 12L48 22V42L30 52L12 42V22L30 12Z" stroke="url(#fp-g)" strokeWidth="2" fill="rgba(14,165,233,0.08)" />
            <circle cx="30" cy="32" r="6" fill="url(#fp-g)" opacity="0.9" />
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--nova-text-primary)', letterSpacing: '0.06em', margin: 0 }}>
            NOVA
          </h1>
        </div>

        <div className="nova-card" style={{ padding: 32 }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nova-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 8px' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
                If an account with that email exists, we sent a reset link. Check your inbox and spam folder.
              </p>
              <Link href="/login" className="nova-btn nova-btn-ghost" style={{ display: 'inline-flex' }}>
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 6px' }}>
                  Reset your password
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: 0 }}>
                  Enter your email and we&apos;ll send a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label className="nova-label">Email address</label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="nova-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !isReady}
                  className="nova-btn nova-btn-primary"
                  style={{ width: '100%', padding: '10px 16px', marginBottom: 16 }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <Link href="/login" style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', textDecoration: 'none' }}>
                    ← Back to login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
