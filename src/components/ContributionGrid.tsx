import { useMemo, useState } from "react";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import { usePomodoroStore } from "../stores/pomodoroStore";
import { getLocalDateString } from "../utils/date";
type CellData = {
  level: number;
  date: Date;
  totalHours: number;
  breakdown: { name: string; hours: number }[];
};

export default function ContributionGrid() {
  const days = 7;
  const blocksPerDay = 30;
  const dateOffsetDays = useDebugStore((state) => state.dateOffsetDays);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
  const history = usePomodoroStore((state) => state.history);
  const categories = usePomodoroStore((state) => state.categories);

  // Generate stable mock data on mount
  const grid = useMemo(() => {
    const _forceUpdate = dateOffsetDays; // read to satisfy eslint exhaustive-deps, since getMockedDate reads it internally
    void _forceUpdate;
    const todayDate = getMockedDate(); // we still use this if dateOffsetDays is used for testing, but let's base it on currentDateStr?
    // Actually, getMockedDate applies offset to the real Date.
    // But store's currentDate is just a string. Let's use getMockedDate so we can test the grid offset.
    const todayDOW = todayDate.getDay();
    const currentDOW = todayDOW === 0 ? 6 : todayDOW - 1; // 0=Mon, 6=Sun

    return Array.from({ length: days }, (_, rowIndex) =>
      Array.from({ length: blocksPerDay }, (_, colIndex) => {
        const weeksAgo = blocksPerDay - 1 - colIndex;
        const daysAgo = weeksAgo * 7 + (currentDOW - rowIndex);

        let level = 0;
        let totalHours = 0;
        const breakdown: { name: string; hours: number }[] = [];

        const date = new Date(todayDate);
        date.setDate(date.getDate() - daysAgo);

        if (daysAgo < 0) {
          // Future day
          level = -1;
        } else if (daysAgo === 0) {
          // Today
          totalHours = Math.round((todayTotalTime / 60) * 10) / 10;
          if (totalHours <= 0) level = 0;
          else if (totalHours <= 1) level = 1;
          else if (totalHours <= 3) level = 2;
          else if (totalHours <= 5) level = 3;
          else level = 4;

          for (const [catId, mins] of Object.entries(todayCategoryBreakdown || {})) {
            const cat = categories.find((c) => c.id === catId);
            if (cat && mins > 0) {
              breakdown.push({ name: cat.name, hours: Math.round((mins / 60) * 10) / 10 });
            }
          }
        } else {
          // Past days real history
          const dateString = getLocalDateString(date);
          const historicalData = (history || {})[dateString];
          if (historicalData && historicalData.totalHours > 0) {
            totalHours = Math.round(historicalData.totalHours * 10) / 10;
            if (totalHours <= 0) level = 0;
            else if (totalHours <= 1) level = 1;
            else if (totalHours <= 3) level = 2;
            else if (totalHours <= 5) level = 3;
            else level = 4;

            for (const [catId, hours] of Object.entries(historicalData.breakdown || {})) {
              if (hours <= 0) continue;
              // Ưu tiên dùng snapshot tên tại thời điểm lưu, fallback về categories hiện tại
              const snapshotName = historicalData.categoryNames?.[catId];
              const name = snapshotName ?? (categories.find((c) => c.id === catId)?.name ?? catId);
              breakdown.push({ name, hours: Math.round(hours * 10) / 10 });
            }
          } else {
            level = 0;
          }
        }

        return { level, date, totalHours, breakdown };
      }),
    );
  }, [dateOffsetDays, todayTotalTime, todayCategoryBreakdown, history, categories]);

  const [hoveredCell, setHoveredCell] = useState<{
    data: CellData;
    rect: DOMRect;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, data: CellData) => {
    if (data.level < 0) return; // Skip future cells
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredCell({ data, rect });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <>
      <div className="contribution-grid" onMouseLeave={handleMouseLeave}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="contribution-row">
            {row.map((cell, colIndex) => {
              const monthThis = cell.date.getMonth();
              const isNewMonthLeft =
                colIndex > 0 && monthThis !== grid[rowIndex][colIndex - 1].date.getMonth();
              const isNewMonthTop =
                rowIndex > 0 && monthThis !== grid[rowIndex - 1][colIndex].date.getMonth();
              const isCornerTurn =
                rowIndex > 0 &&
                colIndex > 0 &&
                monthThis === grid[rowIndex - 1][colIndex].date.getMonth() &&
                monthThis === grid[rowIndex][colIndex - 1].date.getMonth() &&
                monthThis !== grid[rowIndex - 1][colIndex - 1].date.getMonth();
              const fillCorner = (isNewMonthLeft && isNewMonthTop) || isCornerTurn;

              return (
                <div
                  key={colIndex}
                  className="contribution-cell"
                  style={{
                    position: "relative",
                    backgroundColor: "transparent",
                    pointerEvents: cell.level === -1 ? "none" : "auto",
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, cell)}
                >
                  {/* Cell Background */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "2px",
                      backgroundColor: cell.level <= 0 ? "var(--grid-base)" : "var(--grid-active)",
                      opacity:
                        cell.level === -1
                          ? 0
                          : cell.level === 0
                            ? 1
                            : [0, 0.3, 0.5, 0.72, 1.0][cell.level],
                    }}
                  />

                  {/* Month Boundaries */}
                  {isNewMonthLeft && (
                    <div
                      style={{
                        position: "absolute",
                        left: "-2px",
                        top: rowIndex > 0 && !isNewMonthTop ? "-2px" : "0",
                        bottom: 0,
                        width: "2px",
                        backgroundColor: "#FFFFFF",
                        opacity: 1,
                        zIndex: 5,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {isNewMonthTop && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-2px",
                        left: colIndex > 0 && !isNewMonthLeft ? "-2px" : "0",
                        right: 0,
                        height: "2px",
                        backgroundColor: "#FFFFFF",
                        opacity: 1,
                        zIndex: 5,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {fillCorner && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-2px",
                        left: "-2px",
                        width: "2px",
                        height: "2px",
                        backgroundColor: "#FFFFFF",
                        opacity: 1,
                        zIndex: 5,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hoveredCell && (
        <div
          className="contribution-tooltip"
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              const center = hoveredCell.rect.left + hoveredCell.rect.width / 2;
              let newLeft = center - rect.width / 2;
              newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - rect.width - 10));
              if (el.style.left !== `${newLeft}px`) {
                el.style.left = `${newLeft}px`;
              }
            }
          }}
          style={{
            position: "fixed",
            top: hoveredCell.rect.top - 8,
            left: -9999, // Initial off-screen
          }}
        >
          <div className="tooltip-date">
            {`${hoveredCell.data.date.getDate()}/${hoveredCell.data.date.getMonth() + 1}/${hoveredCell.data.date.getFullYear() % 100}`}
          </div>
          <div className="tooltip-total">{hoveredCell.data.totalHours}h</div>
          {hoveredCell.data.breakdown.length > 0 && (
            <div className="tooltip-breakdown">
              {hoveredCell.data.breakdown.map((b) => (
                <div key={b.name} className="tooltip-b-item">
                  <span className="tooltip-b-hours">{b.hours}h</span>
                  <span className="tooltip-b-name">{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
