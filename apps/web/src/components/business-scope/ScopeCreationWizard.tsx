'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScopeCreationWizard({ companyId, organizationId }: { companyId: string, organizationId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'RESTAURANT',
    name: '',
    externalId: '',
    location: '',
    responsiblePerson: '',
  });
  const [error, setError] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/org-admin/${organizationId}/companies/${companyId}/scopes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': organizationId
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError(data);
        } else {
          setError({ message: data.message || 'An error occurred' });
        }
        return;
      }

      router.push(`/companies/${companyId}`);
    } catch (err: any) {
      setError({ message: err.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Additional' },
    { num: 3, label: 'Review' },
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 24 }}>
        Create Business Scope
      </h2>

      {/* Stepper */}
      <div className="nova-stepper" style={{ marginBottom: 28 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`nova-step ${step === s.num ? 'nova-step-active' : step > s.num ? 'nova-step-done' : ''}`}>
              <div className="nova-step-circle">{step > s.num ? '✓' : s.num}</div>
              <span className="nova-step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`nova-step-connector ${step > s.num ? 'nova-step-connector-done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="nova-alert nova-alert-error" style={{ marginBottom: 20 }}>
          <span><strong>Error: </strong>{error.message}</span>
          {error.scope && (
            <div style={{ marginTop: 8, fontSize: '0.8125rem' }}>
              <p style={{ margin: '2px 0' }}>Conflicting Scope ID: {error.scope.id}</p>
              <p style={{ margin: '2px 0' }}>Name: {error.scope.name}</p>
            </div>
          )}
        </div>
      )}

      <div className="nova-card">
        <div className="nova-card-body">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="nova-label">Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="nova-select">
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="PROPERTY_DEVELOPMENT">Property Development</option>
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="EVENT">Event</option>
                </select>
              </div>
              <div>
                <label className="nova-label">Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="nova-input" required />
              </div>
              <div>
                <label className="nova-label">External Identifier (Optional)</label>
                <input type="text" name="externalId" value={formData.externalId} onChange={handleChange} className="nova-input" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleNext} disabled={!formData.name.trim()} className="nova-btn nova-btn-primary">
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="nova-label">Location (Optional)</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="nova-input" />
              </div>
              <div>
                <label className="nova-label">Responsible Person (Optional)</label>
                <input type="text" name="responsiblePerson" value={formData.responsiblePerson} onChange={handleChange} className="nova-input" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={handleBack} className="nova-btn nova-btn-ghost">← Back</button>
                <button onClick={handleNext} className="nova-btn nova-btn-primary">Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--nova-text-primary)', marginBottom: 16 }}>Review & Confirm</h3>
              <div style={{
                background: 'var(--nova-bg-base)',
                border: '1px solid var(--nova-border)',
                borderRadius: 8, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 10,
                marginBottom: 20, fontSize: '0.875rem',
              }}>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Organization:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{organizationId}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Company:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{companyId}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Type:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{formData.type}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Name:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{formData.name}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>External ID:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{formData.externalId || '—'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Location:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{formData.location || '—'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: 'var(--nova-text-muted)', minWidth: 140 }}>Responsible:</span>
                  <span style={{ color: 'var(--nova-text-primary)', fontWeight: 500 }}>{formData.responsiblePerson || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={handleBack} disabled={isSubmitting} className="nova-btn nova-btn-ghost">← Back</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="nova-btn nova-btn-primary">
                  {isSubmitting ? 'Submitting…' : 'Confirm & Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
