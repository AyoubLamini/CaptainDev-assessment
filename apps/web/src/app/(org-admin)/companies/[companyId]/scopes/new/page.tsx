'use client';

import { useState, FormEvent, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PageProps = {
  params: Promise<{ companyId: string }>;
};

export default function NewScopePage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyId } = use(params);
  const organizationId = searchParams.get('orgId') || '00000000-0000-0000-0000-000000000000';

  const [type, setType] = useState('RESTAURANT');
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [location, setLocation] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/org-admin/${organizationId}/companies/${companyId}/scopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId
        },
        body: JSON.stringify({
          type,
          name,
          externalId: externalId || undefined,
          location: location || undefined,
          responsiblePerson: responsiblePerson || undefined,
        })
      });

      if (res.ok) {
        router.push('/companies'); // redirect back to companies list
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to create business scope');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Business Scope</h1>
        <Link 
          href="/companies"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          &larr; Back to Companies
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Scope Name *</label>
            <input 
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. Downtown Location"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type *</label>
            <select
              id="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="RESTAURANT">Restaurant</option>
              <option value="PROPERTY_DEVELOPMENT">Property Development</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="EVENT">Event</option>
            </select>
          </div>

          <div>
            <label htmlFor="externalId" className="block text-sm font-medium text-gray-700">External ID (Optional)</label>
            <input 
              id="externalId"
              type="text"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location (Optional)</label>
            <input 
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="responsiblePerson" className="block text-sm font-medium text-gray-700">Responsible Person (Optional)</label>
            <input 
              id="responsiblePerson"
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Scope'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
