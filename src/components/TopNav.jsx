import React from 'react';

export default function TopNav({ menuOpen, galleryOpen, currentDiary, diaries, onToggleGallery, onToggleCalendar, onGoHome, onToggleMusic, onTogglePersona, onToggleVoiceClone }) {
  const navItems = [
    { label: 'THE GARDEN', action: onGoHome },
    { label: 'MEMORY', action: () => {
      if (diaries.length > 0) onToggleGallery();
      else onToggleCalendar();
    }},
    { label: 'MUSIC', action: onToggleMusic },
    { label: 'PERSONA', action: onTogglePersona },
    { label: 'VOICES', action: onToggleVoiceClone },
  ];

  const isActive = (item) => {
    if (item === 'MEMORY' && (menuOpen || galleryOpen)) return true;
    if (item === 'THE GARDEN' && !menuOpen && !galleryOpen && !currentDiary) return true;
    return false;
  };

  return (
    <nav className="top-nav interactive" aria-label="Main navigation">
      {navItems.map(({ label, action }) => (
        <button
          key={label}
          className={`nav-link serif-text ${isActive(label) ? 'active' : ''}`}
          onClick={action}
          aria-current={isActive(label) ? 'page' : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
