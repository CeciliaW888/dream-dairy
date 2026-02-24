import React, { useEffect, useRef, useState } from 'react';

export default function CalendarModal({ diaries, onLoadDiary, onClose }) {
  const backdropRef = useRef(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map diary dates to day numbers in this month
  const diaryDays = (() => {
    const daySet = new Set();
    diaries.forEach(d => {
      const ts = d.timestamp ? new Date(d.timestamp) : null;
      if (ts && ts.getFullYear() === year && ts.getMonth() === month) {
        daySet.add(ts.getDate());
      }
    });
    return daySet;
  })();

  const getDiaryForDay = (day) => {
    return diaries.find(d => {
      const ts = d.timestamp ? new Date(d.timestamp) : null;
      return ts && ts.getFullYear() === year && ts.getMonth() === month && ts.getDate() === day;
    });
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div
      className="modal-backdrop interactive calendar-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Memory calendar"
    >
      <div className="calendar-modal">
        <h2 className="serif-text calendar-title">Day/night<br/>chron</h2>
        <p className="sans-text calendar-subtitle">
            {diaries.length === 0
              ? 'No memories saved yet. Upload a photo to begin.'
              : `${diaries.length} ${diaries.length === 1 ? 'memory' : 'memories'} saved`
            }
        </p>

        <div className="calendar-nav">
            <button className="icon-btn calendar-nav-btn" onClick={prevMonth} aria-label="Previous month">&lt;</button>
            <div className="serif-text calendar-month-label" aria-live="polite">{monthName}</div>
            <button className="icon-btn calendar-nav-btn" onClick={nextMonth} aria-label="Next month">&gt;</button>
        </div>

        {/* Days Header */}
        <div className="calendar-header" role="row">
           {['S','M','T','W','T','F','S'].map((d, i) => (
             <div key={i} className="calendar-day-label" role="columnheader" aria-label={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}>{d}</div>
           ))}
        </div>

        {/* Days Grid */}
        <div className="calendar-grid" role="grid" aria-label={`Calendar for ${monthName}`}>
           {/* Empty slots for start of month */}
           {Array.from({ length: firstDayOfMonth }, (_, i) => (
             <div key={`empty-${i}`} className="calendar-day-empty" />
           ))}
           {/* Days */}
           {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
               const hasDiary = diaryDays.has(day);
               const diary = hasDiary ? getDiaryForDay(day) : null;

               return (
                   <button
                       key={day}
                       className={`calendar-day ${hasDiary ? 'has-diary' : ''}`}
                       onClick={() => {
                           if (diary) {
                             onLoadDiary(diary);
                             onClose();
                           }
                       }}
                       disabled={!hasDiary}
                       aria-label={`${monthName.split(' ')[0]} ${day}${hasDiary ? ', has diary entry' : ''}`}
                   >
                       <span className="serif-text">{day}</span>
                       {hasDiary && (
                         <span className="calendar-dot" aria-hidden="true"></span>
                       )}
                   </button>
               );
           })}
        </div>

        <button className="btn calendar-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
