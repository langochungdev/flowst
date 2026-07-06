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
      </div>
    </div>
  );
}
