import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useDebugStore, getMockedDate } from "./debugStore";
import { emit, listen } from "@tauri-apps/api/event";

let lastSoundTime = 0;

export type SessionType = "focus" | "break" | "idle";

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  dailyTarget?: number;
}

export interface HistoryDay {
  totalHours: number;
  breakdown: Record<string, number>;
}

export interface GoalTracker {
  text: string;
  targetDate: number; // timestamp
  createdDate: number; // timestamp
  displayUnit: "hours" | "days" | "weeks" | "months";
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

  startTimer: (
    focusTimeStr: string,
    breakTimeStr: string,
    customTimeLeft: number,
    categoryId: string,
  ) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  checkRollover: () => void;
  setTimeLeft: (seconds: number) => void;
  soundOption: "victory" | "trumpet" | "off";
  setSoundOption: (option: "victory" | "trumpet" | "off") => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  triggerNotification: (title: string, body: string) => void;
  playSound: () => void;
  categories: TaskCategory[];
  addCategory: (category: TaskCategory) => void;
  updateCategory: (id: string, name: string, color: string, dailyTarget?: number) => void;
  deleteCategory: (id: string) => void;
  dailyTarget: number;
  setDailyTarget: (minutes: number) => void;
  todayTotalTime: number; // in minutes
  gridColor: string;
  setGridColor: (color: string) => void;
  goal: GoalTracker | null;
  setGoal: (goal: GoalTracker | null) => void;
  selectedTaskCategory: string;
  setSelectedTaskCategory: (categoryId: string) => void;
  selectedFocusTime: string;
  setSelectedFocusTime: (time: string) => void;
  selectedBreakTime: string;
  setSelectedBreakTime: (time: string) => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      state: "idle",
      timeLeft: 25 * 60,
      sessionDuration: 25 * 60,
      isActive: false,

      blocks: [],
      currentBlockIndex: 0,
      totalSessionDuration: 0,
      elapsedSessionTime: 0,
      breakDuration: 0,

      currentDate: new Date().toISOString().split("T")[0],
      activeCategoryId: null,
      todayCategoryBreakdown: {},
      history: {},

      soundOption: "victory",
      notificationsEnabled: true,
      dailyTarget: 240,
      todayTotalTime: 0,
      gridColor: "#00FBFF",
      goal: null,
      selectedTaskCategory: "study",
      selectedFocusTime: "25",
      selectedBreakTime: "5",
      categories: [
        { id: "study", name: "Study", color: "#00FBFF" },
        { id: "work", name: "Work", color: "#00FF66" },
      ],

      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),

      updateCategory: (id, name, color, dailyTarget) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, name, color, dailyTarget } : c)),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      setDailyTarget: (minutes) => set({ dailyTarget: minutes }),

      setGridColor: (color) => set({ gridColor: color }),

      setGoal: (goal) => set({ goal }),

      setSelectedTaskCategory: (categoryId) => set({ selectedTaskCategory: categoryId }),
      setSelectedFocusTime: (time) => set({ selectedFocusTime: time }),
      setSelectedBreakTime: (time) => set({ selectedBreakTime: time }),

      setSoundOption: (option) => set({ soundOption: option }),
      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        if (enabled) {
          isPermissionGranted().then(granted => {
            if (!granted) {
              requestPermission().catch(console.error);
            }
          }).catch(console.error);
        }
      },

      triggerNotification: (title: string, body: string) => {
        const { notificationsEnabled } = get();
        if (!notificationsEnabled) return;
        
        const checkVis = async () => {
          const mainWin = await WebviewWindow.getByLabel("main");
          const mainVis = mainWin ? await mainWin.isVisible() : false;
          
          const miniWin = await WebviewWindow.getByLabel("mini");
          const miniVis = miniWin ? await miniWin.isVisible() : false;
          
          // Only show notification if BOTH main and mini views are hidden
          if (!mainVis && !miniVis) {
            let granted = await isPermissionGranted();
            if (!granted) {
              const permission = await requestPermission();
              granted = permission === 'granted';
            }
            if (granted) {
              sendNotification({ title, body, icon: "icon.png" });
            }
          }
        };
        
        checkVis().catch(console.error);
      },

      playSound: () => {
        const { soundOption } = get();
        if (soundOption === "off") return;
        const now = Date.now();
        if (now - lastSoundTime < 500) return;
        lastSoundTime = now;
        const soundFile =
          soundOption === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
        const audio = new Audio(`/sounds/${soundFile}`);
        audio.play().catch((e) => console.error("Error playing sound:", e));
      },

      startTimer: (focusTimeStr, breakTimeStr, customTimeLeft, categoryId) => {
        const B = parseInt(breakTimeStr) || 0;
        const T = customTimeLeft;

        let totalSessionDuration = 0;
        let blocks: number[] = [];

        if (focusTimeStr === "auto") {
          const T_minutes = Math.floor(T / 60);
          totalSessionDuration = T; // Full inputted time including breaks
          if (B === 0) {
            blocks = [T];
          } else {
            let bestN = 1;
            let bestDiff = Infinity;
            const validNs = [];

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
          state: "focus",
          blocks,
          currentBlockIndex: 0,
          timeLeft: blocks[0],
          sessionDuration: blocks[0],
          breakDuration: B * 60,
          totalSessionDuration,
          elapsedSessionTime: 0,
          activeCategoryId: categoryId,
          isActive: true,
        });
      },

      pauseTimer: () => {
        set({ isActive: false });
      },

      resumeTimer: () => {
        set({ isActive: true });
      },

      stopTimer: () => {
        set({
          state: "idle",
          timeLeft: 25 * 60,
          sessionDuration: 25 * 60,
          isActive: false,
          blocks: [],
          currentBlockIndex: 0,
          totalSessionDuration: 0,
          elapsedSessionTime: 0,
        });
      },

      setTimeLeft: (seconds) => {
        set({ timeLeft: seconds });
      },

      checkRollover: () => {
        const todayDateString = getMockedDate().toISOString().split("T")[0];
        const { currentDate, todayTotalTime, todayCategoryBreakdown, history } = get();

        if (todayDateString !== currentDate) {
          const archivedTotalHours = todayTotalTime / 60;
          const archivedBreakdown: Record<string, number> = {};
          for (const [cat, mins] of Object.entries(todayCategoryBreakdown || {})) {
            archivedBreakdown[cat] = mins / 60;
          }

          const newHistory = {
            ...(history || {}),
            [currentDate]: {
              totalHours: archivedTotalHours,
              breakdown: archivedBreakdown,
            },
          };

          const targetDayHistory = newHistory[todayDateString];
          let restoredTotalTime = 0;
          const restoredBreakdown: Record<string, number> = {};

          if (targetDayHistory) {
            restoredTotalTime = targetDayHistory.totalHours * 60;
            for (const [cat, hrs] of Object.entries(targetDayHistory.breakdown || {})) {
              restoredBreakdown[cat] = hrs * 60;
            }
          }

          set({
            history: newHistory,
            currentDate: todayDateString,
            todayTotalTime: restoredTotalTime,
            todayCategoryBreakdown: restoredBreakdown,
          });
        }
      },

      tick: () => {
        const {
          isActive,
          timeLeft,
          stopTimer,
          state,
          blocks,
          currentBlockIndex,
          breakDuration,
          activeCategoryId,
          checkRollover,
        } = get();

        checkRollover();

        if (!isActive) return;

        const debugState = useDebugStore.getState();
        const multiplier = debugState.isDebugMode ? debugState.timeMultiplier : 1;

        if (timeLeft > 0) {
          const toSubtract = multiplier === 0 ? 0 : 1;
          const actualSubtracted = Math.min(toSubtract, timeLeft);
          if (actualSubtracted > 0) {
            if (state === "focus") {
              const addedMinutes = actualSubtracted / 60;
              set((s) => {
                const breakdown = { ...s.todayCategoryBreakdown };
                if (activeCategoryId) {
                  breakdown[activeCategoryId] = (breakdown[activeCategoryId] || 0) + addedMinutes;
                }
                return {
                  elapsedSessionTime: s.elapsedSessionTime + actualSubtracted,
                  todayTotalTime: s.todayTotalTime + addedMinutes,
                  todayCategoryBreakdown: breakdown,
                };
              });
            }
            set((s) => ({ timeLeft: Math.max(0, s.timeLeft - actualSubtracted) }));
          }
        } else {
          get().playSound();

          if (state === "focus") {
            const nextIndex = currentBlockIndex + 1;
            if (nextIndex < blocks.length) {
              if (breakDuration > 0) {
                get().triggerNotification("Break Time", `${breakDuration / 60} min`);
                set({
                  state: "break",
                  timeLeft: breakDuration,
                  sessionDuration: breakDuration,
                  currentBlockIndex: nextIndex,
                });
              } else {
                get().triggerNotification("Focus Time", `${Math.round(blocks[nextIndex] / 60)} min`);
                set({
                  state: "focus",
                  timeLeft: blocks[nextIndex],
                  sessionDuration: blocks[nextIndex],
                  currentBlockIndex: nextIndex,
                });
              }
            } else {
              get().triggerNotification("All Done", "Session complete");
              stopTimer();
            }
          } else if (state === "break") {
            get().triggerNotification("Focus Time", `${Math.round(blocks[currentBlockIndex] / 60)} min`);
            set({
              state: "focus",
              timeLeft: blocks[currentBlockIndex],
              sessionDuration: blocks[currentBlockIndex],
            });
          }
        }
      },
    }),
    {
      name: "pomodoro-storage",
      partialize: (state) => ({
        history: state.history,
        todayTotalTime: state.todayTotalTime,
        todayCategoryBreakdown: state.todayCategoryBreakdown,
        currentDate: state.currentDate,
        categories: state.categories,
        dailyTarget: state.dailyTarget,
        gridColor: state.gridColor,
        goal: state.goal,
        soundOption: state.soundOption,
        selectedTaskCategory: state.selectedTaskCategory,
        selectedFocusTime: state.selectedFocusTime,
        selectedBreakTime: state.selectedBreakTime,
      }),
    },
  ),
);

let isSyncing = false;
const storeWindowId = Math.random().toString(36).substring(7);

listen("pomodoro-state-sync", (event: { payload: { senderId: string; state: PomodoroState } }) => {
  if (event.payload.senderId === storeWindowId) return;
  isSyncing = true;
  usePomodoroStore.setState(event.payload.state);
  isSyncing = false;
}).catch(console.error);

let lastSyncTime = 0;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

usePomodoroStore.subscribe((state) => {
  if (!isSyncing) {
    const now = Date.now();
    if (now - lastSyncTime > 100) {
      lastSyncTime = now;
      emit("pomodoro-state-sync", { senderId: storeWindowId, state }).catch(console.error);
    } else {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        lastSyncTime = Date.now();
        emit("pomodoro-state-sync", { senderId: storeWindowId, state: usePomodoroStore.getState() }).catch(console.error);
      }, 100);
    }
  }
});

// Listen to system tray presets
listen<{ type: SessionType; duration: number }>("tray-preset", (event) => {
  const store = usePomodoroStore.getState();
  const d = event.payload.duration;

  if (event.payload.type === "focus") {
    store.startTimer(String(d / 60), "0", d, "");
  } else if (event.payload.type === "break") {
    // Manually initiate a break session since startTimer is for focus
    usePomodoroStore.setState({
      state: "break",
      timeLeft: d,
      sessionDuration: d,
      isActive: true,
      blocks: [d],
      currentBlockIndex: 0,
      totalSessionDuration: d,
      elapsedSessionTime: 0,
      breakDuration: d,
      activeCategoryId: null,
    });
  }
}).catch(console.error);

export const swapData = (toDebug: boolean) => {
  const currentState = usePomodoroStore.getState();
  if (toDebug) {
    localStorage.setItem("flowst-real-backup", JSON.stringify({ state: currentState }));
    const debugDataStr = localStorage.getItem("flowst-debug-backup");
    if (debugDataStr) {
      try {
        const debugData = JSON.parse(debugDataStr);
        usePomodoroStore.setState({
          ...debugData.state,
          state: "idle",
          isActive: false,
          blocks: [],
          currentBlockIndex: 0,
          timeLeft: 25 * 60,
          sessionDuration: 25 * 60,
          totalSessionDuration: 0,
          elapsedSessionTime: 0,
        });
      } catch {
        // ignore JSON parse error
      }
    } else {
      usePomodoroStore.setState({
        history: {},
        todayTotalTime: 0,
        todayCategoryBreakdown: {},
        goal: null,
        blocks: [],
        state: "idle",
        isActive: false,
        timeLeft: 25 * 60,
        sessionDuration: 25 * 60,
        totalSessionDuration: 0,
        elapsedSessionTime: 0,
      });
    }
  } else {
    localStorage.setItem("flowst-debug-backup", JSON.stringify({ state: currentState }));
    const realDataStr = localStorage.getItem("flowst-real-backup");
    if (realDataStr) {
      try {
        const realData = JSON.parse(realDataStr);
        usePomodoroStore.setState({
          ...realData.state,
          state: "idle",
          isActive: false,
          blocks: [],
          currentBlockIndex: 0,
          timeLeft: 25 * 60,
          sessionDuration: 25 * 60,
          totalSessionDuration: 0,
          elapsedSessionTime: 0,
        });
      } catch {
        // ignore JSON parse error
      }
    }
  }
};
