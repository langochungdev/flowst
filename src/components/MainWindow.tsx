import { useState } from 'react';
import { Minimize2, Minus, X, Settings } from 'lucide-react';
import ClockPane from './ClockPane';
import SettingsPane from './SettingsPane';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';

export default function MainWindow() {
  const [isSettings, setIsSettings] = useState(false);
  const [hovered, setHovered] = useState(false);

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
      className="glass-window main-window"
      onMouseDown={handleMouseDown}
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
