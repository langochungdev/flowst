import React from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const TitleBar: React.FC = () => {
  const appWindow = getCurrentWebviewWindow();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-logo" data-tauri-drag-region>
        Flowst
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-button minimize"
          onClick={() => appWindow?.minimize()}
          title="Minimize"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          className="titlebar-button close"
          onClick={() => appWindow?.close()}
          title="Close"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
