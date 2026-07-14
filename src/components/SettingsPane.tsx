import { usePomodoroStore } from "../stores/pomodoroStore";
import { useDebugStore } from "../stores/debugStore";
import { ChevronDown, Play, Pause, X, Upload, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getLocalDateString } from "../utils/date";
import { invoke } from "@tauri-apps/api/core";
import { save, open, ask } from "@tauri-apps/plugin-dialog";
import {
  writeTextFile,
  readTextFile,
  exists,
  remove,
  copyFile,
  readFile,
} from "@tauri-apps/plugin-fs";
import { join, appDataDir, extname } from "@tauri-apps/api/path";

const soundFiles = import.meta.glob("/src/sounds/*.*", {
  eager: true,
  query: "?url",
  import: "default",
});
const soundUrls: Record<string, string> = {};
const dynamicSounds = Object.keys(soundFiles).map((path) => {
  const id = path.split("/").pop() || "";
  soundUrls[id] = soundFiles[path] as string;
  const baseName = id.replace(/\.[^/.]+$/, "");
  const displayName = baseName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return { id, displayName };
});
const availableSounds = [...dynamicSounds, { id: "off", displayName: "Off" }];

export default function SettingsPane() {
  const soundOptionRaw = usePomodoroStore((state) => state.soundOption);

  const customSound = usePomodoroStore((state) => state.customSound);
  const setCustomSound = usePomodoroStore((state) => state.setCustomSound);

  // Resolve backward compat names to actual filenames, and ensure default is first item
  let soundOption = soundOptionRaw;
  if (soundOption === "victory") soundOption = "victory-chime.mp3";
  if (soundOption === "trumpet") soundOption = "success-fanfare-trumpets.mp3";
  if (soundOption !== "custom" && !availableSounds.find((s) => s.id === soundOption)) {
    soundOption = availableSounds[0]?.id || "off";
  }

  const setSoundOption = usePomodoroStore((state) => state.setSoundOption);
  const notificationsEnabled = usePomodoroStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = usePomodoroStore((state) => state.setNotificationsEnabled);
  const dailyTarget = usePomodoroStore((state) => state.dailyTarget);
  const setDailyTarget = usePomodoroStore((state) => state.setDailyTarget);
  const gridColor = usePomodoroStore((state) => state.gridColor);
  const setGridColor = usePomodoroStore((state) => state.setGridColor);

  const [localTarget, setLocalTarget] = useState(dailyTarget.toString());
  const [isSoundDropdownOpen, setIsSoundDropdownOpen] = useState(false);
  const soundDropdownRef = useRef<HTMLDivElement>(null);

  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isDebugMode = useDebugStore((state) => state.isDebugMode);
  const dirKey = isDebugMode ? "custom-data-dir-debug" : "custom-data-dir";

  const [customDataDir, setCustomDataDir] = useState<string | null>(localStorage.getItem(dirKey));
  const [prevDirKey, setPrevDirKey] = useState(dirKey);
  if (dirKey !== prevDirKey) {
    setPrevDirKey(dirKey);
    setCustomDataDir(localStorage.getItem(dirKey));
  }

  const handleChooseDir = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected && typeof selected === "string") {
        const oldDir = localStorage.getItem(dirKey);
        if (oldDir === selected) return;

        const filePath = await join(selected, "flowst-storage.json");
        const legacyFilePath = await join(selected, "pomodoro-storage.json");

        const hasNewFile = await exists(filePath);
        const hasLegacyFile = await exists(legacyFilePath);

        if (hasNewFile || hasLegacyFile) {
          const shouldOverwrite = await ask(
            "This directory already contains storage data. Do you want to overwrite it with your current data?\n\n- Select 'Yes' to overwrite (Existing data in the directory will be deleted)\n- Select 'No' to load the existing data (Your current progress will be replaced)",
            { title: "Confirm Data Overwrite", kind: "warning" },
          );

          if (shouldOverwrite) {
            const currentData = localStorage.getItem("flowst-storage");
            if (currentData) {
              await writeTextFile(filePath, currentData);
              if (hasLegacyFile) {
                await remove(legacyFilePath).catch(console.error);
              }
            }
          }
        } else {
          // No existing files, just write current data
          const currentData = localStorage.getItem("flowst-storage");
          if (currentData) {
            await writeTextFile(filePath, currentData);
          }
        }

        // Remove files from the old directory to ensure they are moved
        if (oldDir) {
          const oldFilePath = await join(oldDir, "flowst-storage.json");
          const oldLegacyFilePath = await join(oldDir, "pomodoro-storage.json");
          if (await exists(oldFilePath)) await remove(oldFilePath);
          if (await exists(oldLegacyFilePath)) await remove(oldLegacyFilePath);
        }

        localStorage.setItem(dirKey, selected);
        setCustomDataDir(selected);
        localStorage.removeItem("flowst-storage");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveDir = async () => {
    try {
      const dir = localStorage.getItem(dirKey);
      if (dir) {
        const filePath = await join(dir, "flowst-storage.json");
        let dataToMove = null;
        if (await exists(filePath)) {
          dataToMove = await readTextFile(filePath);
        }
        if (dataToMove) {
          localStorage.setItem("flowst-storage", dataToMove);
        }
        if (await exists(filePath)) {
          await remove(filePath);
        }
        localStorage.removeItem(dirKey);
        setCustomDataDir(null);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadCustomSound = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg"] }],
      });
      if (selected && typeof selected === "string") {
        const appDataDirPath = await appDataDir();
        const ext = await extname(selected);
        const destPath = await join(appDataDirPath, `custom_sound.${ext}`);

        if (customSound?.path && (await exists(customSound.path))) {
          await remove(customSound.path).catch(console.error);
        }

        await copyFile(selected, destPath);
        const baseName = selected.split(/[\\/]/).pop() || "Custom Sound";
        setCustomSound({ name: baseName, path: destPath });
        setSoundOption("custom");
        setIsSoundDropdownOpen(false);
      }
    } catch (e) {
      console.error("Failed to upload custom sound:", e);
    }
  };

  const handleDeleteCustomSound = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (customSound?.path) {
      try {
        if (await exists(customSound.path)) {
          await remove(customSound.path);
        }
      } catch (e) {
        console.error("Failed to delete custom sound:", e);
      }
    }
    setCustomSound(null);
    if (soundOption === "custom") {
      setSoundOption(availableSounds[0]?.id || "off");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (soundDropdownRef.current && !soundDropdownRef.current.contains(e.target as Node)) {
        setIsSoundDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePlayPreview = async (soundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundId === "off") return;

    if (playingSoundId === soundId && audioRef.current) {
      audioRef.current.pause();
      setPlayingSoundId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    let url = soundUrls[soundId];
    let isBlobUrl = false;

    if (soundId === "custom" && customSound?.path) {
      try {
        const data = await readFile(customSound.path);
        const blob = new Blob([data]);
        url = URL.createObjectURL(blob);
        isBlobUrl = true;
      } catch (err) {
        console.error("Failed to read file:", err);
        return;
      }
    }

    if (!url) return;

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingSoundId(soundId);

    audio.addEventListener("ended", () => {
      setPlayingSoundId(null);
      if (isBlobUrl) URL.revokeObjectURL(url);
    });

    audio.play().catch((err) => {
      console.error("Error playing preview:", err);
      setPlayingSoundId(null);
      if (isBlobUrl) URL.revokeObjectURL(url);
    });
  };

  const getSoundLabel = (val: string) => {
    if (val === "custom" && customSound) return customSound.name;
    const found = availableSounds.find((s) => s.id === val);
    return found ? found.displayName : val;
  };

  return (
    <div
      className="settings-pane"
      style={{
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* ROW 1: Alert Sound & Theme Color */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }} ref={soundDropdownRef}>
          <div className="setting-label" style={{ marginBottom: "4px" }}>
            Alert Sound
          </div>
          <div className="custom-select" style={{ width: "100%", minWidth: 0 }}>
            <div
              className="select-trigger"
              onClick={() => setIsSoundDropdownOpen(!isSoundDropdownOpen)}
              style={{
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                }}
              >
                {getSoundLabel(soundOption)}
              </span>
              <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: "4px" }} />
            </div>
            {isSoundDropdownOpen && (
              <div
                className="select-dropdown"
                style={{
                  width: "100%",
                  maxWidth: "none",
                  padding: "4px",
                  right: 0,
                  left: "auto",
                  zIndex: 50,
                }}
              >
                <div
                  className="sound-option"
                  onClick={handleUploadCustomSound}
                  style={{
                    padding: "4px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--el-border)",
                    marginBottom: "4px",
                  }}
                >
                  <Upload size={12} />
                  <div style={{ fontSize: "11px" }}>Upload Custom</div>
                </div>
                {customSound && (
                  <div
                    className={`sound-option ${soundOption === "custom" ? "selected" : ""}`}
                    onClick={() => {
                      setSoundOption("custom");
                      setIsSoundDropdownOpen(false);
                    }}
                    style={{
                      padding: "4px 6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className="sound-option-name"
                      style={{
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "90px",
                      }}
                      title={customSound.name}
                    >
                      {customSound.name}
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={(e) => handlePlayPreview("custom", e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          padding: "2px",
                        }}
                      >
                        {playingSoundId === "custom" ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                      <button
                        onClick={handleDeleteCustomSound}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          padding: "2px",
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )}
                {availableSounds.map((sound) => (
                  <div
                    key={sound.id}
                    className={`sound-option ${soundOption === sound.id ? "selected" : ""}`}
                    onClick={() => {
                      setSoundOption(sound.id);
                      setIsSoundDropdownOpen(false);
                      if (sound.id === "off" && playingSoundId) {
                        audioRef.current?.pause();
                        setPlayingSoundId(null);
                      }
                    }}
                    style={{
                      padding: "4px 6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div className="sound-option-name" style={{ fontSize: "11px" }}>
                      {sound.displayName}
                    </div>
                    {sound.id !== "off" && (
                      <button
                        onClick={(e) => handlePlayPreview(sound.id, e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          padding: "2px",
                        }}
                      >
                        {playingSoundId === sound.id ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="setting-label" style={{ marginBottom: "4px" }}>
            Theme
          </div>
          <div style={{ display: "flex", alignItems: "center", height: "26px" }}>
            <input
              type="color"
              value={gridColor || "#00FBFF"}
              onChange={(e) => setGridColor(e.target.value)}
              style={{
                width: "26px",
                height: "26px",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      </div>

      {/* ROW 2: Focus Target & Notifications */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="setting-label" style={{ marginBottom: "4px" }}>
            Daily Target
          </div>
          <div style={{ display: "flex" }}>
            <input
              type="number"
              value={localTarget}
              onChange={(e) => setLocalTarget(e.target.value)}
              className="modern-input"
              style={{
                flex: 1,
                padding: "4px",
                height: "26px",
                textAlign: "center",
                fontSize: "12px",
                borderRadius: "0",
                minWidth: 0,
              }}
            />
            <button
              onClick={() => {
                const val = parseInt(localTarget);
                if (!isNaN(val) && val > 0) setDailyTarget(val);
              }}
              disabled={localTarget === dailyTarget.toString()}
              style={{
                background:
                  localTarget !== dailyTarget.toString() ? "var(--text-primary)" : "transparent",
                border: "1px solid var(--divider)",
                borderLeft: "none",
                color:
                  localTarget !== dailyTarget.toString() ? "var(--el-bg)" : "var(--text-secondary)",
                padding: "0 8px",
                borderRadius: 0,
                cursor: localTarget !== dailyTarget.toString() ? "pointer" : "not-allowed",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              Save
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "26px",
            border: "1px solid var(--el-border)",
            padding: "0 8px",
          }}
        >
          <span className="setting-label" style={{ margin: 0 }}>
            Notify
          </span>
          <label className="switch" style={{ transform: "scale(0.8)", margin: 0 }}>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      <div className="divider" style={{ margin: "2px 0" }} />

      {/* ROW 3: Data Management */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span className="setting-label">Data Management</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            className="action-btn-outline"
            onClick={async () => {
              try {
                const state = usePomodoroStore.getState();
                const data = {
                  categories: state.categories,
                  dailyTarget: state.dailyTarget,
                  soundOption: state.soundOption,
                  notificationsEnabled: state.notificationsEnabled,
                  todayTotalTime: state.todayTotalTime,
                  todayCategoryBreakdown: state.todayCategoryBreakdown,
                  history: state.history,
                  gridColor: state.gridColor,
                  goal: state.goal,
                  selectedTaskCategory: state.selectedTaskCategory,
                  selectedFocusTime: state.selectedFocusTime,
                  selectedBreakTime: state.selectedBreakTime,
                };
                const path = await save({
                  filters: [{ name: "JSON", extensions: ["json"] }],
                  defaultPath: `flowst-backup-${getLocalDateString()}.json`,
                });
                if (path) await writeTextFile(path, JSON.stringify(data, null, 2));
              } catch {
                // ignore
              }
            }}
          >
            Export
          </button>
          <button
            className="action-btn-outline"
            onClick={async () => {
              try {
                const path = await open({
                  multiple: false,
                  filters: [{ name: "JSON", extensions: ["json"] }],
                });
                if (path && typeof path === "string") {
                  const content = await readTextFile(path);
                  const data = JSON.parse(content);
                  const state = usePomodoroStore.getState();
                  usePomodoroStore.setState({
                    categories: data.categories || state.categories,
                    dailyTarget: data.dailyTarget || state.dailyTarget,
                    soundOption: data.soundOption || state.soundOption,
                    notificationsEnabled:
                      data.notificationsEnabled !== undefined
                        ? data.notificationsEnabled
                        : state.notificationsEnabled,
                    todayTotalTime:
                      data.todayTotalTime !== undefined
                        ? data.todayTotalTime
                        : state.todayTotalTime,
                    todayCategoryBreakdown:
                      data.todayCategoryBreakdown || state.todayCategoryBreakdown,
                    history: data.history || state.history,
                    gridColor: data.gridColor || state.gridColor,
                    goal: data.goal !== undefined ? data.goal : state.goal,
                    selectedTaskCategory: data.selectedTaskCategory || state.selectedTaskCategory,
                    selectedFocusTime: data.selectedFocusTime || state.selectedFocusTime,
                    selectedBreakTime: data.selectedBreakTime || state.selectedBreakTime,
                  });
                  setLocalTarget((data.dailyTarget || state.dailyTarget).toString());
                }
              } catch {
                // ignore
              }
            }}
          >
            Import
          </button>
          <button
            className="action-btn-outline hover-danger"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear
          </button>
        </div>
        <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "var(--el-bg)",
              border: "1px solid var(--el-border)",
              padding: "0 8px",
              fontSize: "11px",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={customDataDir || "Default Directory"}
          >
            {customDataDir || "Default Directory"}
          </div>
          <button
            className="action-btn-outline"
            onClick={handleChooseDir}
            style={{ width: "auto", padding: "0 8px", flex: "none" }}
          >
            Browse
          </button>
          {customDataDir && (
            <button
              className="action-btn-outline hover-danger"
              onClick={handleRemoveDir}
              style={{
                width: "26px",
                padding: "0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flex: "none",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ROW 4: Extra Windows */}
      <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
        <button
          className="action-btn-outline"
          onClick={() => invoke("open_dashboard_window")}
          style={{ flex: 1, padding: "8px 0", height: "auto" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#00F2F6";
            e.currentTarget.style.color = "#00F2F6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--el-border)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          Dashboard
        </button>
        <button
          className="action-btn-outline"
          onClick={async () => {
            try {
              const debugWin = await WebviewWindow.getByLabel("debug");
              if (debugWin) {
                if (await debugWin.isVisible()) {
                  await debugWin.hide();
                  useDebugStore.getState().setDebugMode(false);
                } else {
                  await debugWin.show();
                  await debugWin.setFocus();
                  useDebugStore.getState().setDebugMode(true);
                }
              } else {
                await invoke("open_debug_window");
                useDebugStore.getState().setDebugMode(true);
              }
            } catch {
              // ignore
            }
          }}
          style={{ flex: 1, padding: "8px 0", height: "auto" }}
        >
          Debug Log
        </button>
      </div>

      {showClearConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "var(--dropdown-bg)",
              border: "1px solid var(--el-border)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "80%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e81123" }}>
              Delete all data?
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  padding: "4px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  usePomodoroStore.setState({
                    categories: [
                      { id: "study", name: "Study", color: "#00FBFF" },
                      { id: "work", name: "Work", color: "#00FF66" },
                    ],
                    dailyTarget: 240,
                    todayTotalTime: 0,
                    todayCategoryBreakdown: {},
                    history: {},
                    soundOption: "victory",
                    gridColor: "#00FBFF",
                    goal: null,
                  });
                  setLocalTarget("240");
                  setShowClearConfirm(false);
                }}
                style={{
                  flex: 1,
                  background: "#e81123",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .setting-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .action-btn-outline {
          background: transparent;
          border: 1px solid var(--el-border);
          color: var(--text-primary);
          padding: 0 4px;
          border-radius: 0;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 200ms ease;
          flex: 1;
          height: 26px;
        }
        .action-btn-outline:hover {
          background: var(--el-bg-hover);
          border-color: var(--el-border-hover);
        }
        .action-btn-outline.hover-danger:hover {
          background: #e81123;
          color: white;
          border-color: #e81123;
        }
      `}</style>
    </div>
  );
}
