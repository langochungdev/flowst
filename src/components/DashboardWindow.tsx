import { useEffect, useState, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { X, Download } from "lucide-react";
import { toPng } from "html-to-image";
import DashboardGrid from "./dashboard/DashboardGrid";
import DashboardChart from "./dashboard/DashboardChart";
import DashboardStats from "./dashboard/DashboardStats";
import { useWindowDrag } from "../hooks/useWindowDrag";

export default function DashboardWindow() {
  const { bind } = useWindowDrag();
  const [windowRef, setWindowRef] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // We need the data from store to pass down or let components use it themselves.
  // Using store inside components is fine since it's global.

  useEffect(() => {
    setWindowRef(getCurrentWebviewWindow());
  }, []);

  const closeWindow = () => {
    if (windowRef) {
      windowRef.close();
    }
  };

  const handleExport = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, { cacheBust: true, backgroundColor: "#000" });
      const link = document.createElement('a');
      link.download = 'flowst-dashboard.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      {...bind}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <button
          onClick={closeWindow}
          style={{
            background: "transparent",
            border: "none",
            color: "#888",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          backgroundColor: "#000",
        }}
      >
        <DashboardGrid />

        <div style={{ display: "flex", gap: "24px", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 2, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <DashboardChart />
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <DashboardStats />
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 10 }}>
        <button
          onClick={handleExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#00F2F6",
            color: "#000",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <Download size={16} /> Export
        </button>
      </div>
    </div>
  );
}
