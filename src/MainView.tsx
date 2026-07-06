import { invoke } from "@tauri-apps/api/core";
import { usePomodoroStore } from "./stores/pomodoroStore";
import Dashboard from "./features/dashboard/Dashboard";

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

  return (
    <div className="main-view">
      <div className="timer-container">
        <div className="timer-text">{formatTime(timeLeft)}</div>
        <div className="timer-phase">{state}</div>

        <div className="timer-controls">
          {state === "idle" ? (
            <button className="primary" onClick={() => startTimer(25, "focus")}>
              Start Focus
            </button>
          ) : (
            <>
              {isActive ? (
                <button onClick={pauseTimer}>Pause</button>
              ) : (
                <button className="primary" onClick={resumeTimer}>
                  Resume
                </button>
              )}
              <button onClick={stopTimer}>Stop</button>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Dashboard</div>
        <Dashboard />
      </div>

      <div className="panel">
        <div className="panel-header">Settings & Backup</div>
        <button
          className="secondary"
          onClick={() => invoke("open_settings_window")}
          style={{ width: "100%" }}
        >
          ⚙️ Open Settings
        </button>
      </div>
    </div>
  );
}
