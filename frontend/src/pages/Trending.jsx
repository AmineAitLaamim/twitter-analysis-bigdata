import { useState } from "react"
import { usePolling } from "../hooks/usePolling"
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell 
} from "recharts"

export default function Trending() {
  const { data: rawData, loading } = usePolling("/api/hashtags/trending", 15000)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState(null)

  const data = rawData || []

  // Precalculated metrics
  const totalVolume = data.reduce((acc, curr) => acc + curr.count, 0)
  const maxVolume = data.length > 0 ? Math.max(...data.map(d => d.count)) : 0
  const topHashtag = data.length > 0 ? data[0].hashtag : "N/A"
  const topHashtagCount = data.length > 0 ? data[0].count : 0

  // Filter trends list by search
  const filteredData = data.filter(d => 
    d.hashtag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "rgba(15, 23, 42, 0.96)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 8,
          padding: "10px 14px",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
          color: "#ffffff"
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", margin: 0 }}>
            {payload[0].payload.hashtag}
          </p>
          <p style={{ fontSize: 13, fontWeight: 800, marginTop: 4, margin: 0 }}>
            {payload[0].value.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>records</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Styles
  const container = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 8px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 20
  }

  const headerCard = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0"
  }

  const badgeStyle = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fffbeb",
    border: "1px solid #fef3c7",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 11,
    color: "#d97706",
    fontWeight: 600
  }

  const kpiRow = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16
  }

  const kpiCard = (borderColor) => ({
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    borderTop: `3px solid ${borderColor}`,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.01)"
  })

  const gridLayout = {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 20,
    alignItems: "start"
  }

  const searchInput = {
    width: "100%",
    padding: "9px 12px 9px 34px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 12,
    color: "#0f172a",
    outline: "none",
    marginBottom: 12,
    transition: "border-color 0.2s"
  }

  const listCard = {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 16,
    gridColumn: "span 4",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
    maxHeight: 520,
    display: "flex",
    flexDirection: "column"
  }

  const chartCard = {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    gridColumn: "span 8",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)"
  }

  const trendRow = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s",
    background: active ? "#f5f3ff" : "transparent",
    borderLeft: `3px solid ${active ? "#6366f1" : "transparent"}`
  })

  const rankBadge = (index) => {
    let background = "#f1f5f9"
    let color = "#475569"
    if (index === 0) {
      background = "linear-gradient(135deg, #fef3c7, #fde68a)"
      color = "#b45309"
    } else if (index === 1) {
      background = "linear-gradient(135deg, #f1f5f9, #e2e8f0)"
      color = "#475569"
    } else if (index === 2) {
      background = "linear-gradient(135deg, #ffedd5, #fed7aa)"
      color = "#c2410c"
    }
    return {
      width: 22,
      height: 22,
      borderRadius: 6,
      background,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 10
    }
  }

  // RENDER LOADING SHIMMER STATE
  if (loading && data.length === 0) {
    return (
      <div style={container} className="animate-fade-in">
        <div style={headerCard}>
          <div style={{ width: 140, height: 24, borderRadius: 4 }} className="shimmer-bg" />
          <div style={{ width: 100, height: 28, borderRadius: 20 }} className="shimmer-bg" />
        </div>
        <div style={kpiRow}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...kpiCard("#cbd5e1"), height: 80 }} className="shimmer-bg" />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
          <div style={{ ...listCard, gridColumn: "span 4", height: 400 }} className="shimmer-bg" />
          <div style={{ ...chartCard, gridColumn: "span 8", height: 400 }} className="shimmer-bg" />
        </div>
      </div>
    )
  }

  return (
    <div style={container} className="animate-fade-in">
      
      {/* 1. HEADER */}
      <div style={headerCard}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>
            Trending Hashtags
          </h2>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Real-time tracking of topic volume metrics
          </p>
        </div>
        <div style={badgeStyle}>
          <i className="ti ti-bolt" aria-hidden="true" />
          <span>REALTIME VELOCITY</span>
        </div>
      </div>

      {/* 2. KPI METRICS SUMMARY ROW */}
      <div style={kpiRow}>
        {/* KPI 1 */}
        <div style={kpiCard("#6366f1")}>
          <div>
            <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
              HOTTEST TOPIC
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
              {topHashtag}
            </h3>
            <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 500, marginTop: 4, display: "inline-block" }}>
              {topHashtagCount.toLocaleString()} records
            </span>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: "rgba(99, 102, 241, 0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1"
          }}>
            <i className="ti ti-pulse" style={{ fontSize: 18 }} aria-hidden="true" />
          </div>
        </div>

        {/* KPI 2 */}
        <div style={kpiCard("#10b981")}>
          <div>
            <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
              TOTAL VOLUME
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
              {totalVolume.toLocaleString()}
            </h3>
            <span style={{ fontSize: 10, color: "#10b981", fontWeight: 500, marginTop: 4, display: "inline-block" }}>
              across all active tags
            </span>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: "rgba(16, 185, 129, 0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981"
          }}>
            <i className="ti ti-layout-grid3" style={{ fontSize: 16 }} aria-hidden="true" />
          </div>
        </div>

        {/* KPI 3 */}
        <div style={kpiCard("#f59e0b")}>
          <div>
            <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
              TOPICS TRACKED
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
              {data.length}
            </h3>
            <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 500, marginTop: 4, display: "inline-block" }}>
              active streaming subjects
            </span>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: "rgba(245, 158, 11, 0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b"
          }}>
            <i className="ti ti-tag" style={{ fontSize: 16 }} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* 3. DOUBLE-COLUMN ANALYTICS VIEW */}
      <div style={gridLayout}>
        
        {/* LEFT COLUMN: RANKED LEADERBOARD */}
        <div style={listCard}>
          <div style={{ position: "relative" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 11, color: "#94a3b8", fontSize: 12 }} aria-hidden="true" />
            <input
              style={searchInput}
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: 3, paddingRight: 4 }}>
            {filteredData.length > 0 ? (
              filteredData.map((d, index) => {
                const globalIndex = data.findIndex(item => item.hashtag === d.hashtag)
                const active = selectedTag === d.hashtag
                const relativeWidth = maxVolume > 0 ? `${(d.count / maxVolume) * 100}%` : "0%"

                return (
                  <div 
                    key={d.hashtag} 
                    style={trendRow(active)}
                    onClick={() => setSelectedTag(active ? null : d.hashtag)}
                    className="hover-lift"
                  >
                    <div style={rankBadge(globalIndex)}>
                      {globalIndex + 1}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                          {d.hashtag}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>
                          {d.count.toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Trend Progress Bar */}
                      <div style={{ height: 4, width: "100%", background: "#f1f5f9", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                        <div style={{ 
                          height: "100%", 
                          width: relativeWidth, 
                          background: globalIndex === 0 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" : "linear-gradient(90deg, #818cf8, #6366f1)",
                          borderRadius: 2
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                No hashtags match "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUALIZATION CHART */}
        <div style={chartCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8 }}>
                VOLUME DISTRIBUTION
              </span>
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Ingested record quantities per tracked hashtag
              </p>
            </div>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                style={{
                  background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6,
                  fontSize: 10, fontWeight: 600, padding: "5px 10px", color: "#64748b",
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                Clear Selection
              </button>
            )}
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <BarChart 
              data={filteredData} 
              layout="vertical"
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              {/* Define modern custom gradients */}
              <defs>
                <linearGradient id="normalGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="highlightGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="selectedGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              
              <XAxis 
                type="number" 
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              
              <YAxis 
                type="category" 
                dataKey="hashtag" 
                width={100} 
                tick={({ x, y, payload }) => {
                  const active = selectedTag === payload.value
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      dy={4}
                      fill={active ? "#8b5cf6" : "#64748b"} 
                      fontSize={11} 
                      fontWeight={active ? 700 : 500}
                      textAnchor="end"
                    >
                      {payload.value}
                    </text>
                  )
                }}
                axisLine={false}
                tickLine={false}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.5)" }} />
              
              <Bar 
                dataKey="count" 
                radius={[0, 8, 8, 0]}
                barSize={16}
              >
                {filteredData.map((entry) => {
                  let fill = "url(#normalGrad)"
                  if (entry.hashtag === selectedTag) {
                    fill = "url(#selectedGrad)"
                  } else if (entry.hashtag === topHashtag) {
                    fill = "url(#highlightGrad)"
                  }
                  return <Cell key={entry.hashtag} fill={fill} style={{ cursor: "pointer" }} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  )
}