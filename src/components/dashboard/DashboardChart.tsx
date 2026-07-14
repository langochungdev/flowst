import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { usePomodoroStore } from "../../stores/pomodoroStore";
import { getLocalDateString } from "../../utils/date";
import { getMockedDate } from "../../stores/debugStore";

export default function DashboardChart({
  selectedCategories,
  timeFilter,
  customDays,
}: {
  selectedCategories: string[];
  timeFilter: string;
  customDays: number | string;
}) {
  const history = usePomodoroStore((state) => state.history);
  const categories = usePomodoroStore((state) => state.categories);
  const todayCategoryBreakdown = usePomodoroStore((state) => state.todayCategoryBreakdown);

  const { data, activeCategories } = useMemo(() => {
    const today = getMockedDate();
    let startDate = getMockedDate();
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
          const compareDate = today < endOfYear ? today : endOfYear;
          numDays =
            Math.ceil((compareDate.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
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

    startDate = new Date(anchorDate);
    startDate.setDate(anchorDate.getDate() - numDays + 1);

    const chartData: Record<string, number | string>[] = [];
    const catMap = new Map<string, { name: string; color: string }>();

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = getLocalDateString(d);
      const isToday = dateStr === getLocalDateString(today);

      const point: Record<string, number | string> = {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDate: dateStr,
      };

      if (isToday) {
        Object.entries(todayCategoryBreakdown).forEach(([catId, minutes]) => {
          if (!selectedCategories.includes(catId)) return;
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
          if (!selectedCategories.includes(catId)) return;
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

      chartData.push(point);
    }

    const activeCatArr = Array.from(catMap.entries()).map(([id, val]) => ({ id, ...val }));

    // Fill missing data points with 0 ONLY for days after the category's first appearance
    const catFirstIndex = new Map<string, number>();
    chartData.forEach((point, index) => {
      activeCatArr.forEach((cat) => {
        if ((point[cat.id] as number) > 0 && !catFirstIndex.has(cat.id)) {
          catFirstIndex.set(cat.id, index);
        }
      });
    });

    chartData.forEach((point, index) => {
      activeCatArr.forEach((cat) => {
        const firstIdx = catFirstIndex.get(cat.id);
        if (firstIdx !== undefined && index >= firstIdx) {
          if (point[cat.id] === undefined) {
            point[cat.id] = 0;
          }
        }
      });
    });

    return { data: chartData, activeCategories: activeCatArr };
  }, [timeFilter, customDays, history, todayCategoryBreakdown, categories, selectedCategories]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-glass)",
        padding: "16px",
        border: "1px solid var(--glass-border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px" }}>Trend Overview</h3>
      </div>

      <div style={{ flex: 1, minHeight: 0, marginTop: "12px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#888"
              fontSize={12}
              tickMargin={6}
              minTickGap={15}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => `${val}h`} />
            <Tooltip
              contentStyle={{
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "6px 10px",
              }}
              itemStyle={{ color: "#000", padding: "2px 0" }}
              formatter={(
                value: number | string | readonly (number | string)[] | undefined,
                name: string | number | undefined,
              ) => {
                const cat = activeCategories.find((c) => c.id === String(name));
                return [`${value || 0}h`, cat ? cat.name : String(name)] as any;
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
