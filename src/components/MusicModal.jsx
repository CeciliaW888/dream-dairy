import React, { useEffect } from 'react';

export default function MusicModal({ tracks, currentTrackIndex, onSelectTrack, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop interactive"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-label="Music selection"
    >
      <div className="glass-panel settings-panel" style={{ padding: '2rem' }}>
        <h3 className="serif-text settings-title">Music</h3>
        <div className="music-track-list">
          {tracks.map((track, index) => (
            <button
              key={track.src}
              className={`music-track-item interactive ${index === currentTrackIndex ? 'active' : ''}`}
              onClick={() => {
                onSelectTrack(index);
                const audio = document.getElementById('bg-music');
                if (audio) {
                  setTimeout(() => {
                    audio.play().catch(() => {});
                    if (window.initAudioContext) window.initAudioContext();
                  }, 50);
                }
              }}
            >
              <span className="music-track-title">{track.title}</span>
              <span className="music-track-artist">{track.artist}</span>
              {index === currentTrackIndex && <span className="music-track-playing">Playing</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-small calendar-close-btn" onClick={onClose} style={{ marginTop: '1.5rem' }}>
          Close
        </button>
      </div>
    </div>
  );
}
