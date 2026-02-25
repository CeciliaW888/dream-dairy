import React, { useState, useEffect, useRef, useCallback } from 'react';

const GEMINI_VOICES = [
  { name: 'Kore', desc: 'Warm, calm female' },
  { name: 'Charon', desc: 'Deep, steady male' },
  { name: 'Fenrir', desc: 'Low, resonant male' },
  { name: 'Aoede', desc: 'Bright, expressive female' },
  { name: 'Puck', desc: 'Playful, energetic' },
];

export default function SettingsModal({ settings, onSettingsChange, onClose }) {
  const [particleIntensity, setParticleIntensity] = useState(settings?.particleIntensity ?? 1);
  const [voiceName, setVoiceName] = useState(settings?.voiceName ?? 'Kore');
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

  const propagateSettings = useCallback((pi, vn) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onSettingsChange) {
        onSettingsChange({ particleIntensity: pi, voiceName: vn });
      }
    }, 100);
  }, [onSettingsChange]);

  const handleParticleChange = (val) => {
    setParticleIntensity(val);
    propagateSettings(val, voiceName);
  };

  const handleVoiceChange = (val) => {
    setVoiceName(val);
    propagateSettings(particleIntensity, val);
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
           <label className="sans-text settings-label" htmlFor="voice-select">Gemini Voice</label>
           <select
             id="voice-select"
             value={voiceName}
             onChange={(e) => handleVoiceChange(e.target.value)}
             className="settings-select"
           >
             {GEMINI_VOICES.map((v) => (
               <option key={v.name} value={v.name}>
                 {v.name} — {v.desc}
               </option>
             ))}
           </select>
           <p className="settings-hint">Changes the AI voice personality.</p>
        </div>

        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
