import React, { useState, useEffect } from "react";
import Scene from "./components/Scene";
import OverlayUI from "./components/OverlayUI";
import { v4 as uuidv4 } from "uuid";
import { saveAudioBlob } from "./lib/audioDB";

const DEFAULT_IMAGE = "/images/little-prince.png";

const audioTracks = [
  { src: "/audio/ambient.mp3", title: "Ambient Drift", artist: "Atmosphere" },
  { src: "/audio/lofi-jazz.mp3", title: "LoFi Jazz", artist: "Atmosphere" },
  { src: "/audio/night-cafe.mp3", title: "Night Cafe", artist: "Atmosphere" },
  { src: "/audio/space-jazz.mp3", title: "Space Jazz", artist: "Atmosphere" },
];

export default function App() {
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_IMAGE);
  const [started, setStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diaries, setDiaries] = useState(() => {
    const saved = localStorage.getItem("dream-diaries");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load diaries", e);
      }
    }
    return [];
  });
  const [currentDiary, setCurrentDiary] = useState(null);
  const [settings, setSettings] = useState({
    particleIntensity: 1,
    voiceTone: 1,
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Audio Analyzer
  const analyzerRef = React.useRef(null);
  const dataArrayRef = React.useRef(null);

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
  }, []);

  const startSession = () => {
    setStarted(true);
    const audio = document.getElementById("bg-music");
    if (audio) {
      audio.play().catch(() => {});
      if (window.initAudioContext) window.initAudioContext();
    }
  };

  const handlePhotoUploadAndStart = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target.result);
        startSession();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDiary = async (summary, messages, audioBlob) => {
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
      hasAudio: !!audioBlob,
    };

    const newDiaries = [newDiary, ...diaries];
    setDiaries(newDiaries);
    localStorage.setItem("dream-diaries", JSON.stringify(newDiaries));
    setCurrentDiary(newDiary);

    if (audioBlob) {
      try {
        await saveAudioBlob(newDiary.id, audioBlob);
      } catch (e) {
        console.warn("Failed to save audio recording:", e);
      }
    }
  };

  const handleLoadDiary = (diary) => {
    if (diary) {
      setIsLoading(true);
      setPhotoUrl(null);
      setCurrentDiary(diary);
      setStarted(true);
      setTimeout(() => setPhotoUrl(diary.photoUrl), 50);
    } else {
      setCurrentDiary(null);
      setPhotoUrl(DEFAULT_IMAGE);
      setStarted(false);
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
        <div className="loading-screen interactive">
          <div className="spinner"></div>
          <div>Reconstructing Atmosphere...</div>
        </div>
      )}

      <Scene
        imageUrl={photoUrl}
        onLoaded={() => setIsLoading(false)}
        settings={settings}
        analyzerData={dataArrayRef}
        analyzer={analyzerRef}
      />

      <OverlayUI
        onPhotoUploadAndStart={handlePhotoUploadAndStart}
        photoLoaded={!!photoUrl}
        started={started}
        onStart={startSession}
        onSaveDiary={handleSaveDiary}
        diaries={diaries}
        onLoadDiary={handleLoadDiary}
        currentDiary={currentDiary}
        onSettingsChange={setSettings}
        currentTrack={audioTracks[currentTrackIndex]}
        onNextTrack={() =>
          setCurrentTrackIndex((prev) => (prev + 1) % audioTracks.length)
        }
        audioTracks={audioTracks}
        currentTrackIndex={currentTrackIndex}
        onSelectTrack={setCurrentTrackIndex}
        analyzer={analyzerRef}
        analyzerData={dataArrayRef}
      />
    </>
  );
}
