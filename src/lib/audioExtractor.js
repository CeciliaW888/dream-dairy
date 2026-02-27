/**
 * Audio extraction from video files
 * Using native browser APIs for better compatibility and performance
 */

/**
 * Extract audio from video file using native browser APIs
 * @param {File} videoFile - Video file from user upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Blob} Audio blob (MP3 format via MediaRecorder)
 */
export async function extractAudioFromVideo(videoFile, onProgress = null) {
  if (onProgress) onProgress(10);

  try {
    // For audio files, return directly
    if (videoFile.type.startsWith('audio/')) {
      if (onProgress) onProgress(100);
      return videoFile;
    }

    // Create video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    // Wait for metadata to load
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', reject, { once: true });
      video.load();
    });

    if (onProgress) onProgress(30);

    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100 // Standard sample rate for voice
    });

    if (onProgress) onProgress(40);

    // Use AudioContext to properly decode and capture audio
    const source = audioContext.createMediaElementSource(video);
    const dest = audioContext.createMediaStreamDestination();
    
    // Connect source to destination
    source.connect(dest);
    source.connect(audioContext.destination); // Also connect to speakers for monitoring (muted anyway)

    if (onProgress) onProgress(50);

    // Determine best audio format
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    if (!selectedMimeType) {
      throw new Error('No supported audio format found in this browser');
    }

    // Create media recorder with the best supported format
    const mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 128000 // 128kbps
    });

    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    if (onProgress) onProgress(60);

    // Start recording and playing
    const recordingComplete = new Promise((resolve, reject) => {
      let progressInterval;

      mediaRecorder.onstart = () => {
        video.currentTime = 0;
        video.play().catch(reject);
        
        // Update progress based on playback
        progressInterval = setInterval(() => {
          if (video.duration > 0) {
            const playProgress = (video.currentTime / video.duration) * 30; // 30% of progress bar
            if (onProgress) onProgress(Math.round(60 + playProgress));
          }
        }, 200);
      };

      mediaRecorder.onstop = () => {
        if (progressInterval) clearInterval(progressInterval);
        resolve();
      };

      mediaRecorder.onerror = (event) => {
        if (progressInterval) clearInterval(progressInterval);
        reject(new Error('Recording failed: ' + event.error));
      };

      video.onended = () => {
        if (progressInterval) clearInterval(progressInterval);
        mediaRecorder.stop();
      };

      video.onerror = () => {
        if (progressInterval) clearInterval(progressInterval);
        mediaRecorder.stop();
        reject(new Error('Video playback failed'));
      };
    });

    // Start the recording
    mediaRecorder.start(100); // Collect data every 100ms

    // Wait for recording to complete
    await recordingComplete;

    if (onProgress) onProgress(95);

    // Clean up
    URL.revokeObjectURL(videoUrl);
    video.remove();
    await audioContext.close();

    if (onProgress) onProgress(100);

    // Return audio blob
    const audioBlob = new Blob(audioChunks, { type: selectedMimeType });
    
    // Verify we got something
    if (audioBlob.size === 0) {
      throw new Error('Audio extraction failed - no audio data captured');
    }

    return audioBlob;

  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error(`Failed to extract audio: ${error.message}`);
  }
}

/**
 * Get audio duration from file
 * @param {Blob} audioBlob - Audio blob
 * @returns {Promise<number>} Duration in seconds
 */
export async function getAudioDuration(audioBlob) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };

    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      cleanup();
      resolve(duration);
    });

    audio.addEventListener('error', (e) => {
      cleanup();
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
    audio.load();
  });
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2:34")
 */
export function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
