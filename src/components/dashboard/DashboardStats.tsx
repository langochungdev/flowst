import { useMemo } from "react";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getLocalDateString } from "../../utils/date";
import { getMockedDate } from "../../stores/debugStore";

export default function DashboardStats({
  selectedCategories,
  timeFilter,
  customDays,
}: {
  selectedCategories: string[];
  timeFilter: string;
  customDays: number | string;
}) {
  const categories = usePomodoroStore((state) => state.categories);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
  const history = usePomodoroStore((state) => state.history);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);

  const stats = useMemo(() => {
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
        const day = today.getDay();
        numDays = day === 0 ? 7 : day;
        break;
      case "thisMonth":
        numDays = today.getDate();
        break;
      case "thisYear":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        numDays = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
        break;
      case "custom":
        numDays = Number(customDays) || 1;
        break;
      case "last1year":
        numDays = 365;
        break;
      case "all":
        const keys = Object.keys(history || {});
        if (keys.length > 0) {
          const earliest = new Date(keys.sort()[0]);
          numDays = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 3600 * 24)) + 1;
        } else {
          numDays = 1;
        }
        break;
      default:
        // For specific years like "2024"
        if (!isNaN(Number(timeFilter))) {
          const year = Number(timeFilter);
          const startOfYear = new Date(year, 0, 1);
          const endOfYear = new Date(year, 11, 31);
          const compareDate = today < endOfYear ? today : endOfYear;
          numDays =
            Math.ceil((compareDate.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
          // Note: for specific years we also need to adjust the today/start reference
          // Let's adjust the stats logic for specific years later in the loop if needed.
          // Or simpler: Stats just iterates from `today` backwards. For a specific year, `today` is not the right anchor.
          // Let's fix the anchor date for specific years.
        }
        break;
    }

    let totalHours = 0;
    const breakdown: Record<string, number> = {};
    const catFirstActive: Record<string, number> = {};
    let globalFirstActive = -1;

    // Determine the actual start date to count backwards from.
    // If it's a specific year (and not the current year), we count back from Dec 31 of that year.
    let anchorDate = today;
    if (!isNaN(Number(timeFilter))) {
      const year = Number(timeFilter);
      if (year !== today.getFullYear()) {
        anchorDate = new Date(year, 11, 31);
      }
    }

    // Always include anchorDate if within the range and it is today
    if (numDays > 0 && anchorDate.getTime() === today.getTime()) {
      if (todayCategoryBreakdown) {
        for (const [catId, mins] of Object.entries(todayCategoryBreakdown)) {
          if (selectedCategories.includes(catId)) {
            const hrs = mins / 60;
            breakdown[catId] = (breakdown[catId] || 0) + hrs;
            totalHours += hrs;
            if (hrs > 0) {
              catFirstActive[catId] = Math.max(catFirstActive[catId] || 0, 0);
              globalFirstActive = Math.max(globalFirstActive, 0);
            }
          }
        }
      }
    }

    // Include history days
    for (let i = anchorDate.getTime() === today.getTime() ? 1 : 0; i < numDays; i++) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      if (history && history[dateStr]) {
        const hdBreakdown = history[dateStr].breakdown;
        if (hdBreakdown) {
          for (const [catId, hours] of Object.entries(hdBreakdown)) {
            if (selectedCategories.includes(catId)) {
              breakdown[catId] = (breakdown[catId] || 0) + hours;
              totalHours += hours;
              if (hours > 0) {
                catFirstActive[catId] = Math.max(catFirstActive[catId] || 0, i);
                globalFirstActive = Math.max(globalFirstActive, i);
              }
            }
          }
        }
      }
    }

    const breakdownList = Object.entries(breakdown)
      .map(([catId, hours]) => {
        const cat = categories.find((c) => c.id === catId);
        const cDays = catFirstActive[catId] !== undefined ? catFirstActive[catId] + 1 : 0;
        return {
          name: cat ? cat.name : catId,
          color: cat ? cat.color : "#888",
          hours: Math.round(hours * 10) / 10,
          avgHours: cDays > 0 ? Math.round((hours / cDays) * 10) / 10 : 0,
        };
      })
      .filter((b) => b.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    const startDate = new Date(anchorDate);
    startDate.setDate(anchorDate.getDate() - numDays + 1);

    const formatShortDate = (d: Date) => {
      return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
    };

    const globalDays = globalFirstActive >= 0 ? globalFirstActive + 1 : 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours: globalDays > 0 ? Math.round((totalHours / globalDays) * 10) / 10 : 0,
      days: numDays,
      breakdownList,
      dateRange: `${formatShortDate(startDate)} -> ${formatShortDate(anchorDate)}`,
    };
  }, [
    timeFilter,
    customDays,
    history,
    todayTotalTime,
    todayCategoryBreakdown,
    categories,
    selectedCategories,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-glass)",
        padding: "16px",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px" }}>Total Stats</h3>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontWeight: "bold",
              background: "#111",
              padding: "2px 8px",
              borderRadius: "12px",
              border: "1px solid #222",
            }}
          >
            {stats.days} days
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontWeight: "bold",
              background: "#222",
              padding: "2px 8px",
              borderRadius: "12px",
            }}
          >
            {stats.dateRange}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>Total Focus Time</span>
          <span style={{ fontSize: "64px", fontWeight: "bold", color: "#00F2F6", lineHeight: "1" }}>
            {stats.totalHours}
          </span>
          <div style={{ display: "flex", marginTop: "4px" }}>
            <span style={{ fontSize: "14px", color: "#00F2F6", fontWeight: "bold" }}>
              ~{stats.avgHours}h / day
            </span>
          </div>
        </div>

        {stats.breakdownList.length > 0 && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                borderBottom: "1px solid #333",
                paddingBottom: "4px",
                marginBottom: "6px",
              }}
            >
              By Category
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 12px",
                justifyContent: "center",
              }}
            >
              {stats.breakdownList.map((b) => (
                <div
                  key={b.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px",
                    background: "#111",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #222",
                  }}
                >
                  <span style={{ color: b.color, fontWeight: "bold" }}>{b.name}:</span>
                  <span style={{ fontWeight: "bold" }}>{b.hours}h</span>
                  <span style={{ fontSize: "12px", color: "#888", marginLeft: "4px" }}>
                    (~{b.avgHours}h/d)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
