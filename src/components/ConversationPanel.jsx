import React, { useState } from 'react';
import { FiMic, FiSquare, FiWind, FiPlay } from 'react-icons/fi';

export default function ConversationPanel({
  messages,
  transcript,
  isListening,
  toggleListening,
  sendTextMessage,
  currentDiary,
  speechSupported,
}) {
  const [textInput, setTextInput] = useState("");

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

  return (
    <div className="conversation-overlay" role="region" aria-label="Conversation">
      {/* Speaker Indicator */}
      {(!currentDiary && (messages.length > 0 || isListening || transcript)) && (
        <div className="speaker-indicator interactive">
           <span className="speaker-icon"><FiWind size={14} aria-hidden="true" /></span>
           <span className="speaker-dot" aria-hidden="true"></span>
           <span className="serif-text speaker-name">Gemini</span>
        </div>
      )}

      {/* Active Message Card */}
      {(messages.length > 0 || transcript) && (
        <div className="glass-panel message-card interactive" role="log" aria-label="Conversation messages" aria-live="polite">
           {currentDiary ? (
              <div className="message-history">
                 {messages.map((msg, idx) => (
                     <div key={idx} className={`message ${msg.role}`} role="article" aria-label={`${msg.role === 'user' ? 'You' : 'Gemini'} said`}>
                         {msg.content}
                     </div>
                 ))}
              </div>
           ) : (
              <>
                  <div className="serif-text active-message-text">
                    {transcript ? transcript : (messages.length > 0 ? messages[messages.length - 1].content : "")}
                  </div>
                  {(transcript || messages.length > 0) && (
                    <div className="message-actions">
                      <button className="btn-small" aria-label="Replay last message"><FiPlay aria-hidden="true" /> replay</button>
                      <button className="btn-small" aria-label="Translate message">tap to translate</button>
                    </div>
                  )}
              </>
           )}
        </div>
      )}

      {/* Empty Welcome Message */}
      {messages.length === 0 && !transcript && !currentDiary && (
         <div className="glass-panel message-card interactive">
             <div className="serif-text active-message-text welcome-text">
                 The atmosphere has settled. What are your thoughts?
             </div>
         </div>
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
                {speechSupported && (
                  <button
                      className={`icon-btn chat-mic-btn ${isListening ? 'recording' : ''}`}
                      onClick={toggleListening}
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={isListening}
                  >
                      {isListening ? <FiSquare size={16} aria-hidden="true" /> : <FiMic size={16} aria-hidden="true" />}
                  </button>
                )}
            </div>

            {!speechSupported && (
              <p className="speech-unsupported">Voice input is not supported in your browser.</p>
            )}

            {/* Save Memory Button */}
            {messages.length > 0 && (
                <button
                    className="btn-pill interactive"
                    onClick={() => sendTextMessage("summarize")}
                    aria-label="Save this memory"
                >
                    Save Memory &gt;
                </button>
            )}
        </div>
      )}
    </div>
  );
}
