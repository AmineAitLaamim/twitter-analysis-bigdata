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
  const { data }   = usePolling("/api/analytics/geo", 30000)
  const geoData    = data || MOCK_GEO
  const max        = Math.max(...Object.values(geoData))
  const total      = Object.values(geoData).reduce((a, b) => a + b, 0)
  const topCountry = Object.entries(geoData).sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", letterSpacing: -0.2 }}>
          Geographic activity
        </h2>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
          Tweet volume by country
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="TOTAL TWEETS"   value={total.toLocaleString("en-US")}        sub="across all regions"               color="#3b82f6" icon="ti-world"      />
        <KpiCard label="TOP COUNTRY"    value={topCountry[0]}                         sub={`${topCountry[1].toLocaleString("en-US")} tweets`} color="#f59e0b" icon="ti-star"  />
        <KpiCard label="ACTIVE REGIONS" value={Object.keys(geoData).length}          sub="countries tracked"                color="#a78bfa" icon="ti-map-pin"    />
      </div>

      {/* Map */}
      <div style={{
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