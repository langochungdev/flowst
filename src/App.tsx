import { useEffect, useState } from "react";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import MainWindow from "./components/MainWindow";
import MiniWindow from "./components/MiniWindow";
import DebugWindow from "./components/DebugWindow";
import DashboardWindow from "./components/DashboardWindow";
import { usePomodoroStore } from "./stores/pomodoroStore";
import { useDebugStore } from "./stores/debugStore";
import { onAction } from "@tauri-apps/plugin-notification";
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

  const [isMiniMode, setIsMiniMode] = useState(false);

  useEffect(() => {
    const unlisten1 = listen("switch-to-mini", () => {
      setIsMiniMode(true);
    });
    const unlisten2 = listen("ui-mode-changed", (event: { payload: { mini: boolean } }) => {
      setIsMiniMode(event.payload.mini);
    });
    const unlisten3 = listen("debug-closed", () => {
      useDebugStore.getState().setDebugMode(false);
    });
    const unlisten4 = listen("reset-view", () => {
      setIsMiniMode(false);
    });

    let unlistenAction: { unregister?: () => Promise<void> } | undefined;
    onAction(() => {
      const win = getCurrentWebviewWindow();
      if (win) {
        win.unminimize().catch(console.error);
        win.show().catch(console.error);
        win.setFocus().catch(console.error);
      }
    })
      .then((listener) => {
        unlistenAction = listener as unknown as { unregister?: () => Promise<void> };
      })
      .catch(() => {
        // Ignored: Action listeners may not be supported on this platform
      });

    return () => {
      unlisten1.then((f) => f()).catch(console.error);
      unlisten2.then((f) => f()).catch(console.error);
      unlisten3.then((f) => f()).catch(console.error);
      unlisten4.then((f) => f()).catch(console.error);
      if (unlistenAction && typeof unlistenAction.unregister === "function") {
        unlistenAction.unregister().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (windowLabel === "main") {
      WebviewWindow.getByLabel("debug")
        .then((debugWin) => {
          // Only disable debug mode if the debug window is not actually open
          if (!debugWin) {
            const debugState = useDebugStore.getState();
            if (debugState.isDebugMode) {
              debugState.setDebugMode(false);
            }
          }
        })
        .catch(console.error);
    }
  }, [windowLabel]);

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
  const isCountUp = usePomodoroStore((state) => state.isCountUp);
  const sessionState = usePomodoroStore((state) => state.state);
  const updateAvailable = usePomodoroStore((state) => state.updateAvailable);
  const latestVersion = usePomodoroStore((state) => state.latestVersion);

  const timeLeftMins = Math.floor(timeLeft / 60);

  const [appVersion, setAppVersion] = useState("v0.15.0");
  useEffect(() => {
    import("@tauri-apps/api/app")
      .then((module) => module.getVersion())
      .then((v) => setAppVersion(`v${v}`))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (windowLabel === "main") {
      const emailText = updateAvailable
        ? `Update available! (v${latestVersion})`
        : "langochungdev@gmail.com";
      let tooltip = `Flowst ${appVersion}\n${emailText}`;
      if (isActive) {
        if (isCountUp) {
          tooltip = `${timeLeftMins}m elapsed - Stopwatch`;
        } else {
          const phase = sessionState === "break" ? "Break" : "Focus";
          tooltip = `${timeLeftMins}m left - ${phase}`;
        }
      }
      invoke("update_tray_tooltip", { tooltip }).catch(console.error);
    }
  }, [
    windowLabel,
    isActive,
    timeLeftMins,
    isCountUp,
    sessionState,
    appVersion,
    updateAvailable,
    latestVersion,
  ]);

  const gridColor = usePomodoroStore((state) => state.gridColor);

  const [isHydrated, setIsHydrated] = useState(usePomodoroStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = usePomodoroStore.persist.onFinishHydration(() => setIsHydrated(true));
    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (!windowLabel) return null;
  if (!isHydrated) return null;

  return (
    <>
      <style>{`:root { --grid-active: ${gridColor || "#00FBFF"} !important; }`}</style>
      {windowLabel === "main" && (isMiniMode ? <MiniWindow /> : <MainWindow />)}
      {windowLabel === "debug" && <DebugWindow />}
      {windowLabel === "dashboard" && <DashboardWindow />}
    </>
  );
}

export default App;
