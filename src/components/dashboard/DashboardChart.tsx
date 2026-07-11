import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getMockedDate } from "../../stores/debugStore";

type FilterType = "7d" | "1m" | "3m" | "thisWeek" | "thisMonth" | "thisYear" | "all" | "custom";

export default function DashboardChart() {
  const [filter, setFilter] = useState<FilterType>("7d");
  const [customDays, setCustomDays] = useState<number>(14);

  const history = usePomodoroStore((state) => state.history);
  const categories = usePomodoroStore((state) => state.categories);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);

  const { data, activeCategories } = useMemo(() => {
    const today = getMockedDate();
    let startDate = getMockedDate();
    let numDays = 0;

    switch (filter) {
      case "7d": numDays = 7; break;
      case "1m": numDays = 30; break;
      case "3m": numDays = 90; break;
      case "thisWeek": numDays = today.getDay() === 0 ? 7 : today.getDay(); break;
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

    startDate.setDate(today.getDate() - numDays + 1);

    const chartData = [];
    const catMap = new Map<string, { name: string; color: string }>();

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = dateStr === today.toISOString().split("T")[0];

      const point: any = {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDate: dateStr
      };

      if (isToday) {
        Object.entries(todayCategoryBreakdown).forEach(([catId, minutes]) => {
          const hours = minutes / 60;
          if (hours > 0) {
            point[catId] = Math.round(hours * 10) / 10;
            const currentCat = categories.find(c => c.id === catId);
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
                color: dayHist.categoryColors?.[catId] || "#00F2F6"
              });
            }
          }
        });
      }

      chartData.push(point);
    }

    const activeCatArr = Array.from(catMap.entries()).map(([id, val]) => ({ id, ...val }));
    
    // Fill missing data points with 0
    chartData.forEach(point => {
      activeCatArr.forEach(cat => {
        if (point[cat.id] === undefined) {
          point[cat.id] = 0;
        }
      });
    });

    return { data: chartData, activeCategories: activeCatArr };
  }, [filter, customDays, history, todayCategoryBreakdown, categories]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-glass)", padding: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>Focus Trend</h3>
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

      <div style={{ flex: 1, minHeight: 0, marginTop: "12px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={6} minTickGap={15} padding={{ left: 10, right: 10 }} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => `${val}h`} />
            <Tooltip
              contentStyle={{ background: "#fff", color: "#000", border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: "bold", padding: "6px 10px" }}
              itemStyle={{ color: "#000", padding: "2px 0" }}
              formatter={(value: any, name: any) => {
                const cat = activeCategories.find(c => c.id === String(name));
                return [`${value}h`, cat ? cat.name : String(name)];
              }}
              labelStyle={{ color: "#555", marginBottom: "4px" }}
            />
            {activeCategories.map((cat) => (
              <Line 
                key={cat.id}
                type="monotone" 
                dataKey={cat.id} 
                stroke={cat.color} 
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
