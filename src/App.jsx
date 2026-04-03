import { useState } from "react"
import { CATEGORIES } from "./config"
import { useTheme } from "./ThemeContext"

export default function App() {
  const [categoryId, setCategoryId] = useState(null)
  const [appId, setAppId] = useState(null)
const { dark, setDark } = useTheme()


  // Niveau 3 — affichage d'une app
  if (categoryId && appId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    const app = cat.apps.find(a => a.id === appId)
    const Component = app.component
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setAppId(null)}
          style={backBtn}
        >
          ← {cat.label}
        </button>
        <Component onBack={() => setAppId(null)} />
      </div>
    )
  }

  // Niveau 2 — liste des apps d'une catégorie
  if (categoryId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    return (
      <div style={pageStyle}>
        <button onClick={() => setCategoryId(null)} style={backBtn}>
          ← Accueil
        </button>
        <div style={headerStyle}>
          <span style={{ fontSize: 40 }}>{cat.emoji}</span>
          <h1 style={h1Style}>{cat.label}</h1>
          <p style={subtitleStyle}>{cat.description}</p>
        </div>
        <div style={gridStyle}>
          {cat.apps.map(app => (
            <AppCard
              key={app.id}
              item={app}
              accent={cat.color}
              onClick={() => setAppId(app.id)}
            />
          ))}
        </div>
      </div>
    )
  }

  // Niveau 1 — choix de la catégorie
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={h1Style}>Simulations MDC</h1>
        <p style={subtitleStyle}>BTS Métiers de la Chimie</p>
        <button
  onClick={() => setDark(d => !d)}
  style={{
    marginTop: 16,
    padding: "6px 14px",
    borderRadius: 20,
    border: `1px solid var(--border)`,
    background: "var(--bg-card)",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  }}
>
  {dark ? "☀️ Mode clair" : "🌙 Mode sombre"}
</button>
      </div>
      <div style={gridStyle}>
        {CATEGORIES.map(cat => (
          <AppCard
            key={cat.id}
            item={cat}
            accent={cat.color}
            onClick={() => setCategoryId(cat.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Carte réutilisable ────────────────────────────────────────────────────────
function AppCard({ item, accent, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 240,
        padding: "28px 24px",
        borderRadius: 14,
        border: `2px solid ${hovered ? accent : "var(--border)"}`,
        background: hovered ? `${accent}18` : "var(--bg-card)",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: hovered ? `0 8px 24px ${accent}22` : "var(--shadow)",
        transition: "all 0.18s ease",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{item.emoji}</div>
      <div style={{
        fontSize: 15, fontWeight: 700, marginBottom: 6,
        color: "var(--text)",
        fontFamily: "system-ui, sans-serif"
      }}>
        {item.label}
      </div>
      <div style={{
        fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
        fontFamily: "system-ui, sans-serif"
      }}>
        {item.description}
      </div>
    </button>
  )
}

// ── Styles partagés ───────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  display: "flex", flexDirection: "column",
  alignItems: "center",
  background: "var(--bg)",
  fontFamily: "system-ui, sans-serif",
  padding: "2rem",
  paddingTop: "3rem",
}

const headerStyle = {
  textAlign: "center",
  marginBottom: 40,
}

const h1Style = {
  fontSize: 26, fontWeight: 800,
  color: "#111", margin: "8px 0 4px",
  letterSpacing: "-0.02em",
}

const subtitleStyle = {
  fontSize: 14, color: "#666", margin: 0,
}

const gridStyle = {
  display: "flex", gap: 20,
  flexWrap: "wrap", justifyContent: "center",
}

const backBtn = {
  position: "fixed", top: 12, left: 12, zIndex: 9999,
  fontSize: 11, fontWeight: 700, padding: "5px 11px",
  border: "1px solid #ddd", borderRadius: 8, cursor: "pointer",
  background: "#fff", color: "#666",
  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
}