import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function DebugPanel() {
  const [ramUsage, setRamUsage] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const usage = await invoke<number>("get_memory_usage");
        setRamUsage(usage);
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ position: "fixed", bottom: 10, right: 10, padding: 10, background: "rgba(0,0,0,0.8)", borderRadius: 8, fontSize: "12px", color: "#0f0", zIndex: 9999, border: "1px solid #333" }}>
      <strong>[DEV DEBUG]</strong><br/>
      RAM Usage: {(ramUsage / 1024).toFixed(2)} MB
      <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
        <button style={{ padding: "4px 8px", fontSize: "10px", background: "#333" }} onClick={() => console.clear()}>Clear Log</button>
      </div>
    </div>
  );
}
