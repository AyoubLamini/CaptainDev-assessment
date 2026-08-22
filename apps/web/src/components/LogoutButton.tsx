'use client';

import { useState } from 'react';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export function LogoutButton({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const csrfToken = (getCookie('nova_csrf') || getCookie('__Host-csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        window.location.href = '/login';
      } else {
        console.error('Failed to log out');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
          border: '1px solid var(--nova-border)',
          borderRadius: 8,
          color: 'var(--nova-text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'all 0.12s ease',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {loading ? 'Logging out…' : 'Log out'}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="nova-btn nova-btn-ghost nova-btn-sm"
    >
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
