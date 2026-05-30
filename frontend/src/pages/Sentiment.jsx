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
  const { data: current, error: currentError, loading: currentLoading } = usePolling("/api/analytics/sentiment", 30000)
  const { data: timeline, error: timelineError, loading: timelineLoading } = usePolling("/api/analytics/sentiment/timeline", 60000)

  const isOffline = !!(currentError || timelineError)
  const isDbEmpty = current && (current.positive + current.neutral + current.negative === 0)
  const useMock = isOffline || isDbEmpty || currentLoading || !current

  const pieData  = useMock ? MOCK_CURRENT : (current || MOCK_CURRENT)
  const lineData = useMock ? MOCK_TIMELINE : (timeline || MOCK_TIMELINE)
  const total    = pieData.positive + pieData.neutral + pieData.negative
  const score    = total > 0 ? Math.round((pieData.positive / total) * 100) : 0

  const chartPie = [
    { name: "Positive", value: pieData.positive },
    { name: "Neutral",  value: pieData.neutral  },
    { name: "Negative", value: pieData.negative },
  ]

  // Beautiful formatting for timeline hours
  const formattedLineData = lineData.map(item => {
    if (typeof item.hour === 'string' && item.hour.length === 10) {
      // e.g. "2026052911" -> "11h" (only show the hour for cleaner graphs)
      const hourPart = item.hour.substring(8, 10);
      return { ...item, hour: `${hourPart}h` };
    }
    return item;
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>
            Sentiment analysis
          </h2>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
            Real-time tweet sentiment classification
          </p>
        </div>
        <div>
          {isOffline ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 600, color: "#ea580c",
              background: "#ffedd5", border: "1px solid #fed7aa",
              padding: "4px 10px", borderRadius: 20
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ea580c" }} />
              Demo Mode (Database Offline)
            </span>
          ) : isDbEmpty ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 600, color: "#0284c7",
              background: "#e0f2fe", border: "1px solid #bae6fd",
              padding: "4px 10px", borderRadius: 20
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7" }} />
              Demo Mode (Database Empty)
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 600, color: "#16a34a",
              background: "#dcfce7", border: "1px solid #bbf7d0",
              padding: "4px 10px", borderRadius: 20
            }}>
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              Live Database Connected
            </span>
          )}
        </div>
      </div>

      {/* Info Alert Banner */}
      {useMock && (
        <div className="animate-fade-in" style={{
          display: "flex", alignItems: "start", gap: 10,
          background: isOffline ? "#fff7ed" : "#f0f9ff",
          border: `1px solid ${isOffline ? "#ffedd5" : "#e0f2fe"}`,
          borderRadius: 8, padding: "12px 16px", marginBottom: 18
        }}>
          <i className={`ti ${isOffline ? "ti-alert-triangle" : "ti-info-circle"}`} style={{
            fontSize: 16, color: isOffline ? "#ea580c" : "#0284c7", marginTop: 2
          }} />
          <div>
            <h4 style={{
              fontSize: 12, fontWeight: 600,
              color: isOffline ? "#c2410c" : "#0369a1", marginBottom: 2
            }}>
              {isOffline ? "HBase Connection Offline" : "Database Connected But Empty"}
            </h4>
            <p style={{ fontSize: 11, color: isOffline ? "#9a3412" : "#075985", lineHeight: 1.4 }}>
              {isOffline 
                ? "FastAPI API could not connect to HBase (make sure the HBase docker container is running). Displaying simulated database metrics as a preview."
                : "HBase is connected successfully, but no records have been processed. Run the tweet simulator and the Spark streaming engine to populate the database. Displaying simulated metrics as a preview."}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="TOTAL ANALYZED" value={total.toLocaleString("en-US")} sub="tweets this session" color="#3b82f6" icon="ti-database"       />
        <KpiCard label="POSITIVE SCORE" value={`${score}%`}                   sub="above average"       color="#22c55e" icon="ti-arrow-up-right" />
        <KpiCard label="NEUTRAL"        value={pieData.neutral.toLocaleString("en-US")}               sub="tweets"              color="#94a3b8" icon="ti-minus"          />
        <KpiCard label="NEGATIVE"       value={pieData.negative.toLocaleString("en-US")}              sub="tweets"              color="#ef4444" icon="ti-arrow-down-right"/>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div className="hover-lift" style={card}>
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

        <div className="hover-lift" style={card}>
          <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            TREND — LAST 24H
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={formattedLineData}>
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