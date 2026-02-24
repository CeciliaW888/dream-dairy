import React, { useEffect, useRef } from 'react';

export default function DiaryGallery({ diaries, onLoadDiary, onClose }) {
  const backdropRef = useRef(null);
  const firstCardRef = useRef(null);

  // Focus trap + close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    firstCardRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

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
      role="dialog"
      aria-modal="true"
      aria-label="Memory gallery"
    >
       <div className="gallery-scroll">
         {diaries.map((diary, idx) => (
            <article
              key={diary.id}
              className="glass-panel gallery-card"
              ref={idx === 0 ? firstCardRef : undefined}
              tabIndex={0}
            >
               <div
                 className="gallery-card-image"
                 style={{ backgroundImage: `url(${diary.imgUrl || diary.photoUrl || ''})` }}
                 role="img"
                 aria-label={`Memory from ${diary.date}`}
               />
               <div className="gallery-card-body">
                  <h3 className="serif-text gallery-card-title">{diary.summary ? "Diary Summary" : "The Atmosphere"}</h3>
                  <p className="sans-text gallery-card-meta">@user and GEMINI &bull; {diary.date}</p>

                  <p className="sans-text gallery-card-summary">
                     {diary.summary}
                  </p>

                  <div className="gallery-card-messages">
                      {(diary.messages || []).map((msg, msgIdx) => (
                          <div key={msgIdx} className={`message gallery-message ${msg.role}`}>
                              {msg.content}
                          </div>
                      ))}
                  </div>

                  <button className="btn-pill gallery-load-btn" onClick={() => {
                      onLoadDiary(diary);
                      onClose();
                  }}>Load Atmosphere</button>
               </div>
            </article>
         ))}
       </div>
    </div>
  );
}
