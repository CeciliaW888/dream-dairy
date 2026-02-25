import { useState, useEffect, useRef, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const useVoiceChat = ({ onSummaryReady, voiceName = "Kore", started, persona, onAIAudioChunk }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [micError, setMicError] = useState(null);

  const sessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const micContextRef = useRef(null);
  const processorRef = useRef(null);
  const playbackTimeRef = useRef(0);
  const messagesRef = useRef(messages);
  const onSummaryReadyRef = useRef(onSummaryReady);
  const aiTranscriptRef = useRef("");
  const userTranscriptRef = useRef("");
  const summaryModeRef = useRef(false);
  const summaryBufferRef = useRef("");
  const onAIAudioChunkRef = useRef(onAIAudioChunk);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { onSummaryReadyRef.current = onSummaryReady; }, [onSummaryReady]);
  useEffect(() => { onAIAudioChunkRef.current = onAIAudioChunk; }, [onAIAudioChunk]);

  // --- Audio playback helpers ---

  function getPlaybackContext() {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      playbackTimeRef.current = 0;
    }
    return audioContextRef.current;
  }

  function playAudioChunk(base64Data) {
    const ctx = getPlaybackContext();
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    try {
      if (onAIAudioChunkRef.current) onAIAudioChunkRef.current(float32);
    } catch (e) {
      console.warn("Audio recording chunk error:", e);
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Gapless scheduling
    const now = ctx.currentTime;
    const startTime = Math.max(now, playbackTimeRef.current);
    source.start(startTime);
    playbackTimeRef.current = startTime + buffer.duration;
  }

  function stopPlayback() {
    playbackTimeRef.current = 0;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  // --- Server message handler ---
  // Uses only refs and state setters (all stable), safe to capture in effect closure

  function handleServerMessage(message) {
    const sc = message.serverContent;
    if (!sc) return;

    // AI audio output — always handle regardless of summary mode
    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          playAudioChunk(part.inlineData.data);
          setIsAiSpeaking(true);
        }
        // Ignore part.text — the model sends thinking/reasoning text there
      }
    }

    if (summaryModeRef.current) {
      if (sc.outputTranscription?.text) {
        summaryBufferRef.current += sc.outputTranscription.text;
        setAiTranscript(summaryBufferRef.current);
      }
      if (sc.turnComplete) {
        setIsAiSpeaking(false);
        const summary = summaryBufferRef.current;
        if (summary && onSummaryReadyRef.current) {
          onSummaryReadyRef.current(summary, messagesRef.current);
        }
        summaryModeRef.current = false;
        summaryBufferRef.current = "";
        setAiTranscript("");
      }
      return;
    }

    // User speech transcription — accumulate chunks like AI transcription
    if (sc.inputTranscription?.text?.trim()) {
      userTranscriptRef.current += sc.inputTranscription.text;
      setTranscript(userTranscriptRef.current);
    }

    // AI speech transcription
    if (sc.outputTranscription?.text) {
      aiTranscriptRef.current += sc.outputTranscription.text;
      setAiTranscript(aiTranscriptRef.current);
    }

    // Turn complete
    if (sc.turnComplete) {
      setIsAiSpeaking(false);
      const userText = userTranscriptRef.current;
      if (userText) {
        setMessages((prev) => [...prev, { role: "user", content: userText }]);
      }
      userTranscriptRef.current = "";
      const aiText = aiTranscriptRef.current;
      if (aiText) {
        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
      }
      aiTranscriptRef.current = "";
      setAiTranscript("");
      setTranscript("");
    }

    // Interruption
    if (sc.interrupted) {
      stopPlayback();
      setIsAiSpeaking(false);
      const userText = userTranscriptRef.current;
      if (userText) {
        setMessages((prev) => [...prev, { role: "user", content: userText }]);
      }
      userTranscriptRef.current = "";
      const aiText = aiTranscriptRef.current;
      if (aiText) {
        setMessages((prev) => [...prev, { role: "assistant", content: aiText + "..." }]);
      }
      aiTranscriptRef.current = "";
      setAiTranscript("");
      setTranscript("");
    }
  }

  // --- Connect to Gemini Live when session starts ---

  useEffect(() => {
    if (!started || !persona || !ai) return;

    let cancelled = false;

    async function connect() {
      try {
        const session = await ai.live.connect({
          model: "gemini-2.5-flash-native-audio-latest",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            systemInstruction: persona,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen() {
              if (!cancelled) {
                setIsConnected(true);
                console.log("Connected to Gemini Live");
              }
            },
            onmessage(msg) {
              if (!cancelled) handleServerMessage(msg);
            },
            onerror(e) {
              console.error("Gemini Live error:", e);
            },
            onclose() {
              if (!cancelled) {
                setIsConnected(false);
                console.log("Disconnected from Gemini Live");
              }
            },
          },
        });

        if (cancelled) {
          session.close();
          return;
        }
        sessionRef.current = session;
      } catch (e) {
        console.error("Failed to connect to Gemini Live:", e);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [started, voiceName, persona]);

  // --- Microphone toggle ---

  const toggleListening = useCallback(async () => {
    if (isListening) {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (micContextRef.current) {
        micContextRef.current.close();
        micContextRef.current = null;
      }
      setIsListening(false);
      return;
    }

    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: { ideal: 16000 }, channelCount: 1 },
      });
      micStreamRef.current = stream;

      const micCtx = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micCtx;
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);

      // Silent gain node to prevent mic feedback through speakers
      const silentGain = micCtx.createGain();
      silentGain.gain.value = 0;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;

        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)));
        }

        const uint8 = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        sessionRef.current.sendRealtimeInput({
          media: { mimeType: "audio/pcm;rate=16000", data: base64 },
        });
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(micCtx.destination);
      processorRef.current = processor;

      setIsListening(true);
    } catch (e) {
      console.error("Mic error:", e);
      if (e.name === "NotAllowedError") {
        setMicError("Microphone access denied. Please allow microphone in your browser settings.");
      } else if (e.name === "NotFoundError") {
        setMicError("No microphone found. Please connect a microphone.");
      } else {
        setMicError("Could not access microphone.");
      }
    }
  }, [isListening]);

  // --- Text input fallback ---

  const sendTextMessage = useCallback((text) => {
    if (!text || !sessionRef.current) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    sessionRef.current.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
    });
  }, []);

  // --- Summary request ---

  const requestSummary = useCallback(() => {
    if (!sessionRef.current) return;

    // Stop any current AI speech immediately
    stopPlayback();
    setIsAiSpeaking(false);
    aiTranscriptRef.current = "";
    setAiTranscript("");

    summaryModeRef.current = true;
    summaryBufferRef.current = "";

    sessionRef.current.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [
            {
              text: "Please provide a brief, poetic summary of our conversation so far, suitable as a diary entry. Focus on the themes and emotions discussed. Keep it to 2-3 sentences.",
            },
          ],
        },
      ],
    });
  }, []);

  // --- Load saved transcript ---

  const loadTranscript = useCallback((savedMessages) => {
    setMessages(savedMessages);
  }, []);

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micContextRef.current && micContextRef.current.state !== "closed") {
        micContextRef.current.close();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      if (sessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    aiTranscript,
    messages,
    isConnected,
    isAiSpeaking,
    micError,
    toggleListening,
    sendTextMessage,
    requestSummary,
    loadTranscript,
    micStream: micStreamRef.current,
  };
};
