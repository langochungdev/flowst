import { create } from "zustand";
import { useDebugStore } from "./debugStore";

export type SessionType = "focus" | "break" | "idle";

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

interface PomodoroState {
  state: SessionType;
  timeLeft: number; // in seconds
  sessionDuration: number; // in seconds
  isActive: boolean;
  startTimer: (duration: number, type: SessionType) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  setTimeLeft: (seconds: number) => void;
  soundOption: "victory" | "trumpet";
  setSoundOption: (option: "victory" | "trumpet") => void;
  playSound: () => void;
  categories: TaskCategory[];
  addCategory: (category: TaskCategory) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  deleteCategory: (id: string) => void;
  dailyTarget: number;
  setDailyTarget: (minutes: number) => void;
  todayTotalTime: number; // in minutes
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  state: "idle",
  timeLeft: 25 * 60,
  sessionDuration: 25 * 60,
  isActive: false,
  soundOption: "victory",
  dailyTarget: 120,
  todayTotalTime: 60, // MOCKED at 50% for preview
  categories: [
    { id: "work", name: "Work", color: "#00FBFF" },
    { id: "study", name: "Study", color: "#808080" }
  ],

  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  
  updateCategory: (id, name, color) => set((state) => ({
    categories: state.categories.map(c => c.id === id ? { ...c, name, color } : c)
  })),

  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter(c => c.id !== id)
  })),

  setDailyTarget: (minutes) => set({ dailyTarget: minutes }),

  setSoundOption: (option) => set({ soundOption: option }),

  playSound: () => {
    const { soundOption } = get();
    const soundFile = soundOption === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(e => console.error("Error playing sound:", e));
  },

  startTimer: (duration, type) => {
    set({ state: type, timeLeft: duration * 60, sessionDuration: duration * 60, isActive: true });
  },

  pauseTimer: () => {
    set({ isActive: false });
  },

  resumeTimer: () => {
    set({ isActive: true });
  },

  stopTimer: () => {
    set({ state: "idle", timeLeft: 25 * 60, sessionDuration: 25 * 60, isActive: false });
  },

  setTimeLeft: (seconds) => {
    set({ timeLeft: seconds });
  },

  tick: () => {
    const { isActive, timeLeft, stopTimer } = get();
    if (!isActive) return;

    const multiplier = useDebugStore.getState().timeMultiplier;

    if (timeLeft > 0) {
      if (isActive && get().state === 'focus') {
        set((s) => ({ todayTotalTime: s.todayTotalTime + multiplier / 60 }));
      }
      set({ timeLeft: Math.max(0, timeLeft - multiplier) });
    } else {
      get().playSound();
      stopTimer();
      // TODO: Log session to database and auto-start next block if auto_mode is on
    }
  },
}));
