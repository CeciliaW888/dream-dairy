import React, { useState, useEffect } from "react";
import Scene from "./components/Scene";
import OverlayUI from "./components/OverlayUI";
import { v4 as uuidv4 } from "uuid";

export default function App() {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diaries, setDiaries] = useState([]);
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
  const analyzerRef = React.useRef(null);
  const dataArrayRef = React.useRef(null);

  // Initialize Audio Context on first interaction
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

  // Load diaries from local storage
  useEffect(() => {
    const saved = localStorage.getItem("dream-diaries");
    if (saved) {
      try {
        setDiaries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load diaries", e);
      }
    }
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsLoading(true); // show loading screen
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target.result);
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
    localStorage.setItem("dream-diaries", JSON.stringify(newDiaries));
    setCurrentDiary(newDiary);
  };

  const handleLoadDiary = (diary) => {
    if (diary) {
      setIsLoading(true);
      setPhotoUrl(null); // Clear first to force re-render/re-compute of Scene
      setCurrentDiary(diary);

      // Delay to let React tear down the old point cloud, then load the new one
      setTimeout(() => setPhotoUrl(diary.photoUrl), 50);
    } else {
      // Revert to blank state
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
