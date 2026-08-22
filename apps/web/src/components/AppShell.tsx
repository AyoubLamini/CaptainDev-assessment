'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';

interface AppShellProps {
  isPlatformAdmin: boolean;
  children: ReactNode;
}

/* ──── NOVA Logo SVG ──── */
function NovaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nova-g1" x1="10" y1="5" x2="50" y2="55">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d="M30 4L54 17.5V44.5L30 58L6 44.5V17.5L30 4Z" stroke="url(#nova-g1)" strokeWidth="3" fill="none" />
      <path d="M30 12L48 22V42L30 52L12 42V22L30 12Z" stroke="url(#nova-g1)" strokeWidth="2" fill="rgba(14,165,233,0.08)" />
      <circle cx="30" cy="32" r="6" fill="url(#nova-g1)" opacity="0.9" />
    </svg>
  );
}

/* ──── Nav Items ──── */
const platformNavItems = [
  {
    label: 'Organizations',
    href: '/platform/organizations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
];

const orgNavItems = [
  {
    label: 'Companies',
    href: '/companies',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" /><path d="M9 9h1" /><path d="M14 9h1" /><path d="M9 13h1" /><path d="M14 13h1" />
      </svg>
    ),
  },
  {
    label: 'Collaborators',
    href: '/collaborators',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Search',
    href: '/search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
];

export function AppShell({ isPlatformAdmin, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [hasOrganizations, setHasOrganizations] = useState<boolean | null>(null);
  const navItems = isPlatformAdmin ? platformNavItems : orgNavItems;

  useEffect(() => {
    if (!isPlatformAdmin) {
      const fetchMe = async () => {
        try {
          const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
          
          if (res.status === 401) {
            document.cookie = '__Host-session=; Max-Age=0; path=/; Secure; SameSite=Strict';
            document.cookie = 'nova_session=; Max-Age=0; path=/';
            document.cookie = '__Host-csrf=; Max-Age=0; path=/; Secure; SameSite=Strict';
            document.cookie = 'nova_csrf=; Max-Age=0; path=/';
            window.location.href = '/login';
            return;
          }

          if (res.ok) {
            const data = await res.json();
            if (data.organizations && data.organizations.length > 0) {
              setOrganizationName(data.organizations[0].name);
              setOrgRole(data.organizations[0].role);
              setMembershipStatus(data.organizations[0].status);
              setHasOrganizations(true);
            } else {
              setHasOrganizations(false);
            }
          }
        } catch (e) {
          console.error('Failed to fetch user', e);
        }
      };
      fetchMe();
    }
  }, [isPlatformAdmin]);

  const contextLabel = isPlatformAdmin ? 'Platform Administration' : organizationName || 'Organization';
  const roleLabel = isPlatformAdmin ? 'Platform Admin' : (orgRole === 'OWNER' ? 'Owner' : (orgRole === 'ADMIN' ? 'Administrator' : 'Collaborator'));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--nova-bg-base)' }}>
      {/* ─── Mobile overlay ─── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 40, display: 'block',
          }}
          className="lg:hidden"
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: 'var(--nova-sidebar-width)',
          background: 'var(--nova-sidebar-bg)',
          borderRight: '1px solid var(--nova-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: sidebarOpen ? 0 : 'calc(-1 * var(--nova-sidebar-width))',
          zIndex: 45,
          transition: 'left 0.2s ease',
        }}
        className="sidebar-desktop"
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <NovaLogo size={36} />
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--nova-text-primary)', letterSpacing: '0.04em' }}>
            NOVA
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--nova-accent)' : 'var(--nova-text-secondary)',
                  background: isActive ? 'var(--nova-accent-bg)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--nova-accent)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.12s ease',
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid var(--nova-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--nova-text-muted)', marginBottom: 4 }}>Signed in</div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="main-with-sidebar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar */}
        <header
          style={{
            height: 'var(--nova-topbar-height)',
            background: 'var(--nova-bg-surface)',
            borderBottom: '1px solid var(--nova-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
              aria-label="Toggle menu"
              style={{
                background: 'none', border: 'none', color: 'var(--nova-text-secondary)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>

            {/* Context */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--nova-text-secondary)' }}>
                {contextLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-secondary)' }}>
                {roleLabel}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {!isPlatformAdmin && membershipStatus === 'SUSPENDED' ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nova-status-suspended)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 8 }}>
                Access Suspended
              </h2>
              <p style={{ color: 'var(--nova-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                Your access was suspended by the organization administrator.
              </p>
            </div>
          ) : !isPlatformAdmin && membershipStatus === 'REMOVED' ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nova-status-disabled)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 8 }}>
                Access Removed
              </h2>
              <p style={{ color: 'var(--nova-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                Your access was removed by the organization administrator.
              </p>
            </div>
          ) : !isPlatformAdmin && hasOrganizations === false ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 8 }}>
                No Organization
              </h2>
              <p style={{ color: 'var(--nova-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                You do not currently belong to any active organization.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Responsive CSS injected via style tag (keeps it in this component) */}
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-desktop {
            left: 0 !important;
          }
          .main-with-sidebar {
            margin-left: var(--nova-sidebar-width);
          }
          .lg\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
