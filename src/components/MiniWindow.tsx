import { useState } from 'react';
import { Maximize2, X, Play, Pause } from 'lucide-react';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MiniWindow() {
  const [hovered, setHovered] = useState(false);
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer } = usePomodoroStore();

  const handleClose = () => {
    const appWindow = getCurrentWebviewWindow();
    if (appWindow) appWindow.close();
  };

  const handleExpand = () => {
    invoke('toggle_mini_window').catch(console.error);
  };

  const handlePlayPause = () => {
    if (state === 'idle') {
      startTimer(25, 'focus');
    } else if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('.custom-select') || 
      target.closest('.time-text')
    ) {
      return;
    }
    const appWindow = getCurrentWindow();
    if (appWindow) appWindow.startDragging().catch(console.error);
  };

  return (
    <div 
      className="glass-window mini-window"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="top-bar">
        <button 
          className="icon-btn" 
          onClick={handleExpand}
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
          <Maximize2 size={16} />
        </button>
        <button 
          className="icon-btn" 
          onClick={handleClose}
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="timer-display" style={{ margin: 0 }}>
        <div className="time-text">{formatTime(timeLeft)}</div>
      </div>

      {hovered && (
        <button className="mini-play-pause-btn" onClick={handlePlayPause}>
          {isActive ? <Pause size={15} /> : <Play size={15} />}
        </button>
      )}
    </div>
  );
}
