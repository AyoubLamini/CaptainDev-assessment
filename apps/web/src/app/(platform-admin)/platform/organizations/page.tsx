'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

type Organization = {
  id: string;
  name: string;
  accessStatus: string;
  commercialStatus: string;
  createdAt: string;
  ownerEmail?: string | null;
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

function getStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'nova-badge-active';
  if (s === 'SUSPENDED') return 'nova-badge-suspended';
  if (s === 'DISABLED') return 'nova-badge-disabled';
  if (s === 'PROVISIONING') return 'nova-badge-provisioning';
  if (s === 'PILOT') return 'nova-badge-pilot';
  if (s === 'TRIAL') return 'nova-badge-trial';
  if (s === 'DEMO') return 'nova-badge-demo';
  return 'nova-badge-disabled';
}

function getStatusDotClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'nova-dot-active';
  if (s === 'SUSPENDED') return 'nova-dot-suspended';
  if (s === 'DISABLED') return 'nova-dot-disabled';
  return 'nova-dot-pending';
}

export default function PlatformOrganizationsPage() {
  const { addToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Provision modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionName, setProvisionName] = useState('');
  const [provisionReason, setProvisionReason] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Invite form state
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Action modal state
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | 'disable' | null>(null);
  const [actionOrgId, setActionOrgId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionPassword, setActionPassword] = useState('');
  const [isActing, setIsActing] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('http://localhost:3001/platform/organizations', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch organizations');
      const data = await res.json();
      const orgs = data.data || [];
      setOrganizations(orgs);
      
      setSelectedOrg(prev => {
        if (!prev) return (orgs.length > 0 ? orgs[0] : null);
        const updated = orgs.find((o: any) => o.id === prev.id);
        return updated || null;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch('http://localhost:3001/platform/organizations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: provisionName, commercialStatus: 'ACTIVE', reason: provisionReason }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to provision organization');
      setProvisionName('');
      setProvisionReason('');
      setShowProvisionModal(false);
      addToast('success', 'Organization provisioned', `"${provisionName}" has been created.`);
      fetchOrganizations();
    } catch (err: any) {
      addToast('error', 'Provisioning failed', err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteOrgId) return;

    setIsInviting(true);
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/platform/organizations/${inviteOrgId}/owner-invitation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to invite owner');
      setInviteOrgId(null);
      setInviteEmail('');
      addToast('success', 'Invitation sent', 'The owner will receive an email with activation instructions.');
    } catch (err: any) {
      addToast('error', 'Invitation failed', err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrgId || !actionType) return;

    setIsActing(true);
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const endpoint = `http://localhost:3001/platform/organizations/${actionOrgId}/${actionType}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: actionReason, passwordConfirmation: actionPassword }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${actionType} organization`);
      }

      setActionOrgId(null);
      setActionType(null);
      setActionReason('');
      setActionPassword('');
      addToast('success', `Organization ${actionType}d`, 'The operation completed successfully.');
      fetchOrganizations();
    } catch (err: any) {
      addToast('error', 'Action failed', err.message);
    } finally {
      setIsActing(false);
    }
  };

  const openActionModal = (orgId: string, type: 'suspend' | 'reactivate' | 'disable') => {
    setActionOrgId(orgId);
    setActionType(type);
    setActionReason('');
    setActionPassword('');
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="nova-section-label">Client Accounts</div>
          <h1 className="nova-section-title">Organizations</h1>
          <p className="nova-section-subtitle">Create and supervise access without opening business data</p>
        </div>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="nova-btn nova-btn-primary"
          style={{ padding: '10px 20px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Organization
        </button>
      </div>

      {error && (
        <div className="nova-alert nova-alert-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Responsive grid: on larger screens use 2 columns */}
        <style>{`
          @media (min-width: 1024px) {
            .org-grid { grid-template-columns: 2fr 1fr !important; }
          }
        `}</style>
        <div className="org-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>

          {/* Left — Directory */}
          <div className="nova-card">
            {/* Search + Filters */}
            <div className="nova-card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search organizations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="nova-input"
                  style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            <div className="nova-table-container">
              <div className="nova-table-inner">
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--nova-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--nova-border)' }}>
                  <span>Organization</span>
                  <span>Access</span>
                  <span>Commercial</span>
                </div>

                {/* Rows */}
                {loading ? (
                  <div style={{ padding: 24, color: 'var(--nova-text-muted)', textAlign: 'center' }}>Loading directory…</div>
                ) : filteredOrgs.length === 0 ? (
                  <div style={{ padding: 24, color: 'var(--nova-text-muted)', textAlign: 'center' }}>
                    {searchQuery ? 'No matching organizations.' : 'No organizations found. Provision one to get started.'}
                  </div>
                ) : (
                  filteredOrgs.map(org => (
                    <div
                      key={org.id}
                      className={`nova-row${selectedOrg?.id === org.id ? ' nova-row-selected' : ''}`}
                      onClick={() => setSelectedOrg(org)}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', gap: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
                        </svg>
                        <span style={{ fontWeight: 600, color: 'var(--nova-text-primary)' }}>{org.name}</span>
                      </div>
                      <span className={`nova-badge ${getStatusBadgeClass(org.accessStatus)}`}>
                        <span className={`nova-dot ${getStatusDotClass(org.accessStatus)}`} />
                        {org.accessStatus}
                      </span>
                      <span className={`nova-badge ${getStatusBadgeClass(org.commercialStatus)}`}>
                        {org.commercialStatus}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer count */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--nova-border)', fontSize: '0.8125rem', color: 'var(--nova-text-muted)' }}>
              {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Right — Detail panel */}
          <div className="nova-card">
            {selectedOrg ? (
              <div className="nova-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--nova-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
                  </svg>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: 0 }}>
                    {selectedOrg.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  <DetailRow icon="" label="Access Status">
                    <span className={`nova-badge ${getStatusBadgeClass(selectedOrg.accessStatus)}`}>
                      <span className={`nova-dot ${getStatusDotClass(selectedOrg.accessStatus)}`} />
                      {selectedOrg.accessStatus}
                    </span>
                  </DetailRow>
                  <DetailRow icon="" label="Commercial Status">
                    <span className={`nova-badge ${getStatusBadgeClass(selectedOrg.commercialStatus)}`}>
                      {selectedOrg.commercialStatus}
                    </span>
                  </DetailRow>
                  {selectedOrg.ownerEmail && (
                    <DetailRow icon="" label="  Owner">
                      <span style={{ color: 'var(--nova-text-primary)', fontSize: '0.875rem' }}>{selectedOrg.ownerEmail}</span>
                    </DetailRow>
                  )}
                  <DetailRow icon="" label="Created">
                    <span style={{ color: 'var(--nova-text-primary)', fontSize: '0.875rem' }}>
                      {new Date(selectedOrg.createdAt).toLocaleDateString()}
                    </span>
                  </DetailRow>
                </div>

                <hr className="nova-divider" style={{ marginBottom: 16 }} />

                {/* Info notice */}
                <div className="nova-alert nova-alert-warning" style={{ marginBottom: 16, fontSize: '0.8125rem' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>Re-authentication and reason required for any sensitive action.</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => setInviteOrgId(selectedOrg.id)}
                    disabled={!!selectedOrg.ownerEmail}
                    className="nova-btn nova-btn-outline"
                    style={{ width: '100%' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                    {selectedOrg.ownerEmail ? 'Owner already invited' : 'Invite Owner'}
                  </button>
                  <button
                    onClick={() => openActionModal(selectedOrg.id, selectedOrg.accessStatus === 'SUSPENDED' ? 'reactivate' : 'suspend')}
                    disabled={selectedOrg.accessStatus === 'DISABLED'}
                    className={selectedOrg.accessStatus === 'SUSPENDED' ? 'nova-btn nova-btn-warning' : 'nova-btn nova-btn-danger'}
                    style={{ width: '100%' }}
                  >
                    {selectedOrg.accessStatus === 'SUSPENDED' ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        Reactivate Access
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        Suspend Access
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openActionModal(selectedOrg.id, 'disable')}
                    disabled={selectedOrg.accessStatus === 'DISABLED'}
                    className="nova-btn nova-btn-danger"
                    style={{ width: '100%' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Disable Permanently
                  </button>
                </div>
              </div>
            ) : (
              <div className="nova-card-body" style={{ textAlign: 'center', color: 'var(--nova-text-muted)', padding: 40 }}>
                Select an organization to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Provision Modal ─── */}
      {showProvisionModal && (
        <div className="nova-modal-overlay" onClick={() => setShowProvisionModal(false)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 4px' }}>
                Create Organization
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
                Provision a new organization in provisioning state.
              </p>
            </div>
            <form onSubmit={handleProvision}>
              <div className="nova-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="nova-label">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={provisionName}
                    onChange={(e) => setProvisionName(e.target.value)}
                    className="nova-input"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="nova-label">Reason</label>
                  <input
                    type="text"
                    required
                    value={provisionReason}
                    onChange={(e) => setProvisionReason(e.target.value)}
                    className="nova-input"
                    placeholder="Initial customer onboarding"
                  />
                </div>
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => setShowProvisionModal(false)} className="nova-btn nova-btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isProvisioning} className="nova-btn nova-btn-primary">
                  {isProvisioning ? 'Provisioning…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Invite Modal ─── */}
      {inviteOrgId && (
        <div className="nova-modal-overlay" onClick={() => setInviteOrgId(null)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 4px' }}>
                Invite Initial Owner
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
                They will receive a secure email link to activate this organization and set their password.
              </p>
            </div>
            <form onSubmit={handleInvite}>
              <div className="nova-modal-body">
                <label className="nova-label">Owner Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="nova-input"
                  placeholder="owner@example.com"
                />
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => setInviteOrgId(null)} className="nova-btn nova-btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isInviting} className="nova-btn nova-btn-primary">
                  {isInviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Action Modal ─── */}
      {actionOrgId && actionType && (
        <div className="nova-modal-overlay" onClick={() => { setActionOrgId(null); setActionType(null); }}>
          <div className="nova-modal" onClick={e => e.stopPropagation()}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: actionType === 'reactivate' ? 'var(--nova-status-warning)' : 'var(--nova-status-danger)', margin: '0 0 4px', textTransform: 'capitalize' }}>
                {actionType} Organization
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
                {actionType === 'disable'
                  ? 'This is a permanent action. The organization will be terminally disabled.'
                  : actionType === 'suspend'
                  ? 'All users will immediately lose access. This can be reversed.'
                  : 'Organization access will be restored for all users.'}
              </p>
            </div>
            <form onSubmit={handleAction}>
              <div className="nova-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="nova-label">Reason for action</label>
                  <input
                    type="text"
                    required
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="nova-input"
                    placeholder="Violation of terms…"
                  />
                </div>
                <div>
                  <label className="nova-label">Confirm your password</label>
                  <input
                    type="password"
                    required
                    value={actionPassword}
                    onChange={(e) => setActionPassword(e.target.value)}
                    className="nova-input"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="nova-modal-footer">
                <button type="button" onClick={() => { setActionOrgId(null); setActionType(null); }} className="nova-btn nova-btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActing}
                  className={`nova-btn ${actionType === 'reactivate' ? 'nova-btn-warning' : 'nova-btn-danger'}`}
                >
                  {isActing ? 'Processing…' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Detail Row helper ─── */
function DetailRow({ label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* <span style={{ fontSize: '0.875rem', width: 20, textAlign: 'center' }}>{icon}</span> */}
      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', minWidth: 120 }}>{label}:</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
