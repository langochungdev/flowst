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

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const days = 7;
  const weeks = 52; // Full year

  const grid = useMemo(() => {
    // If selected year is current year, we align to today.
    // If selected year is past year, we align to Dec 31 of that year.
    let referenceDate = getMockedDate();
    if (selectedYear !== currentYear) {
      referenceDate = new Date(selectedYear, 11, 31); // Dec 31
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

        // If date is completely out of the selected year, we could make it level -1 (invisible)
        // But typical Github graph shows surrounding days. We will hide days not in the year if they are in the future of that year.
        if (date.getFullYear() > selectedYear || date > new Date()) {
          level = -1;
        } else if (date.getFullYear() === currentYear && daysAgo === 0) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-glass)", padding: "16px", border: "1px solid var(--glass-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>Contributions</h3>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{ background: "#222", color: "#fff", border: "1px solid #444", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ position: "relative", overflowX: "auto", overflowY: "hidden", paddingBottom: "4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: "3px" }}>
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
                      width: "10px",
                      height: "10px",
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
                        borderRadius: "2px",
                        backgroundColor: cell.level <= 0 ? "#222" : "#00F2F6",
                        opacity: cell.level === -1 ? 0 : cell.level === 0 ? 1 : [0, 0.3, 0.5, 0.72, 1.0][cell.level],
                      }}
                    />
                    {isNewMonthLeft && <div style={{ position: "absolute", left: "-2px", top: rowIndex > 0 && !isNewMonthTop ? "-2px" : "0", bottom: 0, width: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
                    {isNewMonthTop && <div style={{ position: "absolute", top: "-2px", left: colIndex > 0 && !isNewMonthLeft ? "-2px" : "0", right: 0, height: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
                    {fillCorner && <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "1px", height: "1px", backgroundColor: "#555", opacity: 0.5, pointerEvents: "none" }} />}
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
            top: hoveredCell.rect.top - 30,
            left: hoveredCell.rect.left + 5,
            transform: "translateX(-50%)",
            background: "#fff",
            color: "#000",
            padding: "4px 8px",
            fontSize: "10px",
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
