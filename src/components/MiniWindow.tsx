import { useState } from 'react';
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
  const [hovered, setHovered] = useState(false);
  const { timeLeft, isActive, pauseTimer, resumeTimer } = usePomodoroStore();
  const { startDrag } = useWindowDrag();

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

  return (
    <div 
      className={`mini-window-container ${hovered ? 'hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={startDrag}
      data-tauri-drag-region
    >
      <div className="time-text mini-text" data-tauri-drag-region>
        {formatTime(timeLeft)}
      </div>

      {hovered && (
        <div className="mini-hover-overlay">
          <button className="icon-btn float-left" onClick={handleExpand}>
            <Maximize2 size={12} />
          </button>
          <button className="icon-btn float-right" onClick={closeWindow}>
            <X size={12} />
          </button>
          <button className="icon-btn center-play" onClick={handlePlayPause}>
            {isActive ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}
