import { invoke } from "@tauri-apps/api/core";
import { usePomodoroStore } from "./stores/pomodoroStore";
import DebugPanel from "./features/debug/DebugPanel";
import Dashboard from "./features/dashboard/Dashboard";
import ExportImport from "./features/settings/ExportImport";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MainView() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer, stopTimer } =
    usePomodoroStore();

  // Calculate progress for the circular timer
  const maxTime = state === "focus" ? 25 * 60 : state === "break" ? 5 * 60 : 25 * 60;
  const progress = (timeLeft / maxTime) * 100;

  const stateClass = state === "focus" ? "state-focus" : state === "break" ? "state-break" : "";

  return (
    <div className="container">
      <div
        className="glass-panel"
        style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div
          className="timer-circle"
          style={{ "--progress": `${progress}%` } as React.CSSProperties}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="timer-display">{formatTime(timeLeft)}</div>
            <div className="timer-status">{state}</div>
          </div>
        </div>

        <div className="controls">
          {state === "idle" ? (
            <button className="state-focus" onClick={() => startTimer(25, "focus")}>
              Start Focus
            </button>
          ) : (
            <>
              {isActive ? (
                <button className={`secondary ${stateClass}`} onClick={pauseTimer}>
                  Pause
                </button>
              ) : (
                <button className={stateClass} onClick={resumeTimer}>
                  Resume
                </button>
              )}
              <button className="secondary" onClick={stopTimer}>
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      <button
        className="secondary"
        style={{ marginTop: "2rem", opacity: 0.7 }}
        onClick={() => invoke("toggle_mini_window")}
      >
        Toggle Mini Window
      </button>

      <Dashboard />
      <ExportImport />

      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
