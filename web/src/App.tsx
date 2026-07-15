import React, { useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Minimize2, Minus, Home, Download } from "lucide-react";
import MiniWindow from "./components/MiniWindow";
import MainWindow from "./components/MainWindow";
import SettingsPane from "./components/SettingsPane";
import DashboardWindow from "./components/DashboardWindow";
import { usePomodoroStore } from "./stores/pomodoroStore";

interface Annotation {
  id: string;
  label: string;
  sub: string;
  side: "left" | "right" | "top" | "bottom";
  targetSelector: string; // CSS selector inside the component
  posY?: number; // relative Y position from 0 to 1
}

const annotations = {
  mini: [
    {
      id: "mini-progress",
      label: "Session progress",
      sub: "Elapsed / remaining time in the current block",
      side: "left",
      targetSelector: ".mini-progress-row",
      posY: 0.45,
    },
    {
      id: "mini-close",
      label: "✕ Stop & hide",
      sub: "Stops timer and hides window",
      side: "right",
      targetSelector: ".mini-action-btn:last-child",
      posY: 0.55,
    },
  ],
  main: [
    {
      id: "main-dur",
      label: "Focus time",
      sub: "Set Pomodoro block length per session",
      side: "top",
      targetSelector: ".select-group > :nth-child(1)",
      posY: 0.1,
    },
    {
      id: "main-cat",
      label: "Task category",
      sub: "Tag & color-code each session",
      side: "top",
      targetSelector: ".select-group > :nth-child(3)",
      posY: 0.1,
    },
    {
      id: "main-goal",
      label: "Goal",
      sub: "Set a deadline — text fills as time passes",
      side: "left",
      targetSelector: ".goal-empty-state, .goal-display",
      posY: 0.48,
    },
    {
      id: "main-act",
      label: "Activity · This week",
      sub: "Switch between heatmap history and 7-day bar chart",
      side: "left",
      targetSelector: "#view-toggle",
      posY: 0.62,
    },
  ],
  settings: [
    {
      id: "set-sound",
      label: "Custom sound",
      sub: "Upload MP3/WAV or pick a built-in chime",
      side: "top",
      targetSelector: ".custom-select",
      posY: 0.1,
    },
    {
      id: "set-dash",
      label: "Dashboard",
      sub: "Detailed analytics — charts & category breakdown (Click me!)",
      side: "bottom",
      targetSelector: "#dashboard-btn",
      posY: 0.76,
    },
  ],
} as const;

function AnnotationLayer({
  stageId,
  mockId,
  config,
}: {
  stageId: string;
  mockId: string;
  config: readonly Annotation[];
}) {
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
        const target = mock.querySelector(ann.targetSelector) as HTMLElement;
        const tr = target
          ? target.getBoundingClientRect()
          : {
              top: mr.top + mr.height / 2,
              left: mr.left + mr.width / 2,
              right: mr.left + mr.width / 2,
              height: 10,
              width: 0,
            };

        const isMobile = window.innerWidth <= 768;
        let actualSide = ann.side;
        let mIndex = 0;

        // On mobile, distribute annotations to top/bottom to avoid overlapping
        if (isMobile) {
          if (ann.id === "mini-progress") {
            actualSide = "top";
            mIndex = 0;
          } else if (ann.id === "mini-close") {
            actualSide = "bottom";
            mIndex = 0;
          } else if (ann.id === "main-dur") {
            actualSide = "top";
            mIndex = 0;
          } else if (ann.id === "main-cat") {
            actualSide = "top";
            mIndex = 1;
          } else if (ann.id === "main-goal") {
            actualSide = "bottom";
            mIndex = 1;
          } else if (ann.id === "main-act") {
            actualSide = "bottom";
            mIndex = 0;
          } else if (ann.id === "set-sound") {
            actualSide = "top";
            mIndex = 0;
          } else if (ann.id === "set-dash") {
            actualSide = "bottom";
            mIndex = 0;
          }
        }

        const GAP = 5;
        const LW = 95;
        const LH = 36;

        let labelY =
          ann.posY !== undefined
            ? ann.posY * sr.height
            : (i + 1) * (sr.height / (config.length + 1)) - LH / 2;

        if (isMobile) {
          if (actualSide === "top") {
            // Place above the mock frame, stack downwards using mIndex
            labelY = 15 + mIndex * 50;
          } else if (actualSide === "bottom") {
            // Place below the mock frame, stack upwards using mIndex
            labelY = sr.height - 45 - mIndex * 50;
          }
        }

        let dotX, dotY;

        // Calculate touch point based on the original intended side
        if (ann.side === "left") {
          dotX = tr.left - sr.left - GAP;
          dotY = tr.top + tr.height / 2 - sr.top;
        } else if (ann.side === "top") {
          dotX = tr.left + tr.width / 2 - sr.left;
          dotY = tr.top - sr.top - GAP;
        } else if (ann.side === "bottom") {
          dotX = tr.left + tr.width / 2 - sr.left;
          dotY = tr.top + tr.height - sr.top + GAP;
        } else {
          dotX = tr.right - sr.left + GAP;
          dotY = tr.top + tr.height / 2 - sr.top;
        }

        let labelX, lineTo;

        // Calculate label box position and connection line based on actualSide
        if (actualSide === "left") {
          labelX = dotX - LW - 16;
          labelX = Math.min(labelX, mr.left - sr.left - GAP - LW - 25);
          labelX = Math.max(10, labelX); // Avoid cut-off
          lineTo = { x: labelX + LW, y: labelY + LH / 2 };
        } else if (actualSide === "top") {
          labelX = dotX - LW / 2;
          labelX = Math.max(10, Math.min(sr.width - 120, labelX)); // Avoid cut-off
          lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY + LH };
        } else if (actualSide === "bottom") {
          labelX = dotX - LW / 2;
          labelX = Math.max(10, Math.min(sr.width - 120, labelX)); // Avoid cut-off
          lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY };
        } else {
          labelX = dotX + 16;
          labelX = Math.max(labelX, mr.right - sr.left + GAP + 10);
          labelX = Math.max(10, Math.min(sr.width - 120, labelX)); // Avoid cut-off
          lineTo = { x: labelX, y: labelY + LH / 2 };
        }

        // Explicit coordinate overrides per user request
        if (isMobile) {
          if (ann.id === "main-cat") {
            labelY = 18;
          } else if (ann.id === "main-goal") {
            labelY = 429;
            labelX = 216.3;
            dotX = tr.left + tr.width - sr.left - 15; // Move left a bit
            dotY = tr.top + tr.height - sr.top - 15; // Move up a bit
          } else if (ann.id === "mini-progress") {
            labelX = 35.3;
          } else if (ann.id === "mini-close") {
            labelX = 232.175;
          } else if (ann.id === "set-dash") {
            labelY = 429.8;
          }

          // Recalculate lineTo based on overridden labelX and labelY
          if (actualSide === "left") {
            lineTo = { x: labelX + LW, y: labelY + LH / 2 };
          } else if (actualSide === "top") {
            lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY + LH };
          } else if (actualSide === "bottom") {
            lineTo = { x: Math.max(labelX + 4, Math.min(labelX + LW - 4, dotX)), y: labelY };
          } else {
            lineTo = { x: labelX, y: labelY + LH / 2 };
          }
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
        {placed.map((p) => (
          <path
            key={p.id}
            d={p.d}
            stroke="rgba(0,251,255,0.4)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="3 3"
          />
        ))}
      </svg>
      {placed.map((p) => (
        <React.Fragment key={p.id}>
          <div className="ann-dot" style={{ left: p.dotX, top: p.dotY }}></div>
          <div
            className={`ann-label ${p.side === "left" ? "right-aligned" : ""}`}
            style={{ left: p.labelX, top: p.labelY, width: p.LW }}
          >
            <b>{p.label}</b>
            <span>{p.sub}</span>
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

function DemoCursor() {
  const [pos, setPos] = useState({ x: 250, y: 300 });
  const [clicking, setClicking] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    let mounted = true;
    let cx = 250;
    let cy = 300;

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const updatePos = (x: number, y: number) => {
      cx = x;
      cy = y;
      setPos({ x, y });
    };

    const animateCursor = async (endX: number, endY: number, duration: number) => {
      const startX = cx;
      const startY = cy;
      const steps = 30; // Fewer steps for faster anim
      const dt = duration / steps;
      for (let i = 0; i <= steps; i++) {
        if (!mounted) return;
        const t = i / steps;
        const ease = 1 - Math.pow(1 - t, 3);
        updatePos(startX + (endX - startX) * ease, startY + (endY - startY) * ease);
        await wait(dt);
      }
    };

    const run = async () => {
      await wait(1000);
      while (mounted) {
        // 1. Appear
        updatePos(250, 300);
        setOpacity(1);
        await wait(200);

        const getRel = (el: Element) => {
          const mockRect = document.querySelector("#mock-main")!.getBoundingClientRect();
          const scale = mockRect.width / 300;
          const r = el.getBoundingClientRect();
          return {
            x: (r.left - mockRect.left) / scale + r.width / scale / 2,
            y: (r.top - mockRect.top) / scale + r.height / scale / 2,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
          };
        };

        let timeText = document.querySelector("#mock-main .time-text.editable");
        if (!timeText) {
          await wait(500);
          continue;
        }

        let ttPos = getRel(timeText);

        // 2. Move to time text & single click
        await animateCursor(ttPos.x, ttPos.y, 400);
        await wait(100);
        setClicking(true);
        timeText.dispatchEvent(
          new MouseEvent("mousedown", {
            bubbles: true,
            clientX: ttPos.clientX,
            clientY: ttPos.clientY,
          }),
        );
        timeText.dispatchEvent(
          new MouseEvent("mouseup", {
            bubbles: true,
            clientX: ttPos.clientX,
            clientY: ttPos.clientY,
          }),
        );
        timeText.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            clientX: ttPos.clientX,
            clientY: ttPos.clientY,
          }),
        );
        await wait(50);
        setClicking(false);

        // 3. Wait for wheel picker, drag to scroll, then pick active
        await wait(300);
        const wheelList = document.querySelector("#mock-main .wheel-list");
        if (wheelList) {
          const wlPos = getRel(wheelList);
          await animateCursor(wlPos.x, wlPos.y + 40, 200); // move to bottom part of list
          await wait(50);

          // Drag up to scroll down
          setClicking(true);
          const mockRect = document.querySelector("#mock-main")!.getBoundingClientRect();
          const scale = mockRect.width / 300;
          const startClientY = wlPos.clientY + 40 * scale;

          wheelList.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              clientX: wlPos.clientX,
              clientY: startClientY,
              pointerId: 1,
            }),
          );

          const dragSteps = 15;
          const dragDist = 120; // 120px drag up
          for (let i = 1; i <= dragSteps; i++) {
            if (!mounted) return;
            const currY = wlPos.y + 40 - dragDist * (i / dragSteps);
            const currCy = startClientY - dragDist * scale * (i / dragSteps);
            updatePos(wlPos.x, currY);
            wheelList.dispatchEvent(
              new PointerEvent("pointermove", {
                bubbles: true,
                clientX: wlPos.clientX,
                clientY: currCy,
                pointerId: 1,
              }),
            );
            await wait(12);
          }

          wheelList.dispatchEvent(
            new PointerEvent("pointerup", {
              bubbles: true,
              clientX: wlPos.clientX,
              clientY: startClientY - dragDist * scale,
              pointerId: 1,
            }),
          );
          setClicking(false);

          // Wait for momentum scroll to finish
          await wait(800);

          const activeItem =
            document.querySelector("#mock-main .wheel-item.active") ||
            document.querySelector("#mock-main .wheel-item:last-child");
          if (activeItem) {
            const actPos = getRel(activeItem);
            await animateCursor(actPos.x, actPos.y, 200);
            await wait(100);

            setClicking(true);
            activeItem.dispatchEvent(
              new PointerEvent("pointerdown", {
                bubbles: true,
                clientX: actPos.clientX,
                clientY: actPos.clientY,
                pointerId: 2,
              }),
            );
            activeItem.dispatchEvent(
              new PointerEvent("pointerup", {
                bubbles: true,
                clientX: actPos.clientX,
                clientY: actPos.clientY,
                pointerId: 2,
              }),
            );
            await wait(50);
            setClicking(false);
          }
        }

        // 4. Wait for it to close
        await wait(400);

        // 5. Double click to type
        timeText = document.querySelector("#mock-main .time-text.editable");
        if (timeText) {
          ttPos = getRel(timeText);
          await animateCursor(ttPos.x, ttPos.y, 300);
          await wait(100);

          setClicking(true);
          await wait(50);
          setClicking(false);
          timeText.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              clientX: ttPos.clientX,
              clientY: ttPos.clientY,
            }),
          );
          await wait(50);
          setClicking(true);
          await wait(50);
          setClicking(false);
          timeText.dispatchEvent(
            new MouseEvent("dblclick", {
              bubbles: true,
              clientX: ttPos.clientX,
              clientY: ttPos.clientY,
            }),
          );
        }

        await wait(200);

        // 6. Type "45"
        const input = document.querySelector("#mock-main .time-text-input") as HTMLInputElement;
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;

          nativeInputValueSetter?.call(input, "4");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(100);

          nativeInputValueSetter?.call(input, "45");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(200);

          input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
          input.dispatchEvent(new Event("blur", { bubbles: true }));
        }

        await wait(600);

        // 7. Click switch activity
        const viewToggle = document.querySelector("#mock-main #view-toggle");
        if (viewToggle) {
          const vtPos = getRel(viewToggle);
          await animateCursor(vtPos.x, vtPos.y, 400);
          await wait(150);
          setClicking(true);
          viewToggle.dispatchEvent(
            new MouseEvent("mousedown", {
              bubbles: true,
              clientX: vtPos.clientX,
              clientY: vtPos.clientY,
            }),
          );
          viewToggle.dispatchEvent(
            new MouseEvent("mouseup", {
              bubbles: true,
              clientX: vtPos.clientX,
              clientY: vtPos.clientY,
            }),
          );
          viewToggle.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              clientX: vtPos.clientX,
              clientY: vtPos.clientY,
            }),
          );
          await wait(50);
          setClicking(false);
        }

        await wait(1000);
        setOpacity(0);
        await wait(800);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        opacity,
        transform: clicking ? "scale(0.85)" : "scale(1)",
        transition: "opacity 0.15s, transform 0.1s",
        pointerEvents: "none",
        zIndex: 9999,
        marginLeft: "-6px",
        marginTop: "-2px",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.5 3.5L18.5 10.5L11.5 12.5L9.5 19.5L5.5 3.5Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
      const dateStr = `${y}-${m.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

      const workH = (Math.random() * 4).toFixed(1);
      const studyH = (Math.random() * 3).toFixed(1);

      mockHistory[dateStr] = {
        totalHours: parseFloat(workH) + parseFloat(studyH),
        breakdown: { work: parseFloat(workH), study: parseFloat(studyH) },
        categoryNames: { work: "Work", study: "Study" },
        categoryColors: { work: "#00FF66", study: "#00FBFF" },
      };
    }

    const goalTarget = new Date();
    goalTarget.setDate(goalTarget.getDate() + 4);
    const goalCreated = new Date();
    goalCreated.setDate(goalCreated.getDate() - 10);

    usePomodoroStore.setState({
      history: mockHistory,
      todayCategoryBreakdown: { work: 180, study: 90 },
      todayTotalTime: 270,
      goal: {
        text: "Finish MVP release",
        targetDate: goalTarget.getTime(),
        createdDate: goalCreated.getTime(),
        displayUnit: "days",
      },
    });
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.textContent === "Dashboard" && target.tagName === "BUTTON") {
        setShowDashPopup(true);
      }
    };
    document.addEventListener("click", handleGlobalClick);

    // Add pulse to dashboard button
    const timer = setInterval(() => {
      const btns = document.querySelectorAll("button");
      btns.forEach((b) => {
        if (b.textContent === "Dashboard" && !b.classList.contains("pulse-anim")) {
          b.classList.add("pulse-anim");
        }
      });
    }, 1000);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
      clearInterval(timer);
    };
  }, []);

  return (
    <HelmetProvider>
      <Helmet>
        <title>Flowst — Minimal Pomodoro Timer for Windows | Free Focus App</title>
        <meta
          name="description"
          content="Flowst is a free, minimal Pomodoro timer for Windows. Features always-on-top mini view, contribution heatmap, and deep work sessions."
        />
        <meta
          name="keywords"
          content="pomodoro timer, focus timer, windows pomodoro, minimal pomodoro"
        />
        <meta name="author" content="La Ngọc Hùng" />
        <meta property="og:title" content="Flowst — Free Minimal Pomodoro Timer for Windows" />
        <meta
          property="og:description"
          content="A distraction-free floating Pomodoro timer. Mini overlay, contribution grid, goal tracker. Free for Windows."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://langochung.me/flowst" />
        <link rel="canonical" href="https://langochung.me/flowst" />
      </Helmet>

      <nav className="nav">
        <a href="#" className="nav-brand">
          <svg viewBox="0 0 140 140" className="nav-brand-logo" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="140" height="140" rx="32" fill="#000000" />
            <circle cx="70" cy="70" r="42" fill="none" stroke="#8A8A8A" strokeWidth="8" />
            <path
              className="logo-path-anim"
              pathLength="100"
              d="M 70 28 A 42 42 0 1 1 34 91"
              fill="none"
              stroke="#00FBFF"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle className="logo-dot-anim" cx="34" cy="91" r="7" fill="#00FBFF" />
          </svg>
          <span className="nav-brand-text">Flowst</span>
        </a>
        <div className="nav-right">
          <a href="https://langochung.me" target="_blank" rel="noreferrer" className="nav-link">
            Contact
          </a>
          <a href="privacy.html" className="nav-link">
            Privacy
          </a>
          <a
            href="https://github.com/langochungdev/flowst/releases/latest"
            className="nav-dl"
            target="_blank"
            rel="noreferrer"
          >
            <span className="dl-text">Download free ↓</span>
            <Download className="dl-icon" size={16} />
          </a>
        </div>
      </nav>

      <main className="guide">
        {/* MINI VIEW COLUMN */}
        <div className="col">
          <div className="col-title">Mini View</div>
          <div id="stage-mini" className="stage">
            <AnnotationLayer stageId="stage-mini" mockId="mock-mini" config={annotations.mini} />
            <div className="stage-inner-wrap" style={{ position: "absolute", zIndex: 10 }}>
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
            <div className="stage-inner-wrap" style={{ position: "absolute", zIndex: 10 }}>
              <div id="mock-main" className="app-wrapper app-wrapper-main">
                <MainWindow />
                <DemoCursor />
              </div>
            </div>
          </div>
        </div>

        {/* SETTINGS VIEW COLUMN */}
        <div className="col">
          <div className="col-title">Settings</div>
          <div id="stage-settings" className="stage">
            <AnnotationLayer
              stageId="stage-settings"
              mockId="mock-settings"
              config={annotations.settings}
            />
            <div className="stage-inner-wrap" style={{ position: "absolute", zIndex: 10 }}>
              <div
                id="mock-settings"
                className="app-wrapper app-wrapper-settings glass-window"
                style={{
                  background: "#000",
                  padding: "0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0",
                  height: "320px",
                  width: "300px",
                }}
              >
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
                        transition: "color 150ms ease",
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
                  <button className="corner-btn">
                    <Minimize2 size={14} />
                  </button>
                  <div className="corner-divider" />
                  <button className="corner-btn">
                    <Home size={14} />
                  </button>
                </div>
                <div className="corner-btn-group right">
                  <button className="corner-btn">
                    <Minus size={14} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  <SettingsPane />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-left">
          <img src="/logo.png" alt="" className="footer-logo" />
          <span>Flowst · Free Pomodoro Timer for Windows</span>
        </div>
        <div className="footer-right">
          <span>
            By{" "}
            <a href="https://langochung.me" target="_blank">
              La Ngọc Hùng
            </a>
          </span>
          <a href="privacy.html">Privacy</a>
        </div>
      </footer>

      {showDashPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowDashPopup(false)}
        >
          <div
            className="app-wrapper"
            style={{
              position: "absolute",
              width: 450,
              height: 800,
              overflow: "hidden",
              borderRadius: 12,
              transform: `scale(${Math.min(1, (window.innerWidth - 32) / 450, (window.innerHeight - 32) / 800)})`,
              transformOrigin: "center center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DashboardWindow onClose={() => setShowDashPopup(false)} />
          </div>
        </div>
      )}
    </HelmetProvider>
  );
}
