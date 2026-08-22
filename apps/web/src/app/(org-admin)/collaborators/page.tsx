'use client';

import { useState, useEffect, useCallback } from 'react';
import InviteModal from '@/components/collaborators/InviteModal';
import EditGrantsModal from '@/components/collaborators/EditGrantsModal';
import { useToast } from '@/components/Toast';

type Collaborator = {
  id: string;
  role: string;
  status: string;
  identity: { id: string; email: string };
  grants: any;
  createdAt?: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  state: 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'REVOKED' | 'SUPERSEDED';
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  grants: any;
};

type TransferProposal = {
  id: string;
  proposerId: string;
  successorId: string;
  status: string;
  expiresAt: string;
  proposer: { id: string; identity: { id: string; email: string } };
  successor: { id: string; identity: { id: string; email: string } };
} | null;

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

function getInitials(email: string): string {
  if (!email) return 'U';
  const name = email.split('@')[0] || '';
  const parts = name.split(/[._-]/);
  const p1 = parts[0];
  const p2 = parts[1];
  if (p1 && p2 && p1[0] && p2[0]) return (p1[0] + p2[0]).toUpperCase();
  return name.substring(0, 2).toUpperCase() || 'U';
}

function getRoleBadgeClass(role: string): string {
  if (role === 'OWNER') return 'nova-badge-owner';
  if (role === 'ADMIN') return 'nova-badge-admin';
  return 'nova-badge-user';
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE': return { cls: 'nova-badge-active', dot: 'nova-dot-active', label: 'Active' };
    case 'SUSPENDED': return { cls: 'nova-badge-suspended', dot: 'nova-dot-suspended', label: 'Suspended' };
    case 'REMOVED': return { cls: 'nova-badge-expired', dot: 'nova-dot-suspended', label: 'Removed' };
    default: return { cls: 'nova-badge-user', dot: '', label: status };
  }
}

function InvitationStateBadge({ state }: { state: Invitation['state'] }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: 'nova-badge-pending', label: 'Pending' },
    EXPIRED: { cls: 'nova-badge-expired', label: 'Expired' },
    ACCEPTED: { cls: 'nova-badge-active', label: 'Accepted' },
    REVOKED: { cls: 'nova-badge-suspended', label: 'Revoked' },
    SUPERSEDED: { cls: 'nova-badge-consumed', label: 'Superseded' },
  };
  const { cls, label } = map[state] ?? { cls: 'nova-badge-user', label: state };
  return <span className={`nova-badge ${cls}`}>{label}</span>;
}

export default function CollaboratorsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [myIdentityId, setMyIdentityId] = useState('');
  const [myMembership, setMyMembership] = useState<any>(null);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedMember, setSelectedMember] = useState<Collaborator | null>(null);
  const [transferProposal, setTransferProposal] = useState<TransferProposal>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editGrantsMemberId, setEditGrantsMemberId] = useState<string | null>(null);
  const [editGrantsMember, setEditGrantsMember] = useState<Collaborator | null>(null);
  const [availableScopes, setAvailableScopes] = useState<{id: string; name: string}[]>([]);

  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string; memberId: string; memberEmail: string } | null>(null);

  const apiHeaders = useCallback((withJson = false): HeadersInit => {
    const csrfToken = getCookie('__Host-csrf') || getCookie('nova_csrf');
    const h: HeadersInit = { 'x-organization-id': organizationId };
    if (withJson) h['Content-Type'] = 'application/json';
    if (csrfToken) h['x-csrf-token'] = csrfToken;
    return h;
  }, [organizationId]);

  const fetchCollaborators = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        const fresh: Collaborator[] = data.data;
        setCollaborators(fresh);
        // Update selected member from fresh data
        setSelectedMember(prev => {
          if (!prev) return (fresh.length > 0 ? fresh[0] : null) ?? null;
          const updated = fresh.find(m => m.id === prev.id);
          return updated ?? null;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [organizationId]);

  const fetchInvitations = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [organizationId]);

  const fetchTransferProposal = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        setTransferProposal(data.data ?? null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [organizationId]);

  const fetchScopes = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        const scopes: {id: string; name: string}[] = [];
        if (Array.isArray(data)) {
          data.forEach((company: any) => {
            if (company.scopes) {
              company.scopes.forEach((scope: any) => {
                if (scope.status === 'ACTIVE') {
                  scopes.push({ id: scope.id, name: `${company.name} › ${scope.name}` });
                }
              });
            }
          });
        }
        setAvailableScopes(scopes);
      }
    } catch (e) {
      console.error(e);
    }
  }, [organizationId]);

  // Load user + org on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMyIdentityId(data.identity?.id ?? '');
          if (data.organizations && data.organizations.length > 0) {
            setOrganizations(data.organizations);
            setOrganizationId(data.organizations[0].id);
            setMyMembership(data.organizations[0]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };
    fetchMe();
  }, []);

  // Refresh myMembership when org changes (pick the right org)
  useEffect(() => {
    if (organizationId && organizations.length > 0) {
      const org = organizations.find(o => o.id === organizationId);
      setMyMembership(org ?? null);
    }
  }, [organizationId, organizations]);

  // Fetch data when org or tab changes
  useEffect(() => {
    if (!organizationId) return;
    if (activeTab === 'members') {
      fetchCollaborators();
      fetchTransferProposal();
    } else {
      fetchInvitations();
    }
    fetchScopes();
  }, [organizationId, activeTab]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleInvite = async (email: string, role: string, preset: string, selectedScopes: string[]) => {
    try {
      let capabilities: string[] = [];
      if (preset === 'viewer') capabilities = ['read'];
      else if (preset === 'editor') capabilities = ['read', 'write'];
      else if (preset === 'manager') capabilities = ['read', 'write', 'manage'];

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(true),
        body: JSON.stringify({ email, role, grants: { capabilities, scopes: selectedScopes } }),
      });
      if (res.ok) {
        addToast('success', 'Invitation sent', `Invitation sent to ${email}`);
        if (activeTab === 'invitations') fetchInvitations();
        setIsInviteModalOpen(false);
      } else {
        const err = await res.json();
        addToast('error', 'Invitation failed', err.message || 'Could not send invitation');
      }
    } catch (e) {
      console.error(e);
      addToast('error', 'Error', 'Unexpected error sending invitation');
    }
  };

  const handleUpdateGrants = async (collaboratorId: string, preset: string, selectedScopes: string[]) => {
    try {
      let capabilities: string[] = [];
      if (preset === 'viewer') capabilities = ['read'];
      else if (preset === 'editor') capabilities = ['read', 'write'];
      else if (preset === 'manager') capabilities = ['read', 'write', 'manage'];

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/grants`, {
        method: 'PATCH', credentials: 'include', headers: apiHeaders(true),
        body: JSON.stringify({ grants: { capabilities, scopes: selectedScopes } }),
      });
      if (res.ok) {
        addToast('success', 'Grants updated', 'Permissions have been updated');
        await fetchCollaborators();
      } else {
        const err = await res.json();
        addToast('error', 'Update failed', err.message || 'Could not update grants');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeStatus = async (collaboratorId: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/status`, {
        method: 'PATCH', credentials: 'include', headers: apiHeaders(true),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const label = status === 'SUSPENDED' ? 'Collaborator suspended' : status === 'ACTIVE' ? 'Collaborator reactivated' : 'Collaborator removed';
        addToast('success', label);
        await fetchCollaborators();
      } else {
        const err = await res.json();
        addToast('error', 'Action failed', err.message || 'Could not change status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromote = async (collaboratorId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/promote`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(true),
        body: JSON.stringify({ reason: 'Promoted via admin interface' }),
      });
      if (res.ok) {
        addToast('success', 'Promoted to Administrator', 'The user now has administrator rights');
        await fetchCollaborators();
      } else {
        const err = await res.json();
        addToast('error', 'Promotion failed', err.message || 'Could not promote member');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations/${invitationId}/resend`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(),
      });
      if (res.ok) {
        addToast('success', 'Invitation resent', 'A new link has been sent. The old link is now invalid.');
        await fetchInvitations();
      } else {
        const err = await res.json();
        addToast('error', 'Resend failed', err.message || 'Could not resend invitation');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations/${invitationId}/revoke`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(),
      });
      if (res.ok) {
        addToast('info', 'Invitation revoked', 'The invitation link is now invalid.');
        await fetchInvitations();
      } else {
        const err = await res.json();
        addToast('error', 'Revoke failed', err.message || 'Could not revoke invitation');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProposeTransfer = async (successorId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(true),
        body: JSON.stringify({ successorMemberId: successorId }),
      });
      if (res.ok) {
        addToast('info', 'Transfer proposed', 'The designated administrator must accept the transfer to complete it.');
        await fetchCollaborators();
        await fetchTransferProposal();
      } else {
        const err = await res.json();
        addToast('error', 'Transfer failed', err.message || 'Could not propose transfer');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptTransfer = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer/accept`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(),
      });
      if (res.ok) {
        addToast('success', 'Ownership transfer accepted!', 'You are now the Organization Owner.');
        await fetchCollaborators();
        await fetchTransferProposal();
      } else {
        const err = await res.json();
        addToast('error', 'Accept failed', err.message || 'Could not accept transfer');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelTransfer = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer/cancel`, {
        method: 'POST', credentials: 'include', headers: apiHeaders(),
      });
      if (res.ok) {
        addToast('info', 'Transfer cancelled');
        await fetchTransferProposal();
      } else {
        const err = await res.json();
        addToast('error', 'Cancel failed', err.message || 'Could not cancel transfer');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle confirm dialog execution
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, memberId } = confirmAction;
    setConfirmAction(null);

    if (type === 'suspend') await handleChangeStatus(memberId, 'SUSPENDED');
    else if (type === 'reactivate') await handleChangeStatus(memberId, 'ACTIVE');
    else if (type === 'remove') await handleChangeStatus(memberId, 'REMOVED');
    else if (type === 'promote') await handlePromote(memberId);
    else if (type === 'propose-transfer') await handleProposeTransfer(memberId);
    else if (type === 'accept-transfer') await handleAcceptTransfer();
    else if (type === 'cancel-transfer') await handleCancelTransfer();
  };

  // ─── Computed ──────────────────────────────────────────────────────────────

  const currentOrg = organizations.find(o => o.id === organizationId);
  const isSuspended = currentOrg?.accessStatus === 'SUSPENDED';

  const isOwner = myMembership?.role === 'OWNER';
  const isAdmin = myMembership?.role === 'ADMIN' || isOwner;

  // Find my member record in the collaborators list
  const myMemberRecord = collaborators.find(m => m.identity?.id === myIdentityId);

  // Determine if I am the designated successor of the active proposal
  const iAmSuccessor = transferProposal && myMemberRecord && transferProposal.successorId === myMemberRecord.id;

  // Pending invitations only (for the invite tab count badge)
  const pendingInvitations = invitations.filter(inv => inv.state === 'PENDING');

  // ─── Render ────────────────────────────────────────────────────────────────

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
            Reason: {currentOrg?.suspensionReason || 'No reason provided.'}
          </p>
        </div>
        {organizations.length > 1 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="nova-select" style={{ maxWidth: 300, display: 'inline-block' }}>
              {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="nova-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="nova-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="nova-modal-header">
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 4px' }}>
                Confirm {confirmAction.label}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
                {confirmAction.type === 'promote' && `You are about to promote ${confirmAction.memberEmail} to Administrator. This is a sensitive, irreversible action.`}
                {confirmAction.type === 'suspend' && `Suspend ${confirmAction.memberEmail}? Their active sessions will be terminated immediately.`}
                {confirmAction.type === 'reactivate' && `Reactivate ${confirmAction.memberEmail}? They will regain access with their existing grants.`}
                {confirmAction.type === 'remove' && `Remove ${confirmAction.memberEmail}? Their access will be permanently revoked. History is preserved.`}
                {confirmAction.type === 'propose-transfer' && `Propose ownership transfer to ${confirmAction.memberEmail}? They must accept before the transfer completes. You will remain an Administrator until a separate action.`}
                {confirmAction.type === 'accept-transfer' && `Accept ownership transfer? You will become the Organization Owner.`}
                {confirmAction.type === 'cancel-transfer' && `Cancel the pending ownership transfer proposal?`}
              </p>
            </div>
            <div className="nova-modal-footer">
              <button onClick={() => setConfirmAction(null)} className="nova-btn nova-btn-ghost">Cancel</button>
              <button
                onClick={executeConfirmedAction}
                className={`nova-btn ${confirmAction.type === 'remove' ? 'nova-btn-danger' : confirmAction.type === 'suspend' ? 'nova-btn-warning' : 'nova-btn-primary'}`}
              >
                {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="nova-section-label">Administration</div>
          <h1 className="nova-section-title">Users &amp; Permissions</h1>
          <p className="nova-section-subtitle">Assign access by company, scope, and capability</p>
        </div>
        <button onClick={() => setIsInviteModalOpen(true)} className="nova-btn nova-btn-primary" style={{ padding: '10px 20px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Invite a User
        </button>
      </div>

      {/* Org selector (minimal, shown only when multiple orgs) */}
      {organizations.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="nova-select" style={{ maxWidth: 300 }}>
            {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--nova-border)', marginBottom: 24 }}>
        {(['members', 'invitations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--nova-accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--nova-accent)' : 'var(--nova-text-muted)',
              fontWeight: activeTab === tab ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab === 'members' ? 'Active Members' : 'Invitations'}
            {tab === 'invitations' && pendingInvitations.length > 0 && (
              <span style={{ background: 'var(--nova-accent)', color: '#fff', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', lineHeight: 1.5 }}>
                {pendingInvitations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Members Tab ── */}
      {activeTab === 'members' && (
        <div>
          <style>{`
            @media (min-width: 1024px) {
              .collab-grid { grid-template-columns: 260px 1fr !important; }
            }
          `}</style>

          {/* Active transfer proposal banner */}
          {transferProposal && (
            <div style={{
              marginBottom: 16, padding: '10px 16px', borderRadius: 8,
              background: 'rgba(var(--nova-accent-rgb, 99, 102, 241), 0.08)',
              border: '1px solid var(--nova-accent)',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--nova-text-primary)' }}>
                <strong>Pending ownership transfer</strong> — from{' '}
                <em>{transferProposal.proposer?.identity?.email ?? 'owner'}</em> to{' '}
                <em>{transferProposal.successor?.identity?.email ?? 'successor'}</em>.
                {' '}Expires {new Date(transferProposal.expiresAt).toLocaleDateString()}.
              </span>
              {iAmSuccessor && (
                <button
                  onClick={() => setConfirmAction({ type: 'accept-transfer', label: 'Accept Transfer', memberId: '', memberEmail: '' })}
                  className="nova-btn nova-btn-primary nova-btn-sm"
                >
                  Accept
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setConfirmAction({ type: 'cancel-transfer', label: 'Cancel Transfer', memberId: '', memberEmail: '' })}
                  className="nova-btn nova-btn-ghost nova-btn-sm"
                  style={{ color: 'var(--nova-status-danger)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          <div className="collab-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
            {/* Left — User list */}
            <div className="nova-card">
              <div className="nova-card-header" style={{ padding: '12px 16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--nova-text-primary)', margin: 0 }}>
                  Users ({collaborators.length})
                </h4>
              </div>
              {collaborators.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--nova-text-muted)', fontSize: '0.875rem' }}>
                  No members found.
                </div>
              ) : (
                collaborators.map(member => {
                  const sb = getStatusBadge(member.status);
                  return (
                    <div
                      key={member.id}
                      className={`nova-row${selectedMember?.id === member.id ? ' nova-row-selected' : ''}`}
                      onClick={() => setSelectedMember(member)}
                      style={{ padding: '10px 16px', gap: 10 }}
                    >
                      <div className="nova-avatar nova-avatar-sm">
                        {getInitials(member.identity?.email || '')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--nova-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.identity?.email}
                          {member.identity?.id === myIdentityId && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--nova-text-muted)', fontWeight: 400 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--nova-text-muted)' }}>{member.role}</div>
                      </div>
                      <span className={`nova-dot ${sb.dot}`} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Right — Selected member detail + actions */}
            <div className="nova-card">
              {selectedMember ? (
                <div className="nova-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div className="nova-avatar">
                      {getInitials(selectedMember.identity?.email || '')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--nova-text-primary)' }}>
                        {selectedMember.identity?.email}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className={`nova-badge ${getRoleBadgeClass(selectedMember.role)}`}>{selectedMember.role}</span>
                        <span className={`nova-badge ${getStatusBadge(selectedMember.status).cls}`}>
                          <span className={`nova-dot ${getStatusBadge(selectedMember.status).dot}`} />
                          {getStatusBadge(selectedMember.status).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grants info */}
                  {selectedMember.grants && (selectedMember.grants.capabilities?.length > 0 || selectedMember.grants.scopes?.length > 0) && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--nova-text-accent)', marginBottom: 8 }}>Effective Grants</h4>
                      {selectedMember.grants.capabilities && selectedMember.grants.capabilities.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {selectedMember.grants.capabilities.map((cap: string) => (
                            <span key={cap} className="nova-badge nova-badge-active" style={{ fontSize: '0.75rem' }}>✓ {cap}</span>
                          ))}
                        </div>
                      )}
                      {selectedMember.grants.scopes && selectedMember.grants.scopes.length > 0 && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)' }}>
                          Access to {selectedMember.grants.scopes.length} scope{selectedMember.grants.scopes.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}

                  <hr className="nova-divider" style={{ marginBottom: 16 }} />

                  {/* Actions — only shown if this is not my own account */}
                  {selectedMember.identity?.id === myIdentityId ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', textAlign: 'center', padding: '8px 0' }}>
                      This is your account. Manage your own settings elsewhere.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Edit grants — only for USER role, and only when ACTIVE */}
                      {selectedMember.role === 'USER' && selectedMember.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setEditGrantsMemberId(selectedMember.id); setEditGrantsMember(selectedMember); }}
                          className="nova-btn nova-btn-outline"
                          style={{ width: '100%' }}
                        >
                          Edit Grants
                        </button>
                      )}

                      {/* Promote USER → ADMIN (only when ACTIVE) */}
                      {selectedMember.role === 'USER' && selectedMember.status === 'ACTIVE' && (
                        <button
                          onClick={() => setConfirmAction({ type: 'promote', label: 'Promote to Administrator', memberId: selectedMember.id, memberEmail: selectedMember.identity.email })}
                          className="nova-btn nova-btn-primary"
                          style={{ width: '100%' }}
                        >
                          Promote to Administrator
                        </button>
                      )}

                      {/* Propose ownership transfer — only if I am OWNER and this member is ADMIN */}
                      {isOwner && selectedMember.role === 'ADMIN' && selectedMember.status === 'ACTIVE' && !transferProposal && (
                        <button
                          onClick={() => setConfirmAction({ type: 'propose-transfer', label: 'Propose Ownership Transfer', memberId: selectedMember.id, memberEmail: selectedMember.identity.email })}
                          className="nova-btn nova-btn-ghost"
                          style={{ width: '100%' }}
                        >
                          Propose Ownership Transfer
                        </button>
                      )}

                      {/* Suspend — only for ACTIVE non-OWNER */}
                      {selectedMember.status === 'ACTIVE' && selectedMember.role !== 'OWNER' && (
                        <button
                          onClick={() => setConfirmAction({ type: 'suspend', label: 'Suspend', memberId: selectedMember.id, memberEmail: selectedMember.identity.email })}
                          className="nova-btn nova-btn-warning"
                          style={{ width: '100%' }}
                        >
                          Suspend
                        </button>
                      )}

                      {/* Reactivate — only for SUSPENDED */}
                      {selectedMember.status === 'SUSPENDED' && selectedMember.role !== 'OWNER' && (
                        <button
                          onClick={() => setConfirmAction({ type: 'reactivate', label: 'Reactivate', memberId: selectedMember.id, memberEmail: selectedMember.identity.email })}
                          className="nova-btn nova-btn-outline"
                          style={{ width: '100%' }}
                        >
                          Reactivate
                        </button>
                      )}

                      {/* Remove — only for non-OWNER, non-REMOVED */}
                      {selectedMember.role !== 'OWNER' && selectedMember.status !== 'REMOVED' && (
                        <button
                          onClick={() => setConfirmAction({ type: 'remove', label: 'Remove Access', memberId: selectedMember.id, memberEmail: selectedMember.identity.email })}
                          className="nova-btn nova-btn-danger"
                          style={{ width: '100%' }}
                        >
                          Remove Access
                        </button>
                      )}

                      {selectedMember.status === 'REMOVED' && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', textAlign: 'center', padding: '8px 0' }}>
                          This member has been removed. History is preserved.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="nova-card-body" style={{ textAlign: 'center', color: 'var(--nova-text-muted)', padding: 40 }}>
                  Select a user to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Invitations Tab ── */}
      {activeTab === 'invitations' && (
        <div className="nova-card">
          <div className="nova-table-container">
            <div className="nova-table-inner">
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--nova-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--nova-border)' }}>
                <span>Email / Grants</span>
                <span>Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {invitations.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--nova-text-muted)' }}>
                  No invitations found.
                </div>
              ) : (
                invitations.map(inv => {
                  const isPending = inv.state === 'PENDING';
                  const capList = Array.isArray(inv.grants?.capabilities) ? inv.grants.capabilities : [];
                  return (
                    <div key={inv.id} className="nova-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--nova-text-primary)', fontWeight: 500 }}>{inv.email}</div>
                        {capList.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                            {capList.map((cap: string) => (
                              <span key={cap} style={{ fontSize: '0.7rem', background: 'var(--nova-bg-raised)', color: 'var(--nova-text-muted)', borderRadius: 4, padding: '1px 5px' }}>{cap}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)' }}>{inv.role || 'USER'}</span>
                      <span><InvitationStateBadge state={inv.state} /></span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isPending && (
                          <>
                            <button onClick={() => handleResendInvitation(inv.id)} className="nova-btn nova-btn-ghost nova-btn-sm">Resend</button>
                            <button
                              onClick={() => handleRevokeInvitation(inv.id)}
                              className="nova-btn nova-btn-sm"
                              style={{ background: 'none', border: 'none', color: 'var(--nova-status-danger)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, padding: '4px 8px' }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        availableScopes={availableScopes}
      />

      <EditGrantsModal
        isOpen={!!editGrantsMemberId}
        onClose={() => { setEditGrantsMemberId(null); setEditGrantsMember(null); }}
        collaboratorId={editGrantsMemberId!}
        currentGrants={editGrantsMember?.grants ?? null}
        onUpdate={handleUpdateGrants}
        availableScopes={availableScopes}
      />
    </div>
  );
}
