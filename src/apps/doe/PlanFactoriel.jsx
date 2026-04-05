import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../ThemeContext";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { EXAMPLE_FILES } from "./exampleFiles";

// ─── utilitaires ──────────────────────────────────────────────────────────────

function genMatrix(factors, responses, centerPoint) {
  const n = factors.length;
  const rows = [];
  const total = 1 << n;
  for (let r = 0; r < total; r++) {
    const coded = {}, real = {};
    for (let f = 0; f < n; f++) {
      const bit = (r >> (n - 1 - f)) & 1;
      const fac = factors[f];
      coded[fac.id] = bit === 0 ? -1 : 1;
      real[fac.id] = fac.continuous
        ? (bit === 0 ? fac.low.real : fac.high.real)
        : (bit === 0 ? (fac.low.label || "−1") : (fac.high.label || "+1"));
    }
    const rv = {};
    responses.forEach(r => { rv[r.id] = ""; });
    rows.push({ id: r + 1, coded, real, center: false, responses: rv });
  }
  if (centerPoint.present) {
    for (let i = 0; i < centerPoint.replicates; i++) {
      const coded = {}, real = {};
      factors.forEach(f => {
        coded[f.id] = 0;
        real[f.id] = f.continuous ? +((f.low.real + f.high.real) / 2).toFixed(3) : null;
      });
      const rv = {};
      responses.forEach(r => { rv[r.id] = ""; });
      rows.push({ id: rows.length + 1, coded, real, center: true, responses: { ...rv } });
    }
  }
  return rows;
}

function computeDefaultModel(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const terms = [...ids];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      terms.push(ids[i] + ids[j]);
  if (n > 2) terms.pop();
  return terms;
}

function getAllPossibleTerms(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const t = [...ids];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) t.push(ids[i] + ids[j] + ids[k]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++) t.push(ids[i] + ids[j] + ids[k] + ids[l]);
  return t;
}

function computePresetModel(preset, factors, modelDefault) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  if (preset === "linear") return [...ids];
  if (preset === "quadratic") {
    const t = [...ids];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    return t;
  }
  if (preset === "cubic") {
    const t = [...ids];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++) t.push(ids[i] + ids[j] + ids[k]);
    return t;
  }
  return [...modelDefault];
}

function termOrder(t, factors) {
  return factors.filter(f => t.includes(f.id)).length;
}

function formatTermDisplay(t, factors) {
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X" + (i + 1)); });
  return s;
}

function termSubScript(t, factors) {
  let s = t;
  factors.forEach((f, i) => { s = s.replaceAll(f.id, (i + 1).toString()); });
  return s;
}

function getMissingRows(matrix, responses) {
  const missing = [];
  matrix.forEach((row, ri) => {
    responses.forEach(resp => {
      const v = row.responses[resp.id];
      if (v === "" || v === null || v === undefined) missing.push(ri);
    });
  });
  return [...new Set(missing)];
}

// ─── styles inline (compatibles dark mode via CSS vars) ───────────────────────

const CSS = {
  app: { maxWidth: 920, margin: "0 auto", padding: "1rem 0", fontFamily: "var(--font-sans, system-ui)" },
  stepper: { display: "flex", alignItems: "center", gap: 0, marginBottom: "1.5rem" },
  stepItem: (active, done) => ({
    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
    padding: "6px 12px", borderRadius: "var(--border-radius-md, 8px)",
    background: "transparent",
  }),
  stepNum: (active, done) => ({
    width: 24, height: 24, borderRadius: "50%", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500,
    flexShrink: 0, border: "0.5px solid",
    background: done ? "#1D9E75" : active ? "var(--color-text-primary, #111)" : "var(--color-background-primary, #fff)",
    color: done ? "#fff" : active ? "var(--color-background-primary, #fff)" : "var(--color-text-secondary, #666)",
    borderColor: done ? "#1D9E75" : active ? "var(--color-text-primary, #111)" : "var(--color-border-secondary, #ccc)",
  }),
  stepLabel: (active) => ({
    fontSize: 13,
    color: active ? "var(--color-text-primary, #111)" : "var(--color-text-secondary, #666)",
    fontWeight: active ? 500 : 400,
  }),
  stepSep: { flex: 1, height: "0.5px", background: "var(--color-border-tertiary, #e5e5e5)", minWidth: 12, maxWidth: 40 },
  card: {
    background: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
    borderRadius: "var(--border-radius-lg, 12px)",
    padding: "1rem 1.25rem", marginBottom: "1rem", position: "relative",
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
    color: "var(--color-text-secondary, #666)", marginBottom: 10,
  },
  input: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 13,
    color: "var(--color-text-primary, #111)",
    background: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    borderRadius: "var(--border-radius-md, 8px)",
    padding: "5px 9px", height: 32, outline: "none", boxSizing: "border-box",
  },
  select: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 13,
    color: "var(--color-text-primary, #111)",
    background: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    borderRadius: "var(--border-radius-md, 8px)",
    padding: "5px 9px", height: 32, outline: "none",
  },
  btn: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 13, cursor: "pointer",
    padding: "6px 14px", height: 32,
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    background: "var(--color-background-primary, #fff)",
    color: "var(--color-text-primary, #111)",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  btnPrimary: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 13, cursor: "pointer",
    padding: "7px 18px", height: 36, fontWeight: 500,
    background: "var(--color-text-primary, #111)",
    color: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-text-primary, #111)",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  btnDanger: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 12, cursor: "pointer",
    padding: "3px 9px", height: 26,
    border: "0.5px solid #E24B4A", background: "transparent", color: "#A32D2D",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  btnSmall: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 12, cursor: "pointer",
    padding: "3px 9px", height: 26,
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    background: "var(--color-background-primary, #fff)",
    color: "var(--color-text-primary, #111)",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  btnWarn: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 12, cursor: "pointer",
    padding: "3px 9px", height: 26,
    background: "#FAEEDA", color: "#633806", border: "0.5px solid #EF9F27",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  btnAdd: {
    fontFamily: "var(--font-sans, system-ui)", fontSize: 12, cursor: "pointer",
    padding: "3px 9px", height: 26,
    border: "0.5px dashed var(--color-border-secondary, #ccc)",
    background: "transparent", color: "var(--color-text-secondary, #666)",
    borderRadius: "var(--border-radius-md, 8px)",
  },
  muted: { color: "var(--color-text-secondary, #666)", fontSize: 12 },
  divider: { height: "0.5px", background: "var(--color-border-tertiary, #e5e5e5)", margin: "12px 0" },
  row: { display: "flex", alignItems: "center", gap: 8 },
  sectionNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.25rem" },
  alertWarn: {
    background: "#FAEEDA", border: "0.5px solid #EF9F27",
    borderRadius: "var(--border-radius-md, 8px)",
    padding: "8px 12px", fontSize: 12, color: "#633806",
    marginBottom: 10, display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 12,
  },
  overlayWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.35)", display: "flex",
    alignItems: "center", justifyContent: "center",
    borderRadius: "var(--border-radius-lg, 12px)", zIndex: 10,
  },
  popupBox: {
    background: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    borderRadius: "var(--border-radius-lg, 12px)",
    padding: "1.25rem", maxWidth: 380, width: "100%",
  },
  modelTermOn: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 20, fontSize: 12,
    fontFamily: "var(--font-mono, monospace)", fontWeight: 500,
    cursor: "pointer", border: "0.5px solid #5DCAA5",
    background: "#E1F5EE", color: "#085041", margin: 3,
  },
  modelTermOff: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 20, fontSize: 12,
    fontFamily: "var(--font-mono, monospace)", fontWeight: 500,
    cursor: "pointer", border: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
    background: "var(--color-background-secondary, #f5f5f5)",
    color: "var(--color-text-secondary, #666)", margin: 3, opacity: 0.55,
  },
  modelTermConst: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 20, fontSize: 12,
    fontFamily: "var(--font-mono, monospace)", fontWeight: 500,
    cursor: "default", border: "0.5px solid #AFA9EC",
    background: "#EEEDFE", color: "#3C3489", margin: 3,
  },
  presetBtn: (sel) => ({
    padding: "5px 12px",
    border: sel ? "0.5px solid var(--color-text-primary, #111)" : "0.5px solid var(--color-border-secondary, #ccc)",
    borderRadius: "var(--border-radius-md, 8px)", fontSize: 12,
    background: sel ? "var(--color-text-primary, #111)" : "var(--color-background-primary, #fff)",
    color: sel ? "var(--color-background-primary, #fff)" : "var(--color-text-secondary, #666)",
    cursor: "pointer",
  }),
  levelBtn: (state) => {
    const base = { flex: 1, padding: "5px 4px", borderRadius: "var(--border-radius-md, 8px)", fontSize: 12, fontFamily: "var(--font-mono, monospace)", cursor: "pointer", textAlign: "center", border: "0.5px solid" };
    if (state === "neg") return { ...base, background: "#FAECE7", color: "#712B13", borderColor: "#F0997B", fontWeight: 500 };
    if (state === "pos") return { ...base, background: "#E1F5EE", color: "#085041", borderColor: "#5DCAA5", fontWeight: 500 };
    if (state === "zero") return { ...base, background: "#FAEEDA", color: "#633806", borderColor: "#EF9F27", fontWeight: 500 };
    return { ...base, background: "var(--color-background-primary, #fff)", color: "var(--color-text-secondary, #666)", borderColor: "var(--color-border-secondary, #ccc)" };
  },
};

// ─── composant principal ──────────────────────────────────────────────────────

export default function PlanFactoriel() {
  const { theme } = useTheme();
  // EXAMPLE_FILES disponible pour usage futur (chargement d'exemples)
  void EXAMPLE_FILES;
  // ChevronDownIcon disponible pour usage futur (selects customisés)

  const [part, setPart] = useState(1);
  const [factors, setFactors] = useState([
    { id: "X1", name: "Température", unit: "°C", continuous: true, low: { real: 60, coded: -1 }, high: { real: 80, coded: 1 } },
    { id: "X2", name: "pH", unit: "", continuous: true, low: { real: 4, coded: -1 }, high: { real: 7, coded: 1 } },
  ]);
  const [responses, setResponses] = useState([{ id: "Y1", name: "Rendement", unit: "%" }]);
  const [centerPoint, setCenterPoint] = useState({ present: false, replicates: 1 });
  const [matrix, setMatrix] = useState(null);
  const [modelDefault, setModelDefault] = useState(["X1", "X2", "X1X2"]);
  const [modelActive, setModelActive] = useState(["X1", "X2", "X1X2"]);
  const [modelPreset, setModelPreset] = useState("default");
  const [addRowLevels, setAddRowLevels] = useState(null);
  const [showCubicPopup, setShowCubicPopup] = useState(false);

  // ── navigation ──
  const goTo = (n) => {
    if (n === 2 && !matrix) setMatrix(genMatrix(factors, responses, centerPoint));
    setPart(n);
  };

  const buildMatrix = () => {
    const m = genMatrix(factors, responses, centerPoint);
    const def = computeDefaultModel(factors);
    setMatrix(m);
    setModelDefault(def);
    setModelActive([...def]);
    setModelPreset("default");
    setPart(2);
  };

  // ── facteurs ──
  const updateFactor = (i, key, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [key]: val };
    if (key === "continuous") {
      if (val) f[i].low = { real: 0, coded: -1 }, f[i].high = { real: 1, coded: 1 };
      else f[i].low = { label: "", coded: -1 }, f[i].high = { label: "", coded: 1 };
    }
    setFactors(f);
    const def = computeDefaultModel(f);
    setModelDefault(def); setModelActive([...def]); setModelPreset("default");
    setMatrix(null);
  };
  const updateFactorLevel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], real: +val } };
    setFactors(f);
  };
  const updateFactorLabel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], label: val } };
    setFactors(f);
  };
  const addFactor = () => {
    const n = factors.length + 1;
    const f = [...factors, { id: "X" + n, name: "Facteur " + n, unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } }];
    setFactors(f);
    const def = computeDefaultModel(f);
    setModelDefault(def); setModelActive([...def]); setModelPreset("default");
    setMatrix(null);
  };
  const removeFactor = (i) => {
    const f = factors.filter((_, j) => j !== i).map((fac, j) => ({ ...fac, id: "X" + (j + 1) }));
    setFactors(f);
    const def = computeDefaultModel(f);
    setModelDefault(def); setModelActive([...def]); setModelPreset("default");
    setMatrix(null);
  };

  // ── réponses ──
  const updateResponse = (i, key, val) => {
    const r = [...responses]; r[i] = { ...r[i], [key]: val }; setResponses(r);
  };
  const addResponse = () => {
    const n = responses.length + 1;
    setResponses([...responses, { id: "Y" + n, name: "Réponse " + n, unit: "" }]);
  };
  const removeResponse = (i) => setResponses(responses.filter((_, j) => j !== i));

  // ── matrice ──
  const updateCell = (ri, fid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], real: { ...m[ri].real, [fid]: +val } };
    setMatrix(m);
  };
  const updateResp = (ri, rid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], responses: { ...m[ri].responses, [rid]: val === "" ? "" : +val } };
    setMatrix(m);
  };
  const removeRun = (i) => setMatrix(matrix.filter((_, j) => j !== i));

  const openAddRow = () => {
    const lvls = {};
    factors.forEach(f => { lvls[f.id] = -1; });
    setAddRowLevels(lvls);
  };
  const confirmAddRow = () => {
    const lvls = addRowLevels;
    const coded = {}, real = {};
    factors.forEach(f => {
      const c = lvls[f.id];
      coded[f.id] = c;
      if (f.continuous) real[f.id] = c === -1 ? f.low.real : c === 1 ? f.high.real : +((f.low.real + f.high.real) / 2).toFixed(3);
      else real[f.id] = c === -1 ? (f.low.label || "−1") : (f.high.label || "+1");
    });
    const rv = {};
    responses.forEach(r => { rv[r.id] = ""; });
    setMatrix([...matrix, { id: matrix.length + 1, coded, real, center: false, responses: rv }]);
    setAddRowLevels(null);
  };

  const fillRandom = () => {
    const m = matrix.map(row => {
      const r = { ...row, responses: { ...row.responses } };
      responses.forEach(resp => {
        if (r.responses[resp.id] === "" || r.responses[resp.id] === null || r.responses[resp.id] === undefined)
          r.responses[resp.id] = +(Math.random() * 80 + 20).toFixed(2);
      });
      return r;
    });
    setMatrix(m);
  };

  // ── modèle ──
  const toggleTerm = (t) => {
    const idx = modelActive.indexOf(t);
    if (idx >= 0) setModelActive(modelActive.filter(x => x !== t));
    else setModelActive([...modelActive, t]);
    setModelPreset("custom");
  };
  const applyPreset = (p) => {
    if (p === "cubic" && factors.length < 3) { setShowCubicPopup(true); return; }
    setModelPreset(p);
    setModelActive(computePresetModel(p, factors, modelDefault));
  };
  const resetModel = () => { setModelActive([...modelDefault]); setModelPreset("default"); };

  const missingRows = matrix ? getMissingRows(matrix, responses) : [];
  const hasMissing = missingRows.length > 0;
  const isDefaultModel = JSON.stringify([...modelActive].sort()) === JSON.stringify([...modelDefault].sort());
  const allTerms = getAllPossibleTerms(factors);
  const byOrder = {};
  allTerms.forEach(t => {
    const o = termOrder(t, factors);
    if (!byOrder[o]) byOrder[o] = [];
    byOrder[o].push(t);
  });
  const orderLabels = { 1: "Effets principaux", 2: "Interactions ordre 2", 3: "Interactions ordre 3", 4: "Interactions ordre 4" };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={CSS.app}>

      {/* Stepper */}
      <div style={CSS.stepper}>
        {[{ n: 1, l: "Facteurs & réponses" }, { n: 2, l: "Matrice" }, { n: 3, l: "Modèle" }].map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {i > 0 && <div style={CSS.stepSep} />}
            <div style={CSS.stepItem(part === s.n, part > s.n)} onClick={() => goTo(s.n)}>
              <div style={CSS.stepNum(part === s.n, part > s.n)}>{part > s.n ? "✓" : s.n}</div>
              <span style={CSS.stepLabel(part === s.n)}>{s.l}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── PARTIE 1 ── */}
      {part === 1 && (
        <>
          {/* Facteurs */}
          <div style={CSS.card}>
            <div style={CSS.sectionLabel}>Facteurs</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["ID", "Nom", "Unité", "Type", "Niveau bas", "Niveau haut", ""].map((h, i) => (
                      <th key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary, #666)", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-secondary, #ccc)", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f, i) => (
                    <tr key={f.id}>
                      <td style={{ padding: "4px 8px" }}><span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary, #666)" }}>{f.id}</span></td>
                      <td style={{ padding: "4px 6px" }}><input value={f.name} onChange={e => updateFactor(i, "name", e.target.value)} style={{ ...CSS.input, minWidth: 110 }} /></td>
                      <td style={{ padding: "4px 6px" }}><input value={f.unit || ""} placeholder="°C, g…" onChange={e => updateFactor(i, "unit", e.target.value)} style={{ ...CSS.input, width: 68 }} /></td>
                      <td style={{ padding: "4px 6px" }}>
                        <select value={String(f.continuous)} onChange={e => updateFactor(i, "continuous", e.target.value === "true")} style={CSS.select}>
                          <option value="true">Continu</option>
                          <option value="false">Discret</option>
                        </select>
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {f.continuous
                          ? <input type="number" value={f.low.real} onChange={e => updateFactorLevel(i, "low", e.target.value)} style={{ ...CSS.input, minWidth: 70 }} />
                          : <input value={f.low.label || ""} placeholder="Label −1" onChange={e => updateFactorLabel(i, "low", e.target.value)} style={{ ...CSS.input, minWidth: 90 }} />
                        }
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {f.continuous
                          ? <input type="number" value={f.high.real} onChange={e => updateFactorLevel(i, "high", e.target.value)} style={{ ...CSS.input, minWidth: 70 }} />
                          : <input value={f.high.label || ""} placeholder="Label +1" onChange={e => updateFactorLabel(i, "high", e.target.value)} style={{ ...CSS.input, minWidth: 90 }} />
                        }
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {factors.length > 2 && <button style={CSS.btnDanger} onClick={() => removeFactor(i)}>✕</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {factors.length < 6
              ? <button style={{ ...CSS.btnAdd, marginTop: 10 }} onClick={addFactor}>+ Ajouter un facteur</button>
              : <p style={{ ...CSS.muted, marginTop: 8 }}>Maximum 6 facteurs atteint.</p>
            }
          </div>

          {/* Réponses */}
          <div style={CSS.card}>
            <div style={CSS.sectionLabel}>Réponses</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["ID", "Nom", "Unité", ""].map((h, i) => (
                      <th key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary, #666)", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-secondary, #ccc)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ padding: "4px 8px" }}><span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary, #666)" }}>{r.id}</span></td>
                      <td style={{ padding: "4px 6px" }}><input value={r.name} onChange={e => updateResponse(i, "name", e.target.value)} style={{ ...CSS.input, minWidth: 130 }} /></td>
                      <td style={{ padding: "4px 6px" }}><input value={r.unit || ""} placeholder="%, nm…" onChange={e => updateResponse(i, "unit", e.target.value)} style={{ ...CSS.input, width: 80 }} /></td>
                      <td style={{ padding: "4px 6px" }}>
                        {responses.length > 1 && <button style={CSS.btnDanger} onClick={() => removeResponse(i)}>✕</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button style={{ ...CSS.btnAdd, marginTop: 10 }} onClick={addResponse}>+ Ajouter une réponse</button>
          </div>

          {/* Point central */}
          <div style={CSS.card}>
            <div style={CSS.sectionLabel}>Point central</div>
            <div style={CSS.row}>
              <label style={{ ...CSS.row, cursor: "pointer", gap: 6 }}>
                <input type="checkbox" checked={centerPoint.present} onChange={e => setCenterPoint({ ...centerPoint, present: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Inclure un point central</span>
              </label>
              {centerPoint.present && (
                <>
                  <span style={{ ...CSS.muted, marginLeft: 8 }}>Répétitions :</span>
                  <input type="number" min={1} max={10} value={centerPoint.replicates} onChange={e => setCenterPoint({ ...centerPoint, replicates: Math.max(1, +e.target.value) })} style={{ ...CSS.input, width: 60 }} />
                </>
              )}
            </div>
          </div>

          <div style={CSS.sectionNav}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)" }}>
              Plan 2<sup>{factors.length}</sup> = <strong>{1 << factors.length}</strong> essai(s)
              {centerPoint.present ? ` + ${centerPoint.replicates} point(s) central` : ""}
            </div>
            <button style={CSS.btnPrimary} onClick={buildMatrix}>Construire la table de données →</button>
          </div>
        </>
      )}

      {/* ── PARTIE 2 ── */}
      {part === 2 && matrix && (
        <>
          <div style={CSS.card}>
            {/* Popup ajout ligne */}
            {addRowLevels && (
              <div style={CSS.overlayWrap}>
                <div style={CSS.popupBox}>
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>Nouvelle ligne — choisir les niveaux</div>
                  {factors.map(f => {
                    const sel = addRowLevels[f.id];
                    return (
                      <div key={f.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)", marginBottom: 4 }}>{f.id} — {f.name}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={CSS.levelBtn(sel === -1 ? "neg" : "")} onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: -1 })}>
                            −1{f.continuous ? ` (${f.low.real}${f.unit ? " " + f.unit : ""})` : (f.low.label ? " " + f.low.label : "")}
                          </button>
                          {f.continuous && (
                            <button style={CSS.levelBtn(sel === 0 ? "zero" : "")} onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 0 })}>
                              0 ({+((f.low.real + f.high.real) / 2).toFixed(2)}{f.unit ? " " + f.unit : ""})
                            </button>
                          )}
                          <button style={CSS.levelBtn(sel === 1 ? "pos" : "")} onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 1 })}>
                            +1{f.continuous ? ` (${f.high.real}${f.unit ? " " + f.unit : ""})` : (f.high.label ? " " + f.high.label : "")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ ...CSS.row, justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                    <button style={CSS.btnSmall} onClick={() => setAddRowLevels(null)}>Annuler</button>
                    <button style={CSS.btnPrimary} onClick={confirmAddRow}>Ajouter</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...CSS.row, justifyContent: "space-between", marginBottom: 10 }}>
              <div style={CSS.sectionLabel}>Matrice d'expériences</div>
              <div style={{ ...CSS.row, gap: 8 }}>
                <span style={CSS.muted}>{matrix.length} essai(s)</span>
                <button style={CSS.btnSmall} onClick={openAddRow}>+ Ligne</button>
              </div>
            </div>

            {hasMissing && (
              <div style={CSS.alertWarn}>
                <span>{missingRows.length} ligne(s) sans réponse complète.</span>
                <button style={CSS.btnWarn} onClick={() => { if (window.confirm("Remplir les réponses manquantes avec des valeurs aléatoires (20–100) ? Ces valeurs sont fictives.")) fillRandom(); }}>
                  Remplir valeurs aléatoires…
                </button>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary, #666)", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-secondary, #ccc)", width: 32 }}>#</th>
                    {factors.map(f => (
                      <th key={f.id} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary, #666)", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-secondary, #ccc)", textAlign: "left" }}>
                        {f.id}<br /><span style={CSS.muted}>{f.name}{f.unit ? ` (${f.unit})` : ""}</span>
                      </th>
                    ))}
                    <th style={{ width: 2, background: "var(--color-border-tertiary, #e5e5e5)", padding: 0 }} />
                    {responses.map(r => (
                      <th key={r.id} style={{ fontSize: 11, fontWeight: 500, color: "#0F6E56", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-secondary, #ccc)", textAlign: "left" }}>
                        {r.id}<br /><span style={{ ...CSS.muted, color: "#1D9E75" }}>{r.name}{r.unit ? ` (${r.unit})` : ""}</span>
                      </th>
                    ))}
                    <th style={{ width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, ri) => {
                    const isMissing = missingRows.includes(ri);
                    return (
                      <tr key={ri} style={{ background: row.center ? "#FAEEDA22" : isMissing ? "#FCEBEB22" : "transparent" }}>
                        <td style={{ padding: "4px 8px", textAlign: "center", fontSize: 11, color: "var(--color-text-secondary, #666)" }}>
                          {row.center ? "PC" : ri + 1}
                        </td>
                        {factors.map(f => {
                          const c = row.coded[f.id];
                          const rv = row.real[f.id];
                          const cLabel = c === 0 ? "0" : c === -1 ? "−1" : "+1";
                          const cColor = c === -1 ? "#993C1D" : c === 1 ? "#0F6E56" : "#854F0B";
                          if (row.center && !f.continuous) return <td key={f.id} style={{ padding: "4px 6px", textAlign: "center", color: "var(--color-text-secondary, #666)", fontSize: 11 }}>—</td>;
                          return (
                            <td key={f.id} style={{ padding: "4px 6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: cColor, minWidth: 28 }}>({cLabel})</span>
                                {f.continuous
                                  ? <input type="number" value={rv} onChange={e => updateCell(ri, f.id, e.target.value)} style={{ ...CSS.input, minWidth: 54, height: 28, padding: "3px 6px", border: "0.5px solid transparent", background: "transparent" }} />
                                  : <span style={{ fontSize: 12, color: "var(--color-text-secondary, #666)" }}>{rv ?? "—"}</span>
                                }
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ width: 2, background: "var(--color-border-tertiary, #e5e5e5)", padding: 0 }} />
                        {responses.map(r => {
                          const v = row.responses[r.id];
                          const isEmpty = v === "" || v === null || v === undefined;
                          return (
                            <td key={r.id} style={{ padding: "4px 6px" }}>
                              <input type="number" value={isEmpty ? "" : v} placeholder="—" onChange={e => updateResp(ri, r.id, e.target.value)}
                                style={{ ...CSS.input, minWidth: 70, height: 28, padding: "3px 6px", color: "#0F6E56", borderColor: isEmpty ? "#F09595" : "transparent", background: "transparent" }} />
                            </td>
                          );
                        })}
                        <td style={{ padding: "4px 6px" }}>
                          <button style={CSS.btnDanger} onClick={() => removeRun(ri)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={CSS.sectionNav}>
            <button style={CSS.btn} onClick={() => goTo(1)}>← Retour</button>
            <div style={{ ...CSS.row, gap: 10 }}>
              {hasMissing && <span style={{ ...CSS.muted, color: "#A32D2D" }}>Compléter les réponses pour continuer</span>}
              <button style={{ ...CSS.btnPrimary, opacity: hasMissing ? 0.35 : 1, cursor: hasMissing ? "not-allowed" : "pointer" }}
                onClick={() => { if (!hasMissing) goTo(3); }}>
                Choisir le modèle →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── PARTIE 3 ── */}
      {part === 3 && (
        <>
          {/* Popup cubique impossible */}
          {showCubicPopup && (
            <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "var(--border-radius-lg, 12px)", padding: "2rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
              <div style={CSS.popupBox}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Modèle cubique impossible</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary, #666)", marginBottom: 14 }}>Il faut au moins 3 facteurs pour inclure des interactions d'ordre 3.</div>
                <button style={CSS.btnSmall} onClick={() => setShowCubicPopup(false)}>Fermer</button>
              </div>
            </div>
          )}

          <div style={CSS.card}>
            <div style={{ ...CSS.row, justifyContent: "space-between", marginBottom: 12 }}>
              <div style={CSS.sectionLabel}>Modèle de régression</div>
              {!isDefaultModel && <button style={CSS.btnSmall} onClick={resetModel}>↺ Revenir au défaut JSON</button>}
            </div>

            <div style={{ ...CSS.row, gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {["linear", "quadratic", "cubic", "default"].map(p => (
                <button key={p} style={CSS.presetBtn(modelPreset === p)} onClick={() => applyPreset(p)}>
                  {{ linear: "Linéaire", quadratic: "Quadratique", cubic: "Cubique", default: "Défaut (JSON)" }[p]}
                </button>
              ))}
            </div>

            <div style={CSS.divider} />

            <div style={{ marginBottom: 4 }}>
              <span style={CSS.modelTermConst}>α₀</span>
              <span style={{ ...CSS.muted, marginLeft: 4 }}>constante — toujours incluse</span>
            </div>

            {Object.entries(byOrder).map(([order, terms]) => (
              <div key={order} style={{ marginTop: 12 }}>
                <div style={{ ...CSS.muted, marginBottom: 5 }}>{orderLabels[order] || "Ordre " + order}</div>
                <div>
                  {terms.map(t => {
                    const isOn = modelActive.includes(t);
                    return (
                      <span key={t} style={isOn ? CSS.modelTermOn : CSS.modelTermOff} onClick={() => toggleTerm(t)} title={modelDefault.includes(t) ? "Présent dans le modèle par défaut" : ""}>
                        {formatTermDisplay(t, factors)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={CSS.divider} />
            <div style={{ ...CSS.row, gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <span style={CSS.muted}>Termes actifs :</span>
              <strong style={{ fontSize: 13 }}>{modelActive.length + 1}</strong>
              <span style={CSS.muted}>(+ constante)</span>
              {!isDefaultModel
                ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#FAEEDA", color: "#633806" }}>Modifié</span>
                : <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#E1F5EE", color: "#085041" }}>Défaut JSON</span>
              }
            </div>
          </div>

          {/* Équation */}
          <div style={{ ...CSS.card, background: "var(--color-background-secondary, #f5f5f5)" }}>
            <div style={CSS.sectionLabel}>Équation</div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "var(--color-text-primary, #111)", lineHeight: 2.2 }}>
              Ŷ = α₀{modelActive.map(t => (
                <span key={t}> + α<sub>{termSubScript(t, factors)}</sub>·<span dangerouslySetInnerHTML={{ __html: (() => { let s = t; factors.forEach((f, i) => { s = s.split(f.id).join("X<sub>" + (i + 1) + "</sub>"); }); return s; })() }} /></span>
              ))}
            </div>
          </div>

          <div style={CSS.sectionNav}>
            <button style={CSS.btn} onClick={() => goTo(2)}>← Retour</button>
            <button style={CSS.btnPrimary}>Continuer →</button>
          </div>
        </>
      )}
    </div>
  );
}