import { usePomodoroStore } from "../stores/pomodoroStore";
import { Play, Pause, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function SettingsPane() {
  const soundOption = usePomodoroStore((state) => state.soundOption);
  const setSoundOption = usePomodoroStore((state) => state.setSoundOption);
  const [isSoundDropdownOpen, setIsSoundDropdownOpen] = useState(false);
  const soundDropdownRef = useRef<HTMLDivElement>(null);
  
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    const soundFile = soundName === "trumpet" ? "success-fanfare-trumpets.mp3" : "victory-chime.mp3";
    const audio = new Audio(`/sounds/${soundFile}`);
    audioRef.current = audio;
    setPlayingSoundId(soundName);

    audio.addEventListener("ended", () => {
      setPlayingSoundId(null);
    });

    audio.play().catch(e => {
      console.error("Error playing preview:", e);
      setPlayingSoundId(null);
    });
  };

  const getSoundLabel = (val: string) => {
    return val === "trumpet" ? "Success Fanfare Trumpets" : "Victory Chime";
  };

  return (
    <div className="settings-pane">
      <div className="setting-item-col" ref={soundDropdownRef}>
        <span className="setting-label">Alert Sound</span>
        <div className="custom-select" style={{ width: '100%' }}>
          <div className="select-trigger" onClick={() => setIsSoundDropdownOpen(!isSoundDropdownOpen)}>
            <span>{getSoundLabel(soundOption)}</span>
            <ChevronDown size={14} />
          </div>
          {isSoundDropdownOpen && (
            <div className="select-dropdown" style={{ width: '100%', maxWidth: 'none', padding: '4px' }}>
              <div 
                className={`sound-option ${soundOption === "victory" ? "selected" : ""}`}
                onClick={() => { setSoundOption("victory"); setIsSoundDropdownOpen(false); }}
                style={{ padding: '6px 10px', marginBottom: '4px' }}
              >
                <div className="sound-option-name" style={{ fontSize: '13px' }}>Victory Chime</div>
                <button className="sound-play-btn" onClick={(e) => handlePlayPreview("victory", e)} title={playingSoundId === "victory" ? "Pause Sound" : "Preview Sound"} style={{ width: '22px', height: '22px' }}>
                  {playingSoundId === "victory" ? <Pause size={10} /> : <Play size={10} />}
                </button>
              </div>
              <div 
                className={`sound-option ${soundOption === "trumpet" ? "selected" : ""}`}
                onClick={() => { setSoundOption("trumpet"); setIsSoundDropdownOpen(false); }}
                style={{ padding: '6px 10px', margin: 0 }}
              >
                <div className="sound-option-name" style={{ fontSize: '13px' }}>Success Fanfare Trumpets</div>
                <button className="sound-play-btn" onClick={(e) => handlePlayPreview("trumpet", e)} title={playingSoundId === "trumpet" ? "Pause Sound" : "Preview Sound"} style={{ width: '22px', height: '22px' }}>
                  {playingSoundId === "trumpet" ? <Pause size={10} /> : <Play size={10} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="setting-item-col">
        <span className="setting-label">Daily Focus Target (minutes)</span>
        <input type="number" defaultValue={120} className="modern-input" />
      </div>

      <div className="setting-item-col" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span className="setting-label">Developer Debug Mode</span>
        <button 
          onClick={async () => {
            try {
              const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
              let debugWin = await WebviewWindow.getByLabel('debug');
              if (debugWin) {
                const isVisible = await debugWin.isVisible();
                if (isVisible) {
                  await debugWin.hide();
                } else {
                  await debugWin.show();
                  await debugWin.setFocus();
                }
              } else {
                debugWin = new WebviewWindow('debug', {
                  url: 'index.html',
                  title: 'Debug Window',
                  width: 500,
                  height: 600,
                  resizable: true,
                });
                debugWin.once('tauri://created', async () => {
                  await debugWin?.show();
                  await debugWin?.setFocus();
                });
                debugWin.once('tauri://error', (e) => {
                  console.error('Error creating debug window:', e);
                });
              }
            } catch(e) {
              console.error('Debug Window Error:', e);
            }
          }}
          style={{
            background: 'var(--el-bg)',
            border: '1px solid var(--el-border)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 200ms ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--grid-active)';
            e.currentTarget.style.color = 'var(--grid-active)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--el-border)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          Open Debug
        </button>
      </div>
    </div>
  );
}
