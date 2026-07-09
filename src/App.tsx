import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import MainWindow from "./components/MainWindow";
import MiniWindow from "./components/MiniWindow";
import DebugWindow from "./components/DebugWindow";
import { usePomodoroStore } from "./stores/pomodoroStore";
import { useDebugStore } from "./stores/debugStore";
import "./App.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const tick = usePomodoroStore((state) => state.tick);
  const timeMultiplier = useDebugStore((state) => state.timeMultiplier);

  useEffect(() => {
    if (windowLabel === "main") {
      const timer = setInterval(() => {
        tick();
      }, 1000 / Math.max(0.1, timeMultiplier));
      return () => clearInterval(timer);
    }
  }, [windowLabel, tick, timeMultiplier]);

  useEffect(() => {
    try {
      const appWindow = getCurrentWebviewWindow();
      if (appWindow) {
        setWindowLabel(appWindow.label);
      } else {
        setWindowLabel("main");
      }
    } catch {
      console.warn("Not in Tauri environment, defaulting to main");
      setWindowLabel("main");
    }
  }, []);

  const gridColor = usePomodoroStore(state => state.gridColor);

  if (!windowLabel) return null;

  return (
    <>
      <style>{`:root { --grid-active: ${gridColor || '#00FBFF'} !important; }`}</style>
      {windowLabel === "main" && <MainWindow />}
      {windowLabel === "mini" && <MiniWindow />}
      {windowLabel === "debug" && <DebugWindow />}
      {/* settings window logic is deprecated since it's merged into MainWindow, but fallback just in case */}
      {windowLabel === "settings" && <MainWindow />}
    </>
  );
}

export default App;
