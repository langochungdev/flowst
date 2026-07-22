import { useMemo, useState } from "react";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import { usePomodoroStore } from "../stores/pomodoroStore";
import { getLocalDateString } from "../utils/date";
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function ContributionGrid() {
  const days = 7;
  const blocksPerDay = 30;
  const dateOffsetDays = useDebugStore((state) => state.dateOffsetDays);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
  const history = usePomodoroStore((state) => state.history);
  const categories = usePomodoroStore((state) => state.categories);
  const contributionView = usePomodoroStore((state) => state.contributionView || "grid");
  const setContributionView = usePomodoroStore((state) => state.setContributionView);

  // Generate stable mock data on mount
  const grid = useMemo(() => {
    const _forceUpdate = dateOffsetDays; // read to satisfy eslint exhaustive-deps, since getMockedDate reads it internally
    void _forceUpdate;
    const todayDate = getMockedDate(); // we still use this if dateOffsetDays is used for testing, but let's base it on currentDateStr?
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
              const snapshotName = historicalData.categoryNames?.[catId];
              const name = snapshotName ?? categories.find((c) => c.id === catId)?.name ?? catId;
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

  const { chartData, activeCategories } = useMemo(() => {
    void dateOffsetDays;
    void todayTotalTime;
    const todayDate = getMockedDate();
    const numDays = 7;
    const startDate = new Date(todayDate);
    startDate.setDate(todayDate.getDate() - numDays + 1);

    const data: Record<string, number | string>[] = [];
    const catMap = new Map<string, { name: string; color: string }>();

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = getLocalDateString(d);
      const isToday = dateStr === getLocalDateString(todayDate);

      const point: Record<string, number | string> = {
        name: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
        fullDate: dateStr,
      };

      if (isToday) {
        Object.entries(todayCategoryBreakdown || {}).forEach(([catId, minutes]) => {
          const hours = minutes / 60;
          if (hours > 0) {
            point[catId] = Math.round(hours * 10) / 10;
            const currentCat = categories.find((c) => c.id === catId);
            if (!catMap.has(catId) && currentCat) {
              catMap.set(catId, { name: currentCat.name, color: currentCat.color });
            }
          }
        });
      } else if (history && history[dateStr]) {
        const dayHist = history[dateStr];
        Object.entries(dayHist.breakdown || {}).forEach(([catId, hours]) => {
          if (hours > 0) {
            point[catId] = Math.round(hours * 10) / 10;
            if (!catMap.has(catId)) {
              catMap.set(catId, {
                name: dayHist.categoryNames?.[catId] || catId,
                color: dayHist.categoryColors?.[catId] || "#00F2F6",
              });
            }
          }
        });
      }

      data.push(point);
    }

    const activeCatArr = Array.from(catMap.entries()).map(([id, val]) => ({ id, ...val }));

    // Fill missing data points with 0 ONLY for days after the category's first appearance
    // If there are 3 or more consecutive days of missing/0 data, explicitly set them to null to break the line.
    activeCatArr.forEach((cat) => {
      const firstIdx = data.findIndex((point) => (point[cat.id] as number) > 0);
      if (firstIdx === -1) return;

      let currentBlockStart = -1;

      for (let i = firstIdx; i <= data.length; i++) {
        const isMissing = i < data.length && !((data[i][cat.id] as number) > 0);

        if (isMissing) {
          if (currentBlockStart === -1) currentBlockStart = i;
        } else {
          if (currentBlockStart !== -1) {
            const blockLength = i - currentBlockStart;
            if (blockLength < 3) {
              for (let j = currentBlockStart; j < i; j++) {
                data[j][cat.id] = 0;
              }
            } else {
              for (let j = currentBlockStart; j < i; j++) {
                data[j][cat.id] = null as any; // Explicit null to break the line
              }
            }
            currentBlockStart = -1;
          }
        }
      }
    });

    if (activeCatArr.length === 0 && categories.length > 0) {
      const defaultCat = categories[0];
      activeCatArr.push({
        id: defaultCat.id,
        name: defaultCat.name,
        color: defaultCat.color || "#888",
      });
      data.forEach((point) => {
        point[defaultCat.id] = 0;
      });
    }

    return { chartData: data, activeCategories: activeCatArr };
  }, [dateOffsetDays, todayTotalTime, todayCategoryBreakdown, history, categories]);

  const [hoveredCell, setHoveredCell] = useState<{
    rowIndex: number;
    colIndex: number;
    rect: DOMRect;
  } | null>(null);

  const hoveredData = hoveredCell
    ? (grid[hoveredCell.rowIndex]?.[hoveredCell.colIndex] ?? null)
    : null;

  const handleMouseEnter = (
    e: React.MouseEvent,
    rowIndex: number,
    colIndex: number,
    level: number,
  ) => {
    if (level < 0) return; // Skip future cells
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredCell({ rowIndex, colIndex, rect });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", flex: 1, minHeight: 0 }}>
      {/* Toggle Button */}
      <button
        onClick={() => setContributionView(contributionView === "grid" ? "chart" : "grid")}
        style={{
          position: "absolute",
          top: "-22px",
          left: "-4px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "var(--text-secondary)",
          zIndex: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.6,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
        title={`Switch to ${contributionView === "grid" ? "Chart" : "Grid"} view`}
      >
        {contributionView === "grid" ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        )}
      </button>

      <div style={{ position: "relative", width: "100%", marginTop: "auto" }}>
        {/* Lưới thật (Luôn render để căng chiều cao, ẩn đi khi xem chart) */}
        <div
          className="contribution-grid"
          onMouseLeave={handleMouseLeave}
          style={{
            marginTop: 0,
            opacity: contributionView === "grid" ? 1 : 0,
            pointerEvents: contributionView === "grid" ? "auto" : "none",
            transition: "opacity 0.2s",
          }}
        >
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
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, colIndex, cell.level)}
                  >
                    {/* Cell Background */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "2px",
                        backgroundColor:
                          cell.level <= 0 ? "var(--grid-base)" : "var(--grid-active)",
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

        {hoveredCell && hoveredData && contributionView === "grid" && (
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
              {`${hoveredData.date.getDate()}/${hoveredData.date.getMonth() + 1}/${hoveredData.date.getFullYear() % 100}`}
            </div>
            <div className="tooltip-total">{hoveredData.totalHours}h</div>
            {hoveredData.breakdown.length > 0 && (
              <div className="tooltip-breakdown">
                {hoveredData.breakdown.map((b) => (
                  <div key={b.name} className="tooltip-b-item">
                    <span className="tooltip-b-hours">{b.hours}h</span>
                    <span className="tooltip-b-name">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHART đè lên trên Grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "-12px",
            width: "calc(100% + 24px)",
            opacity: contributionView === "chart" ? 1 : 0,
            pointerEvents: contributionView === "chart" ? "auto" : "none",
            transition: "opacity 0.2s",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#888"
                fontSize={9}
                tickMargin={0}
                height={15}
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 0, right: 0 }}
                tick={({ x, y, payload, index }) => {
                  let textAnchor: "middle" | "start" | "end" = "middle";
                  if (index === 0) textAnchor = "start";
                  if (index === chartData.length - 1) textAnchor = "end";
                  return (
                    <text x={x} y={Number(y) + 8} textAnchor={textAnchor} fill="#888" fontSize={9}>
                      {payload.value}
                    </text>
                  );
                }}
              />
              <YAxis hide={true} domain={[0, "dataMax"]} />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as { fullDate: string };
                    const totalHours = payload.reduce((sum, entry) => {
                      const val = Array.isArray(entry.value) ? entry.value[0] : entry.value;
                      return sum + (Number(val) || 0);
                    }, 0);

                    const dateParts = data.fullDate.split("-");
                    const dateFormatted =
                      dateParts.length === 3
                        ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].slice(-2)}`
                        : data.fullDate;

                    return (
                      <div
                        className="contribution-tooltip"
                        style={{ position: "relative", left: 0, top: 0, transform: "none" }}
                        ref={(el) => {
                          if (el && el.parentElement) {
                            requestAnimationFrame(() => {
                              const parentRect = el.parentElement!.getBoundingClientRect();
                              const windowWidth = window.innerWidth;
                              const windowHeight = window.innerHeight;
                              let shiftX = 0;
                              let shiftY = 0;
                              if (parentRect.right > windowWidth - 10) {
                                shiftX = windowWidth - 10 - parentRect.right;
                              } else if (parentRect.left < 10) {
                                shiftX = 10 - parentRect.left;
                              }
                              if (parentRect.bottom > windowHeight - 10) {
                                shiftY = windowHeight - 10 - parentRect.bottom;
                              } else if (parentRect.top < 10) {
                                shiftY = 10 - parentRect.top;
                              }
                              if (shiftX !== 0 || shiftY !== 0) {
                                el.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
                              } else {
                                el.style.transform = "none";
                              }
                            });
                          }
                        }}
                      >
                        <div className="tooltip-date">
                          {dateFormatted} ({label})
                        </div>
                        <div className="tooltip-total">{Math.round(totalHours * 10) / 10}h</div>
                        {payload.some((entry) => {
                          const val = Array.isArray(entry.value) ? entry.value[0] : entry.value;
                          return Number(val) > 0;
                        }) && (
                          <div className="tooltip-breakdown">
                            {payload.map((entry) => {
                              const val = Array.isArray(entry.value) ? entry.value[0] : entry.value;
                              if (!val || Number(val) <= 0) return null;
                              const dataKeyStr = String(entry.dataKey);
                              const cat = activeCategories.find((c) => c.id === dataKeyStr);
                              return (
                                <div key={dataKeyStr || "unknown"} className="tooltip-b-item">
                                  <span className="tooltip-b-hours">{val}h</span>
                                  <span className="tooltip-b-name" style={{ color: entry.stroke }}>
                                    {cat ? cat.name : dataKeyStr}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {activeCategories.map((cat) => (
                <Line
                  key={cat.id}
                  type="monotone"
                  dataKey={cat.id}
                  stroke={cat.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
