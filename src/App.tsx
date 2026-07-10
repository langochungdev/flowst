import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import MainWindow from "./components/MainWindow";
import MiniWindow from "./components/MiniWindow";
import DebugWindow from "./components/DebugWindow";
import { usePomodoroStore } from "./stores/pomodoroStore";
import { useDebugStore } from "./stores/debugStore";
import "./App.css";

function App() {
  const tick = usePomodoroStore((state) => state.tick);
  const timeMultiplier = useDebugStore((state) => (state.isDebugMode ? state.timeMultiplier : 1));

  const [windowLabel] = useState<string | null>(() => {
    try {
      const appWindow = getCurrentWebviewWindow();
      return appWindow ? appWindow.label : "main";
    } catch {
      return "main";
    }
  });

  useEffect(() => {
    if (windowLabel === "main") {
      const timer = setInterval(
        () => {
          tick();
        },
        1000 / Math.max(0.1, timeMultiplier),
      );
      return () => clearInterval(timer);
    }
  }, [windowLabel, tick, timeMultiplier]);

  const isActive = usePomodoroStore((state) => state.isActive);
  const timeLeft = usePomodoroStore((state) => state.timeLeft);
  const currentBlockIndex = usePomodoroStore((state) => state.currentBlockIndex);

  useEffect(() => {
    if (windowLabel === "main") {
      let tooltip = "Flowst v0.7.0\nlangochungdev@gmail.com";
      if (isActive) {
        const m = Math.floor(timeLeft / 60);
        const s = Math.floor(timeLeft % 60);
        const isBreak = currentBlockIndex % 2 !== 0;
        const phase = isBreak ? "Break" : "Focus";
        tooltip = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} - ${phase}`;
      }
      invoke("update_tray_tooltip", { tooltip }).catch(console.error);
    }
  }, [windowLabel, isActive, Math.ceil(timeLeft), currentBlockIndex]);

  const gridColor = usePomodoroStore((state) => state.gridColor);

  if (!windowLabel) return null;

  return (
    <>
      <style>{`:root { --grid-active: ${gridColor || "#00FBFF"} !important; }`}</style>
      {windowLabel === "main" && <MainWindow />}
      {windowLabel === "mini" && <MiniWindow />}
      {windowLabel === "debug" && <DebugWindow />}
      {/* settings window logic is deprecated since it's merged into MainWindow, but fallback just in case */}
      {windowLabel === "settings" && <MainWindow />}
    </>
  );
}

export default App;
