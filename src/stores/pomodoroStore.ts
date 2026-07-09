import { create } from "zustand";
import { useDebugStore } from "./debugStore";
import { emit, listen } from "@tauri-apps/api/event";

export type SessionType = "focus" | "break" | "idle";

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

export interface HistoryDay {
  totalHours: number;
  breakdown: Record<string, number>;
}

interface PomodoroState {
  state: SessionType;
  timeLeft: number; // in seconds
  sessionDuration: number; // in seconds
  isActive: boolean;
  
  blocks: number[];
  currentBlockIndex: number;
  totalSessionDuration: number;
  elapsedSessionTime: number;
  breakDuration: number;

  currentDate: string;
  activeCategoryId: string | null;
  todayCategoryBreakdown: Record<string, number>; // in minutes
  history: Record<string, HistoryDay>;

  startTimer: (focusTimeStr: string, breakTimeStr: string, customTimeLeft: number, categoryId: string) => void;
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
  gridColor: string;
  setGridColor: (color: string) => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  state: "idle",
  timeLeft: 25 * 60,
  sessionDuration: 25 * 60,
  isActive: false,
  
  blocks: [],
  currentBlockIndex: 0,
  totalSessionDuration: 0,
  elapsedSessionTime: 0,
  breakDuration: 0,

  currentDate: new Date().toISOString().split('T')[0],
  activeCategoryId: null,
  todayCategoryBreakdown: {},
  history: {},

  soundOption: "victory",
  dailyTarget: 120,
  todayTotalTime: 0, 
  gridColor: "#00FBFF",
  categories: [
    { id: "study", name: "Study", color: "#808080" },
    { id: "work", name: "Work", color: "#00FBFF" }
  ],

  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  
  updateCategory: (id, name, color) => set((state) => ({
    categories: state.categories.map(c => c.id === id ? { ...c, name, color } : c)
  })),

  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter(c => c.id !== id)
  })),

  setDailyTarget: (minutes) => set({ dailyTarget: minutes }),
  
  setGridColor: (color) => set({ gridColor: color }),

  setSoundOption: (option) => set({ soundOption: option }),

  playSound: () => {
    const { soundOption } = get();
    const soundFile = soundOption === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(e => console.error("Error playing sound:", e));
  },

  startTimer: (focusTimeStr, breakTimeStr, customTimeLeft, categoryId) => {
    const B = parseInt(breakTimeStr) || 0;
    let T = customTimeLeft; 
    
    let totalSessionDuration = 0;
    let blocks: number[] = [];

    if (focusTimeStr === 'auto') {
      const T_minutes = Math.floor(T / 60);
      totalSessionDuration = T; // Full inputted time including breaks
      if (B === 0) {
        blocks = [T];
      } else {
        let bestN = 1;
        let bestDiff = Infinity;
        let validNs = [];

        for (let n = 1; n <= Math.max(1, Math.ceil(T_minutes / 15)); n++) {
          const blockTime = T_minutes / n;
          if (blockTime >= 15 && blockTime <= 30) {
            validNs.push(n);
            const diff = Math.abs(blockTime - 25);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestN = n;
            }
          }
        }

        if (validNs.length === 0) {
          blocks = [T];
        } else {
          const totalFocusSeconds = T_minutes * 60;
          const baseBlockSeconds = Math.floor(totalFocusSeconds / bestN);
          const remainderSeconds = totalFocusSeconds % bestN;

          blocks = Array(bestN).fill(baseBlockSeconds);
          for (let i = 0; i < remainderSeconds; i++) {
            blocks[i] += 1;
          }
        }
      }
    } else {
      const blockSeconds = (parseInt(focusTimeStr) || 25) * 60;
      let remainingSeconds = T;
      
      while (remainingSeconds > 0) {
        if (remainingSeconds >= blockSeconds) {
          blocks.push(blockSeconds);
          remainingSeconds -= blockSeconds;
        } else {
          blocks.push(remainingSeconds);
          remainingSeconds = 0;
        }
      }
      
      totalSessionDuration = T;
    }

    set({ 
      state: 'focus', 
      blocks,
      currentBlockIndex: 0,
      timeLeft: blocks[0], 
      sessionDuration: blocks[0], 
      breakDuration: B * 60,
      totalSessionDuration,
      elapsedSessionTime: 0,
      activeCategoryId: categoryId,
      isActive: true 
    });
  },

  pauseTimer: () => {
    set({ isActive: false });
  },

  resumeTimer: () => {
    set({ isActive: true });
  },

  stopTimer: () => {
    set({ state: "idle", timeLeft: 25 * 60, sessionDuration: 25 * 60, isActive: false, blocks: [], currentBlockIndex: 0 });
  },

  setTimeLeft: (seconds) => {
    set({ timeLeft: seconds });
  },

  tick: () => {
    const { isActive, timeLeft, stopTimer, state, blocks, currentBlockIndex, breakDuration, currentDate, todayTotalTime, todayCategoryBreakdown, activeCategoryId } = get();
    if (!isActive) return;

    const todayDateString = new Date().toISOString().split('T')[0];
    if (todayDateString !== currentDate) {
      // Rollover
      const archivedTotalHours = todayTotalTime / 60;
      const archivedBreakdown: Record<string, number> = {};
      for (const [cat, mins] of Object.entries(todayCategoryBreakdown || {})) {
        archivedBreakdown[cat] = mins / 60;
      }
      
      set((s) => ({
        history: {
          ...(s.history || {}),
          [currentDate]: {
            totalHours: archivedTotalHours,
            breakdown: archivedBreakdown
          }
        },
        currentDate: todayDateString,
        todayTotalTime: 0,
        todayCategoryBreakdown: {}
      }));
    }

    const multiplier = useDebugStore.getState().timeMultiplier;

    if (timeLeft > 0) {
      if (state === 'focus') {
        const addedMinutes = multiplier / 60;
        set((s) => {
          const breakdown = { ...s.todayCategoryBreakdown };
          if (activeCategoryId) {
            breakdown[activeCategoryId] = (breakdown[activeCategoryId] || 0) + addedMinutes;
          }
          return {
            elapsedSessionTime: s.elapsedSessionTime + multiplier,
            todayTotalTime: s.todayTotalTime + addedMinutes,
            todayCategoryBreakdown: breakdown
          };
        });
      }
      set((s) => ({ timeLeft: Math.max(0, s.timeLeft - multiplier) }));
    } else {
      get().playSound();
      
      if (state === 'focus') {
        const nextIndex = currentBlockIndex + 1;
        if (nextIndex < blocks.length) {
          if (breakDuration > 0) {
            set({ state: 'break', timeLeft: breakDuration, sessionDuration: breakDuration, currentBlockIndex: nextIndex });
          } else {
            set({ state: 'focus', timeLeft: blocks[nextIndex], sessionDuration: blocks[nextIndex], currentBlockIndex: nextIndex });
          }
        } else {
          stopTimer();
        }
      } else if (state === 'break') {
        set({ state: 'focus', timeLeft: blocks[currentBlockIndex], sessionDuration: blocks[currentBlockIndex] });
      }
    }
  },
}));

let isSyncing = false;

listen('pomodoro-state-sync', (event: any) => {
  isSyncing = true;
  usePomodoroStore.setState(event.payload);
  isSyncing = false;
}).catch(console.error);

usePomodoroStore.subscribe((state) => {
  if (!isSyncing) {
    emit('pomodoro-state-sync', state).catch(console.error);
  }
});
