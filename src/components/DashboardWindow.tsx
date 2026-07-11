import { useEffect, useState, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { X, Download } from "lucide-react";
import { toPng } from "html-to-image";
import DashboardGrid from "./dashboard/DashboardGrid";
import DashboardChart from "./dashboard/DashboardChart";
import DashboardStats from "./dashboard/DashboardStats";
import { useWindowDrag } from "../hooks/useWindowDrag";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export default function DashboardWindow() {
    const { isDragging, bind } = useWindowDrag();
    const [windowRef, setWindowRef] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

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
            const savePath = await save({
                filters: [{ name: "Image", extensions: ["png"] }],
                defaultPath: "flowst-dashboard.png"
            });
            if (!savePath) return;

            setIsExporting(true);
            // Wait for UI to update (hide buttons)
            await new Promise(resolve => setTimeout(resolve, 50));

            const dataUrl = await toPng(containerRef.current, {
                cacheBust: true,
                backgroundColor: "#000",
                pixelRatio: 2.4 // 450 * 2.4 = 1080, 800 * 2.4 = 1920
            });

            // Convert base64 dataUrl to Uint8Array
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            await writeFile(savePath, bytes);
        } catch (err) {
            console.error(err);
        } finally {
            setIsExporting(false);
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
                cursor: isDragging ? "grabbing" : "default",
            }}
        >
            {!isExporting && (
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
                    <button
                        onClick={closeWindow}
                        className="no-drag"
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
            )}

            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    padding: "24px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    backgroundColor: "#000",
                    height: "100%",
                    boxSizing: "border-box"
                }}
            >
                <div style={{ flex: "0 0 auto" }}>
                    <DashboardStats />
                </div>

                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <DashboardChart />
                </div>

                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" }}>
                    <DashboardGrid />
                </div>
            </div>

            {!isExporting && (
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
                    <button
                        onClick={handleExport}
                        className="no-drag"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "#00F2F6",
                            color: "#000",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        <Download size={14} /> Export
                    </button>
                </div>
            )}
        </div>
    );
}
