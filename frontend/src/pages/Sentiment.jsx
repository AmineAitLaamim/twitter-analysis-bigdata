import { usePolling } from "../hooks/usePolling"
import KpiCard        from "../components/KpiCard"
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const MOCK_CURRENT  = { positive: 540, neutral: 310, negative: 150 }
const MOCK_TIMELINE = Array.from({ length: 24 }, (_, i) => ({
  hour:     `${i}h`,
  positive: Math.floor(Math.random() * 300 + 200),
  neutral:  Math.floor(Math.random() * 200 + 100),
  negative: Math.floor(Math.random() * 100 + 50),
}))

const PIE_COLORS = ["#22c55e", "#94a3b8", "#ef4444"]

const card = {
  background: "#ffffff",
  borderRadius: 8,
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
}

const tooltip = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    color: "#0f172a",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  }
}

export default function Sentiment() {
  const { data: current  } = usePolling("/api/analytics/sentiment",          30000)
  const { data: timeline } = usePolling("/api/analytics/sentiment/timeline", 60000)

  const pieData  = current  || MOCK_CURRENT
  const lineData = timeline || MOCK_TIMELINE
  const total    = pieData.positive + pieData.neutral + pieData.negative
  const score    = total > 0 ? Math.round((pieData.positive / total) * 100) : 0

  const chartPie = [
    { name: "Positive", value: pieData.positive },
    { name: "Neutral",  value: pieData.neutral  },
    { name: "Negative", value: pieData.negative },
  ]

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", letterSpacing: -0.2 }}>
          Sentiment analysis
        </h2>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
          Real-time tweet sentiment classification
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="TOTAL ANALYZED" value={total.toLocaleString("en-US")} sub="tweets this session" color="#3b82f6" icon="ti-database"       />
        <KpiCard label="POSITIVE SCORE" value={`${score}%`}                   sub="above average"       color="#22c55e" icon="ti-arrow-up-right" />
        <KpiCard label="NEUTRAL"        value={pieData.neutral}               sub="tweets"              color="#94a3b8" icon="ti-minus"          />
        <KpiCard label="NEGATIVE"       value={pieData.negative}              sub="tweets"              color="#ef4444" icon="ti-arrow-down-right"/>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={card}>
          <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            CURRENT DISTRIBUTION
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartPie} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" innerRadius={55} outerRadius={88}>
                {chartPie.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip {...tooltip} />
              <Legend
                iconType="circle" iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#64748b" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            TREND — LAST 24H
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <XAxis dataKey="hour"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip {...tooltip} />
              <Legend iconType="circle" iconSize={7}
                      wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              <Line type="monotone" dataKey="positive" stroke="#22c55e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="neutral"  stroke="#94a3b8" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="negative" stroke="#ef4444" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}