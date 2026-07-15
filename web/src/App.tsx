import React, { useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Minimize2, Minus, Home } from "lucide-react";
import MiniWindow from './components/MiniWindow';
import MainWindow from './components/MainWindow';
import SettingsPane from './components/SettingsPane';
import DashboardWindow from './components/DashboardWindow';
import { usePomodoroStore } from './stores/pomodoroStore';

interface Annotation {
  id: string;
  label: string;
  sub: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  targetSelector: string; // CSS selector inside the component
  posY?: number; // relative Y position from 0 to 1
}

const annotations = {
  mini: [
    { id: 'mini-progress', label: 'Session progress', sub: 'Elapsed / remaining time in the current block', side: 'left', targetSelector: '.mini-progress-row', posY: 0.45 },
    { id: 'mini-close', label: '✕ Stop & hide', sub: 'Stops timer and hides window', side: 'right', targetSelector: '.mini-action-btn:last-child', posY: 0.55 },
  ],
  main: [
    { id: 'main-dur', label: 'Focus time', sub: 'Set Pomodoro block length per session', side: 'top', targetSelector: '.select-group > :nth-child(1)', posY: 0.15 },
    { id: 'main-cat', label: 'Task category', sub: 'Tag & color-code each session', side: 'top', targetSelector: '.select-group > :nth-child(3)', posY: 0.15 },
    { id: 'main-goal', label: 'Goal', sub: 'Set a deadline — text fills as time passes', side: 'left', targetSelector: '.goal-empty-state, .goal-display', posY: 0.48 },
    { id: 'main-act', label: 'Activity · This week', sub: 'Switch between heatmap history and 7-day bar chart', side: 'left', targetSelector: '#view-toggle', posY: 0.62 },
  ],
  settings: [
    { id: 'set-sound', label: 'Custom sound', sub: 'Upload MP3/WAV or pick a built-in chime', side: 'top', targetSelector: '.custom-select', posY: 0.15 },
    { id: 'set-dash', label: 'Dashboard', sub: 'Detailed analytics — charts & category breakdown (Click me!)', side: 'bottom', targetSelector: '#dashboard-btn', posY: 0.76 },
  ]
} as const;

function AnnotationLayer({ stageId, mockId, config }: { stageId: string, mockId: string, config: readonly Annotation[] }) {
  const [placed, setPlaced] = useState<any[]>([]);

  // Use a resize observer and interval to robustly place annotations
  useEffect(() => {
    let interval: any;
    const positionLines = () => {
      const stage = document.getElementById(stageId);
      const mock = document.getElementById(mockId);
      if (!stage || !mock) return;

      const sr = stage.getBoundingClientRect();
      const mr = mock.getBoundingClientRect();
      if (sr.width === 0 || mr.width === 0) return;

      const newPlaced = config.map((ann, i) => {
        let target = mock.querySelector(ann.targetSelector) as HTMLElement;
        let tr = target ? target.getBoundingClientRect() : { top: mr.top + mr.height/2, left: mr.left + mr.width/2, right: mr.left + mr.width/2, height: 10, width: 0 };
        
        const GAP = 5;
        const LW = 95;
        const LH = 36;
        
        const labelY = ann.posY !== undefined ? ann.posY * sr.height : (i+1) * (sr.height / (config.length+1)) - LH/2;
        let dotX, dotY, labelX, lineTo;

        if (ann.side === 'left') {
          dotX = tr.left - sr.left - GAP;
          dotY = tr.top + tr.height / 2 - sr.top;
          labelX = dotX - LW - 16;
          labelX = Math.min(labelX, mr.left - sr.left - GAP - LW - 25);
          labelX = Math.max(4, labelX);
          lineTo = { x: labelX + LW, y: labelY + LH / 2 };
        } else if (ann.side === 'top') {
          dotX = tr.left + tr.width / 2 - sr.left;
          dotY = tr.top - sr.top - GAP;
          labelX = dotX - LW / 2;
          labelX = Math.max(4, Math.min(sr.width - LW - 4, labelX));
          lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY + LH };
        } else if (ann.side === 'bottom') {
          dotX = tr.left + tr.width / 2 - sr.left;
          dotY = tr.top + tr.height - sr.top + GAP;
          labelX = dotX - LW / 2;
          labelX = Math.max(4, Math.min(sr.width - LW - 4, labelX));
          lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY };
        } else {
          dotX = tr.right - sr.left + GAP;
          dotY = tr.top + tr.height / 2 - sr.top;
          labelX = dotX + 16;
          labelX = Math.max(labelX, mr.right - sr.left + GAP + 10);
          labelX = Math.min(sr.width - LW - 4, labelX);
          lineTo = { x: labelX, y: labelY + LH / 2 };
        }

        const from = { x: dotX, y: dotY };
        const to = lineTo;
        const cx1 = from.x + (to.x - from.x) * 0.1;
        const cx2 = from.x + (to.x - from.x) * 0.9;
        const d = `M${from.x},${from.y} C${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`;

        return { ...ann, dotX, dotY, labelX, labelY, LW, d };
      });
      setPlaced(newPlaced);
    };

    positionLines();
    interval = setInterval(positionLines, 1000); // Check repeatedly to catch late renders

    return () => clearInterval(interval);
  }, [config, mockId, stageId]);

  return (
    <>
      <svg className="ann-svg" aria-hidden="true">
        {placed.map(p => (
          <path key={p.id} d={p.d} stroke="rgba(0,251,255,0.4)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
        ))}
      </svg>
      {placed.map(p => (
        <React.Fragment key={p.id}>
          <div className="ann-dot" style={{ left: p.dotX, top: p.dotY }}></div>
          <div className={`ann-label ${p.side === 'left' ? 'right-aligned' : ''}`} style={{ left: p.labelX, top: p.labelY, width: p.LW }}>
            <b>{p.label}</b>
            <span>{p.sub}</span>
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

export default function App() {
  const [showDashPopup, setShowDashPopup] = useState(false);

  useEffect(() => {
    // Generate mock history data for the demo
    const today = new Date();
    const mockHistory: Record<string, any> = {};
    for (let i = 0; i <= 90; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const y = d.getFullYear();
      const dateStr = `${y}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const workH = (Math.random() * 4).toFixed(1);
      const studyH = (Math.random() * 3).toFixed(1);
      
      mockHistory[dateStr] = {
        totalHours: parseFloat(workH) + parseFloat(studyH),
        breakdown: { 'work': parseFloat(workH), 'study': parseFloat(studyH) },
        categoryNames: { 'work': 'Work', 'study': 'Study' },
        categoryColors: { 'work': '#00FF66', 'study': '#00FBFF' }
      };
    }
    
    const goalTarget = new Date();
    goalTarget.setDate(goalTarget.getDate() + 4);
    const goalCreated = new Date();
    goalCreated.setDate(goalCreated.getDate() - 10);

    usePomodoroStore.setState({
      history: mockHistory,
      todayCategoryBreakdown: { 'work': 180, 'study': 90 },
      todayTotalTime: 270,
      goal: {
        text: "Finish MVP release",
        targetDate: goalTarget.getTime(),
        createdDate: goalCreated.getTime(),
        displayUnit: "days"
      }
    });
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.textContent === 'Dashboard' && target.tagName === 'BUTTON') {
        setShowDashPopup(true);
      }
    };
    document.addEventListener('click', handleGlobalClick);

    // Add pulse to dashboard button
    const timer = setInterval(() => {
      const btns = document.querySelectorAll('button');
      btns.forEach(b => {
        if (b.textContent === 'Dashboard' && !b.classList.contains('pulse-anim')) {
          b.classList.add('pulse-anim');
        }
      });
    }, 1000);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      clearInterval(timer);
    };
  }, []);

  return (
    <HelmetProvider>
      <Helmet>
        <title>Flowst — Minimal Pomodoro Timer for Windows | Free Focus App</title>
        <meta name="description" content="Flowst is a free, minimal Pomodoro timer for Windows. Features always-on-top mini view, contribution heatmap, and deep work sessions." />
        <meta name="keywords" content="pomodoro timer, focus timer, windows pomodoro, minimal pomodoro" />
        <meta name="author" content="La Ngọc Hùng" />
        <meta property="og:title" content="Flowst — Free Minimal Pomodoro Timer for Windows" />
        <meta property="og:description" content="A distraction-free floating Pomodoro timer. Mini overlay, contribution grid, goal tracker. Free for Windows." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://langochung.me/flowst" />
        <link rel="canonical" href="https://langochung.me/flowst" />
      </Helmet>
      
      <nav className="nav">
        <div className="nav-brand">
          <div className="dot"></div>
          Flowst
        </div>
        <div className="nav-mid">
          <a href="#" className="nav-link active">Guide</a>
          <a href="privacy.html" className="nav-link">Privacy</a>
        </div>
        <a href="https://github.com/langochungdev/flowst/releases/latest" className="nav-dl" target="_blank">Download free ↓</a>
      </nav>

      <main className="guide">
        {/* MINI VIEW COLUMN */}
        <div className="col">
          <div className="col-title">Mini View</div>
          <div id="stage-mini" className="stage">
            <AnnotationLayer stageId="stage-mini" mockId="mock-mini" config={annotations.mini} />
            <div className="stage-inner-wrap" style={{position:'absolute', zIndex:10}}>
              <div id="mock-mini" className="app-wrapper app-wrapper-mini">
                <MiniWindow />
              </div>
            </div>
          </div>
        </div>

        {/* MAIN VIEW COLUMN */}
        <div className="col">
          <div className="col-title">Main View</div>
          <div id="stage-main" className="stage">
            <AnnotationLayer stageId="stage-main" mockId="mock-main" config={annotations.main} />
            <div className="stage-inner-wrap" style={{position:'absolute', zIndex:10}}>
              <div id="mock-main" className="app-wrapper app-wrapper-main">
                <MainWindow />
              </div>
            </div>
          </div>
        </div>

        {/* SETTINGS VIEW COLUMN */}
        <div className="col">
          <div className="col-title">Settings</div>
          <div id="stage-settings" className="stage">
            <AnnotationLayer stageId="stage-settings" mockId="mock-settings" config={annotations.settings} />
            <div className="stage-inner-wrap" style={{position:'absolute', zIndex:10}}>
              <div id="mock-settings" className="app-wrapper app-wrapper-settings glass-window" style={{background:'#000', padding:'0', display:'flex', flexDirection:'column', gap:'0', height: '320px', width: '300px'}}>
                <div className="top-header-bar">
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "56px",
                      right: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        transition: "color 150ms ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                      onClick={() => window.open("https://langochung.me", "_blank")}
                    >
                      langochungdev@gmail.com
                    </span>
                  </div>
                </div>

                <div className="corner-btn-group left">
                  <button className="corner-btn"><Minimize2 size={14} /></button>
                  <div className="corner-divider" />
                  <button className="corner-btn"><Home size={14} /></button>
                </div>
                <div className="corner-btn-group right">
                  <button className="corner-btn"><Minus size={14} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <SettingsPane />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        Developed by La Ngọc Hùng · <a href="https://langochung.me" target="_blank">langochung.me</a>
      </footer>

      {showDashPopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowDashPopup(false)}>
          <div className="app-wrapper" style={{ width: 450, height: 800, maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <DashboardWindow />
          </div>
        </div>
      )}
    </HelmetProvider>
  );
}
