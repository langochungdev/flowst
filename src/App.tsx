import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import MainView from "./MainView";
import MiniView from "./MiniView";
import { usePomodoroStore } from "./stores/pomodoroStore";
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
    } catch (e) {
      console.warn("Not in Tauri environment, defaulting to main");
      setWindowLabel("main");
    }
  }, []);

  if (!windowLabel) return null;

  if (windowLabel === "mini") {
    return <MiniView />;
  }

  return <MainView />;
}

export default App;
