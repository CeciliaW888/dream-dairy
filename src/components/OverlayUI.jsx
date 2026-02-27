import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import TopNav from './TopNav';
import AudioPlayer from './AudioPlayer';
import UploadZone from './UploadZone';
import ConversationPanel from './ConversationPanel';
import DiaryGallery from './DiaryGallery';
import CalendarModal from './CalendarModal';
import SettingsModal from './SettingsModal';
import MusicModal from './MusicModal';
import PersonaModal from './PersonaModal';
import VoiceCloneModal from './VoiceCloneModal';

export default function OverlayUI({
  onPhotoUploadAndStart,
  photoLoaded,
  started,
  onStart,
  onSaveDiary,
  diaries,
  onLoadDiary,
  currentDiary,
  onSettingsChange,
  currentTrack,
  onNextTrack,
  audioTracks,
  currentTrackIndex,
  onSelectTrack,
  analyzer,
  analyzerData,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [voiceCloneModalOpen, setVoiceCloneModalOpen] = useState(false);
  const [voiceName, setVoiceName] = useState("Kore");
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [coordinates, setCoordinates] = useState('50\u00b004\'41.5"N 19\u00b050\'43.9"E');

  // Persona state
  const [personaId, setPersonaId] = useState(() => {
    return localStorage.getItem('selected-persona-id') || 'default';
  });
  const [persona, setPersona] = useState(null);

  // Load persona on mount and when personaId changes
  useEffect(() => {
    if (personaId === 'custom') {
      const customText = localStorage.getItem('custom-persona');
      if (customText) {
        setPersona(customText);
        return;
      }
      // Fall back to default if custom was removed
      setPersonaId('default');
    }

    // Load default persona from soul.md
    fetch('/soul.md')
      .then((res) => res.text())
      .then((text) => setPersona(text))
      .catch((e) => console.error('Could not load soul.md', e));
  }, [personaId]);

  const handleSelectPersona = useCallback((id, customText) => {
    setPersonaId(id);
    localStorage.setItem('selected-persona-id', id);
    if (id === 'custom' && customText) {
      setPersona(customText);
    }
  }, []);

  const {
    isRecording, startRecording, feedAIAudio, reconnectMic,
    stopRecording, cleanup: cleanupRecorder,
  } = useAudioRecorder();

  const recorderStartedRef = useRef(false);

  const onSummaryReady = useCallback(async (summary, allMsgs) => {
    const blob = await stopRecording();
    recorderStartedRef.current = false;
    onSaveDiary(summary, allMsgs, blob);
  }, [onSaveDiary, stopRecording]);

  const {
    isListening, transcript, aiTranscript, messages, isConnected,
    isAiSpeaking, micError, toggleListening, sendTextMessage,
    requestSummary, loadTranscript, micStream,
  } = useVoiceChat({ onSummaryReady, voiceName, started, persona, onAIAudioChunk: feedAIAudio });

  // Start recording when mic is first activated
  useEffect(() => {
    if (isListening && !recorderStartedRef.current && micStream) {
      startRecording(micStream);
      recorderStartedRef.current = true;
    }
  }, [isListening, micStream, startRecording]);

  // Handle mic toggle — reconnect new stream to recorder
  useEffect(() => {
    if (recorderStartedRef.current && micStream) {
      reconnectMic(micStream);
    }
  }, [micStream, reconnectMic]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => cleanupRecorder();
  }, [cleanupRecorder]);

  const handleSettingsChange = useCallback((newSettings) => {
    if (newSettings.voiceName !== undefined) {
      setVoiceName(newSettings.voiceName);
    }
    onSettingsChange(newSettings);
  }, [onSettingsChange]);

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
        onToggleMusic={() => setMusicModalOpen(!musicModalOpen)}
        onTogglePersona={() => setPersonaModalOpen(!personaModalOpen)}
        onToggleVoiceClone={() => setVoiceCloneModalOpen(!voiceCloneModalOpen)}
      />

      {/* Top Right Coordinates */}
      <div className="ui-top-right" aria-label="Current time and coordinates">
        <div className="coordinates" aria-live="off">{time}</div>
        <div className="coordinates">{coordinates}</div>
      </div>

      {/* Bottom Center Title */}
      <div className="ui-bottom-center">
        <h2 className="chapter-title">
          {currentDiary ? currentDiary.date : ''}
        </h2>
      </div>

      {/* Bottom Left Audio Player */}
      <AudioPlayer currentTrack={currentTrack} onNextTrack={onNextTrack} />

      {/* Bottom Right Controls */}
      <div className="ui-bottom-right interactive">
        {started && !currentDiary && (
          <button
            className="icon-btn settings-trigger"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open atmosphere settings"
          >
            Settings
          </button>
        )}
      </div>

      {/* Landing CTA — shown when session hasn't started */}
      {!started && !currentDiary && !menuOpen && !galleryOpen && (
        <UploadZone onBegin={onStart} onPhotoUploadAndStart={onPhotoUploadAndStart} />
      )}

      {/* Conversation Overlay */}
      {started && photoLoaded && (
        <ConversationPanel
          messages={messages}
          transcript={transcript}
          aiTranscript={aiTranscript}
          isListening={isListening}
          isConnected={isConnected}
          isAiSpeaking={isAiSpeaking}
          toggleListening={toggleListening}
          sendTextMessage={sendTextMessage}
          requestSummary={requestSummary}
          currentDiary={currentDiary}
          micError={micError}
          analyzer={analyzer}
          analyzerData={analyzerData}
          isRecording={isRecording}
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

      {/* Calendar Modal */}
      {menuOpen && (
        <CalendarModal
          diaries={diaries}
          onLoadDiary={onLoadDiary}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          settings={{ particleIntensity: 1, voiceName }}
          onSettingsChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Music Modal */}
      {musicModalOpen && (
        <MusicModal
          tracks={audioTracks}
          currentTrackIndex={currentTrackIndex}
          onSelectTrack={onSelectTrack}
          onClose={() => setMusicModalOpen(false)}
        />
      )}

      {/* Persona Modal */}
      {personaModalOpen && (
        <PersonaModal
          currentPersonaId={personaId}
          onSelectPersona={handleSelectPersona}
          onClose={() => setPersonaModalOpen(false)}
        />
      )}

      {/* Voice Clone Modal */}
      {voiceCloneModalOpen && (
        <VoiceCloneModal
          onClose={() => setVoiceCloneModalOpen(false)}
          onVoiceCloned={(voiceId, name) => {
            console.log('Voice cloned:', voiceId, name);
            // TODO: Add to voice library and allow selection
            setVoiceCloneModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
