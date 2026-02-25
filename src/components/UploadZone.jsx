import React, { useState, useRef, useCallback } from 'react';
import { FiWind } from 'react-icons/fi';

export default function UploadZone({ onBegin, onPhotoUploadAndStart }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onPhotoUploadAndStart({ target: { files: [file] } });
      }
      e.dataTransfer.clearData();
    }
  }, [onPhotoUploadAndStart]);

  return (
    <div className="landing-backdrop interactive">
      <div
        className="landing-cta"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <h2 className="serif-text landing-title">Dream Diary</h2>
        <p className="sans-text landing-desc">
          {isDragging ? 'Drop your image here...' : 'Begin a conversation with the atmosphere, or upload a photo to set the scene.'}
        </p>
        <div className="landing-buttons">
          <button className="btn-pill interactive" onClick={onBegin}>
            Begin
          </button>
          <button
            className="btn-pill btn-pill-secondary interactive"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onPhotoUploadAndStart}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
