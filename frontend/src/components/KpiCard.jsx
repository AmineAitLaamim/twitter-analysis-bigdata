export default function KpiCard({ label, value, sub, color = "#3b82f6", icon }) {
  return (
    <div className="hover-lift" style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderTop: `2px solid ${color}`,
      borderRadius: 8,
      padding: "14px 16px",
      flex: "1 1 150px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10,
      }}>
        <span style={{
          fontSize: 9, color: "#94a3b8",
          fontWeight: 700, letterSpacing: 0.8,
        }}>
          {label}
        </span>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: color + "12",
          display: "flex", alignItems: "center",
          justifyContent: "center", color: color,
          fontSize: 14,
        }}>
          <i className={`ti ${icon}`} aria-hidden="true" />
        </div>
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: "#0f172a", letterSpacing: -0.5, lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: color, marginTop: 5, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  )
}