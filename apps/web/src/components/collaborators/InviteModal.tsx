'use client';

import { useState } from 'react';

type InviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string, preset: string, selectedScopes: string[]) => Promise<void>;
  availableScopes: { id: string; name: string }[];
};

export default function InviteModal({ isOpen, onClose, onInvite, availableScopes }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [preset, setPreset] = useState('viewer');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onInvite(email, 'USER', preset, selectedScopes);
    setIsSubmitting(false);
    setEmail('');
    setPreset('viewer');
    setSelectedScopes([]);
    onClose();
  };

  return (
    <div className="nova-modal-overlay" onClick={onClose}>
      <div className="nova-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="nova-modal-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nova-text-primary)', margin: '0 0 4px' }}>
            Invite Collaborator
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--nova-text-muted)', margin: 0 }}>
            Send an invitation with explicit capabilities and scope access.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="nova-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="nova-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="nova-input"
                placeholder="collaborator@example.com"
                required
              />
            </div>

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
                Presets resolve to explicit capabilities upon invitation.
              </p>
            </div>

            <div>
              <label className="nova-label">Business Scopes</label>
              <div style={{
                maxHeight: 160, overflowY: 'auto',
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
                Select scopes to limit access boundaries.
              </p>
            </div>
          </div>

          <div className="nova-modal-footer">
            <button type="button" onClick={onClose} className="nova-btn nova-btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="nova-btn nova-btn-primary">
              {isSubmitting ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}