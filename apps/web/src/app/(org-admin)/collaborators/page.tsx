'use client';

import { useState, useEffect } from 'react';
import InviteModal from '@/components/collaborators/InviteModal';
import EditGrantsModal from '@/components/collaborators/EditGrantsModal';

type Collaborator = {
  id: string;
  role: string;
  status: string;
  identity: { id: string; email: string };
  grants: any;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  consumedAt: string | null;
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export default function CollaboratorsPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editGrantsMemberId, setEditGrantsMemberId] = useState<string | null>(null);
  const [availableScopes, setAvailableScopes] = useState<{id: string; name: string}[]>([]);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations`, {
        credentials: 'include',
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScopes = async () => {
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
                  scopes.push({ id: scope.id, name: `${company.name} - ${scope.name}` });
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
          }
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    if (organizationId) {
      if (activeTab === 'members') fetchCollaborators();
      else fetchInvitations();
      fetchScopes();
    }
  }, [organizationId, activeTab]);

  const handleInvite = async (email: string, role: string, preset: string, selectedScopes: string[]) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      let capabilities: string[] = [];
      if (role === 'USER') {
        if (preset === 'viewer') capabilities = ['read'];
        else if (preset === 'editor') capabilities = ['read', 'write'];
        else if (preset === 'manager') capabilities = ['read', 'write', 'manage'];
      }

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email, role, grants: { capabilities, scopes: selectedScopes } }),
      });
      if (res.ok) {
        alert('Invitation sent successfully!');
        if (activeTab === 'invitations') fetchInvitations();
      } else {
        const err = await res.json();
        alert(`Failed to invite: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateGrants = async (collaboratorId: string, preset: string, selectedScopes: string[]) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      let capabilities: string[] = [];
      if (preset === 'viewer') capabilities = ['read'];
      else if (preset === 'editor') capabilities = ['read', 'write'];
      else if (preset === 'manager') capabilities = ['read', 'write', 'manage'];

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/grants`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ grants: { capabilities, scopes: selectedScopes } }),
      });
      if (res.ok) {
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to update grants: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeStatus = async (collaboratorId: string, status: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to change status: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromote = async (collaboratorId: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/${collaboratorId}/promote`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ reason: 'Promoted via web interface' }),
      });
      if (res.ok) {
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to promote: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations/${invitationId}/resend`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        alert('Invitation resent successfully!');
        fetchInvitations();
      } else {
        const err = await res.json();
        alert(`Failed to resend: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/collaborators/invitations/${invitationId}/revoke`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        fetchInvitations();
      } else {
        const err = await res.json();
        alert(`Failed to revoke: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProposeTransfer = async (successorId: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ successorMemberId: successorId }),
      });
      if (res.ok) {
        alert('Ownership transfer proposed.');
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to propose transfer: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptTransfer = async () => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer/accept`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        alert('Ownership transfer accepted!');
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to accept transfer: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelTransfer = async () => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 'x-organization-id': organizationId };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/ownership-transfer/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        alert('Ownership transfer cancelled.');
        fetchCollaborators();
      } else {
        const err = await res.json();
        alert(`Failed to cancel transfer: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Collaborators</h1>
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Invite Collaborator
        </button>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization (Context):
        </label>
        {organizations.length > 0 ? (
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        ) : (
          <input 
            value={organizationId} 
            onChange={e => setOrganizationId(e.target.value)} 
            placeholder="Loading organizations or none found..."
            className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Members
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Invitations
          </button>
        </nav>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collaborators.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.identity?.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    {member.role === 'USER' && (
                      <button onClick={() => setEditGrantsMemberId(member.id)} className="text-blue-600 hover:text-blue-900">Grants</button>
                    )}
                    {member.role === 'USER' && (
                      <button onClick={() => handlePromote(member.id)} className="text-indigo-600 hover:text-indigo-900">Promote</button>
                    )}
                    {member.status === 'ACTIVE' && member.role !== 'OWNER' && (
                      <button onClick={() => handleChangeStatus(member.id, 'SUSPENDED')} className="text-yellow-600 hover:text-yellow-900">Suspend</button>
                    )}
                    {member.status === 'SUSPENDED' && member.role !== 'OWNER' && (
                      <button onClick={() => handleChangeStatus(member.id, 'ACTIVE')} className="text-green-600 hover:text-green-900">Reactivate</button>
                    )}
                    {member.role !== 'OWNER' && (
                      <button onClick={() => handleChangeStatus(member.id, 'REMOVED')} className="text-red-600 hover:text-red-900">Remove</button>
                    )}
                    {member.role === 'ADMIN' && (
                      <button onClick={() => handleProposeTransfer(member.id)} className="text-purple-600 hover:text-purple-900">Propose Transfer</button>
                    )}
                  </td>
                </tr>
              ))}
              {collaborators.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No active members found.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-4">
            <button onClick={handleAcceptTransfer} className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">Accept Pending Transfer (If Any)</button>
            <button onClick={handleCancelTransfer} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Cancel Active Transfer (Owner Only)</button>
          </div>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.role || 'USER'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inv.consumedAt ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Consumed</span>
                    ) : new Date(inv.expiresAt) < new Date() ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Expired</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    {!inv.consumedAt && new Date(inv.expiresAt) >= new Date() && (
                      <>
                        <button onClick={() => handleResendInvitation(inv.id)} className="text-blue-600 hover:text-blue-900">Resend</button>
                        <button onClick={() => handleRevokeInvitation(inv.id)} className="text-red-600 hover:text-red-900">Revoke</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No pending invitations.</td>
                </tr>
              )}
            </tbody>
          </table>
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
        onClose={() => setEditGrantsMemberId(null)}
        collaboratorId={editGrantsMemberId!}
        onUpdate={handleUpdateGrants}
        availableScopes={availableScopes}
      />
    </div>
  );
}
