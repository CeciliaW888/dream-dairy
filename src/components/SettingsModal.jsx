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
  const [clonedVoices, setClonedVoices] = useState([]);
  const backdropRef = useRef(null);
  const debounceRef = useRef(null);

  // Load cloned voices from localStorage
  const loadClonedVoices = useCallback(() => {
    const saved = localStorage.getItem('clonedVoices');
    if (saved) {
      try {
        const voices = JSON.parse(saved);
        setClonedVoices(voices);
      } catch (e) {
        console.error('Failed to parse cloned voices:', e);
      }
    } else {
      setClonedVoices([]);
    }
  }, []);

  useEffect(() => {
    loadClonedVoices();
    
    // Listen for storage changes (when a new voice is cloned)
    const handleStorageChange = (e) => {
      if (e.key === 'clonedVoices') {
        loadClonedVoices();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event from same window
    window.addEventListener('voiceCloned', loadClonedVoices);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('voiceCloned', loadClonedVoices);
    };
  }, [loadClonedVoices]);

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
           <label className="sans-text settings-label" htmlFor="voice-select">AI Voice</label>
           <select
             id="voice-select"
             value={voiceName}
             onChange={(e) => handleVoiceChange(e.target.value)}
             className="settings-select"
           >
             {/* Gemini built-in voices */}
             <optgroup label="Gemini Voices">
               {GEMINI_VOICES.map((v) => (
                 <option key={v.name} value={v.name}>
                   {v.name} — {v.desc}
                 </option>
               ))}
             </optgroup>
             
             {/* Cloned voices */}
             {clonedVoices.length > 0 && (
               <optgroup label="Your Cloned Voices">
                 {clonedVoices.map((v) => (
                   <option key={v.id} value={v.id}>
                     {v.name} — Cloned voice
                   </option>
                 ))}
               </optgroup>
             )}
           </select>
           <p className="settings-hint">
             {clonedVoices.length > 0 
               ? `${clonedVoices.length} cloned voice${clonedVoices.length > 1 ? 's' : ''} available`
               : 'Clone a voice from the menu to use it here'}
           </p>
        </div>

        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
