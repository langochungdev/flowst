import { usePomodoroStore } from "../stores/pomodoroStore";
import { Play, Pause, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function SettingsPane() {
  const soundOption = usePomodoroStore((state) => state.soundOption);
  const setSoundOption = usePomodoroStore((state) => state.setSoundOption);
  const dailyTarget = usePomodoroStore((state) => state.dailyTarget);
  const setDailyTarget = usePomodoroStore((state) => state.setDailyTarget);
  const categories = usePomodoroStore((state) => state.categories);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
  const history = usePomodoroStore((state) => state.history);
  const gridColor = usePomodoroStore((state) => state.gridColor);
  const setGridColor = usePomodoroStore((state) => state.setGridColor);

  const [localTarget, setLocalTarget] = useState(dailyTarget.toString());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSoundDropdownOpen, setIsSoundDropdownOpen] = useState(false);
  const soundDropdownRef = useRef<HTMLDivElement>(null);

  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (soundDropdownRef.current && !soundDropdownRef.current.contains(e.target as Node)) {
        setIsSoundDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePlayPreview = (soundName: "victory" | "trumpet", e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingSoundId === soundName && audioRef.current) {
      audioRef.current.pause();
      setPlayingSoundId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const soundFile =
      soundName === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
    const audio = new Audio(`/sounds/${soundFile}`);
    audioRef.current = audio;
    setPlayingSoundId(soundName);

    audio.addEventListener("ended", () => {
      setPlayingSoundId(null);
    });

    audio.play().catch((e) => {
      console.error("Error playing preview:", e);
      setPlayingSoundId(null);
    });
  };

  const getSoundLabel = (val: string) => {
    return val === "trumpet" ? "Success Fanfare Trumpets" : "Victory Chime";
  };

  return (
    <div className="settings-pane">
      <div className="setting-item-row" ref={soundDropdownRef}>
        <span className="setting-label">Alert Sound</span>
        <div className="custom-select" style={{ width: "150px" }}>
          <div
            className="select-trigger"
            onClick={() => setIsSoundDropdownOpen(!isSoundDropdownOpen)}
          >
            <span>{getSoundLabel(soundOption)}</span>
            <ChevronDown size={14} />
          </div>
          {isSoundDropdownOpen && (
            <div
              className="select-dropdown"
              style={{ width: "100%", maxWidth: "none", padding: "4px", right: 0, left: "auto" }}
            >
              <div
                className={`sound-option ${soundOption === "victory" ? "selected" : ""}`}
                onClick={() => {
                  setSoundOption("victory");
                  setIsSoundDropdownOpen(false);
                }}
                style={{ padding: "6px 10px", marginBottom: "4px" }}
              >
                <div className="sound-option-name" style={{ fontSize: "12px" }}>
                  Victory
                </div>
                <button
                  className="sound-play-btn"
                  onClick={(e) => handlePlayPreview("victory", e)}
                  title={playingSoundId === "victory" ? "Pause" : "Preview"}
                  style={{ width: "22px", height: "22px" }}
                >
                  {playingSoundId === "victory" ? <Pause size={10} /> : <Play size={10} />}
                </button>
              </div>
              <div
                className={`sound-option ${soundOption === "trumpet" ? "selected" : ""}`}
                onClick={() => {
                  setSoundOption("trumpet");
                  setIsSoundDropdownOpen(false);
                }}
                style={{ padding: "6px 10px", margin: 0 }}
              >
                <div className="sound-option-name" style={{ fontSize: "12px" }}>
                  Trumpets
                </div>
                <button
                  className="sound-play-btn"
                  onClick={(e) => handlePlayPreview("trumpet", e)}
                  title={playingSoundId === "trumpet" ? "Pause" : "Preview"}
                  style={{ width: "22px", height: "22px" }}
                >
                  {playingSoundId === "trumpet" ? <Pause size={10} /> : <Play size={10} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="setting-item-row">
        <span className="setting-label">Grid Theme Color</span>
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

      <div className="setting-item-row">
        <span className="setting-label">Daily Focus Target</span>
        <div style={{ display: "flex", gap: "4px", width: "150px" }}>
          <input
            type="number"
            value={localTarget}
            onChange={(e) => setLocalTarget(e.target.value)}
            className="modern-input"
            style={{ padding: "4px 8px", height: "26px" }}
          />
          <button
            onClick={() => {
              const val = parseInt(localTarget);
              if (!isNaN(val) && val > 0) {
                setDailyTarget(val);
              }
            }}
            disabled={localTarget === dailyTarget.toString()}
            style={{
              background:
                localTarget !== dailyTarget.toString() ? "var(--text-primary)" : "transparent",
              border: localTarget !== dailyTarget.toString() ? "none" : "1px solid var(--divider)",
              color:
                localTarget !== dailyTarget.toString() ? "var(--el-bg)" : "var(--text-secondary)",
              padding: "0 10px",
              borderRadius: 0,
              cursor: localTarget !== dailyTarget.toString() ? "pointer" : "not-allowed",
              fontSize: "11px",
              fontWeight: 500,
              transition: "all 200ms ease",
              height: "26px",
            }}
          >
            Save
          </button>
        </div>
      </div>

      <div className="setting-item-row">
        <span className="setting-label">Developer Debug Mode</span>
        <button
          onClick={async () => {
            try {
              let debugWin = await WebviewWindow.getByLabel("debug");
              if (debugWin) {
                const isVisible = await debugWin.isVisible();
                if (isVisible) {
                  await debugWin.hide();
                } else {
                  await debugWin.show();
                  await debugWin.setFocus();
                }
              } else {
                debugWin = new WebviewWindow("debug", {
                  url: "index.html",
                  title: "Debug Window",
                  width: 500,
                  height: 600,
                  resizable: true,
                });
                debugWin.once("tauri://created", async () => {
                  await debugWin?.show();
                  await debugWin?.setFocus();
                });
              }
            } catch (e) {
              console.error("Debug Window Error:", e);
            }
          }}
          style={{
            background: "var(--el-bg)",
            border: "1px solid var(--el-border)",
            color: "var(--text-primary)",
            padding: "0 12px",
            borderRadius: 0,
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 500,
            transition: "all 200ms ease",
            height: "26px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--grid-active)";
            e.currentTarget.style.color = "var(--grid-active)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--el-border)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          Open Debug
        </button>
      </div>

      <div className="divider" style={{ marginTop: "4px", marginBottom: "4px" }} />

      <div className="setting-item-col">
        <span className="setting-label">Data Management</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const data = JSON.parse(event.target?.result as string);
                  usePomodoroStore.setState({
                    categories: data.categories || categories,
                    dailyTarget: data.dailyTarget || dailyTarget,
                    soundOption: data.soundOption || soundOption,
                    todayTotalTime:
                      data.todayTotalTime !== undefined ? data.todayTotalTime : todayTotalTime,
                    todayCategoryBreakdown: data.todayCategoryBreakdown || todayCategoryBreakdown,
                    history: data.history || history,
                    gridColor: data.gridColor || gridColor,
                  });
                  setLocalTarget((data.dailyTarget || dailyTarget).toString());
                  alert("Data imported successfully!");
                } catch {
                  alert("Invalid backup file.");
                }
                if (fileInputRef.current) fileInputRef.current.value = "";
              };
              reader.readAsText(file);
            }}
          />
          <button
            className="action-btn-outline"
            onClick={() => {
              const data = {
                categories,
                dailyTarget,
                soundOption,
                todayTotalTime,
                todayCategoryBreakdown,
                history,
                gridColor,
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `flowst-backup-${new Date().toISOString().split("T")[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </button>
          <button className="action-btn-outline" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <button
            className="action-btn-outline hover-danger"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear Data
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
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
              boxShadow: "var(--el-shadow)",
              maxWidth: "240px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#e81123" }}>
              Delete all data?
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              This will reset your categories, goals, and today's progress. This action cannot be
              undone.
            </div>
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "4px" }}
            >
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--divider)",
                  padding: "4px 12px",
                  borderRadius: 0,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  usePomodoroStore.setState({
                    categories: [
                      { id: "study", name: "Study", color: "#808080" },
                      { id: "work", name: "Work", color: "#00FBFF" },
                    ],
                    dailyTarget: 120,
                    todayTotalTime: 0,
                    todayCategoryBreakdown: {},
                    history: {},
                    soundOption: "victory",
                    gridColor: "#00FBFF",
                    goal: null,
                  });
                  setLocalTarget("120");
                  setShowClearConfirm(false);
                }}
                style={{
                  background: "#e81123",
                  border: "1px solid #e81123",
                  padding: "4px 12px",
                  borderRadius: 0,
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
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
