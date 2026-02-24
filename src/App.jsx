import React, { useState, useEffect, useRef, useCallback } from "react";
import Scene from "./components/Scene";
import OverlayUI from "./components/OverlayUI";
import ErrorBoundary from "./components/ErrorBoundary";
import { v4 as uuidv4 } from "uuid";

const LOADING_TIMEOUT_MS = 15000;

export default function App() {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diaries, setDiaries] = useState(() => {
    try {
      const saved = localStorage.getItem("dream-diaries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentDiary, setCurrentDiary] = useState(null);
  const [settings, setSettings] = useState({
    particleIntensity: 1,
    voiceTone: 1,
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const audioTracks = [
    { src: "/audio/ambient.mp3", title: "Ambient Drift", artist: "Atmosphere" },
    { src: "/audio/lofi-jazz.mp3", title: "LoFi Jazz", artist: "Atmosphere" },
    { src: "/audio/night-cafe.mp3", title: "Night Cafe", artist: "Atmosphere" },
    { src: "/audio/space-jazz.mp3", title: "Space Jazz", artist: "Atmosphere" },
  ];

  // Audio Analyzer
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const loadingTimerRef = useRef(null);

  // Initialize Audio Context on first interaction
  useEffect(() => {
    window.initAudioContext = () => {
      if (analyzerRef.current) return;
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioElement = document.getElementById("bg-music");
        const track = audioCtx.createMediaElementSource(audioElement);
        const analyzer = audioCtx.createAnalyser();

        analyzer.fftSize = 256;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        track.connect(analyzer);
        analyzer.connect(audioCtx.destination);

        analyzerRef.current = analyzer;
        dataArrayRef.current = dataArray;
      } catch (e) {
        console.warn("Audio Context init failed", e);
      }
    };
    return () => { delete window.initAudioContext; };
  }, []);


  // Loading screen timeout — auto-dismiss after 15s with manual close
  const startLoading = useCallback(() => {
    setIsLoading(true);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, LOADING_TIMEOUT_MS);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      startLoading();
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target.result);
      };
      reader.onerror = () => {
        stopLoading();
        console.error("Failed to read file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDiary = (summary, messages) => {
    const newDiary = {
      id: uuidv4(),
      date: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      timestamp: Date.now(),
      photoUrl: photoUrl,
      summary: summary,
      messages: messages,
    };

    const newDiaries = [newDiary, ...diaries];
    setDiaries(newDiaries);
    try {
      localStorage.setItem("dream-diaries", JSON.stringify(newDiaries));
    } catch (e) {
      console.error("Storage quota exceeded. Consider clearing old entries.", e);
    }
    setCurrentDiary(newDiary);
  };

  const handleLoadDiary = (diary) => {
    if (diary) {
      startLoading();
      setPhotoUrl(null);
      setCurrentDiary(diary);

      setTimeout(() => setPhotoUrl(diary.photoUrl), 50);
    } else {
      setCurrentDiary(null);
      setPhotoUrl(null);
    }
  };

  return (
    <>
      <audio
        id="bg-music"
        crossOrigin="anonymous"
        loop
        src={audioTracks[currentTrackIndex].src}
      ></audio>

      {isLoading && (
        <div className="loading-screen interactive" role="alert" aria-live="assertive">
          <button
            className="loading-close"
            onClick={stopLoading}
            aria-label="Dismiss loading screen"
          >
            Close
          </button>
          <div className="spinner" aria-hidden="true"></div>
          <div>Reconstructing Atmosphere...</div>
        </div>
      )}

      <ErrorBoundary fallbackMessage="The 3D scene encountered an error. Try refreshing the page.">
        <Scene
          imageUrl={photoUrl}
          onLoaded={stopLoading}
          settings={settings}
          analyzerData={dataArrayRef}
          analyzer={analyzerRef}
        />
      </ErrorBoundary>

      <OverlayUI
        onPhotoUpload={handlePhotoUpload}
        photoLoaded={!!photoUrl}
        onSaveDiary={handleSaveDiary}
        diaries={diaries}
        onLoadDiary={handleLoadDiary}
        currentDiary={currentDiary}
        onSettingsChange={setSettings}
        currentTrack={audioTracks[currentTrackIndex]}
        onNextTrack={() =>
          setCurrentTrackIndex((prev) => (prev + 1) % audioTracks.length)
        }
      />
    </>
  );
}
