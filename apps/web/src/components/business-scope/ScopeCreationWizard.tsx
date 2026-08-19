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
          setError(data); // Expecting { message, scope }
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

  return (
    <div className="wizard-container p-6 max-w-2xl mx-auto border rounded">
      <h2 className="text-2xl font-bold mb-4">Create Business Scope (Step {step} of 3)</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error.message}</span>
          {error.scope && (
            <div className="mt-2 text-sm">
              <p>Conflicting Scope ID: {error.scope.id}</p>
              <p>Name: {error.scope.name}</p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="step-1">
          <h3 className="text-lg mb-2">Scope Details</h3>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="border p-2 w-full">
              <option value="RESTAURANT">Restaurant</option>
              <option value="PROPERTY_DEVELOPMENT">Property Development</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="EVENT">Event</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="border p-2 w-full" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">External Identifier (Optional)</label>
            <input type="text" name="externalId" value={formData.externalId} onChange={handleChange} className="border p-2 w-full" />
          </div>
          <button onClick={handleNext} disabled={!formData.name.trim()} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="step-2">
          <h3 className="text-lg mb-2">Additional Information</h3>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Location (Optional)</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} className="border p-2 w-full" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Responsible Person (Optional)</label>
            <input type="text" name="responsiblePerson" value={formData.responsiblePerson} onChange={handleChange} className="border p-2 w-full" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleBack} className="bg-gray-300 px-4 py-2 rounded">Back</button>
            <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-3">
          <h3 className="text-lg mb-2">Review & Confirm</h3>
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p><strong>Organization ID:</strong> {organizationId}</p>
            <p><strong>Company ID:</strong> {companyId}</p>
            <p><strong>Type:</strong> {formData.type}</p>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>External ID:</strong> {formData.externalId || '(None)'}</p>
            <p><strong>Location:</strong> {formData.location || '(None)'}</p>
            <p><strong>Responsible Person:</strong> {formData.responsiblePerson || '(None)'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleBack} disabled={isSubmitting} className="bg-gray-300 px-4 py-2 rounded">Back</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-500 text-white px-4 py-2 rounded">
              {isSubmitting ? 'Submitting...' : 'Confirm & Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
