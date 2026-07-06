import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function DebugPanel() {
  const [ramUsage, setRamUsage] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<{ type: string; message: string; time: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // Intercept console
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addLog = (type: string, ...args: any[]) => {
      const message = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" ");
      setLogs((prev) => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
    };

    console.log = (...args) => {
      addLog("log", ...args);
      originalLog(...args);
    };
    console.error = (...args) => {
      addLog("error", ...args);
      originalError(...args);
    };
    console.warn = (...args) => {
      addLog("warn", ...args);
      originalWarn(...args);
    };

    const timer = setInterval(async () => {
      try {
        const usage = await invoke<number>("get_memory_usage");
        setRamUsage(usage);
      } catch {
        // Ignore error
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  if (!import.meta.env.DEV) return null;

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          borderRadius: "50%",
          width: 36,
          height: 36,
          padding: 0,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          background: "var(--panel-bg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
        }}
        title="Toggle Debug Panel"
      >
        🐛
      </button>

      {/* Mini Frame */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 60,
            right: 16,
            width: 320,
            maxHeight: 400,
            background: "var(--panel-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Debug Tools</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              RAM: {(ramUsage / 1024).toFixed(1)} MB
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 8,
              background: "#F9F9F9",
              fontFamily: "monospace",
              fontSize: 11,
              maxHeight: 250,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#999" }}>No logs yet...</div>
            ) : null}
            {logs.map((l, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 4,
                  wordBreak: "break-all",
                  color: l.type === "error" ? "#D32F2F" : l.type === "warn" ? "#ED6C02" : "#2D2D2D",
                }}
              >
                <span style={{ color: "#888" }}>[{l.time}]</span> {l.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          <div
            style={{
              padding: 8,
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: 8,
            }}
          >
            <button style={{ flex: 1, padding: "6px" }} onClick={copyLogs}>
              Copy Logs
            </button>
            <button style={{ padding: "6px" }} onClick={() => setLogs([])}>
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
