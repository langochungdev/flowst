import { useState, useEffect } from "react";
import { Minimize2, Minus, Settings, Home } from "lucide-react";
import ClockPane from "./ClockPane";
import SettingsPane from "./SettingsPane";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { useWindowDrag } from "../hooks/useWindowDrag";
import { openUrl } from "@tauri-apps/plugin-opener";
import { usePomodoroStore } from "../stores/pomodoroStore";

export default function MainWindow() {
  const [isSettings, setIsSettings] = useState(false);
  const [, setHovered] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const { bind } = useWindowDrag();
  const updateAvailable = usePomodoroStore((state) => state.updateAvailable);
  const latestVersion = usePomodoroStore((state) => state.latestVersion);
  const checkForUpdates = usePomodoroStore((state) => state.checkForUpdates);

  useEffect(() => {
    checkForUpdates();
    const unlisten = listen("reset-view", () => {
      setIsSettings(false);
    });
    return () => {
      unlisten.then((f) => f()).catch(console.error);
    };
  }, [checkForUpdates]);

  const executeHideAction = (action: () => Promise<void>) => {
    setIsHiding(true);
    setTimeout(() => {
      action()
        .then(() => {
          setTimeout(() => setIsHiding(false), 200);
        })
        .catch(console.error);
    }, 50);
  };

  const handleMinimize = () => {
    executeHideAction(() => invoke("hide_main_window_minimize"));
  };

  const handleCompact = () => {
    setIsSettings(false);
    executeHideAction(async () => {
      await invoke("toggle_mini_window", { toMini: true });
      await emit("ui-mode-changed", { mini: true });
    });
  };

  return (
    <div
      className="glass-window main-window"
      {...bind}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="top-header-bar">
        {isSettings && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "56px",
              right: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                cursor: "pointer",
                pointerEvents: "auto",
                color: updateAvailable ? "#00FBFF" : "var(--text-secondary)",
                transition: "color 150ms ease",
                fontWeight: updateAvailable ? "bold" : "normal",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = updateAvailable
                  ? "#00FBFF"
                  : "var(--text-secondary)")
              }
              onClick={() => {
                if (updateAvailable) {
                  openUrl("https://flowst.langochung.me");
                } else {
                  openUrl("https://langochung.me");
                }
              }}
            >
              {updateAvailable
                ? `Update available! (v${latestVersion})`
                : "langochungdev@gmail.com"}
            </span>
          </div>
        )}
      </div>

      <div className="corner-btn-group left">
        <button
          className={`corner-btn ${isHiding ? "force-no-hover" : ""}`}
          onClick={handleCompact}
          title="Mini View"
        >
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
        <button
          className={`corner-btn ${isHiding ? "force-no-hover" : ""}`}
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
      </div>

      {isSettings ? <SettingsPane /> : <ClockPane />}
    </div>
  );
}
