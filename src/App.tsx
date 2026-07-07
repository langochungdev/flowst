import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import MainWindow from "./components/MainWindow";
import MiniWindow from "./components/MiniWindow";
import { usePomodoroStore } from "./stores/pomodoroStore";
import DebugPanel from "./features/debug/DebugPanel";
import { Agentation } from "agentation";
import "./App.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const tick = usePomodoroStore((state) => state.tick);

  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [tick]);

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

  if (!windowLabel) return null;

  return (
    <>
      {windowLabel === "main" && <MainWindow />}
      {windowLabel === "mini" && <MiniWindow />}
      {/* settings window logic is deprecated since it's merged into MainWindow, but fallback just in case */}
      {windowLabel === "settings" && <MainWindow />}
      <DebugPanel />
      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
    </>
  );
}

export default App;
