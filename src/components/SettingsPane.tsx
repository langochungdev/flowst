import { usePomodoroStore } from "../stores/pomodoroStore";
import { Play, Pause, ChevronDown, Minus, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

export default function SettingsPane() {
    const soundOption = usePomodoroStore((state) => state.soundOption);
    const setSoundOption = usePomodoroStore((state) => state.setSoundOption);
    const notificationsEnabled = usePomodoroStore((state) => state.notificationsEnabled);
    const setNotificationsEnabled = usePomodoroStore((state) => state.setNotificationsEnabled);
    const dailyTarget = usePomodoroStore((state) => state.dailyTarget);
    const setDailyTarget = usePomodoroStore((state) => state.setDailyTarget);
    const categories = usePomodoroStore((state) => state.categories);
    const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);
    const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
    const history = usePomodoroStore((state) => state.history);
    const gridColor = usePomodoroStore((state) => state.gridColor);
    const setGridColor = usePomodoroStore((state) => state.setGridColor);

    const [localTarget, setLocalTarget] = useState(dailyTarget.toString());
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

    const handlePlayPreview = (soundName: "victory" | "trumpet" | "off", e: React.MouseEvent) => {
        e.stopPropagation();
        if (soundName === "off") return;

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
        if (val === "victory") return "Victory Chime";
        if (val === "trumpet") return "Fanfare Trumpets";
        if (val === "off") return "Off";
        return val;
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
                            <div
                                className={`sound-option ${soundOption === "off" ? "selected" : ""}`}
                                onClick={() => {
                                    setSoundOption("off");
                                    setIsSoundDropdownOpen(false);
                                    if (playingSoundId) {
                                        audioRef.current?.pause();
                                        setPlayingSoundId(null);
                                    }
                                }}
                                style={{ padding: "6px 10px", marginTop: "4px" }}
                            >
                                <div className="sound-option-name" style={{ fontSize: "12px" }}>
                                    Off
                                </div>
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
                <span className="setting-label" title="Show OS notification when timer finishes, if Mini View is hidden">Desktop Notifications</span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                </label>
            </div>

            <div className="setting-item-row">
                <span className="setting-label">Daily Focus Target</span>
                <div style={{ display: "flex", gap: "4px", width: "160px", alignItems: "center" }}>
                    <button
                        className="action-btn-outline"
                        style={{ width: "26px", height: "26px", padding: 0 }}
                        onClick={() => {
                            const val = parseInt(localTarget);
                            if (!isNaN(val) && val > 5) setLocalTarget((val - 5).toString());
                        }}
                    >
                        <Minus size={14} />
                    </button>
                    <input
                        type="number"
                        value={localTarget}
                        onChange={(e) => setLocalTarget(e.target.value)}
                        className="modern-input"
                        style={{ padding: "4px 8px", height: "26px", width: "50px", textAlign: "center" }}
                    />
                    <button
                        className="action-btn-outline"
                        style={{ width: "26px", height: "26px", padding: 0 }}
                        onClick={() => {
                            const val = parseInt(localTarget);
                            if (!isNaN(val)) setLocalTarget((val + 5).toString());
                        }}
                    >
                        <Plus size={14} />
                    </button>
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
                    <button
                        className="action-btn-outline"
                        onClick={async () => {
                            try {
                                const data = {
                                    categories,
                                    dailyTarget,
                                    soundOption,
                                    todayTotalTime,
                                    todayCategoryBreakdown,
                                    history,
                                    gridColor,
                                };
                                const path = await save({
                                    filters: [{ name: 'JSON', extensions: ['json'] }],
                                    defaultPath: `flowst-backup-${new Date().toISOString().split("T")[0]}.json`,
                                });
                                if (path) {
                                    await writeTextFile(path, JSON.stringify(data, null, 2));
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Export failed");
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
                                    filters: [{ name: 'JSON', extensions: ['json'] }]
                                });
                                if (path && typeof path === 'string') {
                                    const content = await readTextFile(path);
                                    const data = JSON.parse(content);
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
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Import failed or invalid file.");
                            }
                        }}
                    >
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
