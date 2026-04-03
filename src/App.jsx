import { useState, useRef, useEffect, useCallback } from "react"
import { CATEGORIES } from "./config"
import { useTheme } from "./ThemeContext"

/* ─────────────────────────────────────────────────────────────────────────────
   Hook : détection mobile < 768 px
───────────────────────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const h = e => setIsMobile(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])
  return isMobile
}

/* ─────────────────────────────────────────────────────────────────────────────
   Icône hamburger / croix animée
───────────────────────────────────────────────────────────────────────────── */
function HamburgerIcon({ open }) {
  return (
    <div className="flex flex-col justify-between w-[22px] h-[16px]">
      <span
        className="block h-[2px] rounded-sm transition-transform duration-250 origin-center"
        style={{
          background: "var(--text)",
          transform: open ? "translateY(7px) rotate(45deg)" : "none",
        }}
      />
      <span
        className="block h-[2px] rounded-sm transition-opacity duration-200"
        style={{ background: "var(--text)", opacity: open ? 0 : 1 }}
      />
      <span
        className="block h-[2px] rounded-sm transition-transform duration-250 origin-center"
        style={{
          background: "var(--text)",
          transform: open ? "translateY(-7px) rotate(-45deg)" : "none",
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Barre de navigation
───────────────────────────────────────────────────────────────────────────── */
function TopNav({ categoryId, appId, setCategoryId, setAppId, dark, setDark }) {
  const [openMenu, setOpenMenu]             = useState(null)
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(null)
  const navRef   = useRef(null)
  const isMobile = useIsMobile()

  /* Fermer dropdown desktop au clic dehors */
  useEffect(() => {
    const h = e => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  /* Fermer drawer au passage desktop */
  useEffect(() => { if (!isMobile) setMobileOpen(false) }, [isMobile])

  /* Bloquer scroll body quand drawer ouvert */
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
      {/* ── Barre principale ── */}
      <nav
        ref={navRef}
        className="sticky top-0 z-50 flex items-center h-13 px-4"
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => goTo(null, null)}
          className="flex items-center gap-2 h-full pr-4 mr-2 shrink-0 font-extrabold tracking-tight cursor-pointer border-0 bg-transparent whitespace-nowrap"
          style={{
            fontSize: isMobile ? 13 : 15,
            color: "var(--text)",
            borderRight: "1px solid var(--border)",
          }}
        >
          🧪 <span>Simulations MDC</span>
        </button>

        {/* ── DESKTOP : catégories ── */}
        {!isMobile && (
          <div className="flex items-center flex-1 h-full">
            {CATEGORIES.map(cat => {
              const isOpen      = openMenu === cat.id
              const isCatActive = categoryId === cat.id
              return (
                <div key={cat.id} className="relative h-full">
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : cat.id)}
                    onMouseEnter={e => { if (!isCatActive) e.currentTarget.style.color = cat.color }}
                    onMouseLeave={e => { if (!isCatActive) e.currentTarget.style.color = "var(--text)" }}
                    className="flex items-center gap-1.5 h-full px-4 text-[13px] whitespace-nowrap border-0 bg-transparent cursor-pointer transition-colors duration-150"
                    style={{
                      fontWeight: isCatActive ? 700 : 500,
                      color: isCatActive ? cat.color : "var(--text)",
                      borderBottom: isCatActive ? `2px solid ${cat.color}` : "2px solid transparent",
                    }}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    {cat.label}
                    <span
                      className="text-[9px] ml-0.5 opacity-50 inline-block transition-transform duration-200"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                    >▾</span>
                  </button>

                  {/* Dropdown */}
                  {isOpen && (
                    <div
                      className="absolute top-[calc(100%+1px)] left-0 min-w-[230px] z-[60] overflow-hidden"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0 0 12px 12px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
                      }}
                    >
                      {/* En-tête catégorie */}
                      <div
                        className="flex items-center gap-2 px-3.5 pt-2.5 pb-2"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="text-[12px] font-bold m-0" style={{ color: cat.color }}>{cat.label}</p>
                          <p className="text-[10px] m-0" style={{ color: "var(--text-muted)" }}>{cat.description}</p>
                        </div>
                      </div>

                      {/* Apps */}
                      {cat.apps.map(app => {
                        const isActive = categoryId === cat.id && appId === app.id
                        return (
                          <button
                            key={app.id}
                            onClick={() => goTo(cat.id, app.id)}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg)" }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none" }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left border-0 cursor-pointer transition-colors duration-150"
                            style={{
                              background: isActive ? `${cat.color}12` : "none",
                              borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                            }}
                          >
                            <span className="text-lg shrink-0">{app.emoji}</span>
                            <div>
                              <p
                                className="text-[13px] m-0"
                                style={{ fontWeight: isActive ? 700 : 500, color: isActive ? cat.color : "var(--text)" }}
                              >{app.label}</p>
                              {app.description && (
                                <p className="text-[10px] leading-snug mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
                                  {app.description}
                                </p>
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
        {isMobile && <div className="flex-1" />}

        {/* Bouton thème */}
        <button
          onClick={() => setDark(d => !d)}
          className="shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer border transition-colors duration-150"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
            marginLeft: isMobile ? 8 : 12,
          }}
        >
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Hamburger — mobile seulement */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex items-center justify-center ml-2 p-1.5 rounded-lg border-0 bg-transparent cursor-pointer"
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        )}
      </nav>

      {/* ── MOBILE : overlay ── */}
      {isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[49] transition-opacity duration-250"
          style={{
            top: 52,
            background: "rgba(0,0,0,0.35)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
          }}
        />
      )}

      {/* ── MOBILE : Drawer ── */}
      {isMobile && (
        <div
          className="fixed top-[52px] right-0 bottom-0 z-50 flex flex-col overflow-y-auto"
          style={{
            width: "min(300px, 85vw)",
            background: "var(--bg-card)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Accueil */}
          <button
            onClick={() => goTo(null, null)}
            className="flex items-center gap-2.5 px-4 py-3.5 text-[14px] border-0 cursor-pointer text-left"
            style={{
              background: !categoryId ? "var(--bg)" : "none",
              borderBottom: "1px solid var(--border)",
              borderLeft: !categoryId ? "3px solid var(--text)" : "3px solid transparent",
              fontWeight: !categoryId ? 700 : 500,
              color: "var(--text)",
            }}
          >
            🏠 <span>Accueil</span>
          </button>

          {/* Catégories accordéon */}
          {CATEGORIES.map(cat => {
            const isExpanded  = mobileExpanded === cat.id
            const isCatActive = categoryId === cat.id
            return (
              <div key={cat.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setMobileExpanded(isExpanded ? null : cat.id)}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-left border-0 cursor-pointer"
                  style={{
                    background: isCatActive && !isExpanded ? `${cat.color}10` : "none",
                    borderLeft: isCatActive ? `3px solid ${cat.color}` : "3px solid transparent",
                  }}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span
                    className="flex-1 text-[14px]"
                    style={{ fontWeight: isCatActive ? 700 : 500, color: isCatActive ? cat.color : "var(--text)" }}
                  >{cat.label}</span>
                  <span
                    className="text-[10px] inline-block transition-transform duration-200"
                    style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none" }}
                  >▾</span>
                </button>

                {/* Apps */}
                {isExpanded && (
                  <div style={{ background: "var(--bg)" }}>
                    {cat.apps.map(app => {
                      const isActive = categoryId === cat.id && appId === app.id
                      return (
                        <button
                          key={app.id}
                          onClick={() => goTo(cat.id, app.id)}
                          className="flex items-center gap-2.5 w-full pl-8 pr-4 py-2.5 text-left border-0 cursor-pointer"
                          style={{
                            background: isActive ? `${cat.color}12` : "none",
                            borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                          }}
                        >
                          <span className="text-base shrink-0">{app.emoji}</span>
                          <div>
                            <p
                              className="text-[13px] m-0"
                              style={{ fontWeight: isActive ? 700 : 400, color: isActive ? cat.color : "var(--text)" }}
                            >{app.label}</p>
                            {app.description && (
                              <p className="text-[10px] mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
                                {app.description}
                              </p>
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
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Carte réutilisable
───────────────────────────────────────────────────────────────────────────── */
function AppCard({ item, accent, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left rounded-2xl cursor-pointer transition-all duration-200 border-2"
      style={{
        width: "clamp(150px, 42vw, 240px)",
        padding: "clamp(16px, 4vw, 28px) clamp(12px, 3vw, 24px)",
        borderColor: hovered ? accent : "var(--border)",
        background: hovered ? `${accent}18` : "var(--bg-card)",
        boxShadow: hovered ? `0 8px 24px ${accent}22` : "var(--shadow)",
      }}
    >
      <div className="mb-3" style={{ fontSize: "clamp(26px, 5vw, 36px)" }}>{item.emoji}</div>
      <p
        className="font-bold mb-1.5 m-0"
        style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "var(--text)" }}
      >{item.label}</p>
      <p
        className="m-0 leading-relaxed"
        style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color: "var(--text-muted)" }}
      >{item.description}</p>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [categoryId, setCategoryId] = useState(null)
  const [appId, setAppId]           = useState(null)
  const { dark, setDark }           = useTheme()

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

  /* Niveau 3 — affichage d'une app */
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

  /* Niveau 2 — liste des apps d'une catégorie */
  if (categoryId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    return (
      <div>
        {nav}
        <div
          className="min-h-[calc(100vh-52px)] flex flex-col items-center"
          style={{
            background: "var(--bg)",
            padding: "clamp(1rem,4vw,2rem)",
            paddingTop: "clamp(1.5rem,5vw,3rem)",
          }}
        >
          <div className="text-center mb-10 w-full">
            <span style={{ fontSize: "clamp(32px,7vw,40px)" }}>{cat.emoji}</span>
            <h1
              className="font-extrabold tracking-tight mt-2 mb-1"
              style={{ fontSize: "clamp(20px,4vw,26px)", color: "var(--text)" }}
            >{cat.label}</h1>
            <p className="m-0" style={{ fontSize: "clamp(12px,3vw,14px)", color: "var(--text-muted)" }}>
              {cat.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-5 justify-center w-full max-w-3xl">
            {cat.apps.map(app => (
              <AppCard key={app.id} item={app} accent={cat.color} onClick={() => setAppId(app.id)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* Niveau 1 — accueil */
  return (
    <div>
      {nav}
      <div
        className="min-h-[calc(100vh-52px)] flex flex-col items-center"
        style={{
          background: "var(--bg)",
          padding: "clamp(1rem,4vw,2rem)",
          paddingTop: "clamp(1.5rem,5vw,3rem)",
        }}
      >
        <div className="text-center mb-10 w-full">
          <h1
            className="font-extrabold tracking-tight mt-2 mb-1"
            style={{ fontSize: "clamp(20px,4vw,26px)", color: "var(--text)" }}
          >Simulations MDC</h1>
          <p className="m-0" style={{ fontSize: "clamp(12px,3vw,14px)", color: "var(--text-muted)" }}>
            BTS Métiers de la Chimie
          </p>
        </div>
        <div className="flex flex-wrap gap-5 justify-center w-full max-w-3xl">
          {CATEGORIES.map(cat => (
            <AppCard key={cat.id} item={cat} accent={cat.color} onClick={() => setCategoryId(cat.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}