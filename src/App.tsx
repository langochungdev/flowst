import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import MainView from "./MainView";
import MiniView from "./MiniView";
import SettingsView from "./SettingsView";
import { usePomodoroStore } from "./stores/pomodoroStore";
import { TitleBar } from "./components/TitleBar";
import DebugPanel from "./features/debug/DebugPanel";
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="app-container">
      <TitleBar />
      {windowLabel === "main" && <MainView />}
      {windowLabel === "mini" && <MiniView />}
      {windowLabel === "settings" && <SettingsView />}
      <DebugPanel />
    </div>
  );
}

export default App;
