import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function SettingsModal({ settings, onSettingsChange, onClose }) {
  const [particleIntensity, setParticleIntensity] = useState(settings?.particleIntensity ?? 1);
  const [voiceTone, setVoiceTone] = useState(settings?.voiceTone ?? 1);
  const [voiceType, setVoiceType] = useState(settings?.voiceType ?? "Female");
  const backdropRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  // Debounced settings propagation
  const propagateSettings = useCallback((pi, vt, vType) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onSettingsChange) {
        onSettingsChange({ particleIntensity: pi, voiceTone: vt, voiceType: vType });
      }
    }, 100);
  }, [onSettingsChange]);

  const handleParticleChange = (val) => {
    setParticleIntensity(val);
    propagateSettings(val, voiceTone, voiceType);
  };

  const handleVoiceToneChange = (val) => {
    setVoiceTone(val);
    propagateSettings(particleIntensity, val, voiceType);
  };

  const handleVoiceTypeChange = (val) => {
    setVoiceType(val);
    propagateSettings(particleIntensity, voiceTone, val);
  };

  return (
    <div
      className="modal-backdrop interactive settings-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Atmosphere settings"
    >
      <div className="modal-content settings-panel">
        <h2 className="title-main settings-title">Atmosphere Settings</h2>

        <div className="settings-group">
           <label className="sans-text settings-label" htmlFor="particle-range">Particle Reactivity</label>
           <input
             id="particle-range"
             type="range"
             min="0"
             max="3"
             step="0.1"
             value={particleIntensity}
             onChange={(e) => handleParticleChange(parseFloat(e.target.value))}
             className="settings-range"
             aria-valuemin={0}
             aria-valuemax={3}
             aria-valuenow={particleIntensity}
           />
           <p className="settings-hint">Adjusts how much particles dance to music/voice.</p>
        </div>

        <div className="settings-group">
           <label className="sans-text settings-label" htmlFor="voice-type-select">Voice Persona Type</label>
           <select
             id="voice-type-select"
             value={voiceType}
             onChange={(e) => handleVoiceTypeChange(e.target.value)}
             className="settings-select"
           >
             <option value="Female">Female (Default)</option>
             <option value="Male">Male</option>
           </select>
        </div>

        <div className="settings-group">
           <label className="sans-text settings-label" htmlFor="voice-tone-range">Voice Persona Tone</label>
           <input
             id="voice-tone-range"
             type="range"
             min="0.5"
             max="2"
             step="0.1"
             value={voiceTone}
             onChange={(e) => handleVoiceToneChange(parseFloat(e.target.value))}
             className="settings-range"
             aria-valuemin={0.5}
             aria-valuemax={2}
             aria-valuenow={voiceTone}
           />
           <p className="settings-hint">Lower for deep/calm, higher for bright/fast.</p>
        </div>

        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
