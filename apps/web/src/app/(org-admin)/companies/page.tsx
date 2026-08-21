'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies`, {
        credentials: 'include',
        headers: {
          'x-organization-id': organizationId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
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
      fetchCompanies();
    }
  }, [organizationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'x-organization-id': organizationId
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setName('');
        fetchCompanies();
      } else {
        const err = await res.json();
        alert(`Failed to create: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'x-organization-id': organizationId
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${editingCompany.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ name: editingCompany.name }),
      });
      if (res.ok) {
        setEditingCompany(null);
        fetchCompanies();
      } else {
        const err = await res.json();
        alert(`Failed to update: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = {
        'x-organization-id': organizationId
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${id}/deactivate`, {
        method: 'PATCH',
        credentials: 'include',
        headers
      });
      if (res.ok) {
        fetchCompanies();
      } else {
        const err = await res.json();
        alert(`Failed to deactivate: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReactivate = async (company: Company) => {
    try {
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${company.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ name: company.name, status: 'ACTIVE' }),
      });
      if (res.ok) {
        fetchCompanies();
      } else {
        const err = await res.json();
        alert(`Failed to reactivate: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Companies</h1>
      
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

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Company</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end">
          <div className="flex-1 sm:max-w-xs">
            <label htmlFor="name" className="sr-only">Company Name</label>
            <input 
              id="name"
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Company Name" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required 
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create
          </button>
        </form>
      </div>

      {editingCompany && (
        <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Edit Company</h2>
          <form onSubmit={handleUpdate} className="flex gap-4 items-end">
            <div className="flex-1 sm:max-w-xs">
              <input 
                value={editingCompany.name} 
                onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required 
              />
            </div>
            <button 
              type="submit"
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={() => setEditingCompany(null)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Companies</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {companies.map((c: Company) => (
              <li key={c.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  <span className={`text-xs px-2 py-1 mt-1 rounded-full w-max ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.status}
                  </span>
                  {c.scopes && c.scopes.length > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      <strong className="text-gray-700">Business Scopes:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {c.scopes.map(s => (
                          <li key={s.id}>
                            <span className="font-medium text-gray-800">{s.name}</span> <span className="text-xs text-gray-400">({s.type})</span> - 
                            <span className={`ml-1 text-xs ${s.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}`}>{s.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0">
                  <button 
                    onClick={() => setEditingCompany(c)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  {c.status === 'ACTIVE' ? (
                    <button 
                      onClick={() => handleDeactivate(c.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleReactivate(c)}
                      className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Reactivate
                    </button>
                  )}
                  <Link 
                    href={`/companies/${c.id}/scopes/new?orgId=${organizationId}`}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Add Scope
                  </Link>
                </div>
              </li>
            ))}
            {companies.length === 0 && (
              <li className="p-4 sm:px-6 text-sm text-gray-500 text-center">
                No companies found
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
