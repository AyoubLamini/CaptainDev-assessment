'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/auth/csrf', { credentials: 'include' }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const csrfToken = (getCookie('nova_csrf') || getCookie('__Host-csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      setSuccess(true);
      setTimeout(() => {
        window.location.href = data.isPlatformAdmin ? '/platform/organizations' : '/companies';
      }, 500);
    } catch (err: any) {
      setError(err.message);
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
              <linearGradient id="login-g" x1="10" y1="5" x2="50" y2="55">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M30 4L54 17.5V44.5L30 58L6 44.5V17.5L30 4Z" stroke="url(#login-g)" strokeWidth="3" fill="none" />
            <path d="M30 12L48 22V42L30 52L12 42V22L30 12Z" stroke="url(#login-g)" strokeWidth="2" fill="rgba(14,165,233,0.08)" />
            <circle cx="30" cy="32" r="6" fill="url(#login-g)" opacity="0.9" />
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--nova-text-primary)', letterSpacing: '0.06em', margin: 0 }}>
            NOVA
          </h1>
        </div>

        {/* Card */}
        <div className="nova-card" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 6px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--nova-text-muted)', margin: 0 }}>
              Sign in to your account
            </p>
          </div>

          {error && (
            <div className="nova-alert nova-alert-error" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#ef4444" style={{ flexShrink: 0, marginTop: 1 }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="nova-alert nova-alert-success" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#22c55e" style={{ flexShrink: 0, marginTop: 1 }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Logged in successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label className="nova-label">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="nova-input"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label className="nova-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nova-input"
                  style={{ paddingRight: 40 }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--nova-text-muted)',
                    cursor: 'pointer', padding: 2, display: 'flex',
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link
                href="/forgot-password"
                style={{ fontSize: '0.8125rem', color: 'var(--nova-accent)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="nova-btn nova-btn-primary"
              style={{ width: '100%', padding: '10px 16px' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
