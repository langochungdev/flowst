import { create } from "zustand";

export type SessionType = "focus" | "break" | "idle";

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
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  state: "idle",
  timeLeft: 25 * 60,
  isActive: false,

  startTimer: (duration, type) => {
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

    if (timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    } else {
      stopTimer();
      // TODO: Log session to database and auto-start next block if auto_mode is on
    }
  },
}));
