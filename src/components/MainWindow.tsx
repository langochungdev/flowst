import { useState } from "react";
import { Minimize2, Minus, X, Settings, Home } from "lucide-react";
import ClockPane from "./ClockPane";
import SettingsPane from "./SettingsPane";
import { invoke } from "@tauri-apps/api/core";
import { useWindowDrag } from "../hooks/useWindowDrag";
import { usePomodoroStore } from "../stores/pomodoroStore";

export default function MainWindow() {
  const [isSettings, setIsSettings] = useState(false);
  const [, setHovered] = useState(false);
  const { bind } = useWindowDrag();
  const isActive = usePomodoroStore((state) => state.isActive);

  const handleMinimize = () => {
    invoke("hide_main_window_minimize").catch(console.error);
  };

  const handleClose = () => {
    if (isActive) {
      usePomodoroStore.getState().stopTimer();
    }
    invoke("hide_main_window_close").catch(console.error);
  };

  const handleCompact = () => {
    setIsSettings(false);
    invoke("toggle_mini_window").catch(console.error);
  };

  return (
    <div
      className="glass-window main-window"
      {...bind}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="top-header-bar"></div>

      <div className="corner-btn-group left">
        <button className="corner-btn" onClick={handleCompact} title="Mini View">
          <Minimize2 size={14} />
        </button>
        <div className="corner-divider" />
        <button
          className="corner-btn"
          onClick={() => setIsSettings(!isSettings)}
          title={isSettings ? "Home" : "Settings"}
        >
          {isSettings ? <Home size={14} /> : <Settings size={14} />}
        </button>
      </div>

      <div className="corner-btn-group right">
        <button className="corner-btn" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <div className="corner-divider" />
        <button className="corner-btn hover-danger" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>

      {isSettings ? <SettingsPane /> : <ClockPane />}
    </div>
  );
}
