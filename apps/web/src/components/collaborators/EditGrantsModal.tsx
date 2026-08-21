'use client';

import { useState, useEffect } from 'react';

type EditGrantsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  onUpdate: (collaboratorId: string, preset: string, selectedScopes: string[]) => Promise<void>;
  availableScopes: { id: string; name: string }[];
};

export default function EditGrantsModal({ isOpen, onClose, collaboratorId, onUpdate, availableScopes }: EditGrantsModalProps) {
  const [preset, setPreset] = useState('viewer'); // 'viewer', 'editor', 'manager'
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreset('viewer'); // Reset when opened, ideally we'd map current grants to a preset
      setSelectedScopes([]); // Reset scopes when opened, ideally map from current grants
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onUpdate(collaboratorId, preset, selectedScopes);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit User Grants</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permission Preset</label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="editor">Editor (Read & Write)</option>
                  <option value="manager">Manager (Manage entities)</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Presets resolve to explicit capabilities that dictate the user's access level.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Scopes</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                  {availableScopes.length === 0 ? (
                    <p className="text-xs text-gray-500">No active scopes available.</p>
                  ) : (
                    availableScopes.map(scope => (
                      <label key={scope.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter(id => id !== scope.id));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{scope.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Select scopes to limit access boundaries.
                </p>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Grants'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
