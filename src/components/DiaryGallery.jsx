import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiPlay, FiPause, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getAudioBlob } from '../lib/audioDB';

function DiaryAudioButton({ diaryId }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const toggle = useCallback(async (e) => {
    e.stopPropagation();
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    try {
      if (!urlRef.current) {
        const blob = await getAudioBlob(diaryId);
        if (!blob) return;
        urlRef.current = URL.createObjectURL(blob);
      }
      if (!audioRef.current) {
        audioRef.current = new Audio(urlRef.current);
        audioRef.current.onended = () => setPlaying(false);
      }
      audioRef.current.play();
      setPlaying(true);
    } catch (e) {
      console.warn("Gallery audio play failed:", e);
    }
  }, [diaryId, playing]);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return (
    <button className="btn-small diary-audio-btn interactive" onClick={toggle} aria-label={playing ? "Pause" : "Play recording"}>
      {playing ? <FiPause size={12} /> : <FiPlay size={12} />}
      <span>{playing ? "Pause" : "Play Audio"}</span>
    </button>
  );
}

// 3D transform for each card based on distance from center
function getCardStyle(offset) {
  // offset: 0 = center, -1 = one left, 1 = one right, etc.
  const absOffset = Math.abs(offset);
  const sign = Math.sign(offset);

  if (absOffset === 0) {
    return {
      transform: 'translateX(0) translateZ(0) rotateY(0deg)',
      opacity: 1,
      zIndex: 10,
    };
  }

  // Side cards rotate toward center, shift back in Z, spread in X
  const rotateY = -sign * Math.min(absOffset * 35, 65);
  const translateZ = -Math.min(absOffset * 120, 300);
  const translateX = sign * Math.min(absOffset * 40, 120);
  const opacity = Math.max(1 - absOffset * 0.3, 0.15);
  const zIndex = 10 - absOffset;

  return {
    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
    opacity,
    zIndex,
  };
}

export default function DiaryGallery({ diaries, onLoadDiary, onClose }) {
  const backdropRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeIndex, diaries.length]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const goNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, diaries.length - 1));
  }, [diaries.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Swipe/drag support
  const handlePointerDown = useCallback((e) => {
    dragStartRef.current = { x: e.clientX, time: Date.now() };
    setIsDragging(true);
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dt = Date.now() - dragStartRef.current.time;
    // Swipe threshold: 50px or fast flick (30px in <300ms)
    if (dx < -50 || (dx < -30 && dt < 300)) goNext();
    else if (dx > 50 || (dx > 30 && dt < 300)) goPrev();
    dragStartRef.current = null;
    setIsDragging(false);
  }, [goNext, goPrev]);

  // Mouse wheel horizontal navigation
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 30) goNext();
        else if (e.deltaX < -30) goPrev();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev]);

  if (diaries.length === 0) {
    return (
      <div
        className="modal-backdrop interactive gallery-backdrop"
        ref={backdropRef}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label="Memory gallery"
      >
        <div className="gallery-empty">
          <p className="serif-text gallery-empty-title">No memories yet</p>
          <p className="sans-text gallery-empty-desc">Upload a photo to create your first entry.</p>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop interactive gallery-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      role="dialog"
      aria-modal="true"
      aria-label="Memory gallery"
    >
      {/* Navigation arrows */}
      {diaries.length > 1 && (
        <>
          <button
            className="gallery-arrow gallery-arrow-left"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            disabled={activeIndex === 0}
            aria-label="Previous memory"
          >
            <FiChevronLeft size={24} />
          </button>
          <button
            className="gallery-arrow gallery-arrow-right"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            disabled={activeIndex === diaries.length - 1}
            aria-label="Next memory"
          >
            <FiChevronRight size={24} />
          </button>
        </>
      )}

      {/* 3D Carousel stage */}
      <div className="gallery-stage">
        {diaries.map((diary, idx) => {
          const offset = idx - activeIndex;
          // Only render cards within visible range for performance
          if (Math.abs(offset) > 3) return null;
          const style = getCardStyle(offset);

          return (
            <article
              key={diary.id}
              className={`glass-panel gallery-card${offset === 0 ? ' gallery-card-active' : ''}`}
              style={style}
              tabIndex={offset === 0 ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                if (offset !== 0) setActiveIndex(idx);
              }}
            >
              {/* Actual image at the top */}
              <div className="gallery-card-image-wrapper">
                <img
                  className="gallery-card-img"
                  src={diary.imgUrl || diary.photoUrl || ''}
                  alt={`Memory from ${diary.date}`}
                  loading="lazy"
                />
              </div>

              {/* Card body */}
              <div className="gallery-card-body">
                <h3 className="serif-text gallery-card-title">
                  {diary.summary ? "Diary Summary" : "The Atmosphere"}
                </h3>
                <p className="sans-text gallery-card-meta">
                  @user and GEMINI &bull; {diary.date}
                </p>

                {diary.summary && (
                  <p className="sans-text gallery-card-summary">{diary.summary}</p>
                )}

                {diary.hasAudio && <DiaryAudioButton diaryId={diary.id} />}

                {/* Conversation messages */}
                <div className="gallery-card-messages">
                  {(diary.messages || []).map((msg, msgIdx) => (
                    <div key={msgIdx} className={`message gallery-message ${msg.role}`}>
                      {msg.content}
                    </div>
                  ))}
                </div>

                <button className="btn-pill gallery-load-btn" onClick={(e) => {
                  e.stopPropagation();
                  onLoadDiary(diary);
                  onClose();
                }}>Load Atmosphere</button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Dot indicators */}
      {diaries.length > 1 && (
        <div className="gallery-dots">
          {diaries.map((_, idx) => (
            <button
              key={idx}
              className={`gallery-dot${idx === activeIndex ? ' active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
              aria-label={`Go to memory ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
