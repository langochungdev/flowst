import { invoke } from "@tauri-apps/api/core";
import { usePomodoroStore } from "./stores/pomodoroStore";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MiniView() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer, stopTimer } =
    usePomodoroStore();

  return (
    <div className="mini-view">
      <div className="timer-container" style={{ margin: "16px 0" }}>
        <div className="timer-text">{formatTime(timeLeft)}</div>
        <div className="timer-phase">{state}</div>
      </div>

      <div className="timer-controls" style={{ marginTop: "16px" }}>
        {state === "idle" ? (
          <button className="primary" onClick={() => startTimer(25, "focus")}>
            Start
          </button>
        ) : (
          <>
            {isActive ? (
              <button onClick={pauseTimer}>Pause</button>
            ) : (
              <button className="primary" onClick={resumeTimer}>Resume</button>
            )}
            <button onClick={stopTimer}>Stop</button>
          </>
        )}
        <button
          onClick={() => invoke("toggle_mini_window")}
          title="Back to Main"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
