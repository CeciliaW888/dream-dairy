import React, { useState, useRef, useCallback } from 'react';
import { FiWind } from 'react-icons/fi';

export default function UploadZone({ onPhotoUpload }) {
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
        // Create a synthetic event matching the file input shape
        onPhotoUpload({ target: { files: [file] } });
      }
      e.dataTransfer.clearData();
    }
  }, [onPhotoUpload]);

  return (
    <div className="upload-backdrop interactive">
      <div
        className={`dropzone interactive ${isDragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload an image to create a memory"
      >
         <FiWind size={48} className="dropzone-icon" aria-hidden="true" />
         <h3 className="serif-text dropzone-title">Recall a Memory</h3>
         <p className="sans-text dropzone-desc">
           {isDragging ? 'Drop your image here...' : 'Upload or drag an image to reconstruct the atmosphere.'}
         </p>
         <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{display: 'none'}}
            onChange={onPhotoUpload}
            aria-hidden="true"
         />
      </div>
    </div>
  );
}
