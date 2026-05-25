import { NavLink } from "react-router-dom"

const links = [
  { to: "/",          label: "Live feed",      icon: "ti-radio"        },
  { to: "/trending",  label: "Trending",       icon: "ti-trending-up"  },
  { to: "/sentiment", label: "Sentiment",      icon: "ti-mood-smile"   },
  { to: "/map",       label: "Geographic map", icon: "ti-map-2"        },
]

const activeColors = {
  "/":          "#6366f1",
  "/trending":  "#f59e0b",
  "/sentiment": "#22c55e",
  "/map":       "#3b82f6",
}

export default function Sidebar() {
  return (
    <aside style={{
      width: 210,
      minHeight: "100vh",
      background: "#ffffff",
      borderRight: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0, left: 0,
      zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{
        padding: "18px 16px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="ti ti-brand-twitter" style={{ fontSize: 16, color: "#3b82f6" }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", letterSpacing: -0.2 }}>
            Tweet Analytics
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
            Big Data Pipeline
          </div>
        </div>
      </div>

      {/* Section */}
      <div style={{
        fontSize: 9, color: "#94a3b8", fontWeight: 700,
        letterSpacing: 1.2, padding: "14px 16px 6px",
      }}>
        ANALYTICS
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", padding: "0 8px", gap: 1 }}>
        {links.map(({ to, label, icon }) => {
          const color = activeColors[to]
          return (
            <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 6,
              fontSize: 12, fontWeight: isActive ? 600 : 400,
              color:      isActive ? color : "#64748b",
              background: isActive ? color + "12" : "transparent",
              borderLeft: `2px solid ${isActive ? color : "transparent"}`,
              transition: "all 0.12s",
            })}>
              <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: "14px 12px 16px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 10px", borderRadius: 6,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#22c55e", flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 500 }}>
            Connected — 30s refresh
          </span>
        </div>
      </div>
    </aside>
  )
}