'use client';

import { useState, useEffect } from 'react';

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

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Provision form state
  const [provisionName, setProvisionName] = useState('');
  const [provisionReason, setProvisionReason] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Invite form state
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Action modal state (Suspend/Reactivate/Disable)
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
      setOrganizations(data.data || []);
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
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message);
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
      alert('Invitation sent successfully!');
    } catch (err: any) {
      alert(err.message);
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
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message);
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Platform Directory</h1>
            <p className="text-gray-400 mt-2">Manage organizations and core platform operations.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content - Directory */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
              <div className="px-6 py-5 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">Organizations</h3>
              </div>
              
              {loading ? (
                <div className="p-6 text-gray-400">Loading directory...</div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {organizations.map((org) => (
                    <li key={org.id} className="p-6 hover:bg-gray-750 transition-colors flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{org.name}</h4>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <span className={`h-2 w-2 rounded-full mr-2 ${org.accessStatus === 'ACTIVE' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                            {org.accessStatus}
                          </span>
                          <span>ID: {org.id.split('-')[0]}...</span>
                          {org.ownerEmail && (
                            <span className="text-gray-300">Owner: {org.ownerEmail}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setInviteOrgId(org.id)}
                          disabled={!!org.ownerEmail}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Invite Owner
                        </button>
                        <button 
                          onClick={() => openActionModal(org.id, org.accessStatus === 'SUSPENDED' ? 'reactivate' : 'suspend')}
                          disabled={org.accessStatus === 'DISABLED'}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {org.accessStatus === 'SUSPENDED' ? 'Enable' : 'Suspend'}
                        </button>
                        <button 
                          onClick={() => openActionModal(org.id, 'disable')}
                          disabled={org.accessStatus === 'DISABLED'}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Disable
                        </button>
                      </div>
                    </li>
                  ))}
                  
                  {organizations.length === 0 && (
                    <li className="p-6 text-center text-gray-500">
                      No organizations found. Provision one to get started.
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar - Provisioning */}
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Provision Organization</h3>
              <form onSubmit={handleProvision} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={provisionName}
                    onChange={(e) => setProvisionName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    value={provisionReason}
                    onChange={(e) => setProvisionReason(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Initial customer onboarding"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="w-full py-2 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProvisioning ? 'Provisioning...' : 'Provision Now'}
                </button>
              </form>
            </div>
          </div>
          
        </div>
      </div>

      {/* Invite Modal */}
      {inviteOrgId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Invite Initial Owner</h3>
            <p className="text-gray-400 text-sm mb-6">They will receive a secure email link to activate this organization and set their password.</p>
            
            <form onSubmit={handleInvite} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="owner@example.com"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setInviteOrgId(null)}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modal (Suspend/Reactivate/Disable) */}
      {actionOrgId && actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 capitalize">{actionType} Organization</h3>
            <p className="text-gray-400 text-sm mb-6">
              This is a highly destructive action requiring recent password confirmation.
            </p>
            
            <form onSubmit={handleAction} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Reason for action</label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Violation of terms..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm your password</label>
                <input
                  type="password"
                  required
                  value={actionPassword}
                  onChange={(e) => setActionPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => { setActionOrgId(null); setActionType(null); }}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActing}
                  className={`flex-1 py-2 px-4 font-medium rounded-lg transition-colors disabled:opacity-50 text-white ${
                    actionType === 'reactivate' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {isActing ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
