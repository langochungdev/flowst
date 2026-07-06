import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mon", focus: 120 },
  { name: "Tue", focus: 150 },
  { name: "Wed", focus: 90 },
  { name: "Thu", focus: 200 },
  { name: "Fri", focus: 180 },
  { name: "Sat", focus: 60 },
  { name: "Sun", focus: 45 },
];

export default function Dashboard() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        marginTop: "2rem",
        padding: "1rem",
        background: "var(--glass-bg)",
        borderRadius: "16px",
        border: "1px solid var(--glass-border)",
      }}
    >
      <h3 style={{ marginBottom: "1rem", textAlign: "center" }}>Weekly Focus Time (Mins)</h3>
      <div style={{ height: "200px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "none", borderRadius: "8px" }}
            />
            <Bar dataKey="focus" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
