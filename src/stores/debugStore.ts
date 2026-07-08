import { create } from "zustand";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "debug" | "error";
  message: string;
  args: any[];
}

interface DebugState {
  logs: LogEntry[];
  timeMultiplier: number;
  dateOffsetDays: number;
  addLog: (level: "debug" | "error", message: string, ...args: any[]) => void;
  clearLogs: () => void;
  setTimeMultiplier: (multiplier: number) => void;
  setDateOffsetDays: (days: number) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  logs: [],
  timeMultiplier: 1,
  dateOffsetDays: 0,
  
  addLog: (level, message, ...args) => set((state) => ({
    logs: [...state.logs, {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      level,
      message,
      args
    }].slice(-500) // Keep max 500 logs
  })),
  
  clearLogs: () => set({ logs: [] }),
  
  
  setTimeMultiplier: (multiplier) => set({ timeMultiplier: multiplier }),
  setDateOffsetDays: (days) => set({ dateOffsetDays: days }),
}));

export const getMockedDate = () => {
  const offset = useDebugStore.getState().dateOffsetDays;
  return new Date(Date.now() + offset * 86400000);
};
