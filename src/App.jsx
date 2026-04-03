import { useState, useRef, useEffect, useCallback } from "react"
import { CATEGORIES } from "./config"
import { useTheme } from "./ThemeContext"

// ── Hook : détection mobile (< 768px) ────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}

// ── Icône hamburger / croix ───────────────────────────────────────────────────
function HamburgerIcon({ open }) {
  const base = {
    display: "block",
    width: 22,
    height: 2,
    background: "var(--text)",
    borderRadius: 2,
    transition: "transform 0.25s, opacity 0.2s",
    transformOrigin: "center",
  }
  return (
    <div style={{ width: 22, height: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <span style={{ ...base, transform: open ? "translateY(7px) rotate(45deg)" : "none" }} />
      <span style={{ ...base, opacity: open ? 0 : 1 }} />
      <span style={{ ...base, transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }} />
    </div>
  )
}

// ── Barre de navigation ───────────────────────────────────────────────────────
function TopNav({ categoryId, appId, setCategoryId, setAppId, dark, setDark }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(null)
  const navRef = useRef(null)
  const isMobile = useIsMobile()

  // Fermer dropdown desktop au clic dehors
  useEffect(() => {
    function handleClick(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Fermer le drawer au passage desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  // Bloquer le scroll body quand drawer ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const goTo = useCallback((catId, appIdVal) => {
    setCategoryId(catId)
    setAppId(appIdVal)
    setOpenMenu(null)
    setMobileOpen(false)
    setMobileExpanded(null)
  }, [setCategoryId, setAppId])

  return (
    <>
      <nav
        ref={navRef}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 52,
        }}
      >
        {/* Logo */}
        <button
          onClick={() => goTo(null, null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 14px 0 0",
            marginRight: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRight: "1px solid var(--border)",
            height: "100%",
            color: "var(--text)",
            fontWeight: 800,
            fontSize: isMobile ? 13 : 15,
            letterSpacing: "-0.02em",
            flexShrink: 0,
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          🧪 <span>Simulations MDC</span>
        </button>

        {/* ── DESKTOP : menus catégories ── */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%" }}>
            {CATEGORIES.map(cat => {
              const isOpen = openMenu === cat.id
              const isCatActive = categoryId === cat.id
              return (
                <div key={cat.id} style={{ position: "relative", height: "100%" }}>
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : cat.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      height: "100%",
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: isCatActive ? 700 : 500,
                      color: isCatActive ? cat.color : "var(--text)",
                      borderBottom: isCatActive ? `2px solid ${cat.color}` : "2px solid transparent",
                      transition: "color 0.15s",
                      whiteSpace: "nowrap",
                      fontFamily: "system-ui, sans-serif",
                    }}
                    onMouseEnter={e => { if (!isCatActive) e.currentTarget.style.color = cat.color }}
                    onMouseLeave={e => { if (!isCatActive) e.currentTarget.style.color = "var(--text)" }}
                  >
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    {cat.label}
                    <span style={{
                      fontSize: 9, marginLeft: 2, opacity: 0.5,
                      display: "inline-block",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}>▾</span>
                  </button>

                  {/* Dropdown desktop */}
                  {isOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 1px)",
                      left: 0,
                      minWidth: 230,
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0 0 12px 12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
                      overflow: "hidden",
                      zIndex: 1001,
                    }}>
                      <div style={{
                        padding: "10px 14px 8px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: cat.color, fontFamily: "system-ui, sans-serif" }}>{cat.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "system-ui, sans-serif" }}>{cat.description}</div>
                        </div>
                      </div>
                      {cat.apps.map(app => {
                        const isActive = categoryId === cat.id && appId === app.id
                        return (
                          <button
                            key={app.id}
                            onClick={() => goTo(cat.id, app.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              width: "100%", padding: "9px 14px",
                              background: isActive ? `${cat.color}12` : "none",
                              border: "none",
                              borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                              cursor: "pointer", textAlign: "left",
                              transition: "background 0.12s",
                              fontFamily: "system-ui, sans-serif",
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg)" }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none" }}
                          >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{app.emoji}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? cat.color : "var(--text)" }}>{app.label}</div>
                              {app.description && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 1 }}>{app.description}</div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Spacer mobile */}
        {isMobile && <div style={{ flex: 1 }} />}

        {/* Bouton thème */}
        <button
          onClick={() => setDark(d => !d)}
          style={{
            padding: "5px 10px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
            marginLeft: isMobile ? 8 : 12,
          }}
        >
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Bouton hamburger — mobile seulement */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              marginLeft: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        )}
      </nav>

      {/* ── MOBILE : Drawer latéral ── */}
      {isMobile && (
        <>
          {/* Overlay sombre */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              top: 52,
              zIndex: 998,
              background: "rgba(0,0,0,0.35)",
              opacity: mobileOpen ? 1 : 0,
              pointerEvents: mobileOpen ? "auto" : "none",
              transition: "opacity 0.25s",
            }}
          />

          {/* Panneau drawer */}
          <div
            style={{
              position: "fixed",
              top: 52,
              right: 0,
              bottom: 0,
              zIndex: 999,
              width: "min(300px, 85vw)",
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Accueil */}
            <button
              onClick={() => goTo(null, null)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 18px",
                background: !categoryId ? "var(--bg)" : "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                borderLeft: !categoryId ? "3px solid var(--text)" : "3px solid transparent",
                cursor: "pointer", textAlign: "left",
                fontFamily: "system-ui, sans-serif",
                fontWeight: !categoryId ? 700 : 500,
                fontSize: 14,
                color: "var(--text)",
              }}
            >
              🏠 <span>Accueil</span>
            </button>

            {/* Catégories accordéon */}
            {CATEGORIES.map(cat => {
              const isExpanded = mobileExpanded === cat.id
              const isCatActive = categoryId === cat.id
              return (
                <div key={cat.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setMobileExpanded(isExpanded ? null : cat.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "13px 18px",
                      background: isCatActive && !isExpanded ? `${cat.color}10` : "none",
                      border: "none",
                      borderLeft: isCatActive ? `3px solid ${cat.color}` : "3px solid transparent",
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <span style={{
                      flex: 1, fontSize: 14, fontWeight: isCatActive ? 700 : 500,
                      color: isCatActive ? cat.color : "var(--text)",
                    }}>{cat.label}</span>
                    <span style={{
                      fontSize: 10, color: "var(--text-muted)",
                      display: "inline-block",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}>▾</span>
                  </button>

                  {/* Apps de la catégorie */}
                  {isExpanded && (
                    <div style={{ background: "var(--bg)" }}>
                      {cat.apps.map(app => {
                        const isActive = categoryId === cat.id && appId === app.id
                        return (
                          <button
                            key={app.id}
                            onClick={() => goTo(cat.id, app.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              width: "100%", padding: "10px 18px 10px 30px",
                              background: isActive ? `${cat.color}12` : "none",
                              border: "none",
                              borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                              cursor: "pointer", textAlign: "left",
                              fontFamily: "system-ui, sans-serif",
                            }}
                          >
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{app.emoji}</span>
                            <div>
                              <div style={{
                                fontSize: 13, fontWeight: isActive ? 700 : 400,
                                color: isActive ? cat.color : "var(--text)",
                              }}>{app.label}</div>
                              {app.description && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{app.description}</div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// ── Styles partagés ──────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "calc(100vh - 52px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "var(--bg)",
  fontFamily: "system-ui, sans-serif",
  padding: "clamp(1rem, 4vw, 2rem)",
  paddingTop: "clamp(1.5rem, 5vw, 3rem)",
}

const headerStyle = {
  textAlign: "center",
  marginBottom: 40,
  width: "100%",
}

const h1Style = {
  fontSize: "clamp(20px, 4vw, 26px)",
  fontWeight: 800,
  color: "var(--text)",
  margin: "8px 0 4px",
  letterSpacing: "-0.02em",
}

const subtitleStyle = {
  fontSize: "clamp(12px, 3vw, 14px)",
  color: "var(--text-muted)",
  margin: 0,
}

const gridStyle = {
  display: "flex",
  gap: "clamp(12px, 3vw, 20px)",
  flexWrap: "wrap",
  justifyContent: "center",
  width: "100%",
  maxWidth: 900,
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
        width: "clamp(150px, 42vw, 240px)",
        padding: "clamp(16px, 4vw, 28px) clamp(12px, 3vw, 24px)",
        borderRadius: 14,
        border: `2px solid ${hovered ? accent : "var(--border)"}`,
        background: hovered ? `${accent}18` : "var(--bg-card)",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: hovered ? `0 8px 24px ${accent}22` : "var(--shadow)",
        transition: "all 0.18s ease",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: "clamp(26px, 5vw, 36px)", marginBottom: 10 }}>{item.emoji}</div>
      <div style={{ fontSize: "clamp(13px, 3vw, 15px)", fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>
        {item.label}
      </div>
      <div style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color: "var(--text-muted)", lineHeight: 1.6 }}>
        {item.description}
      </div>
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function App() {
  const [categoryId, setCategoryId] = useState(null)
  const [appId, setAppId] = useState(null)
  const { dark, setDark } = useTheme()

  const nav = (
    <TopNav
      categoryId={categoryId}
      appId={appId}
      setCategoryId={setCategoryId}
      setAppId={setAppId}
      dark={dark}
      setDark={setDark}
    />
  )

  // Niveau 3 — affichage d'une app
  if (categoryId && appId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    const app = cat.apps.find(a => a.id === appId)
    const Component = app.component
    return (
      <div>
        {nav}
        <Component onBack={() => setAppId(null)} />
      </div>
    )
  }

  // Niveau 2 — liste des apps d'une catégorie
  if (categoryId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    return (
      <div>
        {nav}
        <div style={pageStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: "clamp(32px, 7vw, 40px)" }}>{cat.emoji}</span>
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
      </div>
    )
  }

  // Niveau 1 — accueil
  return (
    <div>
      {nav}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={h1Style}>Simulations MDC</h1>
          <p style={subtitleStyle}>BTS Métiers de la Chimie</p>
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
    </div>
  )
}