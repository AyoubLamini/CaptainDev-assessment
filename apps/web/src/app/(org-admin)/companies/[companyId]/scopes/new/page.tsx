'use client';

import { useState, FormEvent, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type PageProps = {
  params: Promise<{ companyId: string }>;
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export default function NewScopePage({ params }: PageProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const { companyId } = use(params);
  const organizationId = searchParams.get('orgId') || '00000000-0000-0000-0000-000000000000';

  const [step, setStep] = useState(1);
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
      const csrfToken = (getCookie('__Host-csrf') || getCookie('nova_csrf'));
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch(`http://localhost:3001/org-admin/${organizationId}/companies/${companyId}/scopes`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          type,
          name,
          externalId: externalId || undefined,
          location: location || undefined,
          responsiblePerson: responsiblePerson || undefined,
        })
      });

      if (res.ok) {
        addToast('success', 'Business scope created');
        router.push('/companies');
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

  const steps = [
    { num: 1, label: 'Association' },
    { num: 2, label: 'Information' },
    { num: 3, label: 'Review' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: '0.875rem' }}>
        <Link href="/companies" style={{ color: 'var(--nova-text-muted)', textDecoration: 'none' }}>Companies</Link>
        <span style={{ color: 'var(--nova-text-muted)' }}>›</span>
        <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>Add Business Scope</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="nova-section-label">Administration</div>
        <h1 className="nova-section-title">Create Business Scope</h1>
        <p className="nova-section-subtitle">Add a new operational unit under this company</p>
      </div>

      {/* Stepper */}
      <div className="nova-stepper">
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: 'contents' }}>
            <div className={`nova-step ${step === s.num ? 'nova-step-active' : step > s.num ? 'nova-step-done' : ''}`}>
              <div className="nova-step-circle">
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="nova-step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`nova-step-connector ${step > s.num ? 'nova-step-connector-done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .scope-form-grid { grid-template-columns: 2fr 1fr !important; }
        }
      `}</style>
      <div className="scope-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Left — Form */}
        <div className="nova-card">
          <div className="nova-card-body">
            {error && (
              <div className="nova-alert nova-alert-error" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="nova-label">Company</label>
                  <input type="text" value={companyId} readOnly className="nova-input" style={{ opacity: 0.6 }} />
                </div>
                <div>
                  <label className="nova-label">Scope Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="nova-select">
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="PROPERTY_DEVELOPMENT">Property Development</option>
                    <option value="CONSTRUCTION">Construction</option>
                    <option value="EVENT">Event</option>
                  </select>
                </div>
                <div>
                  <label className="nova-label">Scope Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="nova-input"
                    placeholder="e.g. Downtown Location"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Link href="/companies" className="nova-btn nova-btn-ghost">Cancel</Link>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!name.trim()}
                    className="nova-btn nova-btn-primary"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="nova-label">External ID (Optional)</label>
                  <input
                    type="text"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    className="nova-input"
                  />
                </div>
                <div>
                  <label className="nova-label">Location (Optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="nova-input"
                    placeholder="e.g. 123 Main St"
                  />
                </div>
                <div>
                  <label className="nova-label">Responsible Person (Optional)</label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    className="nova-input"
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" onClick={() => setStep(1)} className="nova-btn nova-btn-ghost">← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="nova-btn nova-btn-primary">Next →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 16 }}>
                  Review & Confirm
                </h3>
                <div style={{
                  background: 'var(--nova-bg-base)',
                  border: '1px solid var(--nova-border)',
                  borderRadius: 8, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 10,
                  marginBottom: 20,
                  fontSize: '0.875rem',
                }}>
                  <ReviewRow label="Type" value={type} />
                  <ReviewRow label="Name" value={name} />
                  <ReviewRow label="External ID" value={externalId || '—'} />
                  <ReviewRow label="Location" value={location || '—'} />
                  <ReviewRow label="Responsible Person" value={responsiblePerson || '—'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" onClick={() => setStep(2)} disabled={loading} className="nova-btn nova-btn-ghost">
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="nova-btn nova-btn-primary">
                    {loading ? 'Creating…' : 'Create Scope'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Summary */}
        <div className="nova-card" style={{ alignSelf: 'flex-start' }}>
          <div className="nova-card-header">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: 0 }}>Summary</h4>
          </div>
          <div className="nova-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8125rem' }}>
            <div>
              <span style={{ color: 'var(--nova-text-muted)' }}>Organization</span>
              <div style={{ color: 'var(--nova-text-primary)', fontWeight: 500, marginTop: 2, wordBreak: 'break-all' }}>{organizationId}</div>
            </div>
            <hr className="nova-divider" />
            <div>
              <span style={{ color: 'var(--nova-text-muted)' }}>Company</span>
              <div style={{ color: 'var(--nova-text-primary)', fontWeight: 500, marginTop: 2, wordBreak: 'break-all' }}>{companyId}</div>
            </div>
            <hr className="nova-divider" />
            <div>
              <span style={{ color: 'var(--nova-text-muted)' }}>Type</span>
              <div style={{ color: 'var(--nova-text-primary)', fontWeight: 500, marginTop: 2 }}>{type}</div>
            </div>
            {name && (
              <>
                <hr className="nova-divider" />
                <div>
                  <span style={{ color: 'var(--nova-text-muted)' }}>Name</span>
                  <div style={{ color: 'var(--nova-text-primary)', fontWeight: 500, marginTop: 2 }}>{name}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>{label}:</span>
      <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
