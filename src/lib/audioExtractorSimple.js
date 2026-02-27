/**
 * Simple browser-native audio extraction (no FFmpeg needed)
 * Uses Web Audio API - faster and lighter
 */

/**
 * Extract audio from video file using browser APIs
 * @param {File} videoFile - Video file from user upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Blob} Audio blob (WAV format)
 */
export async function extractAudioFromVideo(videoFile, onProgress = null) {
  if (onProgress) onProgress(10);

  // Create video element to load the file
  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(videoFile);
  video.src = videoUrl;
  video.muted = true;

  // Wait for video to load metadata
  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', resolve);
    video.addEventListener('error', reject);
  });

  if (onProgress) onProgress(30);

  // Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create media element source
  const source = audioContext.createMediaElementSource(video);
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);

  if (onProgress) onProgress(50);

  // Create MediaRecorder to capture audio
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType: 'audio/webm;codecs=opus'
  });

  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  // Start recording
  mediaRecorder.start();
  video.play();

  if (onProgress) onProgress(70);

  // Wait for video to finish
  await new Promise((resolve) => {
    video.onended = () => {
      mediaRecorder.stop();
      resolve();
    };
  });

  if (onProgress) onProgress(90);

  // Wait for final chunks
  await new Promise((resolve) => {
    mediaRecorder.onstop = resolve;
  });

  // Clean up
  URL.revokeObjectURL(videoUrl);
  audioContext.close();

  if (onProgress) onProgress(100);

  // Return audio blob
  return new Blob(audioChunks, { type: 'audio/webm' });
}

/**
 * Get audio duration from file
 * @param {Blob} audioBlob - Audio blob
 * @returns {Promise<number>} Duration in seconds
 */
export async function getAudioDuration(audioBlob) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', reject);
    audio.src = URL.createObjectURL(audioBlob);
  });
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2:34")
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
