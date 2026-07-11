import { useMemo, useState } from "react";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getMockedDate } from "../../stores/debugStore";

type CellData = {
  level: number;
  date: Date;
  totalHours: number;
};

export default function DashboardGrid() {
  const history = usePomodoroStore((state) => state.history);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);

  // Years extraction
  const currentYear = getMockedDate().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    Object.keys(history || {}).forEach((dateStr) => {
      years.add(new Date(dateStr).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [history, currentYear]);

  const [selectedYear, setSelectedYear] = useState<string>("last1year");

  const days = 7;

  const grid = useMemo(() => {
    let referenceDate = getMockedDate();
    let weeks = 52;

    if (selectedYear !== "last1year") {
      const yearNum = Number(selectedYear);
      referenceDate = new Date(yearNum, 11, 31); // Dec 31
      weeks = 53; // A full calendar year can span 53 weeks
    }
    
    const refDOW = referenceDate.getDay();
    const currentDOW = refDOW === 0 ? 6 : refDOW - 1; // 0=Mon, 6=Sun

    return Array.from({ length: days }, (_, rowIndex) =>
      Array.from({ length: weeks }, (_, colIndex) => {
        const weeksAgo = weeks - 1 - colIndex;
        const daysAgo = weeksAgo * 7 + (currentDOW - rowIndex);

        let level = 0;
        let totalHours = 0;

        const date = new Date(referenceDate);
        date.setDate(date.getDate() - daysAgo);

        const isFuture = date > getMockedDate();
        const isWrongYear = selectedYear !== "last1year" && date.getFullYear() !== Number(selectedYear);

        if (isFuture || isWrongYear) {
          level = -1;
        } else if (date.getFullYear() === currentYear && date.getMonth() === getMockedDate().getMonth() && date.getDate() === getMockedDate().getDate()) {
          totalHours = Math.round((todayTotalTime / 60) * 10) / 10;
        } else {
          const dateString = date.toISOString().split("T")[0];
          const historicalData = (history || {})[dateString];
          if (historicalData && historicalData.totalHours > 0) {
            totalHours = Math.round(historicalData.totalHours * 10) / 10;
          }
        }

        if (level !== -1) {
          if (totalHours <= 0) level = 0;
          else if (totalHours <= 1) level = 1;
          else if (totalHours <= 3) level = 2;
          else if (totalHours <= 5) level = 3;
          else level = 4;
        }

        return { level, date, totalHours };
      }),
    );
  }, [selectedYear, currentYear, todayTotalTime, history]);

  const [hoveredCell, setHoveredCell] = useState<{
    data: CellData;
    rect: DOMRect;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, data: CellData) => {
    if (data.level < 0) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredCell({ data, rect });
  };

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--bg-glass)", padding: "16px", border: "1px solid var(--glass-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>Contributions</h3>
        <div style={{ position: "relative" }}>
          <div 
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            style={{ 
              background: "#222", color: "#fff", border: "1px solid #444", 
              padding: "4px 10px", borderRadius: "4px", fontSize: "14px", 
              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" 
            }}
          >
            {selectedYear === "last1year" ? "Last 1 year" : selectedYear}
            <span style={{ fontSize: "10px" }}>▼</span>
          </div>
          {isYearDropdownOpen && (
            <div style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: "4px",
              background: "#222", border: "1px solid #444", borderRadius: "4px",
              display: "flex", flexDirection: "column", zIndex: 100,
              maxHeight: "180px", overflowY: "auto", whiteSpace: "nowrap"
            }}>
              {availableYears.map(y => (
                <div 
                  key={y} 
                  onClick={() => { setSelectedYear(String(y)); setIsYearDropdownOpen(false); }}
                  style={{
                    padding: "6px 16px", fontSize: "14px", cursor: "pointer",
                    background: selectedYear === String(y) ? "#00F2F6" : "transparent",
                    color: selectedYear === String(y) ? "#000" : "#fff",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = selectedYear === String(y) ? "#00F2F6" : "#333"}
                  onMouseLeave={(e) => e.currentTarget.style.background = selectedYear === String(y) ? "#00F2F6" : "transparent"}
                >
                  {y}
                </div>
              ))}
              <div 
                onClick={() => { setSelectedYear("last1year"); setIsYearDropdownOpen(false); }}
                style={{
                  padding: "6px 16px", fontSize: "14px", cursor: "pointer",
                  background: selectedYear === "last1year" ? "#00F2F6" : "transparent",
                  color: selectedYear === "last1year" ? "#000" : "#fff",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = selectedYear === "last1year" ? "#00F2F6" : "#333"}
                onMouseLeave={(e) => e.currentTarget.style.background = selectedYear === "last1year" ? "#00F2F6" : "transparent"}
              >
                Last 1 year
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "relative", overflowX: "hidden", overflowY: "hidden", paddingBottom: "2px", alignSelf: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: "2px" }}>
              {row.map((cell, colIndex) => {
                const monthThis = cell.date.getMonth();
                const isNewMonthLeft = colIndex > 0 && monthThis !== grid[rowIndex][colIndex - 1].date.getMonth();
                const isNewMonthTop = rowIndex > 0 && monthThis !== grid[rowIndex - 1][colIndex].date.getMonth();
                const isCornerTurn = rowIndex > 0 && colIndex > 0 && monthThis === grid[rowIndex - 1][colIndex].date.getMonth() && monthThis === grid[rowIndex][colIndex - 1].date.getMonth() && monthThis !== grid[rowIndex - 1][colIndex - 1].date.getMonth();
                const fillCorner = (isNewMonthLeft && isNewMonthTop) || isCornerTurn;

                return (
                  <div
                    key={colIndex}
                    style={{
                      width: "6px",
                      height: "6px",
                      position: "relative",
                      backgroundColor: "transparent",
                      pointerEvents: cell.level === -1 ? "none" : "auto",
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "1px",
                        backgroundColor: cell.level <= 0 ? "#222" : "#00F2F6",
                        opacity: cell.level === -1 ? 0 : cell.level === 0 ? 1 : [0, 0.3, 0.5, 0.72, 1.0][cell.level],
                      }}
                    />
                    {isNewMonthLeft && <div style={{ position: "absolute", left: "-1px", top: rowIndex > 0 && !isNewMonthTop ? "-1px" : "0", bottom: 0, width: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
                    {isNewMonthTop && <div style={{ position: "absolute", top: "-1px", left: colIndex > 0 && !isNewMonthLeft ? "-1px" : "0", right: 0, height: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
                    {fillCorner && <div style={{ position: "absolute", top: "-1px", left: "-1px", width: "1px", height: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hoveredCell && (
        <div
          style={{
            position: "fixed",
            top: hoveredCell.rect.top - 34,
            left: Math.max(80, Math.min(window.innerWidth - 80, hoveredCell.rect.left + 3)),
            transform: "translateX(-50%)",
            background: "#fff",
            color: "#000",
            padding: "4px 8px",
            fontSize: "14px",
            borderRadius: "4px",
            fontWeight: "bold",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 100,
          }}
        >
          {`${hoveredCell.data.date.getDate()}/${hoveredCell.data.date.getMonth() + 1}/${hoveredCell.data.date.getFullYear()}: ${hoveredCell.data.totalHours}h`}
        </div>
      )}
    </div>
  );
}
