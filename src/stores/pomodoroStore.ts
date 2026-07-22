import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { customStorage } from "./storage";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useDebugStore, getMockedDate } from "./debugStore";

import { emit, listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { getLocalDateString } from "../utils/date";

// Migrate local storage key if exists
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const legacyData = localStorage.getItem("pomodoro-storage");
    if (legacyData) {
      localStorage.setItem("flowst-storage", legacyData);
      localStorage.removeItem("pomodoro-storage");
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

let lastSoundTime = 0;

const soundModules = import.meta.glob("/src/sounds/*.*", {
  eager: true,
  query: "?url",
  import: "default",
});
const soundUrls: Record<string, string> = {};
for (const path in soundModules) {
  const filename = path.split("/").pop() || "";
  soundUrls[filename] = soundModules[path] as string;
}

export type SessionType = "focus" | "break" | "idle";

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  dailyTarget?: number;
  archived?: boolean;
}

export interface HistoryDay {
  totalHours: number;
  breakdown: Record<string, number>;
  /** Snapshot of category names at the time of archiving — immutable after save */
  categoryNames?: Record<string, string>;
  /** Snapshot of category colors at the time of archiving — immutable after save */
  categoryColors?: Record<string, string>;
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
  /** Stopwatch mode: auto focus + 0 total time — counts up, no blocks/breaks */
  isCountUp: boolean;

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
  skipBreak: () => void;
  tick: () => void;
  checkRollover: () => void;
  setTimeLeft: (seconds: number) => void;
  soundOption: string;
  setSoundOption: (option: string) => void;
  customSound: { name: string; path: string } | null;
  setCustomSound: (sound: { name: string; path: string } | null) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  triggerNotification: (title: string, body: string) => void;
  playSound: () => void;
  categories: TaskCategory[];
  addCategory: (category: TaskCategory) => void;
  updateCategory: (id: string, name: string, color: string, dailyTarget?: number) => void;
  deleteCategory: (id: string) => void;
  archiveCategory: (id: string) => void;
  unarchiveCategory: (id: string) => void;
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
  customFocusTime: string;
  setCustomFocusTime: (time: string) => void;
  customBreakTime: string;
  setCustomBreakTime: (time: string) => void;
  contributionView: "grid" | "chart";
  setContributionView: (view: "grid" | "chart") => void;
  updateAvailable: boolean;
  latestVersion: string | null;
  lastUpdateCheck: number;
  checkForUpdates: () => Promise<void>;
  setUpdateAvailable: (available: boolean, version?: string) => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      state: "idle",
      timeLeft: 0,
      sessionDuration: 0,
      isActive: false,

      blocks: [],
      currentBlockIndex: 0,
      totalSessionDuration: 0,
      elapsedSessionTime: 0,
      breakDuration: 0,
      isCountUp: false,

      currentDate: getLocalDateString(),
      activeCategoryId: null,
      todayCategoryBreakdown: {},
      history: {},

      customSound: null,
      soundOption: "victory",
      notificationsEnabled: true,
      dailyTarget: 240,
      todayTotalTime: 0,
      gridColor: "#00FBFF",
      goal: null,
      selectedTaskCategory: "study",
      selectedFocusTime: "25",
      selectedBreakTime: "5",
      customFocusTime: "90",
      customBreakTime: "20",
      contributionView: "grid",
      updateAvailable: false,
      latestVersion: null,
      lastUpdateCheck: 0,
      setContributionView: (view) => set({ contributionView: view }),
      categories: [
        { id: "study", name: "Study", color: "#00FBFF" },
        { id: "work", name: "Work", color: "#00FF66" },
      ],

      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),

      updateCategory: (id, name, color, dailyTarget) =>
        set((state) => {
          // Sync tên và màu mới vào toàn bộ lịch sử
          const updatedHistory: Record<string, (typeof state.history)[string]> = {};
          for (const [date, day] of Object.entries(state.history)) {
            const updatedNames = { ...(day.categoryNames || {}) };
            const updatedColors = { ...(day.categoryColors || {}) };
            if (id in (day.breakdown || {})) {
              updatedNames[id] = name;
              updatedColors[id] = color;
            }
            updatedHistory[date] = {
              ...day,
              categoryNames: updatedNames,
              categoryColors: updatedColors,
            };
          }
          return {
            categories: state.categories.map((c) =>
              c.id === id ? { ...c, name, color, dailyTarget } : c,
            ),
            history: updatedHistory,
          };
        }),

      deleteCategory: (id) =>
        set((state) => {
          // Xóa dữ liệu của category này khỏi toàn bộ lịch sử
          const updatedHistory: Record<string, (typeof state.history)[string]> = {};
          for (const [date, day] of Object.entries(state.history)) {
            const newBreakdown = { ...(day.breakdown || {}) };
            const newNames = { ...(day.categoryNames || {}) };
            const newColors = { ...(day.categoryColors || {}) };
            delete newBreakdown[id];
            delete newNames[id];
            delete newColors[id];
            // Tính lại totalHours sau khi xóa
            const newTotalHours = Object.values(newBreakdown).reduce((a, b) => a + b, 0);
            updatedHistory[date] = {
              ...day,
              breakdown: newBreakdown,
              categoryNames: newNames,
              categoryColors: newColors,
              totalHours: newTotalHours,
            };
          }
          // Xóa khỏi todayCategoryBreakdown nếu có
          const newTodayBreakdown = { ...state.todayCategoryBreakdown };
          delete newTodayBreakdown[id];
          const newTodayTotal = Object.values(newTodayBreakdown).reduce((a, b) => a + b, 0);
          return {
            categories: state.categories.filter((c) => c.id !== id),
            history: updatedHistory,
            todayCategoryBreakdown: newTodayBreakdown,
            todayTotalTime: newTodayTotal,
          };
        }),

      archiveCategory: (id) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)),
        })),

      unarchiveCategory: (id) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, archived: false } : c)),
        })),

      setDailyTarget: (minutes) => set({ dailyTarget: minutes }),

      setGridColor: (color) => set({ gridColor: color }),

      setGoal: (goal) => set({ goal }),

      setSelectedTaskCategory: (categoryId) => set({ selectedTaskCategory: categoryId }),
      setSelectedFocusTime: (time) => set({ selectedFocusTime: time }),
      setSelectedBreakTime: (time) => set({ selectedBreakTime: time }),
      setCustomFocusTime: (time) => set({ customFocusTime: time }),
      setCustomBreakTime: (time) => set({ customBreakTime: time }),
      setUpdateAvailable: (available, version) =>
        set({ updateAvailable: available, latestVersion: version || null }),
      checkForUpdates: async () => {
        const { lastUpdateCheck } = get();
        const now = Date.now();
        // Check at most once per 12 hours
        if (now - lastUpdateCheck < 12 * 60 * 60 * 1000) return;

        try {
          const res = await fetch("https://flowst.langochung.me/version.json");
          const data = await res.json();
          if (data && data.version) {
            const { getVersion } = await import("@tauri-apps/api/app");
            const currentVersion = await getVersion();

            // Basic semver check, simple comparison
            if (data.version !== currentVersion) {
              set({ updateAvailable: true, latestVersion: data.version, lastUpdateCheck: now });
            } else {
              set({ updateAvailable: false, lastUpdateCheck: now });
            }
          }
        } catch (e) {
          console.error("Failed to check for updates:", e);
        }
      },

      setCustomSound: (sound) => set({ customSound: sound }),
      setSoundOption: (option) => set({ soundOption: option }),
      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        if (enabled) {
          isPermissionGranted()
            .then((granted) => {
              if (!granted) {
                requestPermission().catch(console.error);
              }
            })
            .catch(console.error);
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
              granted = permission === "granted";
            }
            if (granted) {
              sendNotification({ title, body });
            }
          }
        };

        checkVis().catch(console.error);
      },

      playSound: () => {
        const { soundOption, customSound } = get();
        if (soundOption === "off") return;
        const now = Date.now();
        if (now - lastSoundTime < 500) return;
        lastSoundTime = now;

        if (soundOption === "custom" && customSound?.path) {
          readFile(customSound.path)
            .then((data) => {
              const blob = new Blob([data]);
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.onended = () => URL.revokeObjectURL(url);
              audio.play().catch((e) => console.error("Error playing custom sound:", e));
            })
            .catch((e) => console.error("Failed to read custom sound:", e));
          return;
        }

        // Backward compatibility for old values
        let soundFile = soundOption;
        if (soundOption === "victory") soundFile = "victory-chime.mp3";
        else if (soundOption === "trumpet") soundFile = "success-fanfare-trumpets.mp3";

        const url = soundUrls[soundFile];
        if (url) {
          const audio = new Audio(url);
          audio.play().catch((e) => console.error("Error playing sound:", e));
        }
      },

      startTimer: (focusTimeStr, breakTimeStr, customTimeLeft, categoryId) => {
        let B = parseInt(breakTimeStr) || 0;
        if (focusTimeStr === "off" || customTimeLeft === -1) {
          B = 0; // Ignore break time
        }
        const T = customTimeLeft;

        let totalSessionDuration = 0;
        let blocks: number[] = [];

        if (focusTimeStr === "auto" || focusTimeStr === "off") {
          // Stopwatch mode: auto/off + 0 total time — đếm tăng vô hạn, không nghỉ
          if (T === 0) {
            set({
              state: "focus",
              blocks: [],
              currentBlockIndex: 0,
              timeLeft: 0,
              sessionDuration: 0,
              breakDuration: 0,
              totalSessionDuration: 0,
              elapsedSessionTime: 0,
              activeCategoryId: categoryId,
              isActive: true,
              isCountUp: true,
            });
            return;
          } else if (T === -1) {
            blocks = [25 * 60];
            totalSessionDuration = 25 * 60;
          } else {
            const T_minutes = Math.floor(T / 60);
            totalSessionDuration = T; // Full inputted time including breaks

            if (focusTimeStr === "off") {
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
          }
        } else {
          const blockSeconds = (parseInt(focusTimeStr) || 25) * 60;

          // Infinite mode: T = 0 — chạy mãi 1 block tống hợp
          if (T === 0) {
            blocks = [blockSeconds];
            totalSessionDuration = 0; // sentinel: infinite
          } else if (T === -1) {
            // 1 block mode
            blocks = [blockSeconds];
            totalSessionDuration = blockSeconds;
          } else {
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
          isCountUp: false,
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
          timeLeft: 0,
          sessionDuration: 0,
          isActive: false,
          blocks: [],
          currentBlockIndex: 0,
          totalSessionDuration: 0,
          elapsedSessionTime: 0,
          isCountUp: false,
        });
      },

      skipBreak: () => {
        const { state, blocks, currentBlockIndex, totalSessionDuration } = get();
        if (state === "break") {
          const isInfinite = totalSessionDuration === 0;
          const blockDuration = isInfinite ? blocks[0] : blocks[currentBlockIndex];
          set({
            state: "focus",
            timeLeft: blockDuration,
            sessionDuration: blockDuration,
          });
        }
      },

      setTimeLeft: (seconds) => {
        set({ timeLeft: seconds });
      },

      checkRollover: () => {
        const todayDateString = getLocalDateString(getMockedDate());
        const { currentDate, todayTotalTime, todayCategoryBreakdown, history, categories } = get();

        if (todayDateString !== currentDate) {
          const archivedTotalHours = todayTotalTime / 60;
          const archivedBreakdown: Record<string, number> = {};
          // Snapshot tên và màu của category tại thời điểm rollover
          const archivedCategoryNames: Record<string, string> = {};
          const archivedCategoryColors: Record<string, string> = {};
          for (const [cat, mins] of Object.entries(todayCategoryBreakdown || {})) {
            archivedBreakdown[cat] = mins / 60;
            const catObj = (categories || []).find((c) => c.id === cat);
            if (catObj) {
              archivedCategoryNames[cat] = catObj.name;
              archivedCategoryColors[cat] = catObj.color;
            }
          }

          const newHistory = {
            ...(history || {}),
            [currentDate]: {
              totalHours: archivedTotalHours,
              breakdown: archivedBreakdown,
              categoryNames: archivedCategoryNames,
              categoryColors: archivedCategoryColors,
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
          isCountUp,
        } = get();

        checkRollover();

        if (!isActive) return;

        const debugState = useDebugStore.getState();
        const multiplier = debugState.isDebugMode ? debugState.timeMultiplier : 1;

        // — Stopwatch mode: auto + 0 — chỉ đếm tăng, không nghỉ, không kết thúc
        if (isCountUp) {
          const addedMinutes = multiplier / 60;
          set((s) => {
            const breakdown = { ...s.todayCategoryBreakdown };
            if (activeCategoryId) {
              breakdown[activeCategoryId] = (breakdown[activeCategoryId] || 0) + addedMinutes;
            }
            return {
              timeLeft: s.timeLeft + multiplier, // đếm tăng
              elapsedSessionTime: s.elapsedSessionTime + multiplier,
              todayTotalTime: s.todayTotalTime + addedMinutes,
              todayCategoryBreakdown: breakdown,
            };
          });
          return;
        }

        if (timeLeft > 0) {
          const actualSubtracted = Math.min(multiplier, timeLeft);
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
            // Infinite mode: totalSessionDuration === 0
            const isInfinite = get().totalSessionDuration === 0;
            const nextIndex = currentBlockIndex + 1;
            if (isInfinite || nextIndex < blocks.length) {
              if (breakDuration > 0) {
                get().triggerNotification("Break Time", `${breakDuration / 60} min`);
                set({
                  state: "break",
                  timeLeft: breakDuration,
                  sessionDuration: breakDuration,
                  currentBlockIndex: isInfinite ? currentBlockIndex : nextIndex,
                });
              } else {
                const nextBlock = isInfinite ? blocks[currentBlockIndex] : blocks[nextIndex];
                get().triggerNotification("Focus Time", `${Math.round(nextBlock / 60)} min`);
                set({
                  state: "focus",
                  timeLeft: nextBlock,
                  sessionDuration: nextBlock,
                  currentBlockIndex: isInfinite ? currentBlockIndex : nextIndex,
                });
              }
            } else {
              get().triggerNotification("All Done", "Session complete");
              stopTimer();
            }
          } else if (state === "break") {
            const isInfinite = get().totalSessionDuration === 0;
            const blockDuration = isInfinite ? blocks[0] : blocks[currentBlockIndex];
            get().triggerNotification("Focus Time", `${Math.round(blockDuration / 60)} min`);
            set({
              state: "focus",
              timeLeft: blockDuration,
              sessionDuration: blockDuration,
            });
          }
        }
      },
    }),
    {
      name: "flowst-storage",
      storage: createJSONStorage(() => customStorage),
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
        customSound: state.customSound,
        selectedTaskCategory: state.selectedTaskCategory,
        selectedFocusTime: state.selectedFocusTime,
        selectedBreakTime: state.selectedBreakTime,
        customFocusTime: state.customFocusTime,
        customBreakTime: state.customBreakTime,
        contributionView: state.contributionView,
        updateAvailable: state.updateAvailable,
        latestVersion: state.latestVersion,
        lastUpdateCheck: state.lastUpdateCheck,
      }),
    },
  ),
);

let isSyncing = false;
const storeWindowId = Math.random().toString(36).substring(7);

listen(
  "pomodoro-state-sync",
  (event: { payload: { senderId: string; state: Partial<PomodoroState> } }) => {
    if (event.payload.senderId === storeWindowId) return;
    isSyncing = true;
    usePomodoroStore.setState(event.payload.state);
    isSyncing = false;
  },
).catch(console.error);

let lastSyncTime = 0;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let lastHistoryRef: PomodoroState["history"] | undefined = undefined;
let pendingHistorySync = false;

usePomodoroStore.subscribe((state) => {
  if (!isSyncing) {
    if (state.history !== lastHistoryRef) {
      pendingHistorySync = true;
      lastHistoryRef = state.history;
    }

    const now = Date.now();
    if (now - lastSyncTime > 100) {
      lastSyncTime = now;
      let payloadState: Partial<PomodoroState>;
      if (pendingHistorySync) {
        payloadState = state;
        pendingHistorySync = false;
      } else {
        payloadState = { ...state };
        delete payloadState.history;
      }
      emit("pomodoro-state-sync", { senderId: storeWindowId, state: payloadState }).catch(
        console.error,
      );
    } else {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        lastSyncTime = Date.now();
        const currentState = usePomodoroStore.getState();
        let payloadState: Partial<PomodoroState>;
        if (pendingHistorySync) {
          payloadState = currentState;
          pendingHistorySync = false;
        } else {
          payloadState = { ...currentState };
          delete payloadState.history;
        }
        emit("pomodoro-state-sync", {
          senderId: storeWindowId,
          state: payloadState,
        }).catch(console.error);
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

export const swapData = async (_toDebug: boolean) => {
  // Vị trí lưu trữ đã được cô lập hoàn toàn trong storage.ts dựa trên isDebugMode.
  // Nên ta chỉ cần gọi rehydrate để Zustand tải lại state từ đúng nguồn (Debug hoặc Real DB).
  await usePomodoroStore.persist.rehydrate();

  // Reset trạng thái timer hiện hành cho an toàn
  usePomodoroStore.setState({
    state: "idle",
    isActive: false,
    blocks: [],
    currentBlockIndex: 0,
    timeLeft: 25 * 60,
    sessionDuration: 25 * 60,
    totalSessionDuration: 0,
    elapsedSessionTime: 0,
  });
};
