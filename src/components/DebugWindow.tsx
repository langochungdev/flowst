import { usePomodoroStore } from "../stores/pomodoroStore";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import { getLocalDateString } from "../utils/date";
import { Trash2, Copy, RotateCcw, FolderOpen, MessageSquareWarning } from "lucide-react";
import { useEffect } from "react";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { appDataDir } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";

export default function DebugWindow() {
  const {
    logs,
    timeMultiplier,
    dateOffsetDays,
    clearLogs,
    setTimeMultiplier,
    setDateOffsetDays,
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

  const handleOpenSoundDir = async () => {
    try {
      const dir = await appDataDir();
      try {
        await openPath(dir);
      } catch (err) {
        console.error("Failed to open dir, falling back to readDir", err);
        const entries = await readDir(dir);
        const audioFiles = entries.filter(e => e.name?.match(/\.(mp3|wav|ogg)$/i)).map(e => e.name);
        await message(
          audioFiles.length ? `Audio files:\n${audioFiles.join("\n")}` : "No custom audio files found.",
          { title: `Sound Directory: ${dir}`, kind: "info" }
        );
      }
    } catch (e) {
      console.error(e);
      await message("Could not access app data dir.", { title: "Error", kind: "error" });
    }
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
    const history: Record<string, { totalHours: number; breakdown: Record<string, number>; categoryNames: Record<string, string>; categoryColors: Record<string, string> }> = {};

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
      const dateStr = getLocalDateString(d);

      if (type === "month-consistent") {
        const workCat = newCats.find((c) => c.id === "work");
        history[dateStr] = {
          totalHours: 4,
          breakdown: { work: 4 },
          categoryNames: { work: workCat?.name ?? "Work" },
          categoryColors: { work: workCat?.color ?? "#00FF66" },
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

        const categoryNames: Record<string, string> = {};
        const categoryColors: Record<string, string> = {};
        newCats.forEach((cat) => {
          categoryNames[cat.id] = cat.name;
          categoryColors[cat.id] = cat.color;
        });

        history[dateStr] = { totalHours, breakdown, categoryNames, categoryColors };
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

  const debugStyles = `
    .debug-window-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0f0f0f;
      color: #e0e0e0;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 12px;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
      flex-shrink: 0;
    }
    .debug-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .debug-panel {
      background: #181818;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .debug-panel-title {
      font-weight: 600;
      font-size: 13px;
      color: #fff;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2a2a2a;
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .debug-btn {
      background: #2a2a2a;
      border: 1px solid #444;
      color: #e0e0e0;
      cursor: pointer;
      padding: 6px 4px;
      border-radius: 4px;
      font-weight: 500;
      transition: all 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 11px;
      flex: 1;
      white-space: nowrap;
      min-width: 0;
    }
    .debug-btn:hover:not(:disabled) {
      background: #333;
      border-color: #555;
      color: #fff;
    }
    .debug-btn:active:not(:disabled) {
      transform: translateY(1px);
    }
    .debug-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .debug-btn.primary {
      background: rgba(0, 251, 255, 0.1);
      border-color: rgba(0, 251, 255, 0.3);
      color: #00FBFF;
    }
    .debug-btn.primary:hover:not(:disabled) {
      background: rgba(0, 251, 255, 0.2);
    }
    .debug-btn.danger {
      background: rgba(232, 17, 35, 0.1);
      border-color: rgba(232, 17, 35, 0.3);
      color: #ff4444;
    }
    .debug-btn.danger:hover:not(:disabled) {
      background: rgba(232, 17, 35, 0.2);
    }
    .debug-scroll-area {
      flex: 1;
      overflow-y: auto;
      border-radius: 2px;
      background: #000;
      border: 1px solid #222;
      padding: 8px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
    }
    .debug-scroll-area::-webkit-scrollbar {
      width: 6px;
    }
    .debug-scroll-area::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 3px;
    }
    .log-entry {
      margin-bottom: 4px;
      word-break: break-all;
      line-height: 1.3;
    }
    .log-time { color: #888; }
    .log-info { color: #00FBFF; font-weight: 600; }
    .log-error { color: #ff4444; font-weight: 600; }
    .btn-group {
      display: flex;
      gap: 4px;
      width: 100%;
    }
    .sim-value {
      color: #00FBFF;
      font-family: monospace;
      font-size: 13px;
      font-weight: normal;
    }
  `;

  const setDebugMode = useDebugStore((state) => state.setDebugMode);

  // Auto-enable sandbox when debug window is active
  useEffect(() => {
    setDebugMode(true);
    // Cleanup is handled by the close button, or if window is destroyed natively.
    return () => {
      setDebugMode(false);
    };
  }, [setDebugMode]);

  return (
    <>
      <style>{debugStyles}</style>
      <div className="debug-window-container">
        {/* Header */}
        <div className="debug-header" data-tauri-drag-region>
          <h2 className="debug-title" data-tauri-drag-region style={{ color: "#ff4444" }}>
            Debug Console
            <span
              style={{
                fontSize: "12px",
                background: "rgba(255,0,0,0.2)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              SANDBOX
            </span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="debug-btn" onClick={resetDebug} style={{ flex: "none", padding: "4px 8px" }} title="Reset Time/Date">
                <RotateCcw size={14} />
              </button>
              <button
                className="debug-btn"
                onClick={handleOpenSoundDir}
                style={{ flex: "none", color: "#3498db", borderColor: "#3498db", padding: "4px 8px" }}
                title="Open Sound Dir"
              >
                <FolderOpen size={14} />
              </button>
              <button
                className="debug-btn"
                onClick={async () => {
                  await ask(
                    "This directory already contains storage data. Do you want to overwrite it with your current data?\n\n- Select 'Yes' to overwrite (Existing data in the directory will be deleted)\n- Select 'No' to load the existing data (Your current progress will be replaced)",
                    { title: "Confirm Data Overwrite", kind: "warning" }
                  );
                }}
                style={{ flex: "none", color: "#f39c12", borderColor: "#f39c12", padding: "4px 8px" }}
                title="Preview Dialog"
              >
                <MessageSquareWarning size={14} />
              </button>
              <button
                className="debug-btn danger"
                onClick={handleClearAppData}
                style={{ flex: "none", padding: "4px 8px" }}
                title="Clear App Data"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        <div
          style={{ display: "flex", gap: "12px", height: "calc(100% - 40px)", overflow: "hidden" }}
        >
          {/* Left Column: State Viewer */}
          <div
            className="debug-panel"
            style={{ flex: 1.2, minWidth: 0, padding: 0, overflow: "hidden" }}
          >
            <div
              className="debug-panel-title"
              style={{ padding: "12px 12px 0 12px", marginBottom: "8px" }}
            >
              State Inspector
            </div>
            <pre className="debug-scroll-area" style={{ margin: "0 12px 12px 12px" }}>
              {JSON.stringify(
                pomodoroState,
                (_key, value) => {
                  if (typeof value === "function") return "[Fn]";
                  return value;
                },
                2,
              )}
            </pre>
          </div>

          {/* Right Column: Simulators & Logs */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* Simulators */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "none" }}>
              <div className="debug-panel" style={{ padding: "8px" }}>
                <div className="debug-panel-title">
                  Time Simulator
                  <span className="sim-value">
                    {timeMultiplier === 0 ? "Stopped" : `${timeMultiplier}x`}
                  </span>
                </div>
                <div className="btn-group">
                  <button
                    className="debug-btn"
                    onClick={() => setTimeMultiplier(Math.max(1, timeMultiplier - 1))}
                    disabled={timeMultiplier <= 1}
                  >
                    -1x
                  </button>
                  <button
                    className={`debug-btn ${timeMultiplier === 0 ? "primary" : ""}`}
                    onClick={() => setTimeMultiplier(timeMultiplier === 0 ? 1 : 0)}
                  >
                    {timeMultiplier === 0 ? "Play" : "Pause"}
                  </button>
                  <button
                    className="debug-btn"
                    onClick={() =>
                      setTimeMultiplier(Math.min(60, timeMultiplier === 0 ? 1 : timeMultiplier + 1))
                    }
                    disabled={timeMultiplier >= 60}
                  >
                    +1x
                  </button>
                  <button
                    className="debug-btn primary"
                    onClick={() =>
                      setTimeMultiplier(Math.min(60, timeMultiplier === 0 ? 2 : timeMultiplier * 2))
                    }
                    disabled={timeMultiplier >= 60}
                  >
                    x2
                  </button>
                </div>
              </div>

              <div className="debug-panel" style={{ padding: "8px" }}>
                <div className="debug-panel-title">
                  Date Simulator
                  <span
                    className="sim-value"
                    style={{ color: dateOffsetDays !== 0 ? "#00FBFF" : "inherit" }}
                  >
                    {dateOffsetDays > 0 ? `+${dateOffsetDays}` : dateOffsetDays} Days
                  </span>
                </div>
                <div
                  style={{ color: "#888", fontSize: "10px", marginTop: "-4px", textAlign: "right" }}
                >
                  Mock Date:{" "}
                  {(() => {
                    const d = getMockedDate();
                    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
                  })()}
                </div>
                <div className="btn-group" style={{ marginTop: "4px" }}>
                  <button
                    className="debug-btn"
                    onClick={() => setDateOffsetDays(dateOffsetDays - 1)}
                  >
                    -1 Day
                  </button>
                  <button className="debug-btn primary" onClick={() => setDateOffsetDays(0)}>
                    Today
                  </button>
                  <button
                    className="debug-btn"
                    onClick={() => setDateOffsetDays(dateOffsetDays + 1)}
                  >
                    +1 Day
                  </button>
                </div>
              </div>

              <div className="debug-panel" style={{ padding: "8px" }}>
                <div className="debug-panel-title">Mock Data Generator</div>
                <div className="btn-group">
                  <button
                    className="debug-btn"
                    onClick={() => handleGenerateMockData("year-random")}
                  >
                    1 Year (Rnd)
                  </button>
                  <button
                    className="debug-btn"
                    onClick={() => handleGenerateMockData("month-consistent")}
                  >
                    1 Mo (Sync)
                  </button>
                  <button
                    className="debug-btn"
                    onClick={() => handleGenerateMockData("month-random")}
                  >
                    1 Mo (Ext)
                  </button>
                </div>
              </div>
            </div>

            {/* System Logs */}
            <div className="debug-panel" style={{ flex: 1, padding: "8px", overflow: "hidden" }}>
              <div
                className="debug-panel-title"
                style={{ padding: "0 0 8px 0", marginBottom: "4px" }}
              >
                <span>System Logs</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="debug-btn"
                    onClick={handleCopyLogs}
                    style={{ padding: "4px 8px", flex: "none" }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    className="debug-btn"
                    onClick={clearLogs}
                    style={{ padding: "4px 8px", flex: "none" }}
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              </div>
              <div className="debug-scroll-area" style={{ margin: 0 }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="log-entry"
                    style={{ color: log.level === "error" ? "#ff4444" : "inherit" }}
                  >
                    <span className="log-time">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    <span className={log.level === "error" ? "log-error" : "log-info"}>
                      {log.level.toUpperCase()}
                    </span>{" "}
                    {log.message}{" "}
                    {log.args.length > 0 && (
                      <span style={{ opacity: 0.7 }}>{JSON.stringify(log.args)}</span>
                    )}
                  </div>
                ))}
                {logs.length === 0 && <div style={{ color: "#888" }}>No logs yet...</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
