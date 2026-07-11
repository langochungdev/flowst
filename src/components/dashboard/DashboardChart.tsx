import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getMockedDate } from "../../stores/debugStore";

type FilterType = "7d" | "1m" | "3m" | "thisWeek" | "thisMonth" | "thisYear" | "all" | "custom";

export default function DashboardChart() {
  const [filter, setFilter] = useState<FilterType>("7d");
  const [customDays, setCustomDays] = useState<number>(14);

  const history = usePomodoroStore((state) => state.history);
  const todayTotalTime = usePomodoroStore((state) => state.todayTotalTime);

  const data = useMemo(() => {
    const today = getMockedDate();
    let startDate = getMockedDate();
    let numDays = 0;

    switch (filter) {
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
        numDays = customDays || 1;
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
    }

    startDate.setDate(today.getDate() - numDays + 1);

    const chartData = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      let hours = 0;
      if (dateStr === today.toISOString().split("T")[0]) {
        hours = todayTotalTime / 60;
      } else if (history && history[dateStr]) {
        hours = history[dateStr].totalHours;
      }

      chartData.push({
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        focus: Math.round(hours * 10) / 10,
        fullDate: dateStr
      });
    }

    return chartData;
  }, [filter, customDays, history, todayTotalTime]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-glass)", padding: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>Focus Time</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {filter === "custom" && (
            <input
              type="number"
              value={customDays}
              onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: "50px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }}
              min={1}
            />
          )}
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as FilterType)}
            style={{ background: "#222", color: "#fff", border: "1px solid #444", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}
          >
            <option value="7d">Last 7 days</option>
            <option value="1m">Last 1 month</option>
            <option value="3m">Last 3 months</option>
            <option value="thisWeek">This week</option>
            <option value="thisMonth">This month</option>
            <option value="thisYear">This year</option>
            <option value="all">All time</option>
            <option value="custom">Custom days</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#888" fontSize={10} tickMargin={5} minTickGap={20} />
            <YAxis stroke="#888" fontSize={10} tickFormatter={(val) => `${val}h`} />
            <Tooltip
              contentStyle={{ background: "#fff", color: "#000", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}
              itemStyle={{ color: "#000" }}
              formatter={(value) => [`${value}h`, "Focus"]}
              labelStyle={{ color: "#555", marginBottom: "4px" }}
            />
            <Bar dataKey="focus" fill="#00F2F6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
