import React, { useRef } from 'react';
import { useEffect } from 'react';

export default function PersonaModal({ currentPersonaId, onSelectPersona, onClose }) {
  const fileInputRef = useRef(null);
  const customPersona = localStorage.getItem('custom-persona');
  const customPersonaName = localStorage.getItem('custom-persona-name');

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const name = file.name.replace(/\.md$/, '');
      localStorage.setItem('custom-persona', text);
      localStorage.setItem('custom-persona-name', name);
      onSelectPersona('custom', text);
    };
    reader.readAsText(file);
  };

  const handleRemoveCustom = () => {
    localStorage.removeItem('custom-persona');
    localStorage.removeItem('custom-persona-name');
    // Switch back to default if currently using custom
    if (currentPersonaId === 'custom') {
      onSelectPersona('default', null);
    } else {
      // Force re-render by selecting current again
      onSelectPersona(currentPersonaId, null);
    }
  };

  return (
    <div
      className="modal-backdrop interactive"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-label="AI Persona selection"
    >
      <div className="glass-panel settings-panel" style={{ padding: '2rem' }}>
        <h3 className="serif-text settings-title">Persona</h3>
        <div className="persona-list">
          <button
            className={`persona-card interactive ${currentPersonaId === 'default' ? 'active' : ''}`}
            onClick={() => onSelectPersona('default', null)}
          >
            <span className="persona-name">The Caretaker</span>
            <span className="persona-desc">Melancholic guardian of forgotten memories</span>
          </button>

          {customPersona && (
            <div className="persona-card-wrapper">
              <button
                className={`persona-card interactive ${currentPersonaId === 'custom' ? 'active' : ''}`}
                onClick={() => onSelectPersona('custom', customPersona)}
              >
                <span className="persona-name">{customPersonaName || 'Custom Persona'}</span>
                <span className="persona-desc">Your uploaded persona</span>
              </button>
              <button
                className="persona-remove-btn"
                onClick={handleRemoveCustom}
                aria-label="Remove custom persona"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        <button
          className="btn-pill btn-pill-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ marginTop: '1.5rem', width: '100%', textAlign: 'center' }}
        >
          Upload Custom Persona (.md)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <button className="btn btn-small calendar-close-btn" onClick={onClose} style={{ marginTop: '1rem' }}>
          Close
        </button>
      </div>
    </div>
  );
}
