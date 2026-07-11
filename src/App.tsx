import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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

        let unlistenAction: any;
        onAction(() => {
            const win = getCurrentWebviewWindow();
            if (win) {
                win.unminimize().catch(console.error);
                win.show().catch(console.error);
                win.setFocus().catch(console.error);
            }
        }).then(listener => {
            unlistenAction = listener;
        }).catch(() => {
            // Ignored: Action listeners may not be supported on this platform
        });

        return () => {
            unlisten1.then((f) => f()).catch(console.error);
            unlisten2.then((f) => f()).catch(console.error);
            unlisten3.then((f) => f()).catch(console.error);
            if (unlistenAction && typeof unlistenAction.unregister === 'function') {
                unlistenAction.unregister().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        if (windowLabel === "main") {
            import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
                WebviewWindow.getByLabel("debug").then(debugWin => {
                    // Only disable debug mode if the debug window is not actually open
                    if (!debugWin) {
                        const debugState = useDebugStore.getState();
                        if (debugState.isDebugMode) {
                            debugState.setDebugMode(false);
                        }
                    }
                }).catch(console.error);
            });
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
    const currentBlockIndex = usePomodoroStore((state) => state.currentBlockIndex);

    useEffect(() => {
        if (windowLabel === "main") {
            let tooltip = "Flowst v0.7.0\nlangochungdev@gmail.com";
            if (isActive) {
                const m = Math.floor(timeLeft / 60);
                const isBreak = currentBlockIndex % 2 !== 0;
                const phase = isBreak ? "Break" : "Focus";
                tooltip = `${m}m left - ${phase}`;
            }
            invoke("update_tray_tooltip", { tooltip }).catch(console.error);
        }
    }, [windowLabel, isActive, Math.floor(timeLeft / 60), currentBlockIndex]);

    const gridColor = usePomodoroStore((state) => state.gridColor);

    if (!windowLabel) return null;

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
