import { BrowserRouter, Routes, Route } from "react-router-dom"
import Sidebar   from "./components/Sidebar"
import Sentiment from "./pages/Sentiment"
import GeoMap    from "./pages/GeoMap"

function Placeholder({ title, color = "#3b82f6" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: 380, gap: 10,
      background: "#ffffff",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
    }}>
      <i className="ti ti-clock" style={{ fontSize: 28, color: "#cbd5e1" }} aria-hidden="true" />
      <p style={{ fontSize: 13, color: "#94a3b8" }}>{title} — coming soon</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main style={{
          marginLeft: 210,
          flex: 1,
          padding: "24px 28px",
          background: "#f0f4f8",
          minHeight: "100vh",
        }}>

          {/* Topbar */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 18,
            borderBottom: "1px solid #e2e8f0",
          }}>
            <div>
              <h1 style={{
                fontSize: 18, fontWeight: 700,
                color: "#0f172a", letterSpacing: -0.3,
              }}>
                Dashboard
              </h1>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                Real-time Twitter analytics pipeline
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#94a3b8",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: "6px 12px", borderRadius: 6,
            }}>
              <i className="ti ti-clock" style={{ fontSize: 13 }} aria-hidden="true" />
              Auto-refresh: 30s
            </div>
          </div>

          <Routes>
            <Route path="/"          element={<Placeholder title="Live feed"  color="#6366f1" />} />
            <Route path="/trending"  element={<Placeholder title="Trending"   color="#f59e0b" />} />
            <Route path="/sentiment" element={<Sentiment />} />
            <Route path="/map"       element={<GeoMap    />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}