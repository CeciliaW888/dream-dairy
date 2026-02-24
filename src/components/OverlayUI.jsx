import React, { useState, useEffect } from 'react';
import { FiMenu, FiMic, FiSquare, FiSave, FiList, FiPlay, FiPause, FiWind } from 'react-icons/fi';
import { useVoiceChat } from '../hooks/useVoiceChat';

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
  const [menuOpen, setMenuOpen] = useState(false); // Used for calendar now
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [coordinates, setCoordinates] = useState('50°04\'41.5"N 19°50\'43.9"E');
  
  // Settings State
  const [particleIntensity, setParticleIntensity] = useState(1);
  const [voiceTone, setVoiceTone] = useState(1);
  const [voiceType, setVoiceType] = useState("Female");

  // Chat Input
  const [textInput, setTextInput] = useState("");

  // Voice Chat Hook
  const { isListening, transcript, messages, toggleListening, loadTranscript } = useVoiceChat((summary, allMsgs) => {
    onSaveDiary(summary, allMsgs);
  }, voiceTone, voiceType);

  // Load transcript if viewing an old diary
  useEffect(() => {
    if (currentDiary && currentDiary.messages) {
      loadTranscript(currentDiary.messages);
    }
  }, [currentDiary]);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}));
      
      // Slight coordinate drift for effect
      const drift = (Math.random() * 0.05).toFixed(1);
      setCoordinates(`50°04'${(41.5 + parseFloat(drift)).toFixed(1)}"N 19°50'${(43.9 - parseFloat(drift)).toFixed(1)}"E`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAudioToggle = () => {
    const audio = document.getElementById('bg-music');
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      // Initialize audio context for visualizer if not already done
      if (window.initAudioContext) {
        window.initAudioContext();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextTrackClick = () => {
    if (onNextTrack) onNextTrack();
    
    // Play the new track if we are currently playing
    setTimeout(() => {
      const audio = document.getElementById('bg-music');
      if (audio && isPlaying) {
         audio.play().catch(e => console.warn("Auto-play prevented", e));
      }
    }, 50);
  };

  const handleTextSubmit = (e) => {
    if (e.key === 'Enter' && textInput.trim()) {
       // Since the hook doesn't natively expose a way to inject text directly as a user without speech,
       // we will emulate the transcript and trigger the LLM/mock response.
       // For a cleaner implementation, we should pass this to the hook, but for now we simulate it:
       if (window.handleUserTextInput) {
         window.handleUserTextInput(textInput);
       }
       setTextInput("");
    }
  };

  // Ensure settings changes bubble up
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({ particleIntensity, voiceTone, voiceType });
    }
  }, [particleIntensity, voiceTone, voiceType]);

  return (
    <div className="overlay-ui">
      
      {/* Top Navigation */}
      <div className="ui-top-center interactive" style={{position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2rem', zIndex: 100}}>
        {['THE GARDEN', 'MEMORY', 'MUSIC', 'INFO'].map((item) => (
          <button 
            key={item}
            className="nav-link serif-text"
            onClick={() => {
                if (item === 'MEMORY') {
                   if (diaries.length > 0) {
                      setGalleryOpen(!galleryOpen);
                   } else {
                      setMenuOpen(!menuOpen);
                   }
                }
                if (item === 'THE GARDEN') {
                    setMenuOpen(false);
                    setGalleryOpen(false);
                    onLoadDiary(null);
                }
            }}
            style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                letterSpacing: '2px', fontSize: '1rem', cursor: 'pointer', opacity: (item === 'MEMORY' && (menuOpen || galleryOpen)) || (item === 'THE GARDEN' && !menuOpen && !galleryOpen && !currentDiary) ? 1 : 0.5,
                transition: 'opacity 0.3s'
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Top Right Coordinates */}
      <div className="ui-top-right">
        <div className="coordinates">{time}</div>
        <div className="coordinates">{coordinates}</div>
      </div>

      {/* Bottom Center Title */}
      <div className="ui-bottom-center">
        <h2 className="chapter-title">
          {currentDiary ? currentDiary.date : "The Blank Canvas"}
        </h2>
      </div>

      {/* Bottom Left Audio Player */}
      <div className="ui-bottom-left interactive">
        <div className="audio-player">
          <button className="icon-btn" onClick={handleAudioToggle}>
             {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          <div className="track-info" onClick={handleNextTrackClick} style={{cursor: 'pointer'}} title="Click to change track">
             <span className="track-title">{currentTrack?.title || "Slow Jazz Drift"}</span>
             <span className="track-artist">{currentTrack?.artist || "Ambient"}</span>
          </div>
        </div>
      </div>

      {/* Bottom Right Controls */}
      <div className="ui-bottom-right interactive" style={{zIndex: 50}}>
        {photoLoaded && !currentDiary && (
          <button 
            className="icon-btn" 
            onClick={() => setSettingsOpen(true)}
            style={{fontSize: '0.8rem', opacity: 0.7}}
          >
            Settings
          </button>
        )}
      </div>

      {/* Upload Zone Overlays if no photo and no current diary */}
      {!photoLoaded && !currentDiary && !menuOpen && (
         <div className="modal-backdrop interactive" style={{background: 'transparent', pointerEvents: 'none'}}>
            <div className="dropzone interactive" onClick={() => document.getElementById('file-upload').click()} style={{pointerEvents: 'auto'}}>
               <FiWind size={48} className="quote-mark" style={{fontSize: '3rem', margin: '0 auto 1rem'}} />
               <h3 className="serif-text" style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Recall a Memory</h3>
               <p className="sans-text" style={{color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px'}}>Upload an image to reconstruct the atmosphere.</p>
               <input 
                  type="file" 
                  id="file-upload" 
                  accept="image/*" 
                  style={{display: 'none'}} 
                  onChange={onPhotoUpload} 
               />
            </div>
         </div>
      )}

      {/* Conversation Overlay (Centered Glassmorphism) */}
      {photoLoaded && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            pointerEvents: 'none', zIndex: 40, gap: '2rem'
        }}>
          {/* Top Speaker Indicator */}
          {(!currentDiary && (messages.length > 0 || isListening || transcript)) ? (
          <div className="speaker-indicator interactive" style={{pointerEvents: 'auto', marginTop: '-5vh'}}>
             <span style={{opacity: 0.5, display: 'flex', alignItems: 'center'}}><FiWind size={14}/></span>
             <span className="dot" style={{width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)'}}></span>
             <span className="serif-text" style={{fontSize: '1.2rem', letterSpacing: '1px'}}>Gemini</span>
          </div>
          ) : null}

          {/* Active Message Card */}
          {(messages.length > 0 || transcript) && (
          <div className="glass-panel interactive" style={{pointerEvents: 'auto', width: '80%', maxWidth: '600px', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', textAlign: 'center'}}>
             {currentDiary ? (
                <div style={{maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%'}}>
                   {messages.map((msg, idx) => (
                       <div key={idx} className={`message ${msg.role}`} style={{background: 'transparent', border: 'none', borderLeft: msg.role === 'assistant' ? '2px solid rgba(255,255,255,0.2)' : 'none', borderRight: msg.role === 'user' ? '2px solid rgba(255,255,255,0.2)' : 'none', textAlign: msg.role === 'user' ? 'right' : 'left', width: '100%', maxWidth: '100%'}}>
                           {msg.content}
                       </div>
                   ))}
                </div>
             ) : (
                <>
                    <div className="serif-text active-message-text" style={{fontSize: '1.6rem', lineHeight: '1.6', textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                      {transcript ? transcript : (messages.length > 0 ? messages[messages.length - 1].content : "")}
                    </div>
                    {(transcript || messages.length > 0) && (
                    <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', opacity: 0.5}}>
                        <button className="btn-small"><FiPlay style={{marginRight: '0.4rem'}}/> replay</button>
                        <button className="btn-small">tap to translate</button>
                    </div>
                    )}
                </>
             )}
          </div>
          )}

          {/* Empty State / Welcome Message if no messages yet */}
          {messages.length === 0 && !transcript && !currentDiary && (
             <div className="glass-panel interactive" style={{pointerEvents: 'auto', width: '80%', maxWidth: '600px', padding: '2.5rem', textAlign: 'center'}}>
                 <div className="serif-text" style={{fontSize: '1.6rem', opacity: 0.8}}>
                     The atmosphere has settled. What are your thoughts?
                 </div>
             </div>
          )}

          {/* Input Area */}
          {!currentDiary && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2vh'}}>
                <div className="glass-panel chat-input-wrapper interactive" style={{pointerEvents: 'auto', display: 'flex', alignItems: 'center', width: '320px', padding: '0.8rem 1.2rem', borderRadius: '30px'}}>
                    <input 
                        type="text" 
                        placeholder="type here..." 
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleTextSubmit}
                        style={{
                           flex: 1, background: 'transparent', border: 'none', 
                           color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-serif)', fontSize: '1.2rem',
                           outline: 'none', fontStyle: 'italic'
                        }}
                    />
                    <button 
                        className={`icon-btn small ${isListening ? 'recording' : ''}`} 
                        onClick={toggleListening}
                        title={isListening ? "Stop Voice" : "Start Voice"}
                        style={{width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)', border: 'none', flexShrink: 0}}
                    >
                        {isListening ? <FiSquare size={16} /> : <FiMic size={16} />}
                    </button>
                </div>

                {/* Save Memory Button */}
                {messages.length > 0 && (
                    <button 
                        className="btn-pill interactive" 
                        onClick={() => { if (window.handleUserTextInput) window.handleUserTextInput("summarize"); }}
                        style={{pointerEvents: 'auto'}}
                    >
                        Save Memory &gt;
                    </button>
                )}
            </div>
          )}
        </div>
      )}

      {/* Diary Gallery Overlay */}
      {galleryOpen && (
        <div className="modal-backdrop interactive" style={{background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(20px)', alignItems: 'center', justifyContent: 'flex-start', overflowX: 'auto', padding: '4rem 2rem', gap: '2rem'}}>
           <div style={{display: 'flex', gap: '4rem', height: '80vh', padding: '0 10vw'}}>
             {diaries.map((diary) => (
                <div key={diary.id} className="glass-panel" style={{minWidth: '400px', width: '400px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                   <div style={{width: '100%', height: '250px', background: '#222', backgroundImage: `url(${diary.imgUrl || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                   </div>
                   <div style={{padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column'}}>
                      <div className="serif-text" style={{fontSize: '1.8rem', marginBottom: '0.5rem'}}>{diary.summary ? "Diary Summary" : "The Atmosphere"}</div>
                      <div className="sans-text" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>@user and GEMINI • {diary.date}</div>
                      
                      <div className="sans-text" style={{fontSize: '0.9rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem'}}>
                         {diary.summary}
                      </div>

                      <div style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                          {(diary.messages || []).map((msg, idx) => (
                              <div key={idx} className={`message ${msg.role}`} style={{
                                 background: 'rgba(255,255,255,0.05)', 
                                 border: 'none', 
                                 borderLeft: msg.role === 'assistant' ? '2px solid rgba(255,255,255,0.2)' : 'none', 
                                 borderRight: msg.role === 'user' ? '2px solid rgba(255,255,255,0.2)' : 'none', 
                                 textAlign: msg.role === 'user' ? 'right' : 'left', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                 padding: '1rem', borderRadius: '12px', fontSize: '1rem', width: '85%'
                              }}>
                                  {msg.content}
                              </div>
                          ))}
                      </div>
                      
                      <button className="btn-pill" style={{marginTop: '2rem', alignSelf: 'center'}} onClick={() => {
                          onLoadDiary(diary);
                          setGalleryOpen(false);
                      }}>Load Atmosphere</button>
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* Calendar Menu Overlay */}
      {menuOpen && (
        <div className="modal-backdrop interactive" style={{background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(20px)'}}>
          <div className="calendar-modal" style={{width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <h2 className="serif-text" style={{fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'left', width: '100%'}}>Day/night<br/>chron</h2>
            <p className="sans-text" style={{color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'left', width: '100%', marginBottom: '2rem'}}>
                You and I have memories,<br/>longer than the road that stretches out ahead<br/><br/>
                @user n GEMINI
            </p>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem'}}>
                <button className="icon-btn small" style={{border: 'none'}}>&lt;</button>
                <div className="serif-text" style={{fontSize: '1.2rem', letterSpacing: '1px'}}>November 2025</div>
                <button className="icon-btn small" style={{border: 'none'}}>&gt;</button>
            </div>

            {/* Days Header */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '1rem'}}>
               {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>

            {/* Days Grid */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', gap: '1rem 0', textAlign: 'center'}}>
               {/* Empty slots for start of month */}
               <div/><div/><div/><div/><div/><div/>
               {/* Days 1-30 */}
               {Array.from({length: 30}, (_, i) => i + 1).map(day => {
                   // Mock finding diaries on specific days
                   const hasDiary = diaries.some(d => d.date.includes(day.toString()));
                   const mockHasDiary = day === 1 || day === 2 || day === 3 || day === 4;
                   
                   return (
                       <div key={day} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s', opacity: mockHasDiary ? 1 : 0.4}} 
                            onClick={() => {
                                if (diaries.length > 0) {
                                  onLoadDiary(diaries[0]); // Just load the most recent for the demo
                                }
                                setMenuOpen(false);
                            }}
                            className="calendar-day"
                       >
                           <span className="serif-text" style={{fontSize: '1.2rem'}}>{day}</span>
                           <div style={{display: 'flex', gap: '2px', marginTop: '4px'}}>
                              {mockHasDiary && <span style={{width: 4, height: 4, borderRadius: '50%', background: day === 4 ? 'var(--accent-pink)' : 'var(--accent-green)'}}></span>}
                              {(day === 2 || day === 3) && <span style={{width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-pink)'}}></span>}
                              {(day === 1 || day === 2 || day === 3) && <span style={{width: 4, height: 4, borderRadius: '50%', background: '#e0a84e'}}></span>}
                           </div>
                       </div>
                   );
               })}
            </div>

          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {settingsOpen && (
        <div className="modal-backdrop interactive" style={{zIndex: 100}}>
          <div className="modal-content" style={{width: '300px'}}>
            <h2 className="title-main" style={{fontSize: '1.5rem', marginBottom: '2rem'}}>Atmosphere Settings</h2>
            
            <div style={{marginBottom: '1.5rem'}}>
               <label className="sans-text" style={{display: 'block', marginBottom: '0.5rem'}}>Particle Reactivity</label>
               <input 
                 type="range" 
                 min="0" 
                 max="3" 
                 step="0.1" 
                 value={particleIntensity} 
                 onChange={(e) => setParticleIntensity(parseFloat(e.target.value))}
                 style={{width: '100%'}}
               />
               <div className="sans-text" style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem'}}>Adjusts how much particles dance to music/voice.</div>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
               <label className="sans-text" style={{display: 'block', marginBottom: '0.5rem'}}>Voice Persona Type</label>
               <select 
                 value={voiceType} 
                 onChange={(e) => setVoiceType(e.target.value)}
                 style={{
                   width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', 
                   padding: '0.5rem', color: '#E8E2D9', fontFamily: 'Inter, sans-serif'
                 }}
               >
                 <option value="Female">Female (Default)</option>
                 <option value="Male">Male</option>
                 <option value="Custom" disabled>Custom Video Extraction (Coming Soon)</option>
               </select>
            </div>

            <div style={{marginBottom: '2rem'}}>
               <label className="sans-text" style={{display: 'block', marginBottom: '0.5rem'}}>Voice Persona Tone</label>
               <input 
                 type="range" 
                 min="0.5" 
                 max="2" 
                 step="0.1" 
                 value={voiceTone} 
                 onChange={(e) => setVoiceTone(parseFloat(e.target.value))}
                 style={{width: '100%'}}
               />
               <div className="sans-text" style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem'}}>Lower for deep/calm, higher for bright/fast.</div>
            </div>

            <button className="btn" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
