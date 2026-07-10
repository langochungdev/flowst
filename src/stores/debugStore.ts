import { create } from "zustand";
import { persist } from "zustand/middleware";
import { swapData } from "./pomodoroStore";
import { emit, listen } from "@tauri-apps/api/event";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "debug" | "error";
  message: string;
  args: unknown[];
}

interface DebugState {
  logs: LogEntry[];
  timeMultiplier: number;
  dateOffsetDays: number;
  isDebugMode: boolean;
  addLog: (level: "debug" | "error", message: string, ...args: unknown[]) => void;
  clearLogs: () => void;
  setTimeMultiplier: (multiplier: number) => void;
  setDateOffsetDays: (days: number) => void;
  setDebugMode: (mode: boolean) => void;
  toggleDebugMode: () => void;
  resetDebug: () => void;
}

export const useDebugStore = create<DebugState>()(
  persist(
    (set, get) => ({
      logs: [],
      timeMultiplier: 1,
      dateOffsetDays: 0,
      isDebugMode: false,

      addLog: (level, message, ...args) =>
        set((state) => ({
          logs: [
            ...state.logs,
            {
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
              level,
              message,
              args,
            },
          ].slice(-500), // Keep max 500 logs
        })),

      clearLogs: () => set({ logs: [] }),

      setTimeMultiplier: (multiplier) => set({ timeMultiplier: multiplier }),
      setDateOffsetDays: (days) => set({ dateOffsetDays: days }),

      setDebugMode: (mode: boolean) => {
        const { isDebugMode } = get();
        if (isDebugMode !== mode) {
          swapData(mode);
          set({ isDebugMode: mode });
        }
      },

      toggleDebugMode: () => {
        const { isDebugMode } = get();
        swapData(!isDebugMode);
        set({ isDebugMode: !isDebugMode });
      },

      resetDebug: () => {
        set({ timeMultiplier: 1, dateOffsetDays: 0, logs: [] });
        // Clear debug backup from localStorage
        localStorage.removeItem("flowst-debug-backup");
      },
    }),
    {
      name: "flowst-debug-store",
    },
  ),
);

export const getMockedDate = () => {
  const offset = useDebugStore.getState().dateOffsetDays;
  return new Date(Date.now() + offset * 86400000);
};

let isDebugSyncing = false;

listen("debug-state-sync", (event: { payload: DebugState }) => {
  isDebugSyncing = true;
  useDebugStore.setState(event.payload);
  isDebugSyncing = false;
}).catch(console.error);

useDebugStore.subscribe((state) => {
  if (!isDebugSyncing) {
    emit("debug-state-sync", state).catch(console.error);
  }
});
