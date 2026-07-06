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
    const appWindow = getCurrentWebviewWindow();
    setWindowLabel(appWindow.label);
  }, []);

  if (!windowLabel) return null;

  if (windowLabel === "mini") {
    return <MiniView />;
  }

  return <MainView />;
}

export default App;
