'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  status: string;
};

type BusinessScope = {
  id: string;
  name: string;
  type: string;
  status: string;
  externalId: string | null;
  location: string | null;
  companyId: string;
};

type SearchResults = {
  companies: { data: Company[]; totalCount: number };
  scopes: { data: BusinessScope[]; totalCount: number };
};

function SearchContent() {
  const searchParams = useSearchParams();
  const [organizationId, setOrganizationId] = useState(searchParams.get('orgId') || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      fetch('http://localhost:3001/auth/me', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.organizations && data.organizations.length > 0) {
            setOrganizationId(data.organizations[0].id);
          }
        })
        .catch(err => console.error('Failed to fetch user', err));
    }
  }, [organizationId]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/search?q=${encodeURIComponent(q)}`, {
        credentials: 'include',
        headers: {
          'x-organization-id': organizationId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.organizations) {
          setOrganizations(data.organizations);
          if (!organizationId && data.organizations.length > 0) {
            setOrganizationId(data.organizations[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to fetch user', err));
  }, [organizationId]);

  const currentOrg = organizations.find(o => o.id === organizationId);
  const isSuspended = currentOrg?.accessStatus === 'SUSPENDED';

  if (isSuspended) {
    return (
      <div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nova-status-suspended)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 8 }}>
            Organization suspended by platform admin
          </h2>
          <p style={{ color: 'var(--nova-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            Reason: {currentOrg.suspensionReason || 'No reason provided.'}
          </p>
        </div>
        
        {organizations.length > 1 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="nova-select"
              style={{ maxWidth: 300, display: 'inline-block' }}
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="nova-section-label">Search</div>
        <h1 className="nova-section-title">Global Search</h1>
        <p className="nova-section-subtitle">Search across companies and business scopes</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              id="search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies and scopes…"
              className="nova-input"
              style={{ paddingLeft: 44, padding: '12px 14px 12px 44px', fontSize: '1rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="nova-btn nova-btn-primary"
            style={{ padding: '12px 24px' }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Companies */}
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 12 }}>
              Companies
              <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--nova-text-muted)', marginLeft: 8 }}>
                ({results.companies.totalCount})
              </span>
            </h2>
            {results.companies.data.length > 0 ? (
              <div className="nova-card">
                {results.companies.data.map(company => (
                  <div key={company.id} className="nova-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5">
                        <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
                      </svg>
                      <span style={{ fontWeight: 600, color: 'var(--nova-text-primary)' }}>{company.name}</span>
                    </div>
                    <span className={`nova-badge ${company.status === 'ACTIVE' ? 'nova-badge-active' : 'nova-badge-disabled'}`}>
                      {company.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--nova-text-muted)', fontSize: '0.875rem' }}>No companies found.</p>
            )}
          </div>

          {/* Business Scopes */}
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 12 }}>
              Business Scopes
              <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--nova-text-muted)', marginLeft: 8 }}>
                ({results.scopes.totalCount})
              </span>
            </h2>
            {results.scopes.data.length > 0 ? (
              <div className="nova-card">
                {results.scopes.data.map(scope => (
                  <div key={scope.id} className="nova-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
                      </svg>
                      <span style={{ fontWeight: 600, color: 'var(--nova-text-primary)' }}>{scope.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="nova-badge nova-badge-provisioning">{scope.type}</span>
                      <span className={`nova-badge ${scope.status === 'ACTIVE' ? 'nova-badge-active' : 'nova-badge-disabled'}`}>
                        {scope.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--nova-text-muted)', fontSize: '0.875rem' }}>No business scopes found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: 'var(--nova-text-muted)' }}>Loading search…</div>}>
      <SearchContent />
    </Suspense>
  );
}
