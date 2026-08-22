'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Company = {
  id: string;
  name: string;
  status: string;
  scopes?: {
    id: string;
    name: string;
    type: string;
    status: string;
  }[];
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export default function CompaniesPage() {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [orgGrants, setOrgGrants] = useState<{ capabilities?: string[], scopes?: string[] } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'company' | 'scope'; company: Company; scopeId?: string } | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Create company modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit company modal
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');

  // Edit scope modal
  const [editingScope, setEditingScope] = useState<{ id: string, name: string, companyId: string } | null>(null);
  const [editScopeName, setEditScopeName] = useState('');

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        // Auto-expand all by default
        const ids = new Set<string>(data.map((c: Company) => c.id));
        setExpandedCompanies(ids);
        
        setSelectedItem(prev => {
          if (!prev) return null;
          const updatedCompany = data.find((c: Company) => c.id === prev.company.id);
          if (!updatedCompany) return null;
          if (prev.type === 'company') {
            return { type: 'company', company: updatedCompany };
          } else {
            const scopeStillExists = updatedCompany.scopes?.some((s: any) => s.id === prev.scopeId);
            return scopeStillExists ? { type: 'scope', company: updatedCompany, scopeId: prev.scopeId } : null;
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.organizations && data.organizations.length > 0) {
            setOrganizations(data.organizations);
            setOrganizationId(data.organizations[0].id);
            setOrgRole(data.organizations[0].role);
            setOrgGrants(data.organizations[0].grants);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    if (organizationId) fetchCompanies();
  }, [organizationId]);

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies`, {
        method: 'POST', credentials: 'include', headers,
        body: JSON.stringify({ name: newCompanyName }),
      });
      if (res.ok) {
        setNewCompanyName('');
        setShowCreateModal(false);
        addToast('success', 'Company created', `"${newCompanyName}" has been added.`);
        fetchCompanies();
      } else {
        const err = await res.json();
        addToast('error', 'Creation failed', err.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${editingCompany.id}`, {
        method: 'PUT', credentials: 'include', headers,
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        setEditingCompany(null);
        addToast('success', 'Company updated');
        fetchCompanies();
      } else {
        const err = await res.json();
        addToast('error', 'Update failed', err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScope) return;
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${editingScope.companyId}/scopes/${editingScope.id}`, {
        method: 'PATCH', credentials: 'include', headers,
        body: JSON.stringify({ name: editScopeName }),
      });
      if (res.ok) {
        setEditingScope(null);
        addToast('success', 'Scope updated');
        fetchCompanies();
        // Update selectedItem if it's the currently viewed scope
        if (selectedItem?.type === 'scope' && selectedItem.scopeId === editingScope.id) {
            setSelectedItem({
              ...selectedItem,
              company: {
                ...selectedItem.company,
                ...(selectedItem.company.scopes ? {
                  scopes: selectedItem.company.scopes.map(s => s.id === editingScope.id ? { ...s, name: editScopeName } : s)
                } : {})
              }
            });
        }
      } else {
        const err = await res.json();
        addToast('error', 'Update failed', err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${id}/deactivate`, {
        method: 'PATCH', credentials: 'include', headers,
      });
      if (res.ok) {
        addToast('success', 'Company deactivated');
        fetchCompanies();
      } else {
        const err = await res.json();
        addToast('error', 'Deactivation failed', err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReactivate = async (company: Company) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${company.id}`, {
        method: 'PUT', credentials: 'include', headers,
        body: JSON.stringify({ name: company.name, status: 'ACTIVE' }),
      });
      if (res.ok) {
        addToast('success', 'Company reactivated');
        fetchCompanies();
      } else {
        const err = await res.json();
        addToast('error', 'Reactivation failed', err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedScope = selectedItem?.type === 'scope' && selectedItem.scopeId
    ? selectedItem.company.scopes?.find(s => s.id === selectedItem.scopeId)
    : null;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="nova-section-label">Administration</div>
          <h1 className="nova-section-title">Companies & Scopes</h1>
          <p className="nova-section-subtitle">Structure the companies and operations of your Organization</p>
        </div>
        {(orgRole === 'ADMIN' || orgRole === 'OWNER') && (
          <button onClick={() => setShowCreateModal(true)} className="nova-btn nova-btn-primary" style={{ padding: '10px 20px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Company
          </button>
        )}
      </div>

      {/* Org selector (minimal) */}
      {organizations.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="nova-select"
            style={{ maxWidth: 300 }}
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        @media (min-width: 1024px) {
          .companies-grid { grid-template-columns: 2fr 1fr !important; }
        }
      `}</style>
      <div className="companies-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Left - Company List */}
        <div className="nova-card">
          {companies.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--nova-text-muted)' }}>
              No companies found. Create one to get started.
            </div>
          ) : (
            companies.map(company => (
              <div key={company.id}>
                {/* Company row */}
                <div
                  className="nova-row"
                  style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                  onClick={() => {
                    setSelectedItem({ type: 'company', company });
                    toggleCompany(company.id);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--nova-text-primary)' }}>{company.name}</span>
                    {company.scopes && company.scopes.length > 0 && (
                      <span className="nova-btn nova-btn-ghost nova-btn-sm" style={{ pointerEvents: 'none', padding: '2px 8px', fontSize: '0.75rem' }}>
                        {company.scopes.length} scope{company.scopes.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {(orgRole === 'ADMIN' || orgRole === 'OWNER') && (
                      <Link
                        href={`/companies/${company.id}/scopes/new?orgId=${organizationId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="nova-btn nova-btn-ghost nova-btn-sm"
                      >
                        + Add scope
                      </Link>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="2" strokeLinecap="round"
                      style={{ transform: expandedCompanies.has(company.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Scopes (expanded) */}
                {expandedCompanies.has(company.id) && company.scopes && company.scopes.map(scope => (
                  <div
                    key={scope.id}
                    className={`nova-row${selectedItem?.type === 'scope' && selectedItem.scopeId === scope.id ? ' nova-row-selected' : ''}`}
                    style={{ paddingLeft: 48, gap: 10 }}
                    onClick={() => setSelectedItem({ type: 'scope', company, scopeId: scope.id })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                    <span style={{ fontWeight: 500, color: 'var(--nova-text-primary)', flex: 1 }}>{scope.name}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)' }}>{scope.type}</span>
                    <span className={`nova-badge ${scope.status === 'ACTIVE' ? 'nova-badge-active' : 'nova-badge-disabled'}`}>
                      {scope.status}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Right — Detail */}
        <div className="nova-card">
          {selectedItem ? (
            <div className="nova-card-body">
              {selectedItem.type === 'company' ? (
                <>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 16px' }}>
                    {selectedItem.company.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 60 }}>Status:</span>
                      <span className={`nova-badge ${selectedItem.company.status === 'ACTIVE' ? 'nova-badge-active' : 'nova-badge-disabled'}`}>
                        {selectedItem.company.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 60 }}>Scopes:</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--nova-text-primary)' }}>
                        {selectedItem.company.scopes?.length || 0} business scope{(selectedItem.company.scopes?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {(orgRole === 'ADMIN' || orgRole === 'OWNER') && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { setEditingCompany(selectedItem.company); setEditName(selectedItem.company.name); }}
                        className="nova-btn nova-btn-primary"
                        style={{ flex: 1 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                        Edit
                      </button>
                      {selectedItem.company.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleDeactivate(selectedItem.company.id)}
                          className="nova-btn nova-btn-danger"
                          style={{ flex: 1 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(selectedItem.company)}
                          className="nova-btn nova-btn-outline"
                          style={{ flex: 1 }}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : selectedScope ? (
                <>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 16px' }}>
                    {selectedScope.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 70 }}>Company:</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--nova-text-primary)' }}>{selectedItem.company.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 70 }}>Type:</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--nova-text-primary)' }}>{selectedScope.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 70 }}>Status:</span>
                      <span className={`nova-badge ${selectedScope.status === 'ACTIVE' ? 'nova-badge-active' : 'nova-badge-disabled'}`}>
                        {selectedScope.status}
                      </span>
                    </div>
                  </div>
                  {(orgRole === 'ADMIN' || orgRole === 'OWNER' || (orgRole === 'USER' && orgGrants?.capabilities?.includes('write') && (orgGrants?.scopes?.length === 0 || orgGrants?.scopes?.includes(selectedScope.id)))) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                      <button
                        onClick={() => { setEditingScope({ id: selectedScope.id, name: selectedScope.name, companyId: selectedItem.company.id }); setEditScopeName(selectedScope.name); }}
                        className="nova-btn nova-btn-primary"
                        style={{ flex: 1 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ) : (
            <div className="nova-card-body" style={{ textAlign: 'center', color: 'var(--nova-text-muted)', padding: 40 }}>
              Select a company or scope to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="nova-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: 0 }}>Add Company</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="nova-modal-body">
                <label className="nova-label">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="nova-input"
                  placeholder="Enter company name"
                />
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="nova-btn nova-btn-ghost">Cancel</button>
                <button type="submit" disabled={isCreating} className="nova-btn nova-btn-primary">
                  {isCreating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="nova-modal-overlay" onClick={() => setEditingCompany(null)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: 0 }}>Edit Company</h3>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="nova-modal-body">
                <label className="nova-label">Company Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="nova-input"
                />
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => setEditingCompany(null)} className="nova-btn nova-btn-ghost">Cancel</button>
                <button type="submit" className="nova-btn nova-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scope Modal */}
      {editingScope && (
        <div className="nova-modal-overlay" onClick={() => setEditingScope(null)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: 0 }}>Edit Business Scope</h3>
            </div>
            <form onSubmit={handleUpdateScope}>
              <div className="nova-modal-body">
                <label className="nova-label">Scope Name</label>
                <input
                  type="text"
                  required
                  value={editScopeName}
                  onChange={(e) => setEditScopeName(e.target.value)}
                  className="nova-input"
                />
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => setEditingScope(null)} className="nova-btn nova-btn-ghost">Cancel</button>
                <button type="submit" className="nova-btn nova-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
