import React, { useState, useRef, useEffect } from 'react';
import { extractAudioFromVideo, getAudioDuration, formatDuration } from '../lib/audioExtractor';

export default function VoiceCloneModal({ onClose, onVoiceCloned }) {
  const [step, setStep] = useState('upload'); // 'upload', 'extracting', 'preview', 'cloning', 'success', 'error'
  const [videoFile, setVideoFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [voiceName, setVoiceName] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [voiceId, setVoiceId] = useState(null);
  
  const backdropRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioPreviewRef = useRef(null);

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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setError(null);

    // Check if it's audio or video
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    if (!isAudio && !isVideo) {
      setError('Please select an audio or video file');
      return;
    }

    try {
      let audioBlob;
      
      if (isAudio) {
        // Audio file - use directly!
        console.log('Audio file detected, using directly');
        audioBlob = file;
        setProgress(100);
      } else {
        // Video file - extract audio with FFmpeg
        console.log('Video file detected, extracting audio with FFmpeg...');
        setStep('extracting');
        setProgress(0);
        setLoadingMessage('Loading FFmpeg (first time only, ~10MB)...');
        
        audioBlob = await extractAudioFromVideo(file, (prog) => {
          setProgress(prog);
          if (prog > 0) {
            setLoadingMessage('Extracting audio from video...');
          }
        });
      }

      // Get duration
      const duration = await getAudioDuration(audioBlob);
      
      if (duration < 10) {
        setError('Audio must be at least 10 seconds long for voice cloning');
        setStep('upload');
        return;
      }

      setAudioBlob(audioBlob);
      setAudioDuration(duration);
      setStep('preview');
      
      // Auto-fill voice name from filename
      const basename = file.name.replace(/\.[^/.]+$/, '');
      setVoiceName(basename);
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err.message);
      setStep('error');
    }
  };

  const handleCloneVoice = async () => {
    if (!audioBlob || !voiceName.trim()) {
      setError('Please provide a name for this voice');
      return;
    }

    setStep('cloning');
    setProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('name', voiceName);
      
      // Determine filename and ensure it's a proper Blob
      const isFile = audioBlob instanceof File;
      const filename = isFile ? audioBlob.name : 'voice_sample.webm';
      
      // Ensure we have a proper Blob (not a Buffer)
      let blobToSend = audioBlob;
      if (!(audioBlob instanceof Blob)) {
        // Convert to Blob if needed
        blobToSend = new Blob([audioBlob], { type: audioBlob.type || 'audio/webm' });
      }
      
      formData.append('audioFile', blobToSend, filename);

      // Call our serverless function (Fish Audio - FREE voice cloning!)
      const response = await fetch('/api/clone-voice-fish', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Voice cloning failed');
      }

      const result = await response.json();
      setVoiceId(result.voice_id);
      setStep('success');

      // Save to local storage
      const clonedVoices = JSON.parse(localStorage.getItem('clonedVoices') || '[]');
      clonedVoices.push({
        id: result.voice_id,
        name: voiceName,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('clonedVoices', JSON.stringify(clonedVoices));

      // Notify parent
      if (onVoiceCloned) {
        onVoiceCloned(result.voice_id, voiceName);
      }
    } catch (err) {
      console.error('Cloning failed:', err);
      setError(err.message);
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setVideoFile(null);
    setAudioBlob(null);
    setVoiceName('');
    setError(null);
    setProgress(0);
  };

  return (
    <div
      className="modal-backdrop interactive settings-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
    >
      <div className="modal-container settings-container voice-clone-modal">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <h2>Clone a Voice</h2>
        <p className="modal-subtitle">Upload audio or video to create a voice clone</p>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="upload-section">
            <div 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">🎙️</div>
              <p className="upload-text">Click to upload audio or video</p>
              <p className="upload-hint">MP3, WAV, M4A, MP4, MOV, etc.</p>
              <p className="upload-hint">Need at least 10 seconds of clear speech</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Extracting Step */}
        {step === 'extracting' && (
          <div className="processing-section">
            <div className="spinner"></div>
            <p>{loadingMessage || 'Processing audio...'}</p>
            {progress === 0 ? (
              <p className="processing-hint">Downloading FFmpeg (~10MB, one-time only)...</p>
            ) : (
              <>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="progress-text">{progress}%</p>
              </>
            )}
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && audioBlob && (
          <div className="preview-section">
            <div className="audio-info">
              <p className="info-label">✅ Audio extracted!</p>
              <p className="info-detail">Duration: {formatDuration(audioDuration)}</p>
              {audioDuration >= 60 && (
                <p className="info-tip">💡 Longer samples = better quality voice clone</p>
              )}
            </div>

            <div className="audio-player-wrapper">
              <audio
                ref={audioPreviewRef}
                src={URL.createObjectURL(audioBlob)}
                controls
                className="audio-preview"
              />
            </div>

            <div className="input-group">
              <label htmlFor="voiceName">Voice Name:</label>
              <input
                id="voiceName"
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Mom, Dad, Friend..."
                maxLength={50}
              />
            </div>

            <div className="button-group">
              <button className="secondary-button" onClick={handleReset}>
                ← Start Over
              </button>
              <button 
                className="primary-button"
                onClick={handleCloneVoice}
                disabled={!voiceName.trim()}
              >
                Clone Voice →
              </button>
            </div>
          </div>
        )}

        {/* Cloning Step */}
        {step === 'cloning' && (
          <div className="processing-section">
            <div className="spinner"></div>
            <p>Creating voice clone...</p>
            <p className="processing-hint">This takes about 10-15 seconds</p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="success-section">
            <div className="success-icon">✨</div>
            <h3>Voice Cloned Successfully!</h3>
            <p className="success-message">
              You can now use <strong>{voiceName}</strong>'s voice in your dream diary.
            </p>
            <div className="voice-id-display">
              <span className="label">Voice ID:</span>
              <code>{voiceId}</code>
            </div>
            <button className="primary-button" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="error-section">
            <div className="error-icon">⚠️</div>
            <h3>Something Went Wrong</h3>
            <p className="error-message">{error}</p>
            <button className="primary-button" onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .voice-clone-modal {
          max-width: 500px;
          padding: 2rem;
        }

        .modal-subtitle {
          color: rgba(255, 255, 255, 0.6);
          margin-top: -0.5rem;
          margin-bottom: 2rem;
        }

        .upload-dropzone {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-dropzone:hover {
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.05);
        }

        .upload-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .upload-text {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .upload-hint {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.25rem 0;
        }

        .processing-section {
          text-align: center;
          padding: 3rem 0;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin: 1rem 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .processing-hint {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 0.5rem;
        }

        .preview-section {
          padding: 1rem 0;
        }

        .audio-info {
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .info-label {
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .info-detail {
          color: rgba(255, 255, 255, 0.7);
          margin: 0.25rem 0;
        }

        .info-tip {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .audio-player-wrapper {
          margin: 1.5rem 0;
        }

        .audio-preview {
          width: 100%;
          border-radius: 8px;
        }

        .input-group {
          margin: 1.5rem 0;
        }

        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .input-group input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }

        .input-group input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.5);
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .primary-button, .secondary-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .primary-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .success-section, .error-section {
          text-align: center;
          padding: 2rem 0;
        }

        .success-icon, .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .success-message, .error-message {
          color: rgba(255, 255, 255, 0.8);
          margin: 1rem 0 2rem;
          line-height: 1.6;
        }

        .voice-id-display {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .voice-id-display .label {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
        }

        .voice-id-display code {
          flex: 1;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          color: #667eea;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
