import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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
