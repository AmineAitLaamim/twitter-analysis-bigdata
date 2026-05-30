import { usePolling } from "../hooks/usePolling"
import KpiCard        from "../components/KpiCard"
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"

const COORDS = {
  US:[37.09,-95.71], UK:[55.37,-3.43],  FR:[46.22,2.21],
  MA:[31.79,-7.09],  JP:[36.20,138.25], BR:[-14.23,-51.92],
  DE:[51.16,10.45],  IN:[20.59,78.96],  CA:[56.13,-106.34],
  AU:[-25.27,133.77]
}

const MOCK_GEO = {
  US:4200, UK:1800, FR:1500, MA:900,
  JP:2100, BR:1200, DE:1100, IN:3000, CA:800, AU:700
}

export default function GeoMap() {
  const { data, error, loading } = usePolling("/api/analytics/geo", 30000)

  const isOffline = !!error
  const isDbEmpty = data && Object.keys(data).length === 0
  const useMock = isOffline || isDbEmpty || loading || !data

  const geoData = useMock ? MOCK_GEO : data

  const keys = Object.keys(geoData)
  const values = Object.values(geoData)
  const max = values.length > 0 ? Math.max(...values) : 1
  const total = values.reduce((a, b) => a + b, 0)
  const sortedEntries = Object.entries(geoData).sort((a, b) => b[1] - a[1])
  const topCountry = sortedEntries.length > 0 ? sortedEntries[0] : ["N/A", 0]

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>
            Geographic activity
          </h2>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
            Tweet volume by country
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
                ? "FastAPI API could not connect to HBase. Displaying simulated metrics as a preview."
                : "HBase is connected but no records yet. Displaying simulated metrics as a preview."}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="TOTAL TWEETS"   value={total.toLocaleString("en-US")} sub="across all regions"                          color="#3b82f6" icon="ti-world"   />
        <KpiCard label="TOP COUNTRY"    value={topCountry[0]}                  sub={`${topCountry[1].toLocaleString("en-US")} tweets`} color="#f59e0b" icon="ti-star"    />
        <KpiCard label="ACTIVE REGIONS" value={keys.length}                    sub="countries tracked"                           color="#a78bfa" icon="ti-map-pin" />
      </div>

      <div className="hover-lift" style={{
        borderRadius: 8, overflow: "hidden",
        border: "1px solid #e2e8f0",
        height: "clamp(320px, 46vw, 480px)",
      }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          {Object.entries(geoData).map(([country, count]) => {
            const coords = COORDS[country]
            if (!coords) return null
            return (
              <CircleMarker key={country} center={coords}
                radius={10 + (count / max) * 28}
                fillColor="#3b82f6"
                fillOpacity={0.5}
                color="#2563eb"
                weight={1.5}
              >
                <Tooltip>
                  <strong>{country}</strong>: {count.toLocaleString("en-US")} tweets
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}