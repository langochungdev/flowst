import { useMemo, useState } from "react";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getMockedDate } from "../../stores/debugStore";

type FilterType = "7d" | "1m" | "3m" | "thisWeek" | "thisMonth" | "thisYear" | "all" | "custom";

export default function DashboardStats() {
  const [filter, setFilter] = useState<FilterType>("7d");
  const [customDays, setCustomDays] = useState<number>(14);

  const categories = usePomodoroStore((state) => state.categories);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);
  const history = usePomodoroStore((state) => state.history);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);

  const stats = useMemo(() => {
    const today = getMockedDate();
    let numDays = 0;

    switch (filter) {
      case "7d": numDays = 7; break;
      case "1m": numDays = 30; break;
      case "3m": numDays = 90; break;
      case "thisWeek":
        const day = today.getDay();
        numDays = day === 0 ? 7 : day;
        break;
      case "thisMonth": numDays = today.getDate(); break;
      case "thisYear":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        numDays = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
        break;
      case "custom": numDays = customDays || 1; break;
      case "all":
        const keys = Object.keys(history || {});
        if (keys.length > 0) {
          const earliest = new Date(keys.sort()[0]);
          numDays = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 3600 * 24)) + 1;
        } else {
          numDays = 1;
        }
        break;
    }

    let totalHours = 0;
    const breakdown: Record<string, number> = {};
    
    // Always include today if within the range
    if (numDays > 0) {
      totalHours += todayTotalTime / 60;
      if (todayCategoryBreakdown) {
        for (const [catId, mins] of Object.entries(todayCategoryBreakdown)) {
          breakdown[catId] = (breakdown[catId] || 0) + (mins / 60);
        }
      }
    }

    // Include history days
    for (let i = 1; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (history && history[dateStr]) {
        totalHours += history[dateStr].totalHours;
        const hdBreakdown = history[dateStr].breakdown;
        if (hdBreakdown) {
          for (const [catId, hours] of Object.entries(hdBreakdown)) {
            breakdown[catId] = (breakdown[catId] || 0) + hours;
          }
        }
      }
    }

    const breakdownList = Object.entries(breakdown)
      .map(([catId, hours]) => {
        const cat = categories.find((c) => c.id === catId);
        return { name: cat ? cat.name : catId, color: cat ? cat.color : "#888", hours: Math.round(hours * 10) / 10 };
      })
      .filter(b => b.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      days: numDays,
      breakdownList
    };
  }, [filter, customDays, history, todayTotalTime, todayCategoryBreakdown, categories]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-glass)", padding: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>Total Stats</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {filter === "custom" && (
            <input
              type="number"
              value={customDays}
              onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: "45px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "14px" }}
              min={1}
            />
          )}
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as FilterType)}
            style={{ background: "#222", color: "#fff", border: "1px solid #444", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}
          >
            <option value="7d">7 days</option>
            <option value="1m">1 month</option>
            <option value="3m">3 months</option>
            <option value="thisWeek">This week</option>
            <option value="thisMonth">This month</option>
            <option value="thisYear">This year</option>
            <option value="all">All time</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>Total Focus Time</span>
          <span style={{ fontSize: "64px", fontWeight: "bold", color: "#00F2F6", lineHeight: "1" }}>{stats.totalHours}</span>
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Hours in {stats.days} days</span>
        </div>

        {stats.breakdownList.length > 0 && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", borderBottom: "1px solid #333", paddingBottom: "4px", marginBottom: "6px" }}>
              By Category
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", justifyContent: "center" }}>
              {stats.breakdownList.map(b => (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: b.color }} />
                  <span style={{ color: "var(--text-secondary)" }}>{b.name}:</span>
                  <span style={{ fontWeight: "bold" }}>{b.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
