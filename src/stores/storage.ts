import { StateStorage } from "zustand/middleware";
import { readTextFile, writeTextFile, exists, remove } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

const isDebug = () => {
  try {
    const debugStoreStr = localStorage.getItem("flowst-debug-store");
    if (debugStoreStr) {
      const parsed = JSON.parse(debugStoreStr);
      if (parsed?.state?.isDebugMode) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
};

const getDirKey = () => {
  return isDebug() ? "custom-data-dir-debug" : "custom-data-dir";
};

const getLocalKey = (name: string) => {
  if (name === "flowst-debug-store") return name; // Do not suffix the debug store itself
  return isDebug() ? `${name}-debug` : name;
};

export const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const localKey = getLocalKey(name);
    const customDir = localStorage.getItem(getDirKey());
    if (customDir) {
      try {
        const filePath = await join(customDir, `${name}.json`);

        // Migrate legacy pomodoro-storage.json to flowst-storage.json
        if (name === "flowst-storage") {
          const legacyFilePath = await join(customDir, "pomodoro-storage.json");
          if (!(await exists(filePath)) && (await exists(legacyFilePath))) {
            try {
              const legacyContent = await readTextFile(legacyFilePath);
              await writeTextFile(filePath, legacyContent);
              await remove(legacyFilePath);
            } catch (err) {
              console.error("Migration of legacy file failed:", err);
            }
          }
        }

        if (await exists(filePath)) {
          const content = await readTextFile(filePath);
          // Sync to localStorage as a backup
          localStorage.setItem(localKey, content);
          return content;
        }
      } catch (e) {
        console.error("Failed to read from custom dir:", e);
      }
    }
    return localStorage.getItem(localKey);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const localKey = getLocalKey(name);
    localStorage.setItem(localKey, value);
    const customDir = localStorage.getItem(getDirKey());
    if (customDir) {
      try {
        const filePath = await join(customDir, `${name}.json`);
        await writeTextFile(filePath, value);
      } catch (e) {
        console.error("Failed to write to custom dir:", e);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    const localKey = getLocalKey(name);
    localStorage.removeItem(localKey);
    const customDir = localStorage.getItem(getDirKey());
    if (customDir) {
      try {
        const filePath = await join(customDir, `${name}.json`);
        if (await exists(filePath)) {
          await remove(filePath);
        }
      } catch (e) {
        console.error("Failed to remove from custom dir:", e);
      }
    }
  },
};
