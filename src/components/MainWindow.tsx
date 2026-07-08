import { useState } from 'react';
import { Minimize2, Minus, X, Settings } from 'lucide-react';
import ClockPane from './ClockPane';
import SettingsPane from './SettingsPane';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import { useWindowDrag } from '../hooks/useWindowDrag';

export default function MainWindow() {
  const [isSettings, setIsSettings] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { startDrag } = useWindowDrag();

  const handleMinimize = () => {
    const appWindow = getCurrentWebviewWindow();
    if (appWindow) appWindow.minimize();
  };

  const handleClose = () => {
    const appWindow = getCurrentWebviewWindow();
    if (appWindow) appWindow.close();
  };

  const handleCompact = () => {
    invoke('toggle_mini_window').catch(console.error);
  };

  return (
    <div 
      className="glass-window main-window"
      onPointerDown={startDrag}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="top-bar">
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-btn" onClick={handleCompact} title="Mini View">
            <Minimize2 size={16} />
          </button>
          <button className="icon-btn" onClick={() => setIsSettings(!isSettings)} title="Settings">
            <Settings size={16} />
          </button>
        </div>
        <div 
          className="window-controls" 
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
          <button className="icon-btn" onClick={handleMinimize}>
            <Minus size={16} />
          </button>
          <button className="icon-btn" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {isSettings ? (
        <SettingsPane />
      ) : (
        <ClockPane />
      )}
    </div>
  );
}
