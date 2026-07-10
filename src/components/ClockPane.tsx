import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Trash2, Pen } from "lucide-react";
import ContributionGrid from "./ContributionGrid";
import { usePomodoroStore } from "../stores/pomodoroStore";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import CustomSelect from "./CustomSelect";
import WheelPicker from "./WheelPicker";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatTotalTime(minutes: number) {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${mins}m`;
}

function GoalTrackerView() {
  const goal = usePomodoroStore((state) => state.goal);
  const setGoal = usePomodoroStore((state) => state.setGoal);

  const [showPopup, setShowPopup] = useState(false);
  const [text, setText] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [displayUnit, setDisplayUnit] = useState<"hours" | "days" | "weeks" | "months">("days");

  const timeMultiplier = useDebugStore((state) => state.timeMultiplier);
  const dateOffsetDays = useDebugStore((state) => state.dateOffsetDays);

  const [now, setNow] = useState(getMockedDate().getTime());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setNow(getMockedDate().getTime());
      usePomodoroStore.getState().checkRollover();
    }, 0);
    if (!goal) return () => clearTimeout(timeoutId);
    const interval = setInterval(
      () => {
        setNow(getMockedDate().getTime());
        usePomodoroStore.getState().checkRollover();
      },
      1000 / Math.max(0.1, timeMultiplier),
    );
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [goal, timeMultiplier, dateOffsetDays]);

  const handleOpenPopup = () => {
    if (goal) {
      setText(goal.text);
      const d = new Date(goal.targetDate);
      setDay(d.getDate().toString().padStart(2, "0"));
      setMonth((d.getMonth() + 1).toString().padStart(2, "0"));
      setYear((d.getFullYear() % 100).toString().padStart(2, "0"));
      setDisplayUnit(goal.displayUnit);
    } else {
      setText("");
      setDay("");
      setMonth("");
      setYear("");
      setDisplayUnit("days");
    }
    setShowPopup(true);
  };

  const handleSave = () => {
    if (!text.trim() || !day || !month || !year) return;
    const dd = parseInt(day);
    const mm = parseInt(month);
    const yy = parseInt(year);
    if (isNaN(dd) || isNaN(mm) || isNaN(yy)) return;

    // Set to end of the selected day
    const targetDateObj = new Date(2000 + yy, mm - 1, dd, 23, 59, 59);
    const targetMs = targetDateObj.getTime();
    if (isNaN(targetMs)) return;

    setGoal({
      text: text.trim().substring(0, 19),
      targetDate: targetMs,
      createdDate:
        goal && goal.targetDate === targetMs ? goal.createdDate : getMockedDate().getTime(),
      displayUnit,
    });
    setShowPopup(false);
  };

  const renderGoalDisplay = () => {
    if (!goal) {
      return (
        <div className="goal-empty-state" onClick={handleOpenPopup}>
          <Pen size={12} /> <span>Set a goal or deadline</span>
        </div>
      );
    }

    let timeRemainingMs = goal.targetDate - now;
    if (timeRemainingMs < 0) timeRemainingMs = 0;

    const totalDuration = goal.targetDate - goal.createdDate;
    const elapsed = now - goal.createdDate;
    let progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));

    let timeString = "";
    if (goal.displayUnit === "hours") {
      timeString = Math.round(timeRemainingMs / (1000 * 60 * 60)) + " hours left";
    } else if (goal.displayUnit === "days") {
      timeString = Math.round(timeRemainingMs / (1000 * 60 * 60 * 24)) + " days left";
    } else if (goal.displayUnit === "weeks") {
      timeString = Math.round(timeRemainingMs / (1000 * 60 * 60 * 24 * 7)) + " weeks left";
    } else {
      timeString = Math.round(timeRemainingMs / (1000 * 60 * 60 * 24 * 30)) + " months left";
    }

    // Green (120) to Red (0) based on elapsed time
    const hue = 120 - (progressPercent / 100) * 120;
    const color = `hsl(${hue}, 100%, 65%)`;

    return (
      <div className="goal-display" onClick={handleOpenPopup}>
        <div className="goal-countdown" style={{ color }}>
          {timeString}
        </div>
        <div className="goal-text-wrapper">
          <div
            className="goal-text"
            style={
              {
                "--progress": `${progressPercent}%`,
                "--active-color": color,
              } as React.CSSProperties
            }
          >
            {goal.text}
          </div>
        </div>
        <button
          className="goal-edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPopup();
          }}
        >
          <Pen size={12} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="goal-tracker-container">{renderGoalDisplay()}</div>

      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 150,
          }}
        >
          <div
            style={{
              background: "var(--dropdown-bg)",
              border: "1px solid var(--el-border)",
              padding: "16px",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "var(--el-shadow)",
              width: "220px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              Goal Tracker
              {goal && (
                <button
                  onClick={() => {
                    setGoal(null);
                    setShowPopup(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                id="goal-text-input"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("goal-day-input")?.focus();
                  }
                }}
                placeholder="What's your goal?"
                maxLength={19}
                style={{
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  color: "var(--text-primary)",
                  padding: "6px 8px",
                  borderRadius: 0,
                  fontSize: "12px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: "6px", width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                  <input
                    id="goal-day-input"
                    type="text"
                    value={day}
                    onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, "").substring(0, 2))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        document.getElementById("goal-month-input")?.focus();
                      } else if (
                        (e.key === "Backspace" || e.key === "Delete") &&
                        (day === "" ||
                          (e.currentTarget.selectionStart === 0 &&
                            e.currentTarget.selectionEnd === 0))
                      ) {
                        e.preventDefault();
                        const prev = document.getElementById("goal-text-input") as HTMLInputElement;
                        if (prev) {
                          prev.focus();
                          setTimeout(() => {
                            prev.selectionStart = prev.value.length;
                            prev.selectionEnd = prev.value.length;
                          }, 0);
                        }
                      }
                    }}
                    placeholder="DD"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--divider)",
                      color: "var(--text-primary)",
                      padding: "4px 0",
                      borderRadius: 0,
                      fontSize: "11px",
                      outline: "none",
                      flex: 1,
                      boxSizing: "border-box",
                      textAlign: "center",
                      width: "100%",
                    }}
                  />
                  <input
                    id="goal-month-input"
                    type="text"
                    value={month}
                    onChange={(e) =>
                      setMonth(e.target.value.replace(/[^0-9]/g, "").substring(0, 2))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        document.getElementById("goal-year-input")?.focus();
                      } else if (
                        (e.key === "Backspace" || e.key === "Delete") &&
                        (month === "" ||
                          (e.currentTarget.selectionStart === 0 &&
                            e.currentTarget.selectionEnd === 0))
                      ) {
                        e.preventDefault();
                        const prev = document.getElementById("goal-day-input") as HTMLInputElement;
                        if (prev) {
                          prev.focus();
                          setTimeout(() => {
                            prev.selectionStart = prev.value.length;
                            prev.selectionEnd = prev.value.length;
                          }, 0);
                        }
                      }
                    }}
                    placeholder="MM"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--divider)",
                      color: "var(--text-primary)",
                      padding: "4px 0",
                      borderRadius: 0,
                      fontSize: "11px",
                      outline: "none",
                      flex: 1,
                      boxSizing: "border-box",
                      textAlign: "center",
                      width: "100%",
                    }}
                  />
                  <input
                    id="goal-year-input"
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").substring(0, 2))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSave();
                      } else if (
                        (e.key === "Backspace" || e.key === "Delete") &&
                        (year === "" ||
                          (e.currentTarget.selectionStart === 0 &&
                            e.currentTarget.selectionEnd === 0))
                      ) {
                        e.preventDefault();
                        const prev = document.getElementById(
                          "goal-month-input",
                        ) as HTMLInputElement;
                        if (prev) {
                          prev.focus();
                          setTimeout(() => {
                            prev.selectionStart = prev.value.length;
                            prev.selectionEnd = prev.value.length;
                          }, 0);
                        }
                      }
                    }}
                    placeholder="YY"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--divider)",
                      color: "var(--text-primary)",
                      padding: "4px 0",
                      borderRadius: 0,
                      fontSize: "11px",
                      outline: "none",
                      flex: 1,
                      boxSizing: "border-box",
                      textAlign: "center",
                      width: "100%",
                    }}
                  />
                </div>
                <select
                  value={displayUnit}
                  onChange={(e) =>
                    setDisplayUnit(e.target.value as "hours" | "days" | "weeks" | "months")
                  }
                  style={{
                    background: "var(--el-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                    padding: "4px",
                    borderRadius: 0,
                    fontSize: "11px",
                    outline: "none",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>

            <div
              style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}
            >
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  padding: "4px 10px",
                  borderRadius: 0,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: "var(--text-primary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 0,
                  color: "var(--el-bg)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ClockPane() {
  const {
    state,
    timeLeft,
    isActive,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setTimeLeft,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    todayTotalTime,
    todayCategoryBreakdown,
    dailyTarget,
    blocks,
    currentBlockIndex,
    selectedFocusTime: focusTime,
    setSelectedFocusTime: setFocusTime,
    selectedBreakTime: breakTime,
    setSelectedBreakTime: setBreakTime,
    selectedTaskCategory: taskCategory,
    setSelectedTaskCategory: setTaskCategory,
  } = usePomodoroStore();

  const [showCatPopup, setShowCatPopup] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("");
  const [newCatTarget, setNewCatTarget] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
    };
  }, []);

  const minTimeInSeconds =
    focusTime === "auto" ? 0 : (parseInt(focusTime) + parseInt(breakTime)) * 60;

  const handlePlayPause = () => {
    if (state === "idle") {
      startTimer(focusTime, breakTime, timeLeft, taskCategory);
    } else if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleTimeClick = () => {
    if (state !== "idle") return;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      setIsEditing(true);
    }, 300);
  };

  const handleTimeDoubleClick = () => {
    if (state !== "idle") return;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    setIsEditingCustom(true);
    setIsEditing(false);
  };

  const handleCustomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === "") {
      setIsEditingCustom(false);
      return;
    }
    let val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      if (val * 60 < minTimeInSeconds) {
        val = minTimeInSeconds / 60;
      }
      setTimeLeft(val * 60);
    }
    setIsEditingCustom(false);
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setIsEditingCustom(false);
    }
  };
  return (
    <div className="clock-pane">
      <div className="select-group">
        <CustomSelect
          options={[
            { label: "Auto", value: "auto" },
            { label: "20m", value: "20" },
            { label: "25m", value: "25" },
            { label: "30m", value: "30" },
            { label: "35m", value: "35" },
            { label: "40m", value: "40" },
            { label: "45m", value: "45" },
            { label: "50m", value: "50" },
            { label: "1h", value: "60" },
            { label: "1h30", value: "90" },
          ]}
          value={focusTime}
          onChange={(val) => {
            setFocusTime(val);
            const newMinTime = val === "auto" ? 0 : (parseInt(val) + parseInt(breakTime)) * 60;
            if (timeLeft < newMinTime) setTimeLeft(newMinTime);
          }}
          width="auto"
          disabled={state !== "idle"}
        />
        <CustomSelect
          options={[
            { label: "Off", value: "0" },
            { label: "5m", value: "5" },
            { label: "10m", value: "10" },
            { label: "15m", value: "15" },
            { label: "20m", value: "20" },
          ]}
          value={breakTime}
          onChange={(val) => {
            setBreakTime(val);
            const newMinTime =
              focusTime === "auto" ? 0 : (parseInt(focusTime) + parseInt(val)) * 60;
            if (timeLeft < newMinTime) setTimeLeft(newMinTime);
          }}
          width="auto"
          disabled={state !== "idle"}
        />
        <CustomSelect
          options={[
            ...categories.map((c) => ({
              label: c.name,
              value: c.id,
              color: c.color,
              editable: true,
            })),
            { label: "Add...", value: "add" },
          ]}
          value={taskCategory}
          onChange={(val) => {
            if (val === "add") {
              const randomColor =
                "#" +
                Math.floor(Math.random() * 16777215)
                  .toString(16)
                  .padStart(6, "0");
              setNewCatColor(randomColor);
              setNewCatName("");
              setNewCatTarget("");
              setEditingCatId(null);
              setShowCatPopup(true);
            } else {
              setTaskCategory(val);
            }
          }}
          onEditOption={(val) => {
            const cat = categories.find((c) => c.id === val);
            if (cat) {
              setNewCatName(cat.name);
              setNewCatColor(cat.color);
              setNewCatTarget(cat.dailyTarget ? cat.dailyTarget.toString() : "");
              setEditingCatId(cat.id);
              setShowCatPopup(true);
            }
          }}
          width="auto"
          disabled={state !== "idle"}
        />
      </div>

      <div className={`timer-display ${isEditing ? "is-editing" : ""}`}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <div
            className="time-text editable"
            onClick={handleTimeClick}
            onDoubleClick={handleTimeDoubleClick}
            title={!isActive ? "Click to open picker, Double click to type" : ""}
            style={{
              cursor: isActive ? "default" : "pointer",
              opacity: isEditing || isEditingCustom ? 0 : 1,
              pointerEvents: isEditingCustom ? "none" : "auto",
            }}
          >
            {formatTime(timeLeft)}
          </div>

          {isEditingCustom && (
            <input
              type="number"
              className="time-text time-text-input"
              autoFocus
              defaultValue=""
              onBlur={handleCustomInputBlur}
              onKeyDown={handleCustomInputKeyDown}
              placeholder={Math.floor(timeLeft / 60).toString()}
            />
          )}
        </div>
        {isEditing && (
          <WheelPicker
            value={Math.max(timeLeft, minTimeInSeconds)}
            onChange={(val) => setTimeLeft(val)}
            onClose={() => setIsEditing(false)}
            minTime={minTimeInSeconds}
          />
        )}
        <div className="time-subtext">
          {state === "focus"
            ? `Focus — block ${currentBlockIndex + 1}/${blocks.length || 1}`
            : state === "break"
              ? "Break"
              : "Ready"}
        </div>
      </div>

      <div className="action-buttons">
        <div className="action-left"></div>
        <div className="action-center">
          <button
            className="play-pause-btn"
            onClick={handlePlayPause}
            disabled={isEditing || isEditingCustom}
            style={{
              opacity: isEditing || isEditingCustom ? 0.3 : 1,
              cursor: isEditing || isEditingCustom ? "not-allowed" : "pointer",
            }}
          >
            {isActive ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
        <div className="action-right">
          {state !== "idle" && (
            <button className="stop-btn" onClick={stopTimer} title="Stop Timer">
              <Square size={18} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <GoalTrackerView />

      <div style={{ position: "relative", marginTop: "auto" }}>
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "-24px",
            right: "-24px",
            paddingBottom: "12px",
          }}
        >
          {(() => {
            const currentCat = categories.find(c => c.id === taskCategory);
            const activeTarget = currentCat?.dailyTarget || dailyTarget;
            const activeTime = currentCat ? (todayCategoryBreakdown[currentCat.id] || 0) : todayTotalTime;
            const activeColor = currentCat ? currentCat.color : "var(--grid-active)";

            return (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0 24px",
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  <span>{formatTotalTime(activeTime)}</span>
                  <span>
                    {activeTime >= activeTarget
                      ? `+${formatTotalTime(activeTime - activeTarget)} over`
                      : `${formatTotalTime(activeTarget - activeTime)} left`}
                  </span>
                </div>
                <div style={{ height: "1px", background: "var(--grid-base)" }}>
                  <div
                    style={{
                      height: "100%",
                      background: activeColor,
                      width: `${Math.min((activeTime / (activeTarget || 1)) * 100, 100)}%`,
                      transition: "width 0.5s ease, background-color 0.5s ease",
                    }}
                  />
                </div>
              </>
            );
          })()}
        </div>

        {/* Top clock over ContributionGrid */}
        {(() => {
          const totalHours = Math.round((todayTotalTime / 60) * 10) / 10;
          let level = 0;
          if (totalHours <= 0) level = 0;
          else if (totalHours <= 1) level = 1;
          else if (totalHours <= 3) level = 2;
          else if (totalHours <= 5) level = 3;
          else level = 4;
          
          const color = level <= 0 ? "var(--grid-base)" : "var(--grid-active)";
          const opacity = level <= 0 ? 1 : [0, 0.3, 0.5, 0.72, 1.0][level];

          return (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: color,
                  opacity: opacity,
                  padding: "0 6px",
                  lineHeight: 1,
                }}
              >
                {formatTotalTime(todayTotalTime)}
              </div>
            </div>
          );
        })()}

        <ContributionGrid />
      </div>

      {showCatPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--dropdown-bg)",
              border: "1px solid var(--el-border)",
              padding: "16px",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "var(--el-shadow)",
              width: "240px",
              maxWidth: "calc(100vw - 32px)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                {editingCatId ? "Edit Category" : "New Category"}
              </div>
              {editingCatId && (
                <button
                  onClick={() => {
                    deleteCategory(editingCatId);
                    if (taskCategory === editingCatId) {
                      setTaskCategory(categories.find((c) => c.id !== editingCatId)?.id || "auto");
                    }
                    setShowCatPopup(false);
                  }}
                  title="Delete Category"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  style={{
                    width: "28px",
                    height: "28px",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category Name"
                  autoFocus
                  style={{
                    background: "transparent",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                    padding: "6px 8px",
                    borderRadius: 0,
                    fontSize: "13px",
                    outline: "none",
                    flex: 1,
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <input
                type="number"
                value={newCatTarget}
                onChange={(e) => setNewCatTarget(e.target.value)}
                placeholder="Daily Target (mins, e.g. 120)"
                style={{
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  color: "var(--text-primary)",
                  padding: "6px 8px",
                  borderRadius: 0,
                  fontSize: "13px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}
            >
              <button
                onClick={() => setShowCatPopup(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  padding: "4px 10px",
                  borderRadius: 0,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newCatName.trim()) {
                    const targetVal = newCatTarget.trim() ? parseInt(newCatTarget.trim()) : undefined;
                    const finalTarget = (targetVal !== undefined && !isNaN(targetVal)) ? targetVal : undefined;
                    if (editingCatId) {
                      updateCategory(editingCatId, newCatName.trim(), newCatColor, finalTarget);
                    } else {
                      const id = "cat_" + Date.now();
                      addCategory({ id, name: newCatName.trim(), color: newCatColor, dailyTarget: finalTarget });
                      setTaskCategory(id);
                    }
                    setShowCatPopup(false);
                  }
                }}
                style={{
                  background: "var(--text-primary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 0,
                  color: "var(--el-bg)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
