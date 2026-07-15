import { useEffect, useState, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { X, Download, Filter, Calendar } from "lucide-react";
import { toPng } from "html-to-image";
import DashboardGrid from "./dashboard/DashboardGrid";
import DashboardChart from "./dashboard/DashboardChart";
import DashboardStats from "./dashboard/DashboardStats";
import { useWindowDrag } from "../hooks/useWindowDrag";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { usePomodoroStore } from "../stores/pomodoroStore";
import { getMockedDate } from "../stores/debugStore";
import { useMemo } from "react";

export default function DashboardWindow({ onClose }: { onClose?: () => void }) {
  const { isDragging, bind } = useWindowDrag();
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const categories = usePomodoroStore((state) => state.categories);
  const history = usePomodoroStore((state) => state.history);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    categories.map((c) => c.id),
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [timeFilter, setTimeFilter] = useState<string>("7d");
  const [customDays, setCustomDays] = useState<number | string>(14);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);

  const currentYear = getMockedDate().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    Object.keys(history || {}).forEach((dateStr) => {
      years.add(new Date(dateStr).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [history, currentYear]);

  const timeOptions = [
    { value: "7d", label: "7 days" },
    { value: "1m", label: "1 month" },
    { value: "3m", label: "3 months" },
    { value: "thisWeek", label: "This week" },
    { value: "thisMonth", label: "This month" },
    { value: "thisYear", label: "This year" },
    { value: "last1year", label: "Last 1 year" },
    { value: "all", label: "All time" },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
    { value: "custom", label: "Custom" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeWindow = () => {
    if (onClose) {
      onClose();
    } else {
      getCurrentWebviewWindow()?.close();
    }
  };

  const handleExport = async () => {
    if (!containerRef.current) return;
    try {
      const today = getMockedDate();
      let numDays = 0;
      switch (timeFilter) {
        case "7d":
          numDays = 7;
          break;
        case "1m":
          numDays = 30;
          break;
        case "3m":
          numDays = 90;
          break;
        case "thisWeek":
          numDays = today.getDay() === 0 ? 7 : today.getDay();
          break;
        case "thisMonth":
          numDays = today.getDate();
          break;
        case "thisYear": {
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          numDays = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
          break;
        }
        case "custom":
          numDays = Number(customDays) || 1;
          break;
        case "last1year":
          numDays = 365;
          break;
        case "all": {
          const keys = Object.keys(history || {});
          if (keys.length > 0) {
            const earliest = new Date(keys.sort()[0]);
            numDays = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 3600 * 24)) + 1;
          } else {
            numDays = 1;
          }
          break;
        }
        default: {
          if (!isNaN(Number(timeFilter))) {
            const year = Number(timeFilter);
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);

            numDays =
              Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
          }
          break;
        }
      }

      let anchorDate = today;
      if (!isNaN(Number(timeFilter))) {
        const year = Number(timeFilter);
        if (year !== today.getFullYear()) {
          anchorDate = new Date(year, 11, 31);
        }
      }

      const startDate = new Date(anchorDate);
      startDate.setDate(anchorDate.getDate() - numDays + 1);

      const formatShortDate = (d: Date) => {
        return `${d.getDate()}-${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`;
      };

      const fileName = `flowst-${formatShortDate(startDate)}_to_${formatShortDate(anchorDate)}.png`;

      const savePath = await save({
        filters: [{ name: "Image", extensions: ["png"] }],
        defaultPath: fileName,
      });
      if (!savePath) return;

      setIsExporting(true);
      // Wait for UI to update (hide buttons)
      await new Promise((resolve) => setTimeout(resolve, 50));

      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        backgroundColor: "#000",
        pixelRatio: 2.4, // 450 * 2.4 = 1080, 800 * 2.4 = 1920
      });

      // Convert base64 dataUrl to Uint8Array
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await writeFile(savePath, bytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) {
        // If it's the last one, maybe don't allow unselecting? Or allow empty.
        return prev.filter((c) => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div
      {...bind}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {!isExporting && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 20,
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={handleExport}
            className="no-drag"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#00F2F6",
              color: "#000",
              border: "none",
              padding: "4px 8px",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <Download size={14} /> Export
          </button>

          <div className="no-drag" style={{ position: "relative" }} ref={categoryDropdownRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              <Filter size={14} /> Categories
            </button>
            {isFilterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  background: "#222",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px",
                  gap: "6px",
                  minWidth: "150px",
                  zIndex: 100,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginBottom: "4px",
                    paddingBottom: "4px",
                    borderBottom: "1px solid #444",
                  }}
                >
                  Categories
                </div>
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      style={{ accentColor: cat.color, cursor: "pointer" }}
                    />
                    <span style={{ color: cat.color, fontWeight: "bold" }}>{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="no-drag" style={{ position: "relative" }} ref={timeDropdownRef}>
            <button
              onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              <Calendar size={14} />{" "}
              {timeOptions.find((o) => o.value === timeFilter)?.label || "Time"}
            </button>
            {isTimeFilterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  background: "#222",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "4px",
                  gap: "2px",
                  minWidth: "130px",
                  zIndex: 100,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                {timeOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      setTimeFilter(opt.value);
                      if (opt.value !== "custom") {
                        setIsTimeFilterOpen(false);
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      background: timeFilter === opt.value ? "#00F2F6" : "transparent",
                      color: timeFilter === opt.value ? "#000" : "#fff",
                      fontWeight: timeFilter === opt.value ? "bold" : "normal",
                    }}
                    onMouseEnter={(e) => {
                      if (timeFilter !== opt.value) e.currentTarget.style.background = "#333";
                    }}
                    onMouseLeave={(e) => {
                      if (timeFilter !== opt.value)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
                {timeFilter === "custom" && (
                  <div
                    style={{
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#888" }}>Days:</span>
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setCustomDays("");
                        else {
                          const num = parseInt(val);
                          if (!isNaN(num)) setCustomDays(Math.max(1, num));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setIsTimeFilterOpen(false);
                        }
                      }}
                      style={{
                        width: "50px",
                        background: "#111",
                        border: "1px solid #444",
                        color: "#fff",
                        borderRadius: "4px",
                        padding: "2px 4px",
                        fontSize: "12px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isExporting && (
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
          <button
            onClick={closeWindow}
            className="no-drag"
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: "48px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          backgroundColor: "#000",
          height: "100%",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ flex: "0 0 auto" }}>
          <DashboardStats
            selectedCategories={selectedCategories}
            timeFilter={timeFilter}
            customDays={customDays}
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <DashboardChart
            selectedCategories={selectedCategories}
            timeFilter={timeFilter}
            customDays={customDays}
          />
        </div>

        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" }}>
          <DashboardGrid selectedCategories={selectedCategories} timeFilter={timeFilter} />
        </div>
      </div>
    </div>
  );
}
