import { Play, Pause, X, Maximize2 } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { usePomodoroStore } from "../stores/pomodoroStore";
import { useWindowDrag } from "../hooks/useWindowDrag";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MiniWindow() {
  const {
    timeLeft,
    isActive,
    state,
    pauseTimer,
    resumeTimer,
    startTimer,
    totalSessionDuration,
    elapsedSessionTime,
    sessionDuration,
    isCountUp,
    selectedFocusTime,
    selectedBreakTime,
    selectedTaskCategory,
    categories,
  } = usePomodoroStore();
  const { bind } = useWindowDrag();

  const activeCategoryInfo = categories.find((c) => c.id === selectedTaskCategory);
  const activeColor =
    state === "idle"
      ? "#3b3b3b"
      : state === "focus"
        ? activeCategoryInfo?.color || "#00fbff"
        : "#00fbff";

  const closeWindow = () => {
    const appWindow = getCurrentWebviewWindow();
    if (appWindow) {
      if (usePomodoroStore.getState().isActive) {
        usePomodoroStore.getState().stopTimer();
      }
      appWindow.hide();
    }
  };

  const handleExpand = () => {
    invoke("toggle_mini_window", { toMini: false }).catch(console.error);
    emit("ui-mode-changed", { mini: false }).catch(console.error);
  };

  const handlePlayPause = () => {
    if (state === "idle") {
      startTimer(
        selectedFocusTime || "25",
        selectedBreakTime || "5",
        timeLeft,
        selectedTaskCategory || "",
      );
    } else if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const isInfinite = !isCountUp && totalSessionDuration === 0 && state !== "idle";
  const progressPercent = isCountUp
    ? // Stopwatch: điền đầy mỗi giờ
      (elapsedSessionTime % 3600) / 3600 * 100
    : isInfinite
      ? // Infinite block: progress theo block hiện tại
        sessionDuration > 0
        ? ((sessionDuration - timeLeft) / sessionDuration) * 100
        : 0
      : totalSessionDuration > 0
        ? (elapsedSessionTime / totalSessionDuration) * 100
        : 0;
  const sessionTimeLeft = totalSessionDuration - elapsedSessionTime;

  return (
    <div className="mini-window-container" {...bind}>
      <div className={`time-text mini-text ${!isActive ? "paused" : ""}`}>
        {formatTime(timeLeft)}
      </div>

      <div className="mini-hover-overlay">
        <button className="mini-action-btn side" onClick={handleExpand} title="Expand">
          <Maximize2 size={12} pointerEvents="none" />
        </button>
        <div className="mini-divider" />
        <button
          className="mini-action-btn center"
          onClick={handlePlayPause}
          title={isActive ? "Pause" : "Play"}
        >
          {isActive ? (
            <Pause size={18} pointerEvents="none" />
          ) : (
            <Play size={18} pointerEvents="none" />
          )}
        </button>
        <div className="mini-divider" />
        <button className="mini-action-btn side" onClick={closeWindow} title="Close">
          <X size={12} pointerEvents="none" />
        </button>
      </div>

      <div className="mini-progress-row">
        {!isInfinite && !isCountUp && (
          <div className="mini-progress-times">
            <span className="mini-progress-text">
              {formatTime(elapsedSessionTime > 0 ? Math.floor(elapsedSessionTime) : 0)}
            </span>
            <span className="mini-progress-text">
              {formatTime(sessionTimeLeft > 0 ? Math.floor(sessionTimeLeft) : 0)}
            </span>
          </div>
        )}
        <div className="mini-progress-bar-bg">
          <div
            className="mini-progress-bar-fill"
            style={{ width: `${progressPercent}%`, backgroundColor: activeColor }}
          />
        </div>
      </div>
    </div>
  );
}
