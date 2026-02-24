import React, { useState, useEffect } from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import TopNav from './TopNav';
import AudioPlayer from './AudioPlayer';
import UploadZone from './UploadZone';
import ConversationPanel from './ConversationPanel';
import DiaryGallery from './DiaryGallery';
import CalendarModal from './CalendarModal';
import SettingsModal from './SettingsModal';

export default function OverlayUI({
  onPhotoUpload,
  photoLoaded,
  onSaveDiary,
  diaries,
  onLoadDiary,
  currentDiary,
  onSettingsChange,
  currentTrack,
  onNextTrack
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [coordinates, setCoordinates] = useState('50\u00b004\'41.5"N 19\u00b050\'43.9"E');

  // Voice Chat Hook — no more window globals
  const { isListening, transcript, messages, toggleListening, sendTextMessage, loadTranscript, speechSupported } = useVoiceChat((summary, allMsgs) => {
    onSaveDiary(summary, allMsgs);
  });

  // Load transcript if viewing an old diary
  useEffect(() => {
    if (currentDiary && currentDiary.messages) {
      loadTranscript(currentDiary.messages);
    }
  }, [currentDiary, loadTranscript]);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}));

      const drift = (Math.random() * 0.05).toFixed(1);
      setCoordinates(`50\u00b004'${(41.5 + parseFloat(drift)).toFixed(1)}"N 19\u00b050'${(43.9 - parseFloat(drift)).toFixed(1)}"E`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overlay-ui">
      {/* Top Navigation */}
      <TopNav
        menuOpen={menuOpen}
        galleryOpen={galleryOpen}
        currentDiary={currentDiary}
        diaries={diaries}
        onToggleGallery={() => setGalleryOpen(!galleryOpen)}
        onToggleCalendar={() => setMenuOpen(!menuOpen)}
        onGoHome={() => {
          setMenuOpen(false);
          setGalleryOpen(false);
          onLoadDiary(null);
        }}
      />

      {/* Top Right Coordinates */}
      <div className="ui-top-right" aria-label="Current time and coordinates">
        <div className="coordinates" aria-live="off">{time}</div>
        <div className="coordinates">{coordinates}</div>
      </div>

      {/* Bottom Center Title */}
      <div className="ui-bottom-center">
        <h2 className="chapter-title">
          {currentDiary ? currentDiary.date : "The Blank Canvas"}
        </h2>
      </div>

      {/* Bottom Left Audio Player */}
      <AudioPlayer currentTrack={currentTrack} onNextTrack={onNextTrack} />

      {/* Bottom Right Controls */}
      <div className="ui-bottom-right interactive">
        {photoLoaded && !currentDiary && (
          <button
            className="icon-btn settings-trigger"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open atmosphere settings"
          >
            Settings
          </button>
        )}
      </div>

      {/* Upload Zone — now with drag-and-drop */}
      {!photoLoaded && !currentDiary && !menuOpen && (
        <UploadZone onPhotoUpload={onPhotoUpload} />
      )}

      {/* Conversation Overlay */}
      {photoLoaded && (
        <ConversationPanel
          messages={messages}
          transcript={transcript}
          isListening={isListening}
          toggleListening={toggleListening}
          sendTextMessage={sendTextMessage}
          currentDiary={currentDiary}
          speechSupported={speechSupported}
        />
      )}

      {/* Diary Gallery */}
      {galleryOpen && (
        <DiaryGallery
          diaries={diaries}
          onLoadDiary={onLoadDiary}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {/* Calendar Modal — now uses real dates, no mock data */}
      {menuOpen && (
        <CalendarModal
          diaries={diaries}
          onLoadDiary={onLoadDiary}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Settings Modal — debounced, with proper labels */}
      {settingsOpen && (
        <SettingsModal
          settings={{ particleIntensity: 1, voiceTone: 1, voiceType: 'Female' }}
          onSettingsChange={onSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
