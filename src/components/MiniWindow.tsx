import { useRef } from 'react';
import { Play, Pause, X, Maximize2 } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { useWindowDrag } from '../hooks/useWindowDrag';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MiniWindow() {
  const { timeLeft, isActive, pauseTimer, resumeTimer, sessionDuration } = usePomodoroStore();
  const { bind } = useWindowDrag();

  const closeWindow = () => {
    getCurrentWebviewWindow()?.close();
  };

  const handleExpand = () => {
    invoke('toggle_mini_window').catch(console.error);
  };

  const handlePlayPause = () => {
    if (isActive) pauseTimer();
    else resumeTimer();
  };

  const isDraggingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleButtonDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleButtonMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // Drag threshold of 4 pixels
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isDraggingRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      getCurrentWebviewWindow()?.startDragging();
    }
  };

  const handleButtonUp = (e: React.PointerEvent, action: () => void) => {
    if (isDraggingRef.current) {
      // Mouse was released without moving beyond threshold -> it's a click!
      isDraggingRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      action();
    }
  };

  const progressPercent = sessionDuration > 0 ? ((sessionDuration - timeLeft) / sessionDuration) * 100 : 0;
  const elapsed = sessionDuration - timeLeft;

  return (
    <div className="mini-window-container" {...bind}>
      <div className={`time-text mini-text ${!isActive ? 'paused' : ''}`}>
        {formatTime(timeLeft)}
      </div>

      <div className="mini-hover-overlay">
        <button 
          className="mini-action-btn side" 
          onPointerDown={handleButtonDown}
          onPointerMove={handleButtonMove}
          onPointerUp={(e) => handleButtonUp(e, handleExpand)}
          title="Expand"
        >
          <Maximize2 size={12} pointerEvents="none" />
        </button>
        <div className="mini-divider" />
        <button 
          className="mini-action-btn center" 
          onPointerDown={handleButtonDown}
          onPointerMove={handleButtonMove}
          onPointerUp={(e) => handleButtonUp(e, handlePlayPause)}
          title={isActive ? "Pause" : "Play"}
        >
          {isActive ? <Pause size={18} pointerEvents="none" /> : <Play size={18} pointerEvents="none" />}
        </button>
        <div className="mini-divider" />
        <button 
          className="mini-action-btn side" 
          onPointerDown={handleButtonDown}
          onPointerMove={handleButtonMove}
          onPointerUp={(e) => handleButtonUp(e, closeWindow)}
          title="Close"
        >
          <X size={12} pointerEvents="none" />
        </button>
      </div>

      <div className="mini-progress-row">
        <div className="mini-progress-times">
          <span className="mini-progress-text">{formatTime(elapsed > 0 ? elapsed : 0)}</span>
          <span className="mini-progress-text">{formatTime(timeLeft)}</span>
        </div>
        <div className="mini-progress-bar-bg">
          <div className="mini-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
