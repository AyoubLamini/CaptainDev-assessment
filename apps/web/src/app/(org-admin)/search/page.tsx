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
  const organizationId = searchParams.get('orgId') || '00000000-0000-0000-0000-000000000000';
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org-admin/${organizationId}/search?q=${encodeURIComponent(q)}`, {
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

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Global Search</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies and scopes..."
              className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Companies ({results.companies.totalCount})
            </h2>
            {results.companies.data.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {results.companies.data.map(company => (
                    <li key={company.id} className="p-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-600 truncate">{company.name}</div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {company.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex text-sm text-gray-500">
                          <p>ID: {company.id}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No companies found.</p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Business Scopes ({results.scopes.totalCount})
            </h2>
            {results.scopes.data.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {results.scopes.data.map(scope => (
                    <li key={scope.id} className="p-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-600 truncate">{scope.name}</div>
                        <div className="ml-2 flex-shrink-0 flex gap-2">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {scope.type}
                          </p>
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${scope.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {scope.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex flex-col gap-1 text-sm text-gray-500">
                          <p>ID: {scope.id}</p>
                          <p>Company ID: {scope.companyId}</p>
                          {scope.externalId && <p>External ID: {scope.externalId}</p>}
                          {scope.location && <p>Location: {scope.location}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No business scopes found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
