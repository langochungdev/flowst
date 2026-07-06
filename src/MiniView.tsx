import { invoke } from "@tauri-apps/api/core";
import { usePomodoroStore } from "./stores/pomodoroStore";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MiniView() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer, stopTimer } = usePomodoroStore();
  
  const stateClass = state === "focus" ? "state-focus" : (state === "break" ? "state-break" : "");

  return (
    <div className="mini-container">
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="mini-timer" style={{ color: state === "focus" ? "var(--red-accent)" : (state === "break" ? "var(--green-accent)" : "white") }}>
          {formatTime(timeLeft)}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
          {state}
        </div>
      </div>

      <div className="mini-controls" style={{ display: "flex", gap: "8px" }}>
        {state === "idle" ? (
          <button className="state-focus" onClick={() => startTimer(25, "focus")}>Start</button>
        ) : (
          <>
            {isActive ? (
              <button className={`secondary ${stateClass}`} onClick={pauseTimer}>Pause</button>
            ) : (
              <button className={stateClass} onClick={resumeTimer}>Resume</button>
            )}
            <button className="secondary" onClick={stopTimer}>Stop</button>
          </>
        )}
        <button className="secondary" onClick={() => invoke("toggle_mini_window")} title="Back to Main">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
