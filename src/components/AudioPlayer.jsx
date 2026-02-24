import React, { useState } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

export default function AudioPlayer({ currentTrack, onNextTrack }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAudioToggle = () => {
    const audio = document.getElementById('bg-music');
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      if (window.initAudioContext) {
        window.initAudioContext();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextTrackClick = () => {
    if (onNextTrack) onNextTrack();

    setTimeout(() => {
      const audio = document.getElementById('bg-music');
      if (audio && isPlaying) {
         audio.play().catch(e => console.warn("Auto-play prevented", e));
      }
    }, 50);
  };

  return (
    <div className="ui-bottom-left interactive">
      <div className="audio-player">
        <button
          className="icon-btn"
          onClick={handleAudioToggle}
          aria-label={isPlaying ? "Pause music" : "Play music"}
        >
           {isPlaying ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
        </button>
        <div
          className="track-info"
          onClick={handleNextTrackClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNextTrackClick(); }}
          role="button"
          tabIndex={0}
          aria-label={`Now playing: ${currentTrack?.title || 'Slow Jazz Drift'}. Click to change track.`}
        >
           <span className="track-title">{currentTrack?.title || "Slow Jazz Drift"}</span>
           <span className="track-artist">{currentTrack?.artist || "Ambient"}</span>
        </div>
      </div>
    </div>
  );
}
