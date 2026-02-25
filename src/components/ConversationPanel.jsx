import React, { useState, useRef, useEffect } from 'react';
import { FiMic, FiSquare, FiWind, FiPlay, FiPause } from 'react-icons/fi';
import AudioVisualizer from './AudioVisualizer';
import { getAudioBlob } from '../lib/audioDB';

export default function ConversationPanel({
  messages,
  transcript,
  aiTranscript,
  isListening,
  isConnected,
  isAiSpeaking,
  toggleListening,
  sendTextMessage,
  requestSummary,
  currentDiary,
  micError,
  analyzer,
  analyzerData,
  isRecording,
}) {
  const [textInput, setTextInput] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Auto-scroll to bottom when messages or live transcript changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiTranscript, transcript]);

  const handleTextSubmit = (e) => {
    if (e.key === 'Enter' && textInput.trim()) {
       sendTextMessage(textInput);
       setTextInput("");
    }
  };

  const handleSendClick = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput("");
    }
  };

  const handleSaveMemory = () => {
    setReviewMode(true);
  };

  const handleConvertToDiary = () => {
    setReviewMode(false);
    requestSummary();
  };

  const handleBackToChat = () => {
    setReviewMode(false);
  };

  const handlePlayAudio = async () => {
    if (!currentDiary?.hasAudio) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      // Load blob if we don't have a URL yet
      if (!audioUrlRef.current) {
        const blob = await getAudioBlob(currentDiary.id);
        if (!blob) return;
        audioUrlRef.current = URL.createObjectURL(blob);
      }

      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrlRef.current);
        audioRef.current.onended = () => setIsPlaying(false);
      }

      audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn("Failed to play recording:", e);
    }
  };

  // Cleanup audio on unmount or diary change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [currentDiary?.id]);

  return (
    <div className="conversation-overlay" role="region" aria-label="Conversation">
      {/* Speaker Indicator */}
      {(!currentDiary && !reviewMode && (messages.length > 0 || isListening || aiTranscript || transcript)) && (
        <div className="speaker-indicator interactive">
           <span className="speaker-icon"><FiWind size={14} aria-hidden="true" /></span>
           <span className={`speaker-dot${isConnected ? ' connected' : ''}`} aria-hidden="true"></span>
           <span className="serif-text speaker-name">
             {isAiSpeaking ? "Gemini is speaking..." : isListening ? "Listening..." : "Gemini"}
           </span>
           {isRecording && <span className="recording-dot" aria-label="Recording" />}
        </div>
      )}

      {/* Audio playback for saved diaries */}
      {currentDiary?.hasAudio && (
        <div className="speaker-indicator interactive">
          <button className="icon-btn diary-audio-play-btn" onClick={handlePlayAudio} aria-label={isPlaying ? "Pause recording" : "Play recording"}>
            {isPlaying ? <FiPause size={14} /> : <FiPlay size={14} />}
          </button>
          <span className="serif-text speaker-name">
            {isPlaying ? "Playing conversation..." : "Play conversation audio"}
          </span>
        </div>
      )}

      {/* Review Mode — full conversation history before saving */}
      {reviewMode && (
        <>
          <div className="speaker-indicator interactive">
            <span className="serif-text speaker-name">Review your conversation</span>
          </div>
          <div className="glass-panel message-card interactive review-card" role="log" aria-label="Conversation review" ref={scrollRef}>
            <div className="message-history">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`} role="article" aria-label={`${msg.role === 'user' ? 'You' : 'Gemini'} said`}>
                    {msg.content}
                </div>
              ))}
            </div>
          </div>
          <div className="chat-input-area review-actions">
            <button
              className="btn-pill interactive"
              onClick={handleConvertToDiary}
              aria-label="Convert to diary entry"
            >
              Convert to Diary &gt;
            </button>
            <button
              className="btn-pill interactive btn-pill-secondary"
              onClick={handleBackToChat}
              aria-label="Go back to conversation"
            >
              &lt; Back to Chat
            </button>
          </div>
        </>
      )}

      {/* Active conversation (not review mode, not viewing saved diary) */}
      {!reviewMode && (
        <>
          {/* Message Card */}
          {(messages.length > 0 || aiTranscript || transcript) && (
            <div className="glass-panel message-card interactive" role="log" aria-label="Conversation messages" aria-live="polite" ref={scrollRef}>
               <div className="message-history">
                 {messages.map((msg, idx) => (
                     <div key={idx} className={`message ${msg.role}`} role="article" aria-label={`${msg.role === 'user' ? 'You' : 'Gemini'} said`}>
                         {msg.content}
                     </div>
                 ))}

                 {/* Show live AI transcript as it streams in */}
                 {aiTranscript && !currentDiary && (
                   <div className="message assistant streaming">
                     {aiTranscript}
                   </div>
                 )}

                 {/* Show user transcript flash */}
                 {transcript && !currentDiary && (
                   <div className="message user streaming">
                     {transcript}
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* Empty Welcome Message */}
          {messages.length === 0 && !aiTranscript && !transcript && !currentDiary && (
             <div className="glass-panel message-card interactive">
                 <div className="serif-text active-message-text welcome-text">
                     {isConnected
                       ? "The atmosphere has settled. What are your thoughts?"
                       : "Connecting to the dream realm..."}
                 </div>
             </div>
          )}

          {/* Audio Visualizer */}
          {!currentDiary && (
            <AudioVisualizer
              analyzer={analyzer}
              analyzerData={analyzerData}
              isActive={isListening || isAiSpeaking}
            />
          )}

          {/* Input Area */}
          {!currentDiary && (
            <div className="chat-input-area">
                <div className="glass-panel chat-input-wrapper interactive">
                    <input
                        type="text"
                        className="chat-text-input"
                        placeholder="Share your thoughts about this memory..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleTextSubmit}
                        aria-label="Type a message"
                    />
                    <button
                        className="icon-btn chat-send-btn"
                        onClick={handleSendClick}
                        disabled={!textInput.trim()}
                        aria-label="Send message"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                    <button
                        className={`icon-btn chat-mic-btn ${isListening ? 'recording' : ''}`}
                        onClick={toggleListening}
                        aria-label={isListening ? "Stop voice input" : "Start voice input"}
                        aria-pressed={isListening}
                    >
                        {isListening ? <FiSquare size={16} aria-hidden="true" /> : <FiMic size={16} aria-hidden="true" />}
                    </button>
                </div>

                {micError && (
                  <p className="mic-error">{micError}</p>
                )}

                {isListening && !transcript && !micError && (
                  <p className="listening-indicator">Listening...</p>
                )}

                {/* Save Memory Button */}
                {messages.length > 0 && (
                    <button
                        className="btn-pill interactive"
                        onClick={handleSaveMemory}
                        aria-label="Save this memory"
                    >
                        Save Memory &gt;
                    </button>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
