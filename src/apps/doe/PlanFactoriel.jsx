import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../ThemeContext";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { EXAMPLE_FILES } from "./exampleFiles";


function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── constantes ────────────────────────────────────────────────────────────────
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = ["", "", "²", "³", "⁴", "⁵"];
const sb = (n) => String(n).split("").map((d) => SUB[+d]).join("");

function lvls(row, n) {
  const lv = [];
  for (let f = 0; f < n; f++) lv.push(((row >> (n - 1 - f)) & 1) === 0 ? -1 : 1);
  return lv;
}

function getTerms(n) {
  const t = [{ o: 0, ix: [], lb: "α₀" }];
  for (let i = 0; i < n; i++) t.push({ o: 1, ix: [i], lb: "α" + sb(i + 1) });
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      t.push({ o: 2, ix: [i, j], lb: "α" + sb(i + 1) + sb(j + 1) });
  if (n >= 3)
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++)
          t.push({ o: 3, ix: [i, j, k], lb: "α" + sb(i + 1) + sb(j + 1) + sb(k + 1) });
  if (n >= 4)
    for (let i = 0; i < n - 3; i++)
      for (let j = i + 1; j < n - 2; j++)
        for (let k = j + 1; k < n - 1; k++)
          for (let l = k + 1; l < n; l++)
            t.push({ o: 4, ix: [i, j, k, l], lb: "α" + sb(i + 1) + sb(j + 1) + sb(k + 1) + sb(l + 1) });
  if (n === 5) t.push({ o: 5, ix: [0, 1, 2, 3, 4], lb: "α₁₂₃₄₅" });
  return t;
}

function fitModel(ts, ys, n) {
  const C = {};
  ts.forEach((t) => {
    let s = 0;
    for (let r = 0; r < ys.length; r++) {
      const lv = lvls(r, n);
      const xp = t.o === 0 ? 1 : t.ix.reduce((a, j) => a * lv[j], 1);
      s += xp * ys[r];
    }
    C[t.lb] = s / ys.length;
  });
  return C;
}

function predict(ts, C, lv) {
  return ts.reduce((z, t) => z + (C[t.lb] || 0) * (t.o === 0 ? 1 : t.ix.reduce((a, j) => a * lv[j], 1)), 0);
}

// ── stats F / p-value ──────────────────────────────────────────────────────────
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betaCF(x, a, b) {
  const MAXIT = 200, EPS = 3e-7, qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x / qap);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betaInc(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lb = lgamma(a) + lgamma(b) - lgamma(a + b);
  return Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lb) * betaCF(x, a, b) / a;
}
function fPval(F, d1, d2) { return betaInc(d2 / (d2 + d1 * F), d2 / 2, d1 / 2); }

function calcStats(ts, C, ys, n) {
  const ne = ys.length, ymean = ys.reduce((a, b) => a + b) / ne;
  const yhat = Array.from({ length: ne }, (_, r) => predict(ts, C, lvls(r, n)));
  const resids = ys.map((y, i) => y - yhat[i]);
  const SStot = ys.reduce((s, y) => s + (y - ymean) ** 2, 0);
  const SSres = resids.reduce((s, e) => s + e ** 2, 0);
  const p = ts.length, R2 = 1 - SSres / SStot, R2adj = 1 - (SSres / (ne - p)) / (SStot / (ne - 1));
  const dfR = p - 1, dfE = ne - p;
  const Fstat = dfE > 0 ? ((SStot - SSres) / dfR) / (SSres / dfE) : null;
  const pF = Fstat !== null && dfE > 0 ? fPval(Fstat, dfR, dfE) : null;
  return { resids, yhat, R2, R2adj, F: Fstat, pF, dfR, dfE };
}

// Variante avec répétitions : coefficients estimés sur les moyennes,
// stats (R², F, ddl) calculées sur toutes les observations brutes.
// rawObs : [{lv: [-1,1,...], y: valeur}, ...]
function calcStatsWithReps(ts, C, rawObs) {
  const N = rawObs.length;
  const ymean = rawObs.reduce((a, o) => a + o.y, 0) / N;
  const yhat  = rawObs.map(o => predict(ts, C, o.lv));
  const resids = rawObs.map((o, i) => o.y - yhat[i]);
  const SStot = rawObs.reduce((s, o) => s + (o.y - ymean) ** 2, 0);
  const SSres = resids.reduce((s, e) => s + e ** 2, 0);
  const p = ts.length;
  const R2    = 1 - SSres / SStot;
  const R2adj = 1 - (SSres / (N - p)) / (SStot / (N - 1));
  const dfR   = p - 1, dfE = N - p;
  const Fstat = dfE > 0 ? ((SStot - SSres) / dfR) / (SSres / dfE) : null;
  const pF    = Fstat !== null && dfE > 0 ? fPval(Fstat, dfR, dfE) : null;
  // résidus et yhat ramenés aux 2^n moyennes pour l'affichage dans le tableau
  const ne = 1 << ts.filter(t => t.o === 1).length || rawObs.length;
  return { resids, yhat, R2, R2adj, F: Fstat, pF, dfR, dfE, rawObs: true };
}

// ── fichiers de données exemples ──────────────────────────────────────────────

const MODEL_DEFS = [
  { id: "lin",  lb: "Modèle linéaire",      col: "#0f6e56", bg: "#e1f5ee", desc: "Effets principaux uniquement",                      maxOrder: 1  },
  { id: "quad", lb: "Modèle quadratique",   col: "#534ab7", bg: "#eeedfe", desc: "Effets principaux + interactions d'ordre 2",         maxOrder: 2  },
  { id: "cub",  lb: "Modèle cubique",       col: "#993c1d", bg: "#faece7", desc: "Effets principaux + interactions d'ordre 2 et 3",    maxOrder: 99 },
];

// ─── tokens de couleur locaux (thème-agnostique, utilise CSS vars) ─────────────
// Les *Bg utilisent des CSS vars pour s'adapter dark/light automatiquement
const T = {
  green:    "#0f6e56",
  greenBg:  "var(--color-green-bg, #e1f5ee)",
  purple:   "#534ab7",
  purpleBg: "var(--color-purple-bg, #eeedfe)",
  red:      "#993c1d",
  redBg:    "var(--color-red-bg, #faece7)",
  amber:    "#ba7517",
  amberBg:  "var(--color-amber-bg, #fef3c7)",
};

// Injecte les CSS vars adaptatives une seule fois
if (typeof document !== "undefined" && !document.getElementById("plan-theme-vars")) {
  const style = document.createElement("style");
  style.id = "plan-theme-vars";
  style.textContent = `
    :root {
      --color-green-bg: #e1f5ee;
      --color-purple-bg: #eeedfe;
      --color-red-bg: #faece7;
      --color-amber-bg: #fef3c7;
    }
    .dark, [data-theme="dark"] {
      --color-green-bg: rgba(15,110,86,0.18);
      --color-purple-bg: rgba(83,74,183,0.18);
      --color-red-bg: rgba(153,60,29,0.18);
      --color-amber-bg: rgba(186,117,23,0.18);
    }
  `;
  document.head.appendChild(style);
}

// ─── composants utilitaires ────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "0.5px solid var(--border)",
      borderRadius: 8,
      padding: "0.85rem 1rem",
      marginBottom: "0.65rem",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
      {children}
    </div>
  );
}

function Btn({ onClick, children, style, disabled, variant = "default" }) {
  const base = {
    padding: "7px 14px", fontSize: 13, borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500, border: "0.5px solid var(--border)", transition: "opacity 0.15s",
    opacity: disabled ? 0.35 : 1, minHeight: 36, touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent", userSelect: "none", ...style,
  };
  if (variant === "primary") {
    return (
      <button onClick={onClick} disabled={disabled} style={{ ...base, background: "var(--text)", color: "var(--bg)", border: "none" }}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, background: "var(--bg-card)", color: "var(--text)" }}>
      {children}
    </button>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{ display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 8, background: bg || "var(--bg-card)", color: color || "var(--text-muted)", fontWeight: 500, border: "0.5px solid var(--border)" }}>
      {children}
    </span>
  );
}

// ─── barre de progression ──────────────────────────────────────────────────────
function ProgressBar({ step, maxStep, onStep }) {
  const steps = [
    { n: 1, label: "Facteurs" },
    { n: 2, label: "Matrice" },
    { n: 3, label: "Résultats" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "1.25rem", gap: 0 }}>
      {steps.map((s, i) => {
        const done      = s.n < step;
        const current   = s.n === step;
        const reachable = s.n <= maxStep && s.n !== step;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                onClick={() => reachable && onStep(s.n)}
                style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600,
                  background: done ? T.green : current ? "var(--text)" : "var(--bg-card)",
                  color:      done ? "#fff"  : current ? "var(--bg)" : "var(--text-muted)",
                  border:     done || current ? "none" : "0.5px solid var(--border)",
                  transition: "all 0.2s",
                  cursor: reachable ? "pointer" : "default",
                  boxShadow: reachable ? "0 0 0 2px var(--border)" : "none",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                onClick={() => reachable && onStep(s.n)}
                style={{
                  fontSize: 10, fontWeight: current ? 600 : 400,
                  color: current ? "var(--text)" : reachable ? "var(--text)" : "var(--text-muted)",
                  cursor: reachable ? "pointer" : "default",
                  textDecoration: reachable ? "underline" : "none",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: 3,
                  touchAction: "manipulation",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 2, height: 1, background: done ? T.green : "var(--border)", marginBottom: 16, transition: "background 0.2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── styles tableaux ────────────────────────────────────────────────────────────
const thStyle = {
  background: "var(--bg-card)", padding: "5px 7px", textAlign: "center",
  border: "0.5px solid var(--border)", fontWeight: 600, fontSize: 10,
  color: "var(--text-muted)", lineHeight: 1.4,
};
const tdStyle = {
  padding: "4px 6px", textAlign: "center",
  border: "0.5px solid var(--border)", fontSize: 12, color: "var(--text)",
};

// ─── step 1 : facteurs ─────────────────────────────────────────────────────────
function Step1({ factors, setFactors, useCenter, setUseCenter, nrep, setNrep, rname, setRname, runit, setRunit, onNext }) {
  const [exIdx, setExIdx] = useState(-1);
  const [setIdx, setSetIdx] = useState(0);
  const [loadedEx, setLoadedEx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const ne = 1 << factors.length;
  const total = ne + (useCenter ? nrep : 0);

  // Nouveau format : experiments[] au niveau racine, sets pointent via response_index
  // Extrait les réponses d'un set depuis ex.experiments
  function extractResponses(ex, set) {
    const ri = set.response_index ?? 0;
    const yKey = `Y${ri + 1}`;
    const sorted = [...ex.experiments].sort((a, b) => a.exp_no - b.exp_no);
    return sorted.map((e) => e[yKey]);
  }

  // Détecte le nombre de répétitions : nb d'expériences ayant le même profil X1..Xn
  function detectReps(ex) {
    const n = ex.factors.length;
    const ne = 1 << n;
    return Math.round(ex.experiments.length / ne);
  }

  async function loadExample(i) {
    setExIdx(i); setSetIdx(0); setLoading(true); setLoadError(null); setLoadedEx(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${EXAMPLE_FILES[i].file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ex = await res.json();
      setLoadedEx(ex);
      setFactors(ex.factors.map((f) => ({ ...f })));
      // rname/runit depuis la première réponse du premier set
      const resp0 = ex.responses[ex.sets[0].response_index ?? 0];
      setRname(resp0.name); setRunit(resp0.unit);
      setUseCenter(false);
      window.__exExperiments = ex.experiments;
      window.__exReps = detectReps(ex);
      window.__exResponseIndex = ex.sets[0].response_index ?? 0;
    } catch (e) {
      setLoadError(`Impossible de charger le fichier : ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function applySet(si) {
    if (!loadedEx) return;
    setSetIdx(si);
    const set = loadedEx.sets[si];
    const resp = loadedEx.responses[set.response_index ?? 0];
    setRname(resp.name); setRunit(resp.unit);
    window.__exExperiments = loadedEx.experiments;
    window.__exReps = detectReps(loadedEx);
    window.__exResponseIndex = set.response_index ?? 0;
  }

  function addF()             { if (factors.length < 5) setFactors([...factors, { n: "Facteur " + (factors.length + 1), u: "", lo: "", mi: "", hi: "" }]); }
  function delF(i)            { if (factors.length > 2) setFactors(factors.filter((_, j) => j !== i)); }
  function updateF(i, key, v) { const f = [...factors]; f[i] = { ...f[i], [key]: v }; setFactors(f); }

  const inputStyle = {
    fontSize: 13, padding: "5px 8px", height: 32, borderRadius: 5,
    border: "0.5px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", margin: 0 }}>Définir les facteurs</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>2 facteurs minimum · point central optionnel</span>
      </div>

      {/* Exemples */}
      <Card>
        <SectionTitle>Charger un exemple</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10, marginBottom: exIdx >= 0 ? 12 : 0 }}>
          {EXAMPLE_FILES.map((ex, i) => (
            <div key={i} onClick={() => loadExample(i)} style={{
              border: exIdx === i ? `1.5px solid var(--text)` : "0.5px solid var(--border)",
              borderRadius: 8, padding: "10px 12px", cursor: "pointer",
              background: exIdx === i ? "var(--bg)" : "transparent",
              transition: "border-color 0.15s",
              opacity: loading && exIdx === i ? 0.6 : 1,
            }}>
              <Badge>{ex.context}</Badge>
              {ex.real && <span style={{ display: "inline-block", marginLeft: 6, fontSize: 10, padding: "2px 7px", borderRadius: 8, background: T.amberBg, color: T.amber, fontWeight: 700, border: `0.5px solid ${T.amber}40`, verticalAlign: "middle" }}>données réelles</span>}
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "6px 0 4px" }}>
                {loading && exIdx === i ? "⟳ Chargement…" : ex.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{ex.context}</div>
            </div>
          ))}
        </div>

        {loadError && (
          <div style={{ color: T.red, fontSize: 12, padding: "8px 12px", background: T.redBg, borderRadius: 7, marginBottom: 8 }}>
            {loadError}
          </div>
        )}

        {exIdx >= 0 && loadedEx && !loading && (
          <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>Jeu de données :</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {loadedEx.sets.map((s, si) => (
                <button key={si} onClick={() => applySet(si)} style={{
                  padding: "4px 12px", fontSize: 12, borderRadius: 6, cursor: "pointer",
                  border: setIdx === si ? "1.5px solid var(--text)" : "0.5px solid var(--border)",
                  background: setIdx === si ? "var(--text)" : "var(--bg-card)",
                  color: setIdx === si ? "var(--bg)" : "var(--text-muted)",
                  fontWeight: setIdx === si ? 600 : 400,
                }}>
                  {loadedEx.sets.length > 1 ? `Jeu ${"ABC"[si]}` : "Jeu unique"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>{loadedEx.sets[setIdx].label}</strong>
              {" — "}{loadedEx.sets[setIdx].hint}
            </div>
          </div>
        )}
      </Card>

      {/* Tableau facteurs */}
      <Card>
        <SectionTitle>Facteurs expérimentaux</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 0.6fr 1fr 1fr 1fr 32px", gap: 7, marginBottom: 8, paddingBottom: 6, borderBottom: "0.5px solid var(--border)" }}>
          {["Nom du facteur", "Unité", "Niveau −1", "Niveau 0 (opt.)", "Niveau +1", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{h}</span>
          ))}
        </div>
        {factors.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.6fr 1fr 1fr 1fr 32px", gap: 7, marginBottom: 7, alignItems: "center" }}>
            <input value={f.n} onChange={(e) => updateF(i, "n", e.target.value)} placeholder="ex : Température" style={inputStyle} />
            <input value={f.u} onChange={(e) => updateF(i, "u", e.target.value)} placeholder="°C" style={inputStyle} />
            <input value={f.lo} onChange={(e) => updateF(i, "lo", e.target.value)} placeholder="valeur basse" style={inputStyle} />
            <input value={f.mi} onChange={(e) => updateF(i, "mi", e.target.value)} placeholder={useCenter ? "valeur centrale" : "—"} disabled={!useCenter}
              style={{ ...inputStyle, opacity: useCenter ? 1 : 0.35 }} />
            <input value={f.hi} onChange={(e) => updateF(i, "hi", e.target.value)} placeholder="valeur haute" style={inputStyle} />
            <button onClick={() => delF(i)} disabled={factors.length <= 2} style={{
              width: 30, height: 30, border: "0.5px solid var(--border)", borderRadius: 6,
              background: "var(--bg-card)", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: factors.length <= 2 ? 0.2 : 0.7, color: "var(--text)",
            }}>−</button>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--border)", flexWrap: "wrap" }}>
          <Btn onClick={addF} disabled={factors.length >= 5}>+ Ajouter un facteur</Btn>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {factors.length} facteur{factors.length > 1 ? "s" : ""} → <strong style={{ color: "var(--text)" }}>{ne} essais</strong>
            {useCenter && nrep > 0 ? ` + ${nrep} centre = ${total} total` : ""}
          </span>
        </div>

        {/* Point central */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={useCenter} onChange={(e) => setUseCenter(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--text)" }} />
          Ajouter des essais au point central (niveau 0)
        </label>
        {useCenter && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
            <label>Répétitions :</label>
            <input type="number" value={nrep} min={2} max={10} onChange={(e) => setNrep(parseInt(e.target.value) || 2)}
              style={{ ...inputStyle, width: 64 }} />
            <span style={{ fontSize: 12 }}>— minimum 2 recommandé</span>
          </div>
        )}

        {/* Réponse */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)", flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
          <label style={{ whiteSpace: "nowrap" }}>Variable réponse :</label>
          <input value={rname} onChange={(e) => setRname(e.target.value)} style={{ ...inputStyle, width: 280 }} />
          <label style={{ whiteSpace: "nowrap" }}>Unité :</label>
          <input value={runit} onChange={(e) => setRunit(e.target.value)} placeholder="optionnel" style={{ ...inputStyle, width: 100 }} />
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="primary" onClick={onNext}>Suivant →</Btn>
      </div>
    </div>
  );
}

// ─── step 2 : matrice ──────────────────────────────────────────────────────────
function Step3({ factors, useCenter, nrep, rname, runit, responses, setResponses, centerResponses, setCenterResponses, onBack, onCalc }) {
  const n = factors.length, ne = 1 << n;
  const allTerms = getTerms(n);
  const iTerms = allTerms.filter((t) => t.o >= 2);
  const [reps, setReps] = useState(1);
  const [experiments, setExperiments] = useState(null); // format matrice complet

  useEffect(() => {
    const exExp  = window.__exExperiments  || null;
    const exReps = window.__exReps         || 1;
    const exRI   = window.__exResponseIndex ?? 0;
    setReps(exReps);
    setExperiments(exExp);
    if (exExp) {
      // Reconstruire les réponses depuis experiments dans l'ordre d'arrivée (exp_no croissant)
      const sorted = [...exExp].sort((a, b) => a.exp_no - b.exp_no);
      const yKey = `Y${exRI + 1}`;
      setResponses(sorted.map((e) => String(e[yKey])));
      window.__exExperiments = null; window.__exReps = null; window.__exResponseIndex = null;
    } else {
      setResponses(Array(ne * exReps).fill(""));
    }
    setCenterResponses(Array(nrep).fill(""));
  }, []);

  // Calcule les moyennes par combinaison (pour le modèle)
  function getMeans() {
    const means = [];
    for (let r = 0; r < ne; r++) {
      const vals = [];
      for (let k = 0; k < reps; k++) {
        const v = Number(responses[r * reps + k]);
        if (!isNaN(v)) vals.push(v);
      }
      means.push(vals.length > 0 ? vals.reduce((a, b) => a + b) / vals.length : NaN);
    }
    return means;
  }

  function getMSe() {
    if (reps < 2) return null;
    let SSe = 0, dfe = 0;
    for (let r = 0; r < ne; r++) {
      const vals = [];
      for (let k = 0; k < reps; k++) {
        const v = Number(responses[r * reps + k]);
        if (!isNaN(v)) vals.push(v);
      }
      if (vals.length > 1) {
        const m = vals.reduce((a, b) => a + b) / vals.length;
        SSe += vals.reduce((s, v) => s + (v - m) ** 2, 0);
        dfe += vals.length - 1;
      }
    }
    return dfe > 0 ? { MSe: SSe / dfe, dfe } : null;
  }

  // ── Mode matrice complète (experiments) ──────────────────────────────────────
  if (experiments) {
    const sorted = [...experiments].sort((a, b) => a.exp_no - b.exp_no);
    const xKeys = Object.keys(sorted[0]).filter(k => /^X\d+$/.test(k)).sort();
    const yKeys = Object.keys(sorted[0]).filter(k => /^Y\d+$/.test(k)).sort();
    const yKey = yKeys[0] || 'Y1';
    const combKey = (row) => xKeys.map(k => row[k]).join(',');
    const combGroups = {};
    sorted.forEach(row => {
      const key = combKey(row);
      if (!combGroups[key]) combGroups[key] = [];
      combGroups[key].push(row[yKey]);
    });
    function handleCalcFromMatrix() {
      const means = [], combSeen = {};
      let SSe = 0, dfe = 0;
      sorted.forEach(row => {
        const key = combKey(row);
        if (!combSeen[key]) combSeen[key] = [];
        combSeen[key].push(row[yKey]);
      });
      // rawObs : toutes les observations brutes avec leur vecteur lv
      const rawObs = sorted.map(row => ({
        lv: xKeys.map(k => row[k]),
        y: row[yKey],
      }));
      for (let r = 0; r < ne; r++) {
        const lv = lvls(r, n);
        const key = lv.join(',');
        const vals = combSeen[key] || [];
        const m = vals.length > 0 ? vals.reduce((a, b) => a + b) / vals.length : NaN;
        means.push(m);
        if (vals.length > 1) {
          SSe += vals.reduce((s, v) => s + (v - m) ** 2, 0);
          dfe += vals.length - 1;
        }
      }
      onCalc(means, [], dfe > 0 ? { MSe: SSe / dfe, dfe } : null, rawObs);
    }
    return (
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", margin: 0 }}>Matrice d'expériences</h2>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Plan 2{SUP[n]} — <strong>{sorted.length} essais</strong>
            {reps > 1 ? ` · ${ne} comb. × ${reps} rép.` : ""}
            {reps > 1 && <span style={{ color: T.green, fontWeight: 500 }}> · Moy. auto.</span>}
          </span>
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{
              maxHeight: "calc(10 * 33px + 36px)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr>
                    <th style={{ ...thStyle, fontSize: 10 }}>N°</th>
                    <th style={{ ...thStyle, fontSize: 10 }}>Ord.</th>
                    {factors.map((f, i) => (
                      <th key={i} style={{ ...thStyle, fontSize: 10 }}>
                        {xKeys[i]}<br />
                        <span style={{ fontWeight: 400, color: "var(--text)", fontSize: 9 }}>{f.n.length > 8 ? f.n.slice(0,8)+"…" : f.n}</span>
                      </th>
                    ))}
                    {iTerms.map((t, i) => (
                      <th key={i} style={{ ...thStyle, color: "var(--text-muted)", fontSize: 9 }}>
                        {t.ix.map(j => xKeys[j]).join("·")}
                      </th>
                    ))}
                    <th style={{ ...thStyle, color: T.purple, fontSize: 10 }}>{rname}{runit ? ` (${runit})` : ""}</th>
                    {reps > 1 && <th style={{ ...thStyle, color: T.green, fontSize: 9 }}>Moy.</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, ri) => {
                    const lv = xKeys.map(k => row[k]);
                    const key = combKey(row);
                    const grp = combGroups[key] || [];
                    const groupMean = grp.length > 0 ? grp.reduce((a, b) => a + b) / grp.length : null;
                    const rowsInGroup = sorted.filter(r => combKey(r) === key);
                    const isLastInGroup = rowsInGroup[rowsInGroup.length - 1] === row;
                    const groupIdx = Object.keys(combGroups).indexOf(key);
                    return (
                      <tr key={ri} style={{ background: groupIdx % 2 === 0 ? "transparent" : "var(--bg-card)", height: 33 }}>
                        <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 10, padding: "3px 5px" }}>{row.exp_no}</td>
                        <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 10, padding: "3px 5px" }}>{row.run_order}</td>
                        {lv.map((v, fi) => (
                          <td key={fi} style={{ ...tdStyle, color: v === 1 ? T.green : T.red, fontWeight: 600, padding: "3px 5px", fontSize: 11 }}>
                            {v === 1 ? "+1" : "−1"}
                            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400, lineHeight: 1 }}>
                              {v === 1 ? factors[fi].hi : factors[fi].lo}
                            </div>
                          </td>
                        ))}
                        {iTerms.map((t, ti) => {
                          const iv = t.ix.reduce((a, j) => a * lv[j], 1);
                          return <td key={ti} style={{ ...tdStyle, color: "var(--text-muted)", fontWeight: 500, fontSize: 10, padding: "3px 4px" }}>{iv === 1 ? "+1" : "−1"}</td>;
                        })}
                        <td style={{ ...tdStyle, fontWeight: 500, fontSize: 11, padding: "3px 6px" }}>{(row[yKey]).toFixed(3)}</td>
                        {reps > 1 && (
                          <td style={{ ...tdStyle, fontWeight: 600, color: T.green, background: "var(--bg-card)", fontSize: 10, padding: "3px 5px" }}>
                            {isLastInGroup && groupMean !== null ? groupMean.toFixed(2) : ""}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sorted.length > 10 && (
              <div style={{ padding: "5px 10px", fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", textAlign: "center" }}>
                ↕ {sorted.length} lignes — faites défiler pour voir toutes les expériences
              </div>
            )}
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Btn onClick={onBack}>← Retour</Btn>
          <Btn variant="primary" onClick={handleCalcFromMatrix}>Calculer →</Btn>
        </div>
      </div>
    );
  }

  // ── Mode standard : saisie manuelle ──────────────────────────────────────────

  // Calcule les moyennes par combinaison (pour le modèle)
  function getMeans() {
    const means = [];
    for (let r = 0; r < ne; r++) {
      const vals = [];
      for (let k = 0; k < reps; k++) {
        const v = Number(responses[r * reps + k]);
        if (!isNaN(v)) vals.push(v);
      }
      means.push(vals.length > 0 ? vals.reduce((a, b) => a + b) / vals.length : NaN);
    }
    return means;
  }

  // Calcule la MSe (erreur pure) depuis les répétitions
  function getMSe() {
    if (reps < 2) return null;
    let SSe = 0, dfe = 0;
    for (let r = 0; r < ne; r++) {
      const vals = [];
      for (let k = 0; k < reps; k++) {
        const v = Number(responses[r * reps + k]);
        if (!isNaN(v)) vals.push(v);
      }
      if (vals.length > 1) {
        const m = vals.reduce((a, b) => a + b) / vals.length;
        SSe += vals.reduce((s, v) => s + (v - m) ** 2, 0);
        dfe += vals.length - 1;
      }
    }
    return dfe > 0 ? { MSe: SSe / dfe, dfe } : null;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", margin: 0 }}>Matrice d'expériences</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Plan 2{SUP[n]} — {ne} comb.{reps > 1 ? ` × ${reps} rép. = ${ne * reps} essais` : ""}{useCenter ? ` + ${nrep} centre` : ""}
          {reps > 1 && <span style={{ color: T.green, fontWeight: 500 }}> · Moy. auto.</span>}
        </span>
      </div>

      {reps === 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
          <label>Répétitions :</label>
          {[1, 2, 3, 4].map((r) => (
            <button key={r} onClick={() => { setReps(r); setResponses(Array(ne * r).fill("")); }}
              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", minHeight: 32,
                touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                border: reps === r ? "1.5px solid var(--text)" : "0.5px solid var(--border)",
                background: reps === r ? "var(--text)" : "var(--bg-card)",
                color: reps === r ? "var(--bg)" : "var(--text-muted)", fontWeight: reps === r ? 600 : 400 }}>
              {r}
            </button>
          ))}
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{
            maxHeight: `calc(10 * 34px + 36px)`,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ ...thStyle, fontSize: 10 }}>Comb.</th>
                  {factors.map((f, i) => (
                    <th key={i} style={{ ...thStyle, fontSize: 10 }}>
                      X{sb(i + 1)}<br />
                      <span style={{ fontWeight: 400, color: "var(--text)", fontSize: 9 }}>{f.n.length > 8 ? f.n.slice(0,8)+"…" : f.n}</span>
                    </th>
                  ))}
                  {iTerms.map((t, i) => (
                    <th key={i} style={{ ...thStyle, color: "var(--text-muted)", fontSize: 9 }}>
                      {t.ix.map((j) => "X" + sb(j + 1)).join("·")}
                    </th>
                  ))}
                  {reps > 1
                    ? Array.from({ length: reps }, (_, k) => (
                        <th key={"rep" + k} style={{ ...thStyle, color: T.purple, fontSize: 10 }}>
                          {rname.slice(0,6)}{runit ? ` (${runit})` : ""}<br />
                          <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 9 }}>Rép. {k + 1}</span>
                        </th>
                      ))
                    : <th style={{ ...thStyle, color: T.purple, fontSize: 10 }}>{rname}{runit ? ` (${runit})` : ""}</th>
                  }
                  {reps > 1 && (
                    <th style={{ ...thStyle, color: T.green, fontSize: 9 }}>Moy.</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ne }, (_, r) => {
                  const lv = lvls(r, n);
                  const repVals = Array.from({ length: reps }, (_, k) => Number(responses[r * reps + k]));
                  const validVals = repVals.filter((v) => !isNaN(v) && responses[r * reps + (repVals.indexOf(v))] !== "");
                  const mean = validVals.length > 0 ? (validVals.reduce((a, b) => a + b) / validVals.length) : null;
                  return (
                    <tr key={r} style={{ background: r % 2 === 0 ? "transparent" : "var(--bg-card)", height: 34 }}>
                      <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 10, padding: "2px 5px" }}>{r + 1}</td>
                      {lv.map((v, fi) => (
                        <td key={fi} style={{ ...tdStyle, color: v === 1 ? T.green : T.red, fontWeight: 600, padding: "2px 5px", fontSize: 11 }}>
                          {v === 1 ? "+1" : "−1"}
                          <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400, lineHeight: 1 }}>{v === 1 ? factors[fi].hi || "+1" : factors[fi].lo || "−1"}</div>
                        </td>
                      ))}
                      {iTerms.map((t, ti) => { const v = t.ix.reduce((a, j) => a * lv[j], 1); return <td key={ti} style={{ ...tdStyle, color: "var(--text-muted)", fontWeight: 500, fontSize: 10, padding: "2px 4px" }}>{v === 1 ? "+1" : "−1"}</td>; })}
                      {Array.from({ length: reps }, (_, k) => (
                        <td key={"rep" + k} style={{ ...tdStyle, padding: "2px 3px" }}>
                          <input type="number"
                            value={responses[r * reps + k] || ""}
                            onChange={(e) => { const r2 = [...responses]; r2[r * reps + k] = e.target.value; setResponses(r2); }}
                            placeholder="—" step="any"
                            style={{ width: reps > 1 ? 60 : 68, textAlign: "center", fontSize: 12, padding: "3px 4px", height: 28,
                              border: "0.5px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--text)", outline: "none",
                              touchAction: "manipulation" }} />
                        </td>
                      ))}
                      {reps > 1 && (
                        <td style={{ ...tdStyle, fontWeight: 600, color: mean !== null ? T.green : "var(--text-muted)", background: "var(--bg-card)", fontSize: 10, padding: "2px 5px" }}>
                          {mean !== null ? mean.toFixed(2) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {useCenter && centerResponses.map((val, c) => (
                  <tr key={"c" + c} style={{ background: "var(--bg-card)", height: 34 }}>
                    <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 10, padding: "2px 5px" }}>{ne + c + 1}</td>
                    {factors.map((f, fi) => (
                      <td key={fi} style={{ ...tdStyle, color: T.purple, fontWeight: 600, padding: "2px 5px", fontSize: 11 }}>
                        0<div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400, lineHeight: 1 }}>{f.mi || "0"}</div>
                      </td>
                    ))}
                    {iTerms.map((_, ti) => <td key={ti} style={{ ...tdStyle, color: T.purple, fontWeight: 500, fontSize: 10, padding: "2px 4px" }}>0</td>)}
                    <td colSpan={reps + (reps > 1 ? 1 : 0)} style={{ ...tdStyle, padding: "2px 3px" }}>
                      <input type="number" value={val} onChange={(e) => { const cr = [...centerResponses]; cr[c] = e.target.value; setCenterResponses(cr); }}
                        placeholder="—" step="any"
                        style={{ width: 68, textAlign: "center", fontSize: 12, padding: "3px 4px", height: 28,
                          border: "0.5px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--text)", outline: "none",
                          touchAction: "manipulation" }} />
                    </td>
                  </tr>
                ))}
                {useCenter && (
                  <tr>
                    <td colSpan={2 + factors.length + iTerms.length} style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 8px", background: "var(--bg-card)", fontStyle: "italic" }}>
                      ↑ Essais au point central
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(ne * reps + (useCenter ? nrep : 0)) > 10 && (
            <div style={{ padding: "4px 10px", fontSize: 10, color: "var(--text-muted)", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", textAlign: "center" }}>
              ↕ {ne * reps + (useCenter ? nrep : 0)} lignes — faites défiler pour voir toutes les expériences
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn onClick={onBack}>← Retour</Btn>
        <Btn variant="primary" onClick={() => {
          const means = getMeans();
          if (means.some(isNaN)) { alert("Veuillez remplir toutes les réponses."); return; }
          if (useCenter && centerResponses.some((v) => isNaN(Number(v)))) { alert("Réponses au centre manquantes."); return; }
          onCalc(means, centerResponses.map(Number), getMSe());
        }}>Calculer →</Btn>
      </div>
    </div>
  );
}


// ─── canvas isoréponses ────────────────────────────────────────────────────────
function IsoCanvas({ factors, C, rname, runit, dark }) {
  const canvasRef = useRef(null);
  const [xi, setXi] = useState(0);
  const [yi, setYi] = useState(Math.min(1, factors.length - 1));

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { l: 56, r: 24, t: 24, b: 52 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    ctx.clearRect(0, 0, W, H);
    const bg = dark ? "#1e293b" : "#ffffff";
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const N = 70, dat = []; let zn = Infinity, zx = -Infinity;
    for (let r = 0; r <= N; r++) {
      dat[r] = [];
      for (let c = 0; c <= N; c++) {
        const xs = factors.map(() => 0);
        xs[xi] = -1 + 2 * c / N; xs[yi] = -1 + 2 * r / N;
        let z = C["α₀"] || 0;
        factors.forEach((_, f) => { const k = "α" + sb(f + 1); if (C[k] !== undefined) z += C[k] * xs[f]; });
        const k12 = "α" + sb(xi + 1) + sb(yi + 1);
        const k21 = "α" + sb(yi + 1) + sb(xi + 1);
        if (C[k12] !== undefined) z += C[k12] * xs[xi] * xs[yi];
        else if (C[k21] !== undefined) z += C[k21] * xs[xi] * xs[yi];
        dat[r][c] = z; if (z < zn) zn = z; if (z > zx) zx = z;
      }
    }

    // Fond de couleur
    for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
      const t = (dat[r][c] - zn) / (zx - zn + 1e-9);
      // palette vert→blanc→rouge (neutre en thème clair/sombre)
      const h = Math.round(t * 255);
      if (dark) ctx.fillStyle = `rgb(${Math.round(30 + t * 60)},${Math.round(80 + t * 80)},${Math.round(80 + t * 40)})`;
      else      ctx.fillStyle = `rgb(${Math.round(29 + t * 32)},${Math.round(158 - t * 56)},${Math.round(117 - t * 95)})`;
      ctx.fillRect(pad.l + c / N * iw, pad.t + (1 - (r + 1) / N) * ih, iw / N + 1, ih / N + 1);
    }

    // Isolignes
    for (let li = 1; li < 8; li++) {
      const zv = zn + li / 8 * (zx - zn);
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
        if ((dat[r][c] < zv) !== (dat[r + 1][c] < zv)) {
          const t = (zv - dat[r][c]) / (dat[r + 1][c] - dat[r][c]);
          ctx.moveTo(pad.l + c / N * iw, pad.t + (1 - (r + t) / N) * ih);
          ctx.lineTo(pad.l + (c + .5) / N * iw, pad.t + (1 - (r + t) / N) * ih);
        }
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left"; ctx.fillText(zv.toFixed(1) + (runit ? " " + runit : ""), pad.l + .6 * iw + 3, pad.t + (1 - li / 8) * ih - 3);
    }

    // Bordure
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5; ctx.strokeRect(pad.l, pad.t, iw, ih);

    // Axes
    const axisColor = dark ? "rgba(210,210,210,0.7)" : "rgba(30,30,30,0.7)";
    ctx.fillStyle = axisColor; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(factors[xi].n + (factors[xi].u ? ` (${factors[xi].u})` : ""), pad.l + iw / 2, H - 6);
    ctx.save(); ctx.translate(14, pad.t + ih / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(factors[yi].n + (factors[yi].u ? ` (${factors[yi].u})` : ""), 0, 0); ctx.restore();
    ctx.fillStyle = dark ? "rgba(180,180,180,0.6)" : "rgba(80,80,80,0.8)";
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    for (let t = 0; t <= 4; t++) {
      ctx.fillText((-1 + 2 * t / 4).toFixed(1), pad.l + t / 4 * iw, pad.t + ih + 16);
      ctx.textAlign = "right";
      ctx.fillText((-1 + 2 * t / 4).toFixed(1), pad.l - 6, pad.t + (1 - t / 4) * ih + 4);
      ctx.textAlign = "center";
    }
  }, [xi, yi, C, factors, dark]);

  useEffect(() => { draw(); }, [draw]);

  const selStyle = {
    fontSize: 12, padding: "4px 8px", height: 28, borderRadius: 5,
    border: "0.5px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", cursor: "pointer",
  };

  return (
    <Card>
      <SectionTitle>Courbes isoréponses</SectionTitle>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          Axe X :
          <select value={xi} onChange={(e) => setXi(+e.target.value)} style={selStyle}>
            {factors.map((f, i) => <option key={i} value={i}>{f.n}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          Axe Y :
          <select value={yi} onChange={(e) => setYi(+e.target.value)} style={selStyle}>
            {factors.map((f, i) => <option key={i} value={i}>{f.n}</option>)}
          </select>
        </label>
        <Btn onClick={draw}>Tracer</Btn>
      </div>
      <canvas ref={canvasRef} width={460} height={320} style={{
        borderRadius: 8, width: "100%", maxWidth: 460, height: "auto",
        border: "0.5px solid var(--border)", display: "block",
      }} />
    </Card>
  );
}

// ─── canvas résidus ────────────────────────────────────────────────────────────
function ResidualsCanvas({ stats, ys, dark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = canvas.offsetWidth || 640; canvas.height = 210;
    const ctx = canvas.getContext("2d"), W = canvas.width, H = 210;
    const pad = { l: 48, r: 24, t: 32, b: 40 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, ne = ys.length;
    ctx.clearRect(0, 0, W, H);

    const bg = dark ? "#1e293b" : "#ffffff";
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const allR = stats.flatMap((s) => s.resids);
    const rmax = Math.max(...allR.map(Math.abs), 0.001) * 1.35;
    const y0 = pad.t + ih / 2;

    // Grille
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    for (let g = 1; g <= 3; g++) {
      const yg = pad.t + ih * g / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, yg); ctx.lineTo(pad.l + iw, yg); ctx.stroke();
    }

    // Ligne zéro
    ctx.beginPath(); ctx.setLineDash([4, 4]);
    ctx.strokeStyle = dark ? "rgba(200,200,200,0.25)" : "rgba(0,0,0,0.20)";
    ctx.lineWidth = 1; ctx.moveTo(pad.l, y0); ctx.lineTo(pad.l + iw, y0); ctx.stroke(); ctx.setLineDash([]);

    // Bordure
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.5; ctx.strokeRect(pad.l, pad.t, iw, ih);

    const cols = [T.green, T.purple, T.red];
    const step = iw / (ne + 1);

    stats.forEach((s, mi) => {
      ctx.fillStyle = cols[mi];
      s.resids.forEach((r, i) => {
        const x = pad.l + (i + 1) * step;
        const y = y0 - r / rmax * (ih / 2);
        // Ligne verticale depuis zéro
        ctx.strokeStyle = cols[mi] + "44"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y); ctx.stroke();
        // Point
        ctx.fillStyle = cols[mi];
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      });
    });

    // Labels axes
    const axColor = dark ? "rgba(180,180,180,0.6)" : "rgba(80,80,80,0.75)";
    ctx.fillStyle = axColor; ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < ne; i++) ctx.fillText(i + 1, pad.l + (i + 1) * step, H - 6);
    ctx.textAlign = "right";
    ctx.fillText("0", pad.l - 5, y0 + 4);
    ctx.fillText("+" + rmax.toFixed(2), pad.l - 5, pad.t + 10);
    ctx.fillText("−" + rmax.toFixed(2), pad.l - 5, pad.t + ih - 2);

    // Titre
    ctx.fillStyle = axColor; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("Résidus par essai", W / 2, 15);

    // Légende
    let lx = pad.l;
    stats.forEach((s, mi) => {
      const ly = H - 8;
      ctx.fillStyle = cols[mi]; ctx.beginPath(); ctx.arc(lx + 5, ly, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = axColor; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "left";
      const lbl = s.lb.replace("Modèle ", ""); ctx.fillText(lbl, lx + 13, ly + 4); lx += lbl.length * 5.5 + 24;
    });
  }, [stats, ys, dark]);

  return (
    <canvas ref={canvasRef} height={210} style={{
      marginTop: 16, borderRadius: 8, width: "100%",
      border: "0.5px solid var(--border)", display: "block",
    }} />
  );
}

// ─── step 4 : résultats ────────────────────────────────────────────────────────
function Step4({ factors, rname, runit, C, ys, yc, useCenter, mse, rawObs, onBack, onRestart }) {
  const { dark } = useTheme();
  const n = factors.length;
  const all = getTerms(n);

  // Statistiques de tous les modèles (toujours calculées)
  const mDefs = MODEL_DEFS.filter((d) => d.id !== "cub" || n >= 3).map((d) => ({
    ...d, ts: all.filter((t) => t.o <= d.maxOrder),
  }));

  // ── Remodélisation : termes exclus par l'utilisateur ──────────────────────────
  const allTermsForRemodel = all.filter((t) => t.o >= 1);
  const [excludedTerms, setExcludedTerms] = useState(new Set());
  const [compareApplied, setCompareApplied] = useState(false);

  // Seuil "faible" : < 15% du max de tous les coefficients du modèle complet
  const fullC = fitModel(all, ys, n);
  const globalMax = Math.max(...allTermsForRemodel.map((t) => Math.abs(fullC[t.lb] || 0)), 0.001);
  const isTiny = (t) => Math.abs(fullC[t.lb] || 0) / globalMax < 0.15;

  // Termes actifs = modèle remodélisé (constante + termes non exclus)
  const hasRemodel = excludedTerms.size > 0;
  const activeTerms = [all[0], ...allTermsForRemodel.filter((t) => !excludedTerms.has(t.lb))];
  const remodelC = fitModel(activeTerms, ys, n);
  const remodelStats = rawObs
    ? calcStatsWithReps(activeTerms, remodelC, rawObs)
    : calcStats(activeTerms, remodelC, ys, n);

  // stats des 3 modèles standards (toujours présentes)
  // Si rawObs disponible (répétitions), on calcule les stats sur toutes les observations
  const stats = mDefs.map((m) => {
    const Cm = fitModel(m.ts, ys, n);
    const st = rawObs
      ? calcStatsWithReps(m.ts, Cm, rawObs)
      : calcStats(m.ts, Cm, ys, n);
    return { ...m, Cm, ...st };
  });

  // Modèle remodélisé comme objet stat
  const remodelStatObj = {
    id: "remodel", lb: "Modèle remodélisé",
    col: T.purple, bg: T.purpleBg,
    ts: activeTerms, Cm: remodelC,
    ...remodelStats,
  };

  // displayStats : si compareApplied et hasRemodel, le remodélisé remplace le modèle standard
  // dont il est le sous-ensemble (le plus grand maxOrder couvert par les termes actifs)
  const remodelMaxOrder = hasRemodel ? Math.max(...activeTerms.map((t) => t.o)) : 0;
  const replaceIdx = hasRemodel && compareApplied
    ? stats.reduce((best, s, i) => s.ts.length >= activeTerms.length && s.ts.length < stats[best].ts.length ? i : best,
        stats.findIndex((s) => s.ts.length >= activeTerms.length) >= 0
          ? stats.findIndex((s) => s.ts.length >= activeTerms.length)
          : stats.length - 1)
    : -1;

  const displayStats = (hasRemodel && compareApplied)
    ? stats.map((s, i) => i === replaceIdx ? { ...remodelStatObj, _replacedModel: s.lb } : s)
    : stats;

  let bestIdx = 0;
  displayStats.forEach((s, i) => { if (s.R2adj > displayStats[bestIdx].R2adj) bestIdx = i; });

  // Équation remodélisée
  const remodelEq = rname + (runit ? ` (${runit})` : "") + " = " +
    activeTerms.map((t, i) => {
      const v = remodelC[t.lb] || 0, av = Math.abs(v).toFixed(4);
      const sg = i === 0 ? "" : (v >= 0 ? " + " : " − ");
      const xp = t.o === 0 ? "" : " · X" + t.ix.map((j) => sb(j + 1)).join("·X");
      return sg + av + xp;
    }).join("");

  // ── Tableau comparaison des modèles (dans onglet remodel) ────────────────────
  // Calcule les stats pour chaque modèle avec les termes actuellement actifs
  // Le modèle remodélisé = termes actifs, les 3 standards = leurs termes propres
  const modelCompareRows = [
    {
      id: "lin",
      lb: "Modèle linéaire",
      col: T.green, bg: T.greenBg,
      ts: all.filter(t => t.o <= 1),
    },
    {
      id: "quad",
      lb: "Modèle quadratique",
      col: T.purple, bg: T.purpleBg,
      ts: all.filter(t => t.o <= 2),
    },
    ...(n >= 3 ? [{
      id: "cub",
      lb: "Modèle cubique",
      col: T.red, bg: T.redBg,
      ts: all.filter(t => t.o <= 99),
    }] : []),
  ].map(m => {
    // Pour chaque modèle standard, on filtre avec les termes exclus
    const ts = [all[0], ...m.ts.filter(t => t.o >= 1 && !excludedTerms.has(t.lb))];
    const Cm = fitModel(ts, ys, n);
    const st = rawObs ? calcStatsWithReps(ts, Cm, rawObs) : calcStats(ts, Cm, ys, n);
    return { ...m, ts, nbCoeff: ts.length, ...st };
  });

  // Trouver le meilleur R²adj parmi les 3 modèles pour le surlignage
  const bestCompareIdx = modelCompareRows.reduce((bi, m, i) =>
    m.R2adj > modelCompareRows[bi].R2adj ? i : bi, 0);

  // ── Tableau comparatif (rendu inline dans RemodelBlock) ──────────────────────
  const renderCompareTable = () => {
    const rowDefs = [
      { key: "nbCoeff", label: "Nb coefficients",  fmt: (s) => s.nbCoeff,          color: ()     => "var(--text)",        bold: false },
      { key: "R2",      label: "R²",               fmt: (s) => s.R2.toFixed(4),    color: (s)    => s.R2    > 0.9 ? T.green : s.R2    > 0.7 ? T.amber : T.red, bold: true },
      { key: "R2adj",   label: "R² ajusté",        fmt: (s) => s.R2adj.toFixed(4), color: (s, i) => i === bestCompareIdx ? T.green : s.R2adj > 0.7 ? T.amber : T.red, bold: true, isBestRow: true },
      { key: "F",       label: "F calculé",        fmt: (s) => s.F  !== null ? s.F.toFixed(3)  : "—", color: () => "var(--text)",        bold: false },
      { key: "pF",      label: "Prob > F",         fmt: (s) => s.pF !== null ? (s.pF < 0.0001 ? "< 0.0001" : s.pF.toFixed(4)) : "—",
        color: (s) => s.pF !== null && s.pF < 0.05 ? T.green : s.pF !== null ? T.red : "var(--text-muted)", bold: true },
      { key: "ddl",     label: "ddl rég. / rés.",  fmt: (s) => `${s.dfR} / ${s.dfE}`, color: () => "var(--text-muted)", bold: false },
    ];
    const colW = `${Math.round(80 / modelCompareRows.length)}%`;
    return (
      <>
        {excludedTerms.size > 0 && (
          <p style={{ fontSize: 11, color: T.amber, margin: "0 0 8px", lineHeight: 1.4 }}>
            ⚠ {excludedTerms.size} terme{excludedTerms.size > 1 ? "s" : ""} exclu{excludedTerms.size > 1 ? "s" : ""} — valeurs recalculées automatiquement.
          </p>
        )}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 110, width: "22%", paddingLeft: 8 }}>Critère</th>
                {modelCompareRows.map((m, i) => (
                  <th key={m.id} style={{
                    ...thStyle, color: m.col, width: colW,
                    background: i === bestCompareIdx
                      ? (dark ? `${m.col}25` : m.bg)
                      : "var(--bg-card)",
                    borderBottom: i === bestCompareIdx ? `2px solid ${m.col}` : `0.5px solid var(--border)`,
                  }}>
                    {m.lb.replace("Modèle ", "")}
                    {i === bestCompareIdx && (
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: m.col }}>★ meilleur</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowDefs.map((row, ri) => (
                <tr key={row.key} style={{ background: ri % 2 === 0 ? "transparent" : "var(--bg-card)" }}>
                  <td style={{ ...tdStyle, textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--text-muted)", paddingLeft: 8 }}>
                    {row.label}
                  </td>
                  {modelCompareRows.map((m, i) => {
                    const isBest = row.isBestRow && i === bestCompareIdx;
                    return (
                      <td key={m.id} style={{
                        ...tdStyle, fontWeight: row.bold ? 700 : 400, color: row.color(m, i),
                        background: isBest ? (dark ? `${m.col}20` : `${m.bg}88`) : "transparent",
                        fontVariantNumeric: "tabular-nums", fontSize: 12,
                      }}>
                        {row.fmt(m)}{isBest && <span style={{ marginLeft: 3, fontSize: 9, color: m.col }}>▲</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: "var(--text-muted)" }}>
          <span><span style={{ color: T.green, fontWeight: 700 }}>■</span> Favorable</span>
          <span><span style={{ color: T.amber, fontWeight: 700 }}>■</span> Acceptable</span>
          <span><span style={{ color: T.red,   fontWeight: 700 }}>■</span> Défavorable</span>
          <span><span style={{ fontWeight: 700 }}>★</span> Meilleur R²adj</span>
        </div>
      </>
    );
  };

  // ── ModelCompareTable conservé pour compatibilité (non utilisé dans remodel) ─
  const ModelCompareTable = () => null;

  const RemodelBlock = () => (
    <Card style={{ border: `1px solid ${T.purple}44` }}>
      {/* ── 1. Tableau comparatif ── */}
      <SectionTitle>Tableau comparatif — statistiques par modèle</SectionTitle>
      {renderCompareTable()}

      {/* ── Séparateur ── */}
      <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

      {/* ── 2. Sélection des termes ── */}
      <SectionTitle>Sélection des termes — optimisation</SectionTitle>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
        Décochez les termes à exclure. Termes faibles (&lt;15 % du max) signalés par ⚠.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6, marginBottom: 10 }}>
        {allTermsForRemodel.map((t) => {
          const v       = fullC[t.lb] || 0;
          const excluded = excludedTerms.has(t.lb);
          const tiny    = isTiny(t);
          const lb      = t.o === 1 ? factors[t.ix[0]].n : t.ix.map((j) => factors[j].n.split(" ")[0]).join(" × ");
          const pct     = Math.round(Math.abs(v) / globalMax * 100);
          return (
            <label key={t.lb} onClick={() => {
              const s = new Set(excludedTerms);
              if (s.has(t.lb)) s.delete(t.lb); else s.add(t.lb);
              setExcludedTerms(s); setCompareApplied(false);
            }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              borderRadius: 7, cursor: "pointer",
              border: tiny && !excluded ? `1px dashed ${T.amber}` : "0.5px solid var(--border)",
              background: excluded
                ? "var(--bg-card)"
                : tiny
                  ? (dark ? `rgba(186,117,23,0.14)` : T.amberBg)
                  : "var(--bg)",
              opacity: excluded ? 0.4 : 1,
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              minHeight: 40, userSelect: "none",
            }}>
              <input type="checkbox" checked={!excluded} readOnly
                style={{ accentColor: T.purple, width: 15, height: 15, flexShrink: 0, pointerEvents: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lb}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <div style={{ width: 44, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: v >= 0 ? T.green : T.red, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: v >= 0 ? T.green : T.red, fontWeight: 700 }}>{v.toFixed(2)}</span>
                  {tiny && <span style={{ fontSize: 9, color: T.amber, fontWeight: 700 }}>⚠</span>}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* ── Aperçu stats remodélisé ── */}
      <div style={{
        background: dark ? `rgba(83,74,183,0.14)` : T.purpleBg,
        borderRadius: 7, padding: "8px 12px",
        border: `1px solid ${T.purple}55`, marginBottom: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.purple, marginBottom: 5 }}>
          Aperçu — {activeTerms.length - 1} terme{activeTerms.length > 2 ? "s" : ""}
        </div>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--text)", wordBreak: "break-word", lineHeight: 1.8, marginBottom: 6 }}>{remodelEq}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11 }}>
          {[
            ["R²",           remodelStats.R2.toFixed(4),    remodelStats.R2    > 0.9  ? T.green : T.amber],
            ["R² ajusté",    remodelStats.R2adj.toFixed(4), remodelStats.R2adj > 0.85 ? T.green : T.amber],
            ["F",            remodelStats.F  !== null ? remodelStats.F.toFixed(3)  : "—", "var(--text)"],
            ["Prob > F",     remodelStats.pF !== null ? (remodelStats.pF < 0.0001 ? "< 0.0001" : remodelStats.pF.toFixed(4)) : "—",
              remodelStats.pF !== null && remodelStats.pF < 0.05 ? T.green : T.red],
            ["ddl rég./rés.", `${remodelStats.dfR} / ${remodelStats.dfE}`, "var(--text-muted)"],
          ].map(([lbl, val, col]) => (
            <div key={lbl} style={{ lineHeight: 1.5 }}>
              <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{lbl}</div>
              <strong style={{ color: col, fontSize: 12 }}>{val}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Btn onClick={() => { setExcludedTerms(new Set()); setCompareApplied(false); }}>Tout réactiver</Btn>
        <Btn onClick={() => {
          const s = new Set(allTermsForRemodel.filter(isTiny).map((t) => t.lb));
          setExcludedTerms(s); setCompareApplied(false);
        }} style={{ color: T.amber, borderColor: T.amber }}>⚠ Termes faibles</Btn>
        {hasRemodel && (
          <Btn variant="primary" onClick={() => setCompareApplied(true)}
            style={{ background: compareApplied ? T.green : T.purple, border: "none" }}>
            {compareApplied ? "✓ Mis à jour" : "↑ Mettre à jour"}
          </Btn>
        )}
      </div>
      {hasRemodel && !compareApplied && (
        <p style={{ fontSize: 10, color: T.amber, marginTop: 6, lineHeight: 1.4 }}>
          ⚠ Cliquez sur "Mettre à jour" pour intégrer le modèle remodélisé dans les autres onglets.
        </p>
      )}
    </Card>
  );

  // Bloc point central
  const CentralBlock = () => {
    if (!useCenter || C._cv === undefined) return null;
    const cv = C._cv;
    const sig = Math.abs(cv) > (Math.abs(C._ym) * 0.05 + 0.001);
    return (
      <div style={{
        background: dark
          ? (sig ? "rgba(186,117,23,0.14)" : "rgba(15,110,86,0.14)")
          : (sig ? T.amberBg : T.greenBg),
        border: `0.5px solid ${sig ? T.amber : T.green}`,
        color: sig ? T.amber : T.green, borderRadius: 8, padding: "10px 14px", fontSize: 12,
        lineHeight: 1.9, marginBottom: "0.75rem",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 3 }}>Analyse du point central</div>
        Moyenne factorielle ȳ : <strong>{C._ym.toFixed(4)}</strong><br />
        Moyenne au centre ȳ₀ : <strong>{C._ymc.toFixed(4)}</strong><br />
        Courbure (ȳ₀ − ȳ) : <strong>{cv >= 0 ? "+" : ""}{cv.toFixed(4)}</strong>
        {" — "}<span style={{ fontSize: 11 }}>{sig ? "Courbure significative — envisager un plan composite." : "Courbure faible — plan factoriel adapté."}</span>
      </div>
    );
  };

  // Bloc tableau comparaison (commun aux deux modes)
  const CompareTable = ({ highlight }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: "1.25rem" }}>
      {displayStats.map((s, i) => {
        const isBest = i === bestIdx;
        const isHighlighted = highlight && s.id === "remodel";
        const isRemodel = s.id === "remodel";
        const pFstr = s.pF !== null ? (s.pF < 0.0001 ? "< 0.0001" : s.pF.toFixed(4)) : "—";
        const pFgood = s.pF !== null && s.pF < 0.05;
        const cardBg = isRemodel
          ? (dark ? `rgba(83,74,183,0.18)` : T.purpleBg)
          : isBest
            ? (dark ? `${s.col}22` : s.bg + "55")
            : "var(--bg)";
        return (
          <div key={i} style={{
            border: isRemodel ? `2px solid ${T.purple}` : isHighlighted ? `2px solid ${s.col}` : isBest ? `1.5px solid ${s.col}` : "0.5px solid var(--border)",
            borderRadius: 10, padding: 14, position: "relative",
            background: cardBg,
          }}>
            {isRemodel && (
              <span style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: T.purple, color: "#fff", fontSize: 10, padding: "2px 10px",
                borderRadius: 8, whiteSpace: "nowrap", fontWeight: 600,
              }}>✦ Remodélisé{s._replacedModel ? ` (remplace ${s._replacedModel.replace("Modèle ", "")})` : ""}</span>
            )}
            {!isRemodel && isBest && (
              <span style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: s.col, color: "#fff", fontSize: 10, padding: "2px 10px",
                borderRadius: 8, whiteSpace: "nowrap", fontWeight: 600,
              }}>{isHighlighted ? "Votre modèle • Meilleur" : "Meilleur ajustement"}</span>
            )}
            {!isRemodel && isHighlighted && !isBest && (
              <span style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: s.col, color: "#fff", fontSize: 10, padding: "2px 10px",
                borderRadius: 8, whiteSpace: "nowrap", fontWeight: 600,
              }}>Votre modèle</span>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: s.col, marginBottom: 12 }}>{s.lb}</div>
            {[
              ["Nb coefficients", s.ts.length, ""],
              ["R²", s.R2.toFixed(4), s.R2 > 0.9 ? "good" : s.R2 > 0.7 ? "warn" : "bad"],
              ["R² ajusté", s.R2adj.toFixed(4), s.R2adj > 0.85 ? "good" : s.R2adj > 0.6 ? "warn" : "bad"],
              ["F calculé", s.F !== null ? s.F.toFixed(3) : "—", ""],
              ["Prob > F", pFstr, pFgood ? "good" : "bad"],
              ["ddl rég. / rés.", `${s.dfR} / ${s.dfE}`, ""],
            ].map(([lbl, val, cls], ri) => (
              <div key={ri} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: ri < 5 ? "0.5px solid var(--border)" : "none", fontSize: 12,
              }}>
                <span style={{ color: "var(--text-muted)" }}>{lbl}</span>
                <span style={{ fontWeight: 600, color: cls === "good" ? T.green : cls === "bad" ? T.red : cls === "warn" ? T.amber : "var(--text)" }}>{val}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  // Bloc conclusion (commun)
  const Conclusion = () => {
    const best = displayStats[bestIdx];
    const pOk = best.pF !== null && best.pF < 0.05;
    const r2Ok = best.R2adj > 0.8;
    const label = best.id === "remodel" ? "Le modèle remodélisé" : best.lb;
    let concl = `${label} présente le meilleur R² ajusté (${best.R2adj.toFixed(4)})`;
    if (pOk) concl += `, avec Prob > F = ${best.pF < 0.0001 ? "< 0.0001" : best.pF.toFixed(4)} — le modèle est statistiquement significatif`;
    else concl += `, mais Prob > F = ${best.pF !== null ? best.pF.toFixed(4) : "—"} — le modèle n'est pas significatif au seuil 5 %`;
    if (!r2Ok) concl += `. R² ajusté faible — ajustement imparfait`;
    concl += `. La somme des résidus est nulle (propriété des moindres carrés).`;
    const col = pOk && r2Ok ? T.green : T.amber;
    const bg  = dark
      ? (pOk && r2Ok ? "rgba(15,110,86,0.14)" : "rgba(186,117,23,0.14)")
      : (pOk && r2Ok ? T.greenBg : T.amberBg);
    return (
      <div style={{ background: bg, border: `0.5px solid ${col}`, color: col, borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.8, marginTop: "0.75rem" }}>
        <div style={{ fontWeight: 600, marginBottom: 3 }}>Conclusion</div>
        {concl}
      </div>
    );
  };


  // ── TABS ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("modeles");

  const TABS = [
    { id: "modeles",       label: "Modèles",          icon: "◈" },
    { id: "residus",       label: "Résidus",           icon: "∿" },
    { id: "pareto",        label: "Pareto",            icon: "▦" },
    { id: "iso",           label: "Isoréponses",       icon: "⬡" },
    { id: "remodel",       label: "Optimisation modèle", icon: "✦", badge: hasRemodel && !compareApplied },
  ];

  // ── données pour les onglets ───────────────────────────────────────────────────
  const bestStat = displayStats[bestIdx];
  const bestC    = bestStat.Cm;
  const bestTs   = bestStat.ts;
  const bestMt   = bestTs.filter((t) => t.o >= 1);
  const bestMx   = Math.max(...bestMt.map((t) => Math.abs(bestC[t.lb] || 0)), 0.001);

  // Équation du meilleur modèle
  const eqBest = rname + (runit ? ` (${runit})` : "") + " = " +
    bestTs.map((t, i) => {
      const v = bestC[t.lb] || 0, av = Math.abs(v).toFixed(4);
      const sg = i === 0 ? "" : (v >= 0 ? " + " : " − ");
      const xp = t.o === 0 ? "" : " · X" + t.ix.map((j) => sb(j + 1)).join("·X");
      return sg + av + xp;
    }).join("");

  const tabBar = (
    <div className="mb-6">
      {/* Mobile : select */}
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          aria-label="Sélectionner un onglet"
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-gray-100 dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-indigo-500"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}{tab.badge ? " ●" : ""}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400"
        />
      </div>
      {/* Desktop : nav */}
      <div className="hidden sm:block">
        <nav aria-label="Onglets résultats" className="flex space-x-1 border-b border-gray-200 dark:border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={classNames(
                activeTab === tab.id
                  ? "border-b-2 border-gray-800 text-gray-900 dark:border-white dark:text-white"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px"
              )}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
              {tab.badge && (
                <span className="ml-1 inline-block w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", margin: 0 }}>Résultats</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Plan factoriel 2{SUP[n]} — {ys.length} essais</span>
      </div>

      <CentralBlock />
      <div style={{ marginBottom: "0.5rem" }}>{tabBar}</div>

      {/* ── Onglet Modèles ── */}
      {activeTab === "modeles" && (
        <div>
          <Card>
            <SectionTitle>Comparaison des modèles</SectionTitle>
            <CompareTable highlight={false} />
            <Conclusion />
          </Card>
          <Card>
            <SectionTitle>Meilleur modèle — {bestStat.lb}</SectionTitle>
            <div style={{
              fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "var(--text)",
              background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 7,
              padding: "10px 14px", lineHeight: 2, wordBreak: "break-word", marginBottom: "1.25rem",
            }}>{eqBest}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {bestTs.map((t, i) => {
                const v = bestC[t.lb] || 0;
                const lb = t.o === 0 ? "Constante (α₀)"
                  : t.o === 1 ? factors[t.ix[0]].n
                  : t.ix.map((j) => factors[j].n.split(" ")[0]).join(" × ");
                const tag = t.o === 0 ? "cst" : t.o === 1 ? "eff" : "int";
                const tagColors = { cst: [T.purple, T.purpleBg], eff: [T.green, T.greenBg], int: [T.red, T.redBg] };
                const [tc, tbg] = tagColors[tag];
                return (
                  <div key={i} style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: tc, background: tbg, borderRadius: 4, padding: "2px 6px", display: "inline-block", marginBottom: 6 }}>
                      {tag === "cst" ? "constante" : tag === "eff" ? "effet" : "interaction"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 4 }}>{lb}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{v.toFixed(3)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Onglet Résidus ── */}
      {activeTab === "residus" && (
        <Card>
          <SectionTitle>Résidus par essai (Y mesuré − Ŷ calculé)</SectionTitle>
          <ResidualsCanvas stats={displayStats} ys={ys} dark={dark} />
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Essai</th>
                  <th style={thStyle}>Y mesuré</th>
                  {displayStats.map((s, i) => [
                    <th key={"h"+i+"a"} style={{ ...thStyle, color: s.col }}>Ŷ {s.lb.replace("Modèle ", "")}</th>,
                    <th key={"h"+i+"b"} style={{ ...thStyle, color: s.col }}>Résidu</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {ys.map((y, r) => (
                  <tr key={r} style={{ background: r % 2 === 0 ? "transparent" : "var(--bg-card)" }}>
                    <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{r + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{y.toFixed(3)}</td>
                    {displayStats.flatMap((s, i) => {
                      const res = s.resids[r];
                      return [
                        <td key={"r"+i+"a"} style={tdStyle}>{s.yhat[r].toFixed(3)}</td>,
                        <td key={"r"+i+"b"} style={{ ...tdStyle, color: res >= 0 ? T.green : T.red, fontWeight: 500 }}>{res >= 0 ? "+" : ""}{res.toFixed(3)}</td>,
                      ];
                    })}
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-card)" }}>
                  <td colSpan={2} style={{ ...tdStyle, fontWeight: 600, textAlign: "right", color: "var(--text-muted)" }}>Somme :</td>
                  {displayStats.flatMap((s, i) => {
                    const sum = s.resids.reduce((a, b) => a + b, 0);
                    return [
                      <td key={"s"+i+"a"} style={tdStyle}></td>,
                      <td key={"s"+i+"b"} style={{ ...tdStyle, fontWeight: 600, color: "var(--text-muted)" }}>{sum >= 0 ? "+" : ""}{sum.toFixed(4)}</td>,
                    ];
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Onglet Pareto ── */}
      {activeTab === "pareto" && (
        <Card>
          <SectionTitle>Importance relative des effets — {bestStat.lb}</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Les barres représentent la valeur absolue de chaque coefficient. Les effets les plus influents apparaissent en tête.
          </p>
          {[...bestMt].sort((a, b) => Math.abs(bestC[b.lb] || 0) - Math.abs(bestC[a.lb] || 0)).map((t, i) => {
            const v = bestC[t.lb] || 0;
            const pct = Math.round(Math.abs(v) / bestMx * 100);
            const lb = t.o === 1 ? factors[t.ix[0]].n : t.ix.map((j) => factors[j].n.split(" ")[0]).join(" × ");
            const tiny = Math.abs(v) / bestMx < 0.15;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <span style={{ width: 220, textAlign: "right", color: tiny ? "var(--text-muted)" : "var(--text)", fontSize: 12, flexShrink: 0, lineHeight: 1.3, opacity: tiny ? 0.6 : 1 }}>{lb}</span>
                <div style={{ flex: 1, height: 22, background: "var(--bg-card)", borderRadius: 5, overflow: "hidden", border: "0.5px solid var(--border)", position: "relative" }}>
                  <div style={{ height: "100%", width: pct + "%", borderRadius: 5, background: v >= 0 ? T.green : T.red, transition: "width 0.4s ease", opacity: tiny ? 0.4 : 1 }} />
                </div>
                <span style={{ width: 64, fontWeight: 600, color: v >= 0 ? T.green : T.red, fontSize: 13, fontVariantNumeric: "tabular-nums", opacity: tiny ? 0.55 : 1 }}>{v >= 0 ? "+" : ""}{v.toFixed(3)}</span>
                {tiny && <span style={{ fontSize: 10, color: T.amber, fontWeight: 700, flexShrink: 0 }}>⚠</span>}
              </div>
            );
          })}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)", fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span><span style={{ color: T.green, fontWeight: 600 }}>■</span> Effet positif</span>
            <span><span style={{ color: T.red, fontWeight: 600 }}>■</span> Effet négatif</span>
            <span><span style={{ color: T.amber, fontWeight: 600 }}>⚠</span> Effet faible (&lt;15 % du max)</span>
          </div>
        </Card>
      )}

      {/* ── Onglet Isoréponses ── */}
      {activeTab === "iso" && n >= 2 && (
        <IsoCanvas factors={factors} C={bestC} rname={rname} runit={runit} dark={dark} />
      )}

      {/* ── Onglet Remodélisation ── */}
      {activeTab === "remodel" && (
        <div>
          <RemodelBlock />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
        <Btn onClick={onBack}>← Retour</Btn>
        <Btn variant="primary" onClick={onRestart}>Nouveau plan</Btn>
      </div>
    </div>
  );
}

export default function PlanFactoriel({ onBack }) {
  const { dark } = useTheme();
  const [step, setStep] = useState(1);
  const [factors, setFactors] = useState([
    { n: "Facteur 1", u: "", lo: "", mi: "", hi: "" },
    { n: "Facteur 2", u: "", lo: "", mi: "", hi: "" },
  ]);
  const [useCenter, setUseCenter]   = useState(false);
  const [nrep, setNrep]             = useState(3);
  const [rname, setRname]           = useState("Y");
  const [runit, setRunit]           = useState("");
  const [responses, setResponses]   = useState([]);
  const [centerResponses, setCenterResponses] = useState([]);
  const [C, setC]   = useState({});
  const [ys, setYs] = useState([]);
  const [yc, setYc] = useState([]);
  const [mse, setMse] = useState(null);
  const [rawObs, setRawObs] = useState(null); // observations brutes pour stats avec répétitions
  const [maxStep, setMaxStep] = useState(1);

  function handleCalc(ysArr, ycArr, mseObj, rawObsArr) {
    const n = factors.length, ne = 1 << n, all = getTerms(n), newC = {};
    all.forEach((t) => {
      let s = 0;
      for (let r = 0; r < ne; r++) {
        const lv = lvls(r, n);
        const xp = t.o === 0 ? 1 : t.ix.reduce((a, j) => a * lv[j], 1);
        s += xp * ysArr[r];
      }
      newC[t.lb] = s / ne;
    });
    if (useCenter && ycArr.length) {
      const ym = ysArr.reduce((a, b) => a + b) / ne;
      const ymc = ycArr.reduce((a, b) => a + b) / ycArr.length;
      newC._cv = ymc - ym; newC._ym = ym; newC._ymc = ymc;
      newC._s2 = ycArr.length > 1 ? ycArr.reduce((s, v) => s + (v - ymc) ** 2, 0) / (ycArr.length - 1) : null;
    }
    setC(newC); setYs(ysArr); setYc(ycArr); setMse(mseObj || null);
    setRawObs(rawObsArr || null);
    setStep(3); setMaxStep(3);
  }

  function restart() {
    setStep(1); setMaxStep(1);
    setFactors([{ n: "Facteur 1", u: "", lo: "", mi: "", hi: "" }, { n: "Facteur 2", u: "", lo: "", mi: "", hi: "" }]);
    setUseCenter(false); setNrep(3); setRname("Y"); setRunit("");
    setResponses([]); setCenterResponses([]);
    setC({}); setYs([]); setYc([]); setMse(null); setRawObs(null);
    window.__exResponses = null; window.__exReps = null;
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "var(--text)", maxWidth: 1040, margin: "0 auto", padding: "1rem 0" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: "1rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0", color: "var(--text)" }}>Plans factoriels 2ⁿ</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Effets principaux & interactions · BTS Chimie</span>
      </div>

      {/* Barre de progression cliquable */}
      <ProgressBar step={step} maxStep={maxStep} onStep={(n) => setStep(n)} />

      {/* Étapes */}
      {step === 1 && (
        <Step1
          factors={factors} setFactors={setFactors}
          useCenter={useCenter} setUseCenter={setUseCenter}
          nrep={nrep} setNrep={setNrep}
          rname={rname} setRname={setRname}
          runit={runit} setRunit={setRunit}
          onNext={() => { setStep(2); setMaxStep((m) => Math.max(m, 2)); }}
        />
      )}
      {step === 2 && (
        <Step3
          factors={factors}
          useCenter={useCenter} nrep={nrep}
          rname={rname} runit={runit}
          responses={responses} setResponses={setResponses}
          centerResponses={centerResponses} setCenterResponses={setCenterResponses}
          onBack={() => setStep(1)} onCalc={handleCalc}
        />
      )}
      {step === 3 && (
        <Step4
          factors={factors}
          rname={rname} runit={runit}
          C={C} ys={ys} yc={yc} useCenter={useCenter} mse={mse} rawObs={rawObs}
          onBack={() => setStep(2)} onRestart={restart}
        />
      )}
    </div>
  );
}