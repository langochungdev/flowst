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
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  state: "idle",
  timeLeft: 25 * 60,
  isActive: false,
  soundOption: "victory",
  categories: [
    { id: "work", name: "Work", color: "#00FBFF" },
    { id: "study", name: "Study", color: "#808080" }
  ],

  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),

  setSoundOption: (option) => set({ soundOption: option }),

  playSound: () => {
    const { soundOption } = get();
    const soundFile = soundOption === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(e => console.error("Error playing sound:", e));
  },

  startTimer: (duration, type) => {
    get().playSound();
    set({ state: type, timeLeft: duration * 60, isActive: true });
  },

  pauseTimer: () => {
    set({ isActive: false });
  },

  resumeTimer: () => {
    set({ isActive: true });
  },

  stopTimer: () => {
    set({ state: "idle", timeLeft: 25 * 60, isActive: false });
  },

  setTimeLeft: (seconds) => {
    set({ timeLeft: seconds });
  },

  tick: () => {
    const { isActive, timeLeft, stopTimer } = get();
    if (!isActive) return;

    const multiplier = useDebugStore.getState().timeMultiplier;

    if (timeLeft > 0) {
      set({ timeLeft: Math.max(0, timeLeft - multiplier) });
    } else {
      get().playSound();
      stopTimer();
      // TODO: Log session to database and auto-start next block if auto_mode is on
    }
  },
}));
