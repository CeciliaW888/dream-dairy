import { useState, useRef, useCallback } from "react";

const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/webm";

function getMediaRecorderMime() {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported(FALLBACK_MIME)) return FALLBACK_MIME;
  return null;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);

  const ctxRef = useRef(null);
  const destRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const micSourceRef = useRef(null);

  const startRecording = useCallback((micStream) => {
    const mimeType = getMediaRecorderMime();
    if (!mimeType) {
      console.warn("MediaRecorder not supported, skipping recording");
      return;
    }

    try {
      const ctx = new AudioContext({ sampleRate: 48000 });
      const dest = ctx.createMediaStreamDestination();

      // Connect mic stream into recording destination
      if (micStream) {
        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(dest);
        micSourceRef.current = micSource;
      }

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);

      ctxRef.current = ctx;
      destRef.current = dest;
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.warn("Failed to start audio recording:", e);
    }
  }, []);

  const feedAIAudio = useCallback((float32Array) => {
    const ctx = ctxRef.current;
    const dest = destRef.current;
    if (!ctx || !dest || ctx.state === "closed") return;

    // AI audio comes at 24kHz mono — AudioContext resamples to 48kHz
    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(dest);
    source.start();
  }, []);

  const reconnectMic = useCallback((newStream) => {
    const ctx = ctxRef.current;
    const dest = destRef.current;
    if (!ctx || !dest || ctx.state === "closed") return;

    // Disconnect old mic source
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect(); } catch {}
      micSourceRef.current = null;
    }

    // Connect new mic stream
    if (newStream) {
      const micSource = ctx.createMediaStreamSource(newStream);
      micSource.connect(dest);
      micSourceRef.current = micSource;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || FALLBACK_MIME,
        });
        chunksRef.current = [];

        // Clean up audio context
        if (ctxRef.current && ctxRef.current.state !== "closed") {
          ctxRef.current.close();
        }
        ctxRef.current = null;
        destRef.current = null;
        recorderRef.current = null;
        micSourceRef.current = null;
        setIsRecording(false);

        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close();
    }
    ctxRef.current = null;
    destRef.current = null;
    recorderRef.current = null;
    micSourceRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    startRecording,
    feedAIAudio,
    reconnectMic,
    stopRecording,
    cleanup,
  };
}
