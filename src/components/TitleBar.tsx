import React from "react";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

export const TitleBar: React.FC = () => {
  const [appWindow, setAppWindow] = React.useState<WebviewWindow | null>(null);

  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppWindow(getCurrentWebviewWindow());
    } catch {
      console.warn("Failed to get window");
    }
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="titlebar-button"
          onClick={() => invoke("toggle_mini_window")}
          title="Toggle Compact Mode"
          style={{ width: 24, height: 24, padding: 0 }}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
        <div className="titlebar-logo" data-tauri-drag-region style={{ flex: 1 }}>
          Flowst
        </div>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-button"
          onClick={() => invoke("open_settings_window")}
          title="Settings"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          className="titlebar-button minimize"
          onClick={(e) => {
            e.currentTarget.blur();
            invoke("hide_main_window_minimize").catch(() => appWindow?.minimize());
          }}
          title="Minimize"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <button 
          className="titlebar-button close" 
          onClick={(e) => {
            e.currentTarget.blur();
            invoke("hide_main_window_close").catch(() => appWindow?.close());
          }} 
          title="Close"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
