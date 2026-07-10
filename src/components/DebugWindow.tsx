import { usePomodoroStore } from "../stores/pomodoroStore";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import { Trash2, Copy, X } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function DebugWindow() {
  const {
    logs,
    timeMultiplier,
    dateOffsetDays,
    isDebugMode,
    clearLogs,
    setTimeMultiplier,
    setDateOffsetDays,
    toggleDebugMode,
    resetDebug,
  } = useDebugStore();
  const pomodoroState = usePomodoroStore();

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toISOString()}] ${l.level.toUpperCase()}: ${l.message} ${l.args.length ? JSON.stringify(l.args) : ""}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  const handleClearAppData = () => {
    usePomodoroStore.setState({
      categories: [
        { id: "study", name: "Study", color: "#00FBFF" },
        { id: "work", name: "Work", color: "#00FF66" },
      ],
      dailyTarget: 240,
      todayTotalTime: 0,
      todayCategoryBreakdown: {},
      history: {},
      soundOption: "victory",
      gridColor: "#00FBFF",
      goal: null,
      blocks: [],
      currentBlockIndex: 0,
      state: "idle",
      isActive: false,
    });
  };

  const handleGenerateMockData = (type: "year-random" | "month-consistent" | "month-random") => {
    const { categories } = usePomodoroStore.getState();
    const history: Record<string, { totalHours: number; breakdown: Record<string, number> }> = {};

    // Add custom categories if missing
    const extraCats = [
      { id: "read", name: "Reading", color: "#FFD700" },
      { id: "code", name: "Coding", color: "#FF00FF" },
      { id: "sport", name: "Sports", color: "#00FF00" },
    ];

    const newCats = [...categories];
    extraCats.forEach((ec) => {
      if (!newCats.find((c) => c.id === ec.id)) newCats.push(ec);
    });

    const now = new Date();
    const daysToGenerate = type.startsWith("year") ? 365 : 30;

    for (let i = 0; i < daysToGenerate; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split("T")[0];

      if (type === "month-consistent") {
        history[dateStr] = {
          totalHours: 4,
          breakdown: { work: 4 },
        };
      } else {
        // Random
        const isExtreme = type === "month-random";
        const totalHours = isExtreme ? Math.random() * 12 : Math.random() * 6;
        const breakdown: Record<string, number> = {};
        let remaining = totalHours;

        newCats.forEach((cat, idx) => {
          if (idx === newCats.length - 1) {
            breakdown[cat.id] = remaining;
          } else {
            const amount = Math.random() * remaining;
            breakdown[cat.id] = amount;
            remaining -= amount;
          }
        });

        history[dateStr] = { totalHours, breakdown };
      }
    }

    const futureDate = new Date(now.getTime() + 15 * 86400000);
    const goal = {
      text: type === "month-consistent" ? "Stay Consistent!" : "Ship the MVP",
      targetDate: futureDate.getTime(),
      createdDate: now.getTime() - (type.startsWith("year") ? 180 : 15) * 86400000,
      displayUnit: "days" as const,
    };

    usePomodoroStore.setState({ history, categories: newCats, goal });
  };

  return (
    <div
      className="glass-window debug-window"
      style={{
        width: "100vw",
        height: "100vh",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: "12px",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          borderBottom: "1px solid var(--text-secondary)",
          paddingBottom: "8px",
        }}
      >
        <h2
          data-tauri-drag-region
          style={{
            margin: 0,
            fontSize: "16px",
            color: isDebugMode ? "#e81123" : "#00FBFF",
            display: "flex",
            gap: "6px",
          }}
        >
          Debug Console{" "}
          <span style={{ opacity: isDebugMode ? 1 : 0, transition: "opacity 0.2s" }}>
            (SANDBOX)
          </span>
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              color: isDebugMode ? "#e81123" : "inherit",
            }}
          >
            <input
              type="checkbox"
              checked={isDebugMode}
              onChange={toggleDebugMode}
              style={{ cursor: "pointer" }}
            />
            Sandbox Mode
          </label>
          <button
            className="action-btn-outline"
            onClick={() => getCurrentWebviewWindow()?.hide()}
            title="Close Debug Window"
            style={{ padding: "4px", border: "none" }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={resetDebug}
            disabled={!isDebugMode}
            style={{
              background: "var(--text-secondary)",
              border: "none",
              color: "var(--el-bg)",
              cursor: !isDebugMode ? "not-allowed" : "pointer",
              padding: "4px 12px",
              borderRadius: 0,
              fontWeight: "bold",
              opacity: !isDebugMode ? 0.5 : 1,
            }}
          >
            Reset Time/Date
          </button>
          <button
            onClick={handleClearAppData}
            disabled={!isDebugMode}
            style={{
              background: "#e81123",
              border: "none",
              color: "white",
              cursor: !isDebugMode ? "not-allowed" : "pointer",
              padding: "4px 12px",
              borderRadius: 0,
              fontWeight: "bold",
              opacity: !isDebugMode ? 0.5 : 1,
            }}
          >
            Clear App Data
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", height: "calc(100% - 40px)" }}>
        {/* Left Column: Logs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontWeight: "bold" }}>Logs</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCopyLogs}
                style={{
                  background: "transparent",
                  border: "1px solid var(--text-secondary)",
                  color: "var(--el-bg)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={clearLogs}
                style={{
                  background: "transparent",
                  border: "1px solid var(--text-secondary)",
                  color: "var(--el-bg)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              border: "1px solid var(--text-secondary)",
              borderRadius: 0,
              overflowY: "auto",
              padding: "8px",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  marginBottom: "4px",
                  color: log.level === "error" ? "red" : "inherit",
                  wordBreak: "break-all",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{" "}
                <span style={{ color: log.level === "error" ? "red" : "#00FBFF" }}>
                  {log.level.toUpperCase()}
                </span>{" "}
                {log.message}{" "}
                {log.args.length > 0 && (
                  <span style={{ opacity: 0.7 }}>{JSON.stringify(log.args)}</span>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ color: "var(--text-secondary)" }}>No logs yet...</div>
            )}
          </div>
        </div>

        {/* Right Column: State & Time */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}
        >
          {/* Simulators */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              opacity: isDebugMode ? 1 : 0.5,
              pointerEvents: isDebugMode ? "auto" : "none",
            }}
          >
            <span style={{ fontWeight: "bold" }}>Time Simulator</span>
            <div
              style={{
                border: "1px solid var(--text-secondary)",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}
              >
                <span>
                  Speed Multiplier:{" "}
                  <span style={{ color: "#00FBFF" }}>
                    {timeMultiplier === 0 ? "Stopped" : `${timeMultiplier}x`}
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setTimeMultiplier(Math.max(1, timeMultiplier - 1))}
                  disabled={timeMultiplier <= 1}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: timeMultiplier <= 1 ? "var(--text-secondary)" : "var(--el-bg)",
                    cursor: timeMultiplier <= 1 ? "not-allowed" : "pointer",
                    padding: "4px",
                  }}
                >
                  - Slower
                </button>
                <button
                  onClick={() => setTimeMultiplier(timeMultiplier === 0 ? 1 : 0)}
                  style={{
                    flex: 1,
                    background: timeMultiplier === 0 ? "#00FBFF" : "var(--text-secondary)",
                    border:
                      "1px solid " + (timeMultiplier === 0 ? "#00FBFF" : "var(--text-secondary)"),
                    color: timeMultiplier === 0 ? "#111" : "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                    fontWeight: timeMultiplier === 0 ? "bold" : "normal",
                  }}
                >
                  {timeMultiplier === 0 ? "Play" : "Stop"}
                </button>
                <button
                  onClick={() =>
                    setTimeMultiplier(Math.min(60, timeMultiplier === 0 ? 1 : timeMultiplier + 1))
                  }
                  disabled={timeMultiplier >= 60}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: timeMultiplier >= 60 ? "var(--text-secondary)" : "var(--el-bg)",
                    cursor: timeMultiplier >= 60 ? "not-allowed" : "pointer",
                    padding: "4px",
                  }}
                >
                  + Faster
                </button>
                <button
                  onClick={() =>
                    setTimeMultiplier(Math.min(60, timeMultiplier === 0 ? 2 : timeMultiplier * 2))
                  }
                  disabled={timeMultiplier >= 60}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: timeMultiplier >= 60 ? "var(--text-secondary)" : "#00FBFF",
                    cursor: timeMultiplier >= 60 ? "not-allowed" : "pointer",
                    padding: "4px",
                    fontWeight: "bold",
                  }}
                >
                  x2 Faster
                </button>
              </div>
            </div>

            <span style={{ fontWeight: "bold" }}>Date Simulator</span>
            <div
              style={{
                border: "1px solid var(--text-secondary)",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}
              >
                <span>
                  Day Offset:{" "}
                  <span style={{ color: dateOffsetDays !== 0 ? "#00FBFF" : "var(--el-bg)" }}>
                    {dateOffsetDays > 0 ? `+${dateOffsetDays}` : dateOffsetDays}
                  </span>
                </span>
                <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
                  {(() => {
                    const d = getMockedDate();
                    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
                  })()}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setDateOffsetDays(dateOffsetDays - 1)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  -1 Day
                </button>
                <button
                  onClick={() => setDateOffsetDays(0)}
                  style={{
                    flex: 1,
                    background: "var(--text-secondary)",
                    border: "none",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateOffsetDays(dateOffsetDays + 1)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  +1 Day
                </button>
              </div>
            </div>

            <span style={{ fontWeight: "bold" }}>Mock Data Generator</span>
            <div
              style={{
                border: "1px solid var(--text-secondary)",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleGenerateMockData("year-random")}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "10px",
                  }}
                >
                  1 Year (Random)
                </button>
                <button
                  onClick={() => handleGenerateMockData("month-consistent")}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "10px",
                  }}
                >
                  1 Month (Consistent)
                </button>
                <button
                  onClick={() => handleGenerateMockData("month-random")}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--text-secondary)",
                    color: "var(--el-bg)",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "10px",
                  }}
                >
                  1 Month (Extreme)
                </button>
              </div>
            </div>
          </div>

          {/* State Viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <span style={{ fontWeight: "bold", marginBottom: "8px" }}>State Inspector</span>
            <pre
              style={{
                flex: 1,
                margin: 0,
                border: "1px solid var(--text-secondary)",
                borderRadius: 0,
                padding: "8px",
                overflowY: "auto",
                background: "rgba(255,255,255,0.05)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {JSON.stringify(
                pomodoroState,
                (_key, value) => {
                  if (typeof value === "function") return "[Function]";
                  return value;
                },
                2,
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
