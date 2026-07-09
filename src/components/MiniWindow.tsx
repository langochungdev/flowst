import { Play, Pause, X, Maximize2 } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { useWindowDrag } from '../hooks/useWindowDrag';

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function MiniWindow() {
    const { timeLeft, isActive, pauseTimer, resumeTimer, totalSessionDuration, elapsedSessionTime } = usePomodoroStore();
    const { bind } = useWindowDrag();

    const closeWindow = () => {
        getCurrentWebviewWindow()?.close();
    };

    const handleExpand = () => {
        invoke('toggle_mini_window').catch(console.error);
    };

    const handlePlayPause = () => {
        if (isActive) pauseTimer();
        else resumeTimer();
    };

    const progressPercent = totalSessionDuration > 0 ? (elapsedSessionTime / totalSessionDuration) * 100 : 0;
    const sessionTimeLeft = totalSessionDuration - elapsedSessionTime;

    return (
        <div className="mini-window-container" {...bind}>
            <div className={`time-text mini-text ${!isActive ? 'paused' : ''}`}>
                {formatTime(timeLeft)}
            </div>

            <div className="mini-hover-overlay">
                <button
                    className="mini-action-btn side"
                    onClick={handleExpand}
                    title="Expand"
                >
                    <Maximize2 size={12} pointerEvents="none" />
                </button>
                <div className="mini-divider" />
                <button
                    className="mini-action-btn center"
                    onClick={handlePlayPause}
                    title={isActive ? "Pause" : "Play"}
                >
                    {isActive ? <Pause size={18} pointerEvents="none" /> : <Play size={18} pointerEvents="none" />}
                </button>
                <div className="mini-divider" />
                <button
                    className="mini-action-btn side"
                    onClick={closeWindow}
                    title="Close"
                >
                    <X size={12} pointerEvents="none" />
                </button>
            </div>

            <div className="mini-progress-row">
                <div className="mini-progress-times">
                    <span className="mini-progress-text">{formatTime(elapsedSessionTime > 0 ? Math.floor(elapsedSessionTime) : 0)}</span>
                    <span className="mini-progress-text">{formatTime(sessionTimeLeft > 0 ? Math.floor(sessionTimeLeft) : 0)}</span>
                </div>
                <div className="mini-progress-bar-bg">
                    <div className="mini-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>
        </div>
    );
}
