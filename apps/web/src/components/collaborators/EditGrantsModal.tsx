'use client';

import { useState, useEffect } from 'react';

type EditGrantsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  currentGrants: { capabilities?: string[]; scopes?: string[] } | null;
  onUpdate: (collaboratorId: string, preset: string, selectedScopes: string[]) => Promise<void>;
  availableScopes: { id: string; name: string }[];
};

function grantsToPreset(capabilities?: string[]): string {
  if (!capabilities || capabilities.length === 0) return 'viewer';
  if (capabilities.includes('write')) return 'manager';
  return 'viewer';
}

export default function EditGrantsModal({ isOpen, onClose, collaboratorId, currentGrants, onUpdate, availableScopes }: EditGrantsModalProps) {
  const [preset, setPreset] = useState('viewer');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate with current grants when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreset(grantsToPreset(currentGrants?.capabilities));
      setSelectedScopes(Array.isArray(currentGrants?.scopes) ? currentGrants!.scopes : []);
    }
  }, [isOpen, currentGrants]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onUpdate(collaboratorId, preset, selectedScopes);
    setIsSubmitting(false);
    onClose();
  };

  const presetCapabilities: Record<string, string[]> = {
    viewer: ['read'],
    manager: ['read', 'write'],
  };

  return (
    <div className="nova-modal-overlay" onClick={onClose}>
      <div className="nova-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="nova-modal-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 4px' }}>
            Edit User Grants
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
            Update the permission preset and scope access for this user.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="nova-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="nova-label">Permission Preset</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="nova-select"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="manager">Manager (Read & Write)</option>
              </select>
              <p style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--nova-text-muted)' }}>
                Resolves to: <strong>{presetCapabilities[preset]?.join(', ')}</strong>
              </p>
            </div>

            <div>
              <label className="nova-label">Business Scopes</label>
              <div style={{
                maxHeight: 180, overflowY: 'auto',
                border: '1px solid var(--nova-border)', borderRadius: 8,
                padding: 10, background: 'var(--nova-bg-base)',
              }}>
                {availableScopes.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>No active scopes available.</p>
                ) : (
                  availableScopes.map(scope => (
                    <label key={scope.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedScopes([...selectedScopes, scope.id]);
                          else setSelectedScopes(selectedScopes.filter(id => id !== scope.id));
                        }}
                        className="nova-checkbox"
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--nova-text-primary)' }}>{scope.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--nova-text-muted)' }}>
                {selectedScopes.length === 0
                  ? 'No scopes selected — user has no business scope access.'
                  : `${selectedScopes.length} scope${selectedScopes.length !== 1 ? 's' : ''} selected.`}
              </p>
            </div>
          </div>

          <div className="nova-modal-footer">
            <button type="button" onClick={onClose} className="nova-btn nova-btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="nova-btn nova-btn-primary">
              {isSubmitting ? 'Saving…' : 'Save Grants'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
