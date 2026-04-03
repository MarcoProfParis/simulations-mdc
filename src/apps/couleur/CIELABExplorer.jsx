// CIELABExplorer v4 — ellipse ΔE stepper
import React, { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Download, Eye, EyeOff, Grid3x3, RotateCcw, ChevronDown } from "lucide-react";

// ─── Custom Tabs (shadcn-style) ───────────────────────────────────────────────
function Tabs({ value, onValueChange, children, className, style }) {
  return <div className={className} style={style}>{children}</div>;
}
function TabsList({ children, className, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#f4f4f5", borderRadius: 8, padding: "3px", gap: 2, ...style }} className={className}>
      {children}
    </div>
  );
}
function TabsTrigger({ value, children, className, activeValue, onValueChange }) {
  const active = value === activeValue;
  return (
    <button onClick={() => onValueChange(value)} style={{
      padding: "5px 14px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 6,
      cursor: "pointer", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap",
      background: active ? "#ffffff" : "transparent",
      color: active ? "#18181b" : "#737373",
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
      transition: "all .15s",
    }} className={className}>{children}</button>
  );
}

const SelectCtx = React.createContext(null);

function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </SelectCtx.Provider>
  );
}
function SelectTrigger({ children, style }) {
  const { open, setOpen } = React.useContext(SelectCtx);
  return (
    <button onClick={() => setOpen(o => !o)} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
      border: "1px solid #e4e4e7", borderRadius: 6, background: "#fff", color: "#18181b",
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)", transition: "border-color .15s", ...style,
    }}>
      {children}
      <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
    </button>
  );
}
function SelectValue({ label }) {
  return <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>;
}
function SelectContent({ children }) {
  const { open } = React.useContext(SelectCtx);
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
      background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}
function SelectItem({ value, children }) {
  const { value: current, onValueChange, setOpen } = React.useContext(SelectCtx);
  const selected = value === current;
  return (
    <div
      onClick={() => { onValueChange(value); setOpen(false); }}
      style={{
        padding: "7px 10px", fontSize: 11, fontWeight: selected ? 600 : 400, cursor: "pointer",
        background: selected ? "#f4f4f5" : "transparent", color: "#18181b",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected ? "#f4f4f5" : "transparent"; }}
    >{children}</div>
  );
}

// ─── CSS variables ──────────────────────────────────────────────────────────
const CSS_VARS = `
  :root {
    --color-background-primary:   #ffffff;
    --color-background-secondary: #f4f4f5;
    --color-text-primary:         #18181b;
    --color-text-secondary:       #525252;
    --color-border-secondary:     #e4e4e7;
    --color-border-tertiary:      #f5f5f5;
    --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    --shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10);
  }
  .cielab-tb-btn {
    width: 26px; height: 26px; border-radius: 6px;
    border: 1px solid #e4e4e7; background: #fff; color: #525252;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    padding: 0; transition: background 0.15s, color 0.15s, border-color 0.15s;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08);
  }
  .cielab-tb-btn:hover:not(:disabled) { background: #f4f4f5; border-color: #d4d4d8; }
  .cielab-tb-btn:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
  .cielab-tb-btn.active-clr   { background: #b03020; color: #fff; border-color: #b03020; }
  .cielab-tb-btn.active-grid  { background: #185FA5; color: #fff; border-color: #185FA5; }
  .cielab-tb-btn.active-panel { background: #534AB7; color: #fff; border-color: #534AB7; }
  .cielab-card {
    background: #fff; border: 1px solid #e4e4e7; border-radius: 10px;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08);
  }
  .cielab-export-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; padding: 5px 11px; cursor: pointer;
    border: 1px solid #e4e4e7; background: #fff; color: #18181b;
    border-radius: 6px; letter-spacing: .05em;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08); transition: background 0.15s;
  }
  .cielab-export-btn:hover { background: #f4f4f5; }
  @keyframes fadein { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

function CSSInjector() {
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "cielab-vars";
    el.textContent = CSS_VARS;
    if (!document.getElementById("cielab-vars")) document.head.appendChild(el);
    return () => { const e = document.getElementById("cielab-vars"); if (e) e.remove(); };
  }, []);
  return null;
}


function labToXYZ(L, a, b) {
  const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
  const Xn = 95.047, Yn = 100, Zn = 108.883, kap = 903.3;
  const X = fx ** 3 > 0.008856 ? fx ** 3 : (116 * fx - 16) / kap;
  const Y = L > kap * 0.008856 ? ((L + 16) / 116) ** 3 : L / kap;
  const Z = fz ** 3 > 0.008856 ? fz ** 3 : (116 * fz - 16) / kap;
  return [X * Xn, Y * Yn, Z * Zn];
}
function xyzToRgb(X, Y, Z) {
  X /= 100; Y /= 100; Z /= 100;
  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bv = X * 0.0557 + Y * -0.2040 + Z * 1.057;
  const gc = v => v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v;
  return [Math.round(Math.min(255, Math.max(0, gc(r) * 255))),
          Math.round(Math.min(255, Math.max(0, gc(g) * 255))),
          Math.round(Math.min(255, Math.max(0, gc(bv) * 255)))];
}
function labToHex(L, a, b) {
  const [r, g, bv] = xyzToRgb(...labToXYZ(L, a, b));
  return "#" + [r, g, bv].map(v => v.toString(16).padStart(2, "0")).join("");
}
function dE(L1, a1, b1, L2, a2, b2) {
  return Math.sqrt((L2 - L1) ** 2 + (a2 - a1) ** 2 + (b2 - b1) ** 2);
}
function interpDE(de) {
  if (de < 1)   return { label: "Imperceptible",           color: "#1D9E75" };
  if (de < 2)   return { label: "Perceptible par expert",  color: "#639922" };
  if (de < 3.5) return { label: "Perceptible à l'œil nu", color: "#EF9F27" };
  if (de < 5)   return { label: "Différence nette",        color: "#D85A30" };
  return         { label: "Très importante",                color: "#E24B4A" };
}
function hueName(h, C) {
  if (C < 8) return "Neutre";
  h = ((h % 360) + 360) % 360;
  if (h < 30) return "Rouge"; if (h < 60) return "Orange";
  if (h < 80) return "Jaune-orange"; if (h < 105) return "Jaune";
  if (h < 135) return "Jaune-vert"; if (h < 165) return "Vert";
  if (h < 195) return "Cyan-vert"; if (h < 225) return "Cyan";
  if (h < 255) return "Bleu"; if (h < 285) return "Bleu-violet";
  if (h < 315) return "Violet"; return "Rouge-violet";
}

const PCOLS  = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];
const PLBLS  = ["1","2","3","4","5","6","7","8"];
const SIZE   = 520;
const CX     = SIZE / 2, CY = SIZE / 2;
const ARANGE = 100; // axis always ±100

// ─── Stepper button with hover tooltip ──────────────────────────────────────
function HintBtn({ children, onClick, style, hint, hintColor }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: "50%",
          transform: "translateX(-50%)",
          background: hintColor, color: "#fff",
          fontSize: 8, fontWeight: 700, padding: "2px 5px",
          borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200,
        }}>{hint}</div>
      )}
      <button style={style} onClick={onClick}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}>
        {children}
      </button>
    </div>
  );
}

// ─── Point popup ────────────────────────────────────────────────────────────
function PointPopup({ point, idx, allPoints, pairA, pairB, showDelta, onClose, onDelete, onChange, initialX, initialY }) {
  const C = Math.sqrt(point.a ** 2 + point.b ** 2);
  const h = (((Math.atan2(point.b, point.a) * 180 / Math.PI) + 360) % 360);

  const isStandard    = point.id === pairA;
  const isEchantillon = point.id === pairB;
  const otherPoint    = isStandard    ? allPoints?.find(p => p.id === pairB)
                      : isEchantillon ? allPoints?.find(p => p.id === pairA)
                      : null;
  const de     = otherPoint ? dE(point.L, point.a, point.b, otherPoint.L, otherPoint.a, otherPoint.b) : null;
  const deInfo = de !== null ? interpDE(de) : null;

  const popupRef = useRef(null);

  // Fixed position on screen — starts at initialX/Y, user can drag
  const [pos, setPos] = useState({ x: initialX ?? window.innerWidth / 2 - 140, y: initialY ?? window.innerHeight - 200 });
  const dragState = useRef(null);

  useEffect(() => {
    // Update position if initialX/Y change (new popup opened)
    if (initialX != null && initialY != null) {
      setPos({ x: initialX, y: initialY });
    }
  }, [initialX, initialY]);

  const onDragStart = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
    dragState.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return;
      setPos({
        x: dragState.current.startPosX + e.clientX - dragState.current.startMouseX,
        y: dragState.current.startPosY + e.clientY - dragState.current.startMouseY,
      });
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const hex = labToHex(point.L, point.a, point.b);
  const PW = 280;

  return (
    <div ref={popupRef} data-popup={`pt-${idx}`} style={{
      position: "fixed",
      left: pos.x,
      top: pos.y,
      width: PW,
      background: "rgba(255,255,255,0.97)",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
      padding: "8px 10px 9px",
      zIndex: 9999,
      backdropFilter: "blur(8px)",
      fontSize: 11,
    }}>

      {/* Header row: swatch + name + badge + drag zone + close */}
      <div onMouseDown={onDragStart} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, cursor: "grab", userSelect: "none" }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: hex, border: "1.5px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
        <input
          value={point.name || ""}
          placeholder={`Point ${idx + 1}`}
          onChange={e => onChange({ ...point, name: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          style={{ flex: 1, fontSize: 10, fontWeight: 600, border: "none", background: "transparent", outline: "none", color: "var(--color-text-primary)", minWidth: 0, cursor: "text" }}
        />
        {(isStandard || isEchantillon) && showDelta && (
          <span style={{
            fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 3, flexShrink: 0,
            background: isStandard ? "rgba(24,95,165,0.12)" : "rgba(30,158,117,0.12)",
            color: isStandard ? "#185FA5" : "#1D9E75",
            border: `0.5px solid ${isStandard ? "#185FA5" : "#1D9E75"}44`,
          }}>
            {isStandard ? "STD" : "ÉCH"}
          </span>
        )}
        {/* Drag handle zone */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 2, opacity: 0.3, cursor: "grab" }}>
          {[0,1].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 3, height: 3, borderRadius: "50%", background: "#555" }} />)}
            </div>
          ))}
        </div>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{
          width: 15, height: 15, borderRadius: "50%", border: "none",
          background: "rgba(0,0,0,0.08)", color: "#666", cursor: "pointer",
          fontSize: 10, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, padding: 0,
        }}>×</button>
      </div>

      {/* Steppers row: L* a* b* in a single horizontal line */}
      <div style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
        {[
          { label: "L*", color: "#888",    value: point.L, min: 0,    max: 100,
            minHint: "+ Sombre", minHintColor: "#555", maxHint: "+ Clair", maxHintColor: "#aaa",
            onSet: v => onChange({ ...point, L: Math.round(v * 10) / 10 }) },
          { label: "a*", color: "#c0392b", value: point.a, min: -100, max: 100,
            minHint: "+ Vert", minHintColor: "#1a7a1a", maxHint: "+ Rouge", maxHintColor: "#c0392b",
            onSet: v => onChange({ ...point, a: Math.round(v * 10) / 10 }) },
          { label: "b*", color: "#e6ac00", value: point.b, min: -100, max: 100,
            minHint: "+ Bleu", minHintColor: "#185FA5", maxHint: "+ Jaune", maxHintColor: "#b8860b",
            onSet: v => onChange({ ...point, b: Math.round(v * 10) / 10 }) },
        ].map(({ label, color, value, min, max, minHint, minHintColor, maxHint, maxHintColor, onSet }) => {
          const stepBtn = { width: 18, height: 18, borderRadius: 4, border: `1px solid ${color}33`, background: `${color}11`, color, cursor: "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, userSelect: "none" };
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 7, fontWeight: 700, color }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <HintBtn style={stepBtn} hint={minHint} hintColor={minHintColor || color}
                  onClick={() => onSet(Math.max(min, Math.round((value - 0.1) * 10) / 10))}>−</HintBtn>
                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color, minWidth: 32, textAlign: "center" }}>{(Math.round(value * 10) / 10).toFixed(1)}</span>
                <HintBtn style={stepBtn} hint={maxHint} hintColor={maxHintColor || color}
                  onClick={() => onSet(Math.min(max, Math.round((value + 0.1) * 10) / 10))}>+</HintBtn>
              </div>
            </div>
          );
        })}
      </div>

      {/* C* h° + ΔE row */}
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {/* C* and h° badges */}
        {[["C*", C.toFixed(1), "#1D9E75"], ["h°", h.toFixed(1) + "°", "#185FA5"]].map(([label, value, color]) => (
          <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 5, padding: "3px 5px", textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "var(--color-text-secondary)" }}>{label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color }}>{value}</div>
          </div>
        ))}
        {/* ΔE inline if applicable */}
        {showDelta && de !== null && otherPoint && (
          <div style={{
            flex: 2, padding: "3px 6px", borderRadius: 5,
            background: `${deInfo.color}10`, border: `0.5px solid ${deInfo.color}44`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, color: "var(--color-text-secondary)" }}>ΔE*ab {isStandard ? "→ Éch." : "→ Std."}</div>
              <div style={{ fontSize: 7, color: "var(--color-text-secondary)" }}>{otherPoint.name || `Pt ${allPoints.indexOf(otherPoint) + 1}`}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: deInfo.color, lineHeight: 1 }}>{de.toFixed(2)}</div>
              <div style={{ fontSize: 7, color: deInfo.color, fontWeight: 600 }}>{deInfo.label}</div>
            </div>
          </div>
        )}
      </div>

      {/* Delete with confirm */}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#c0392b", fontWeight: 600, flex: 1 }}>Supprimer ce point ?</span>
          <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} style={{
            padding: "3px 10px", cursor: "pointer", borderRadius: 5, border: "1px solid #e4e4e7",
            background: "#f4f4f5", color: "#555", fontSize: 9, fontWeight: 700,
          }}>Non</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
            padding: "3px 10px", cursor: "pointer", borderRadius: 5, border: "1px solid rgba(220,50,40,0.4)",
            background: "#c0392b", color: "#fff", fontSize: 9, fontWeight: 700,
          }}>Oui</button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} style={{
          width: "100%", padding: "3px 0", cursor: "pointer",
          border: "1px solid rgba(220,50,40,0.25)", borderRadius: 5,
          background: "rgba(220,50,40,0.05)", color: "#c0392b",
          fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
        }}>
          🗑 Supprimer
        </button>
      )}
    </div>
  );


}

// ─── Disc canvas ────────────────────────────────────────────────────────────
function AbDisc({ L, points, setPoints, zoom, setZoom, showColor, showGrid, showEllipse = false, ellipseDE = 1, Lval, coordMode, exportRef, pairLine = null, pairA = null, pairB = null, showDelta = false }) {
  const colRef    = useRef(null);
  const ovRef     = useRef(null);
  const discContainerRef = useRef(null);
  // drag state: { kind: "point"|"pan", idx?, startPx, startPy, startPanA, startPanB }
  const drag      = useRef(null);
  const didMove   = useRef(false);
  const lastWh    = useRef(0);
  const pinch     = useRef(null);   // { dist0, zoom0 } for pinch-to-zoom
  // pan offset in LAB units (how much the view center is shifted)
  const [pan, setPan] = useState({ a: 0, b: 0 });
  // popup state: null | { idx }
  const [popup, setPopup] = useState(null);
  // hover hint: null | { x, y, kind: "point"|"empty", idx? }
  const [hoverHint, setHoverHint] = useState(null);
  // track dragging for hint visibility
  const [isDragging, setIsDragging] = useState(false);

  // Close popup when clicking anywhere outside it
  useEffect(() => {
    if (popup === null) return;
    const handler = (e) => {
      if (!e.target.closest('[data-popup]')) setPopup(null);
    };
    // delay so the same click that opened it doesn't close it
    const tid = setTimeout(() => document.addEventListener("pointerdown", handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener("pointerdown", handler); };
  }, [popup]);

  const visRange = ARANGE / zoom; // LAB units visible from center to edge

  // LAB → canvas pixel  (pan shifts the origin)
  const l2p = useCallback((a, b) => ({
    x: CX + ((a - pan.a) / visRange) * (SIZE / 2),
    y: CY - ((b - pan.b) / visRange) * (SIZE / 2),
  }), [visRange, pan]);

  // canvas pixel → LAB  (pan shifts origin back)
  const p2l = useCallback((px, py) => {
    const a = ((px - CX) / (SIZE / 2)) * visRange + pan.a;
    const b = -((py - CY) / (SIZE / 2)) * visRange + pan.b;
    return [Math.round(a), Math.round(b)];
  }, [visRange, pan]);

  // pixel delta → LAB delta
  const dp2dl = useCallback((dpx, dpy) => ({
    da: (dpx / (SIZE / 2)) * visRange,
    db: -(dpy / (SIZE / 2)) * visRange,
  }), [visRange]);

  const clampPt = (a, b) => {
    const d = Math.sqrt(a * a + b * b);
    if (d > ARANGE) return [Math.round(a / d * ARANGE), Math.round(b / d * ARANGE)];
    return [Math.round(a), Math.round(b)];
  };

  //── Color fill ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = colRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!showColor) { ctx.clearRect(0, 0, SIZE, SIZE); return; }
    const img = ctx.createImageData(SIZE, SIZE);
    const d = img.data;
    const R2 = (SIZE / 2 - 1) ** 2;
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const dx = px - CX, dy = py - CY;
        const idx = (py * SIZE + px) * 4;
        if (dx * dx + dy * dy <= R2) {
          // color at screen pixel = LAB coord accounting for pan
          const a = (dx / (SIZE / 2)) * visRange + pan.a;
          const b = -(dy / (SIZE / 2)) * visRange + pan.b;
          const [r, g, bv] = xyzToRgb(...labToXYZ(L, a, b));
          d[idx] = r; d[idx+1] = g; d[idx+2] = bv; d[idx+3] = 255;
        } else { d[idx+3] = 0; }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [L, zoom, showColor, visRange, pan]);

  // ── Overlay: grid + axes + labels + points ────────────────────────────────
  useEffect(() => {
    const cv = ovRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    const R = SIZE / 2 - 1;

    // helper: LAB value v → canvas x (for a* axis) accounting for pan
    const vToX = v => CX + ((v - pan.a) / visRange) * (SIZE / 2);
    // LAB value v → canvas y (for b* axis) accounting for pan
    const vToY = v => CY - ((v - pan.b) / visRange) * (SIZE / 2);

    // ── Grid (clipped to disc) ──────────────────────────────────────────
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

    if (showGrid) {
      const lo  = Math.floor((pan.a - visRange) / 5) * 5 - 5;
      const hi  = Math.ceil((pan.a + visRange)  / 5) * 5 + 5;
      const loB = Math.floor((pan.b - visRange) / 5) * 5 - 5;
      const hiB = Math.ceil((pan.b + visRange)  / 5) * 5 + 5;

      for (let v = lo; v <= hi; v += 5) {
        const major = v % 10 === 0;
        const px = vToX(v);
        if (px < -10 || px > SIZE + 10) continue;
        const col_ = showColor
          ? (major ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.09)")
          : (major ? "rgba(70,70,70,0.55)" : "rgba(120,120,120,0.2)");
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, SIZE);
        ctx.strokeStyle = col_; ctx.lineWidth = major ? 0.9 : 0.45; ctx.stroke();
      }
      for (let v = loB; v <= hiB; v += 5) {
        const major = v % 10 === 0;
        const py = vToY(v);
        if (py < -10 || py > SIZE + 10) continue;
        const col_ = showColor
          ? (major ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.09)")
          : (major ? "rgba(70,70,70,0.55)" : "rgba(120,120,120,0.2)");
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(SIZE, py);
        ctx.strokeStyle = col_; ctx.lineWidth = major ? 0.9 : 0.45; ctx.stroke();
      }
    }

    // Main axes (zero lines) — always visible but clamped to central zone of disc
    // "central zone": axes never go closer than 15% of SIZE from the disc edge
    const axisX    = vToX(0);
    const axisY    = vToY(0);
    const NEAR     = SIZE * 0.15;   // min distance from edge
    const FAR      = SIZE * 0.85;   // max distance from edge
    const clampedX = Math.min(Math.max(axisX, NEAR), FAR);
    const clampedY = Math.min(Math.max(axisY, NEAR), FAR);
    const axisInX  = axisX >= 0 && axisX <= SIZE;
    const axisInY  = axisY >= 0 && axisY <= SIZE;

    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";

    // Vertical axis
    ctx.beginPath();
    ctx.moveTo(axisInX ? axisX : clampedX, 0);
    ctx.lineTo(axisInX ? axisX : clampedX, SIZE);
    ctx.stroke();

    // Horizontal axis
    ctx.beginPath();
    ctx.moveTo(0,    axisInY ? axisY : clampedY);
    ctx.lineTo(SIZE, axisInY ? axisY : clampedY);
    ctx.stroke();

    // Dot at true 0,0 when in view
    if (axisInX && axisInY) {
      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.beginPath(); ctx.arc(axisX, axisY, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Reticule at screen centre (CX, CY) — always visible ─────────────
    const RET = 14;  // half-length of reticule arms
    const GAP = 4;   // gap around centre dot
    ctx.strokeStyle = "rgba(0,0,0,0.60)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    // Horizontal arms
    ctx.beginPath(); ctx.moveTo(CX - RET, CY); ctx.lineTo(CX - GAP, CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + GAP, CY); ctx.lineTo(CX + RET, CY); ctx.stroke();
    // Vertical arms
    ctx.beginPath(); ctx.moveTo(CX, CY - RET); ctx.lineTo(CX, CY - GAP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, CY + GAP); ctx.lineTo(CX, CY + RET); ctx.stroke();
    // Small circle at reticule centre
    ctx.beginPath(); ctx.arc(CX, CY, GAP - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.50)"; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();

    // ── Tick labels (no background — direct text with shadow for readability) –
    if (showGrid) {
      ctx.font = "900 12px sans-serif"; // maximum weight
      ctx.textBaseline = "middle";
      const txtCol    = showColor ? "rgba(0,0,0,0.92)" : "rgba(20,20,20,0.98)";
      const shadowCol = showColor ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)";

      const loA  = Math.floor((pan.a - visRange) / 10) * 10;
      const hiA  = Math.ceil((pan.a + visRange)  / 10) * 10;
      const loB2 = Math.floor((pan.b - visRange) / 10) * 10;
      const hiB2 = Math.ceil((pan.b + visRange)  / 10) * 10;

      // a* labels sit just below the horizontal axis, clamped to disc
      const labelY = Math.min(Math.max(clampedY + 8, 10), SIZE - 14);
      for (let v = loA; v <= hiA; v += 10) {
        if (v === 0) continue;
        const px = vToX(v);
        if (px < 14 || px > SIZE - 14) continue;
        ctx.textAlign = "center";
        ctx.shadowColor = shadowCol; ctx.shadowBlur = 3;
        ctx.fillStyle = txtCol;
        ctx.fillText(String(v), px, labelY);
        ctx.shadowBlur = 0;
      }

      // b* labels sit just right of the vertical axis, clamped to disc
      const labelX = Math.min(Math.max(clampedX + 5, 5), SIZE - 30);
      for (let v = loB2; v <= hiB2; v += 10) {
        if (v === 0) continue;
        const py = vToY(v);
        if (py < 14 || py > SIZE - 14) continue;
        ctx.textAlign = "left";
        ctx.shadowColor = shadowCol; ctx.shadowBlur = 3;
        ctx.fillStyle = txtCol;
        ctx.fillText(String(v), labelX, py);
        ctx.shadowBlur = 0;
      }
    }

    // Axis name labels — white pill background, 4px padding, border-radius = height/2 (≈1em)
    ctx.shadowBlur = 0;
    ctx.font = "900 13px sans-serif";

    const drawAxisLabel = (text, x, y, textAlign, textBaseline, textColor) => {
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;
      const tw = ctx.measureText(text).width;
      const PAD = 4;
      const H = 18; // pill height
      const R = H / 2; // border-radius = 1em → half height for pill

      // Compute pill rect top-left based on alignment
      let rx, ry;
      if (textAlign === "right")  rx = x - tw - PAD;
      else if (textAlign === "left") rx = x - PAD;
      else rx = x - tw / 2 - PAD; // center

      if (textBaseline === "bottom") ry = y - H;
      else if (textBaseline === "top") ry = y;
      else ry = y - H / 2;

      const rw = tw + PAD * 2;

      // White pill
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(rx + R, ry);
      ctx.lineTo(rx + rw - R, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + H, R);
      ctx.lineTo(rx + rw, ry + R);
      ctx.arcTo(rx + rw, ry + H, rx + rw - R, ry + H, R);
      ctx.lineTo(rx + R, ry + H);
      ctx.arcTo(rx, ry + H, rx, ry + H - R, R);
      ctx.lineTo(rx, ry + R);
      ctx.arcTo(rx, ry, rx + R, ry, R);
      ctx.closePath();
      ctx.fill();

      // Text on top
      ctx.fillStyle = textColor;
      // vertically centre text in pill
      const textY = ry + H / 2;
      const prevBaseline = ctx.textBaseline;
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, textY);
      ctx.textBaseline = prevBaseline;
    };

    drawAxisLabel("+a* Rouge", SIZE - 8,  CY - 10, "right",  "bottom", "rgba(185,30,30,1)");
    drawAxisLabel("−a* Vert",  8,          CY - 10, "left",   "bottom", "rgba(20,110,20,1)");
    drawAxisLabel("+b* Jaune", CX,         8,        "center", "top",    "rgba(140,100,0,1)");
    drawAxisLabel("−b* Bleu",  CX,         SIZE - 8, "center", "bottom", "rgba(15,55,185,1)");



    // ── C*/h° cylindrical visuals ───────────────────────────────────────────
    if (coordMode === "ch") {
      // NO disc clip — circles must be fully visible outside disc boundary too
      points.forEach((p, i) => {
        if (p.a === 0 && p.b === 0) return;
        const { x: px, y: py } = l2p(p.a, p.b);

        const C    = Math.sqrt(p.a * p.a + p.b * p.b);
        const hRad = Math.atan2(p.b, p.a);
        const hDeg = ((hRad * 180 / Math.PI) + 360) % 360;

        const origX = vToX(0);
        const origY = vToY(0);

        // C* radius in canvas pixels, grows with zoom
        const cPx = (C / visRange) * (SIZE / 2);

        // ── Single solid circle at C* distance (no sub-rings) ────────────
        if (cPx >= 3) {
          ctx.beginPath();
          ctx.arc(origX, origY, cPx, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.80)";
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.stroke();
        }

        // C* label: tangent to the circle, perpendicular to the radius direction
        // Place it 90° rotated from the point direction, at circle edge, offset outward
        const perpAngle = hRad + Math.PI / 2; // 90° from radius
        // Position: on the circle edge, then push outward by 12px, also shift 24px along perp
        const cEdgeX = origX + Math.cos(hRad) * cPx;
        const cEdgeY = origY - Math.sin(hRad) * cPx;
        const cLblX = cEdgeX + Math.cos(perpAngle) * 32 + Math.cos(hRad) * (-6);
        const cLblY = cEdgeY - Math.sin(perpAngle) * 32 - Math.sin(hRad) * (-6);
        ctx.font = "600 9px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.strokeText(`C*=${C.toFixed(1)}`, cLblX, cLblY);
        ctx.fillStyle = "rgba(30,158,117,0.95)";
        ctx.fillText(`C*=${C.toFixed(1)}`, cLblX, cLblY);

        // ── Radius line from origin to point ─────────────────────────────
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Angle arc — scales with zoom, minimum useful size ────────────
        // Base arc radius = 40px at zoom=1, grows with zoom
        const arcR = Math.max(28, Math.min(cPx * 0.55, 28 * zoom));
        // Canvas angle convention: LAB +a* = canvas right (angle 0)
        // LAB b* grows upward but canvas y grows downward → flip sign
        const canvasAngle = -hRad;

        // Reference line: 0° = +a* direction
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(origX + arcR + 10, origY);
        ctx.strokeStyle = "rgba(0,0,0,0.30)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // The arc itself (from 0 to h°)
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        const ccw = canvasAngle < 0;
        ctx.arc(origX, origY, arcR, 0, canvasAngle, ccw);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(origX, origY, arcR, 0, canvasAngle, ccw);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // h° label: along the dashed radius line, at ~60% from origin toward point, offset slightly sideways
        const hLblFrac = 0.60; // 60% of the way from origin to point
        const hLblX = origX + Math.cos(hRad) * cPx * hLblFrac + Math.cos(hRad + Math.PI / 2) * 10;
        const hLblY = origY - Math.sin(hRad) * cPx * hLblFrac - Math.sin(hRad + Math.PI / 2) * (-10);
        ctx.font = "600 9px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.strokeText(`${hDeg.toFixed(1)}°`, hLblX, hLblY);
        ctx.fillStyle = "rgba(24,95,165,0.95)";
        ctx.fillText(`${hDeg.toFixed(1)}°`, hLblX, hLblY);
      });

    } else {
      // Cartesian mode: no extra decorations from origin
    }
    // ── Line between selected pair only ─────────────────────────────────────
    if (pairLine && points[pairLine[0]] && points[pairLine[1]]) {
      const pa = l2p(points[pairLine[0]].a, points[pairLine[0]].b);
      const pb = l2p(points[pairLine[1]].a, points[pairLine[1]].b);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = "rgba(255,255,255,0.90)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // ── ΔE tolerance ellipses ───────────────────────────────────────────────
    if (showEllipse) {
      points.forEach((p) => {
        const { x: cx, y: cy } = l2p(p.a, p.b);
        const hRad    = Math.atan2(p.b, p.a);
        const labToPx = (SIZE / 2) / visRange;

        const rx_px = ellipseDE * labToPx * 2.0; // long axis along hue
        const ry_px = ellipseDE * labToPx * 1.0; // short axis along saturation
        if (rx_px < 0.5) return;

        // Draw ellipse — black dashed
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-hRad);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx_px, ry_px, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Label at topmost screen point
        const cosH = Math.cos(-hRad), sinH = Math.sin(-hRad);
        const t1 = Math.atan2(ry_px * Math.cos(hRad), rx_px * Math.sin(hRad));
        const t2 = t1 + Math.PI;
        const y1 = cy + rx_px * Math.cos(t1) * sinH + ry_px * Math.sin(t1) * cosH;
        const y2 = cy + rx_px * Math.cos(t2) * sinH + ry_px * Math.sin(t2) * cosH;
        const tTop = y1 < y2 ? t1 : t2;
        const lblX = cx + rx_px * Math.cos(tTop) * cosH - ry_px * Math.sin(tTop) * sinH;
        const lblY = cy + rx_px * Math.cos(tTop) * sinH + ry_px * Math.sin(tTop) * cosH - 5;

        ctx.save();
        ctx.font = "600 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth   = 2;
        ctx.lineJoin    = "round";
        ctx.strokeText(`ΔE ${ellipseDE.toFixed(1)}`, lblX, lblY);
        ctx.fillStyle   = "rgba(0,0,0,0.80)";
        ctx.fillText(`ΔE ${ellipseDE.toFixed(1)}`, lblX, lblY);
        ctx.restore();
      });
    }

    // ── Points ──────────────────────────────────────────────────────────────
    points.forEach((p, i) => {
      const { x, y } = l2p(p.a, p.b);
      const hex = labToHex(p.L, p.a, p.b);
      // Circle: r=6, fill=color, white inner ring, black outer border
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hex; ctx.fill();
      // White inner border
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      // Black outer border
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 1; ctx.stroke();
      // Plain bold label above — white stroke halo for readability
      const lbl = p.name ? p.name.slice(0, 8) : PLBLS[i];
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      // White halo: stroke first, then fill
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.strokeText(lbl, x, y - 10);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillText(lbl, x, y - 10);
    });
  }, [L, points, zoom, showColor, showGrid, showEllipse, ellipseDE, visRange, pan, l2p, coordMode, pairLine]);

  // ── Input helpers ─────────────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const rect = ovRef.current.getBoundingClientRect();
    const sc = SIZE / rect.width;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * sc, y: (src.clientY - rect.top) * sc };
  }, []);

  const hitTest = useCallback((px, py) => {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = l2p(points[i].a, points[i].b);
      if (Math.hypot(px - x, py - y) < 14) return i;
    }
    return -1;
  }, [points, l2p]);

  const inDisc = useCallback((px, py) =>
    Math.hypot(px - CX, py - CY) <= SIZE / 2 - 2, []);

  const panRef = useRef({ a: 0, b: 0 });
  // keep panRef in sync so mousedown can read current pan without stale closure
  useEffect(() => { panRef.current = pan; }, [pan]);

  // ── Double-click / double-tap detection ───────────────────────────────────
  const lastTap    = useRef({ t: 0, x: 0, y: 0 });

  const onMouseDown = useCallback((e) => {
    // Ignore events originating from the popup
    if (e.target && e.target.closest && e.target.closest('[data-popup]')) return;
    // ignore multi-touch (pinch handled separately)
    if (e.touches && e.touches.length >= 2) return;
    didMove.current = false;
    const { x, y } = getPos(e);
    const hit = hitTest(x, y);
    if (hit >= 0) {
      drag.current = { kind: "point", idx: hit };
    } else if (inDisc(x, y)) {
      drag.current = { kind: "pan", startX: x, startY: y,
        basePanA: panRef.current.a, basePanB: panRef.current.b };
    }
    e.preventDefault();
  }, [getPos, hitTest, inDisc]);

  const onMouseMove = useCallback((e) => {
    if (!drag.current) return;
    if (e.touches && e.touches.length >= 2) { drag.current = null; return; }
    if (!didMove.current) setIsDragging(true);
    didMove.current = true;
    const { x, y } = getPos(e);

    if (drag.current.kind === "point") {
      const [a, b] = p2l(x, y);
      const [ca, cb] = clampPt(a, b);
      setPoints(pts => pts.map((p, i) => i === drag.current.idx ? { ...p, a: ca, b: cb } : p));
    } else if (drag.current.kind === "pan") {
      const dpx = x - drag.current.startX;
      const dpy = y - drag.current.startY;
      const { da, db } = dp2dl(dpx, dpy);
      setPan({ a: drag.current.basePanA - da, b: drag.current.basePanB - db });
    }
    e.preventDefault();
  }, [getPos, p2l, dp2dl, setPoints]);

  const onMouseUp = useCallback((e) => {
    // Ignore events that originate from inside the popup
    if (e.target && e.target.closest && e.target.closest('[data-popup]')) return;

    const wasDrag = drag.current !== null && didMove.current;
    const dragKind = drag.current?.kind;
    const dragIdx  = drag.current?.idx;
    drag.current = null;
    didMove.current = false;
    setIsDragging(false);
    // If we dragged a point, don't close its popup
    if (wasDrag && dragKind === "point") return;
    if (wasDrag) return;

    const rect = ovRef.current.getBoundingClientRect();
    const sc = SIZE / rect.width;
    const src = e.changedTouches ? e.changedTouches[0] : e;
    const px = (src.clientX - rect.left) * sc;
    const py = (src.clientY - rect.top) * sc;

    const hit = hitTest(px, py);
    const now = Date.now();

    // ── Click on existing point → open popup ────────────────────
    if (hit >= 0) {
      setHoverHint(null);
      setPopup(p => p?.idx === hit ? null : { idx: hit });
      return;
    }

    // ── Click on empty disc area ────────────────────────────────
    if (!inDisc(px, py) || e.button === 2) return;

    // Close popup on click outside
    setPopup(null);

    // Double-click / double-tap detection (within 400ms and 20px)
    const dt = now - lastTap.current.t;
    const dist = Math.hypot(px - lastTap.current.x, py - lastTap.current.y);
    const isDouble = dt < 400 && dist < 20;

    if (isDouble) {
      // Create point on double click
      lastTap.current = { t: 0, x: 0, y: 0 };
      if (points.length >= 8) return;
      const [a, b] = p2l(px, py);
      const [ca, cb] = clampPt(a, b);
      const newIdx = points.length; // will be appended at this index
      setPoints(pts => [...pts, { id: `p${Date.now()}`, L: Lval, a: ca, b: cb, name: "" }]);
      // Auto-open popup for the newly created point
      setPopup({ idx: newIdx });
    } else {
      // Single click on empty area → show hint + record for double-click detection
      lastTap.current = { t: now, x: px, y: py };
      // Show double-click hint at click position, auto-hide after 1.8s
      setHoverHint({ x: px, y: py, kind: "empty", fromClick: true });
      clearTimeout(window.__hintTimer);
      window.__hintTimer = setTimeout(() => setHoverHint(h => h?.fromClick ? null : h), 1800);
    }
  }, [hitTest, inDisc, p2l, setPoints, points.length, Lval]);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWh.current < 40) return;
    lastWh.current = now;
    const steps = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
    setZoom(z => {
      const idx = steps.findIndex(s => Math.abs(s - z) < 0.01);
      const ni = Math.max(0, Math.min(steps.length - 1, idx + (e.deltaY > 0 ? -1 : 1)));
      return steps[ni];
    });
  }, [setZoom]);

  // ── Pinch-to-zoom ─────────────────────────────────────────────────────────
  const ZOOM_STEPS_P = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];

  const onTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinch.current = { dist0: d, zoom0: zoom };
      e.preventDefault();
    }
  }, [zoom]);

  const onTouchMovePinch = useCallback((e) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = d / pinch.current.dist0;
      const target = pinch.current.zoom0 * ratio;
      // snap to nearest step
      let best = 0;
      for (let i = 1; i < ZOOM_STEPS_P.length; i++) {
        if (Math.abs(ZOOM_STEPS_P[i] - target) < Math.abs(ZOOM_STEPS_P[best] - target)) best = i;
      }
      setZoom(ZOOM_STEPS_P[best]);
    }
  }, [setZoom]);

  const onTouchEndPinch = useCallback(() => {
    pinch.current = null;
  }, []);

  useEffect(() => {
    const el = ovRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStartPinch, { passive: false });
    el.addEventListener("touchmove", onTouchMovePinch, { passive: false });
    el.addEventListener("touchend", onTouchEndPinch);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStartPinch);
      el.removeEventListener("touchmove", onTouchMovePinch);
      el.removeEventListener("touchend", onTouchEndPinch);
    };
  }, [onWheel, onTouchStartPinch, onTouchMovePinch, onTouchEndPinch]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Expose export function via ref
  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = () => {
      const SCALE = 2; // HD
      const W = SIZE * SCALE;
      // Info panel height
      const INFO_H = Math.max(120, points.length * 36 + 80) * SCALE;
      const TOTAL_H = W + INFO_H;

      const out = document.createElement("canvas");
      out.width  = W;
      out.height = TOTAL_H;
      const ctx = out.getContext("2d");

      // ── White background ──────────────────────────────────────────────
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, TOTAL_H);

      // ── Disc: composite color + overlay ───────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      if (colRef.current) ctx.drawImage(colRef.current, 0, 0, W, W);
      if (ovRef.current)  ctx.drawImage(ovRef.current,  0, 0, W, W);
      ctx.restore();
      // disc border
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2 * SCALE; ctx.stroke();

      // ── Info panel ────────────────────────────────────────────────────
      const iY = W + 8 * SCALE; // start y of info
      ctx.fillStyle = "#f7f7f7";
      ctx.fillRect(0, W, W, INFO_H);
      ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = SCALE;
      ctx.beginPath(); ctx.moveTo(0, W); ctx.lineTo(W, W); ctx.stroke();

      // Title
      ctx.font = `900 ${13 * SCALE}px sans-serif`;
      ctx.fillStyle = "#111";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`Plan a*b* CIELAB · L*=${L} · Zoom ×${zoom} · Mode ${coordMode === "ch" ? "C*/h°" : "a*/b*"}`, 16 * SCALE, iY);

      // Points table
      const rowH = 30 * SCALE;
      let ry = iY + 22 * SCALE;
      ctx.font = `bold ${10 * SCALE}px sans-serif`;
      ctx.fillStyle = "#555";
      ctx.fillText("Pt   L*     a*     b*     C*     h°     HEX", 16 * SCALE, ry);
      ry += rowH * 0.8;

      ctx.font = `${10 * SCALE}px sans-serif`;
      points.forEach((p, i) => {
        const C   = Math.sqrt(p.a * p.a + p.b * p.b);
        const hRad = Math.atan2(p.b, p.a);
        const hDeg = ((hRad * 180 / Math.PI) + 360) % 360;
        const hex  = labToHex(p.L, p.a, p.b);
        const pc   = PCOLS[i % PCOLS.length];

        // color swatch
        ctx.fillStyle = hex;
        ctx.fillRect(16 * SCALE, ry - 2 * SCALE, 14 * SCALE, 14 * SCALE);
        ctx.strokeStyle = pc; ctx.lineWidth = 1.5 * SCALE;
        ctx.strokeRect(16 * SCALE, ry - 2 * SCALE, 14 * SCALE, 14 * SCALE);

        ctx.fillStyle = "#111";
        const txt = `${PLBLS[i]}   ${p.L.toFixed(1)}     ${p.a.toFixed(1)}     ${p.b.toFixed(1)}     ${C.toFixed(1)}     ${hDeg.toFixed(1)}°     ${hex.toUpperCase()}`;
        ctx.fillText(txt, 36 * SCALE, ry);
        ry += rowH;
      });

      // Delta E section
      if (points.length >= 2) {
        ry += 4 * SCALE;
        ctx.font = `bold ${10 * SCALE}px sans-serif`;
        ctx.fillStyle = "#555";
        ctx.fillText("Écarts ΔE*ab", 16 * SCALE, ry);
        ry += rowH * 0.8;
        ctx.font = `${10 * SCALE}px sans-serif`;
        for (let i = 0; i < points.length - 1; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const de = dE(points[i].L, points[i].a, points[i].b, points[j].L, points[j].a, points[j].b);
            const { label } = interpDE(de);
            ctx.fillStyle = "#111";
            ctx.fillText(`${PLBLS[i]} → ${PLBLS[j]}  ΔE = ${de.toFixed(2)}  (${label})`, 16 * SCALE, ry);
            ry += rowH * 0.8;
          }
        }
      }

      // Trigger download
      const a = document.createElement("a");
      a.download = `cielab_L${L}_z${zoom}.png`;
      a.href = out.toDataURL("image/png");
      a.click();
    };
  }, [points, L, zoom, coordMode, exportRef]);

  // Cursor + hover hint
  const [cursor, setCursor] = useState("crosshair");
  const onHover = useCallback((e) => {
    const { x, y } = getPos(e);
    const hit = hitTest(x, y);
    const isPanning = drag.current?.kind === "pan";
    const isDraggingNow = drag.current !== null;

    if (isPanning) {
      setCursor("grabbing");
      setHoverHint(null);
    } else if (hit >= 0) {
      setCursor("pointer");
      setHoverHint(h => h?.fromClick ? h : { x, y, kind: "point", idx: hit });
    } else if (inDisc(x, y)) {
      setCursor(isDraggingNow ? "grabbing" : "crosshair");
      // Only clear point hint when moving to empty area; don't set empty hint on hover
      setHoverHint(h => (h && !h.fromClick) ? null : h);
    } else {
      setCursor("default");
      setHoverHint(h => h?.fromClick ? h : null);
    }
  }, [getPos, hitTest, inDisc]);

  return (
    <div ref={discContainerRef} style={{ position: "relative", width: "100%", borderRadius: "50%",
      background: showColor ? "transparent" : "var(--color-background-secondary)", flexShrink: 0 }}>
      <canvas ref={colRef} width={SIZE} height={SIZE}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "block" }} />
      <canvas ref={ovRef} width={SIZE} height={SIZE}
        style={{ position: "relative", width: "100%", display: "block", cursor, background: "transparent", touchAction: "none" }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onMouseMove={onHover}
        onMouseLeave={() => setHoverHint(null)}
        onContextMenu={onContextMenu} />

      {/* Hover hint bubble */}
      {hoverHint && !isDragging && (() => {
        const isPoint = hoverHint.kind === "point";
        if (isPoint && popup?.idx === hoverHint.idx) return null;
        if (!isPoint && !hoverHint.fromClick) return null;
        const text = isPoint
          ? "Cliquer pour afficher les détails"
          : "Double-clic pour créer un point";
        const leftPct = hoverHint.x / 520 * 100;
        const topPct  = hoverHint.y / 520 * 100;
        return (
          <div style={{
            position: "absolute",
            left: `${leftPct}%`,
            top:  `calc(${topPct}% - 34px)`,
            transform: "translateX(-50%)",
            background: isPoint ? "rgba(24,95,165,0.88)" : "rgba(0,0,0,0.72)",
            color: "white",
            fontSize: 10, fontWeight: 600, padding: "4px 10px",
            borderRadius: 20, whiteSpace: "nowrap", pointerEvents: "none",
            zIndex: 50, backdropFilter: "blur(4px)",
          }}>
            {text}
          </div>
        );
      })()}

      {/* Point popup — rendered via portal at fixed position */}
      {popup !== null && points[popup.idx] && (() => {
        const rect = discContainerRef.current?.getBoundingClientRect();
        const initX = rect ? rect.left + rect.width / 2 - 140 : window.innerWidth / 2 - 140;
        const initY = rect ? rect.bottom - 160 : window.innerHeight - 200;
        return (
          <PointPopup
            point={points[popup.idx]}
            idx={popup.idx}
            allPoints={points}
            pairA={pairA}
            pairB={pairB}
            showDelta={showDelta}
            initialX={initX}
            initialY={initY}
            onClose={() => setPopup(null)}
            onDelete={() => { setPoints(pts => pts.filter((_, i) => i !== popup.idx)); setPopup(null); }}
            onChange={updated => setPoints(pts => pts.map((p, i) => i === popup.idx ? updated : p))}
          />
        );
      })()}

      {/* Reset pan button */}
      {(pan.a !== 0 || pan.b !== 0) && (
        <button
          onClick={() => setPan({ a: 0, b: 0 })}
          style={{
            position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)",
            fontSize: 10, padding: "3px 10px", cursor: "pointer",
            border: "0.5px solid rgba(255,255,255,0.6)",
            background: "rgba(0,0,0,0.35)", color: "white",
            borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 10,
          }}>
          ⟳ Recentrer
        </button>
      )}
      {/* Zoom −/+ buttons — bottom-left of disc */}
      {(() => {
        const STEPS = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
        const idx = STEPS.findIndex(s => Math.abs(s - zoom) < 0.01);
        const canZoomOut = idx > 0;
        const canZoomIn  = idx < STEPS.length - 1;
        const btnStyle = (enabled) => ({
          width: 28, height: 28, borderRadius: 7,
          border: "0.5px solid rgba(255,255,255,0.55)",
          background: "rgba(0,0,0,0.38)", color: "white",
          fontSize: 18, lineHeight: 1, fontWeight: 400,
          cursor: enabled ? "pointer" : "default",
          opacity: enabled ? 1 : 0.35,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
          userSelect: "none",
        });
        return (
          <div style={{
            position: "absolute", bottom: "7%", left: "7%",
            display: "flex", flexDirection: "column", gap: 4, zIndex: 10,
          }}>
            <button style={btnStyle(canZoomIn)}
              onClick={() => canZoomIn && setZoom(STEPS[idx + 1])}
              title="Agrandir">+</button>
            <button style={btnStyle(canZoomOut)}
              onClick={() => canZoomOut && setZoom(STEPS[idx - 1])}
              title="Réduire">−</button>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Slider with precision ──────────────────────────────────────────────────
function Slider({ label, color, min, max, value, onChange, step = 0.1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
      <span style={{ fontSize: 9, color: color || "var(--color-text-secondary)", fontWeight: 600, minWidth: 14, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Math.round(+e.target.value * 10) / 10)}
        style={{ flex: 1, height: 3, accentColor: color || "var(--color-text-primary)", cursor: "pointer", minWidth: 0 }} />
      <input type="number" min={min} max={max} step={step}
        value={(+value).toFixed(1)}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
        style={{
          width: 38, fontSize: 9, fontWeight: 700, fontFamily: "monospace",
          border: "0.5px solid var(--color-border-secondary)", borderRadius: 3,
          background: "var(--color-background-secondary)", textAlign: "right",
          padding: "1px 3px", color: color || "var(--color-text-primary)", flexShrink: 0,
        }} />
    </div>
  );
}

// ─── Icon toggle button ────────────────────────────────────────────────────
function Btn({ children, active, onClick, title, accent }) {
  return (
    <button title={title} onClick={onClick} style={{
      padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 600,
      border: "none", borderRadius: 6, letterSpacing: ".02em",
      background: active ? (accent || "var(--color-text-primary)") : "rgba(128,128,128,0.12)",
      color: active ? "#fff" : "var(--color-text-secondary)",
      transition: "background .15s, color .15s",
    }}>{children}</button>
  );
}

// ── Coord helpers ───────────────────────────────────────────────────────────
function abToCH(a, b) {
  const C = Math.sqrt(a * a + b * b);
  const h = (a === 0 && b === 0) ? 0 : ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360;
  return { C: Math.round(C * 10) / 10, h: Math.round(h * 10) / 10 };
}
function chToAB(C, h) {
  const rad = h * Math.PI / 180;
  return { a: Math.round(C * Math.cos(rad)), b: Math.round(C * Math.sin(rad)) };
}

// ─── Points panel ───────────────────────────────────────────────────────────
function PointsPanel({ points, setPoints, coordMode, setCoordMode }) {

  if (points.length === 0) return (
    <div>
      {/* coord toggle always visible even with no points */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {["ab","ch"].map(m => (
          <button key={m} onClick={() => setCoordMode(m)}
            style={{
              flex: 1, fontSize: 11, padding: "5px 0", cursor: "pointer", borderRadius: 7,
              border: `0.5px solid ${coordMode===m ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: coordMode===m ? "var(--color-background-secondary)" : "transparent",
              fontWeight: coordMode===m ? 500 : 400,
              color: coordMode===m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}>
            {m === "ab" ? "a* b*  Cartésien" : "C* h°  Cylindrique"}
          </button>
        ))}
      </div>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "16px", textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        Cliquez sur le disque<br />pour ajouter un point
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* ── Mode toggle ── */}
      <div style={{ display: "flex", gap: 4 }}>
        {["ab","ch"].map(m => (
          <button key={m} onClick={() => setCoordMode(m)}
            style={{
              flex: 1, fontSize: 11, padding: "5px 0", cursor: "pointer", borderRadius: 7,
              border: `0.5px solid ${coordMode===m ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: coordMode===m ? "var(--color-background-secondary)" : "transparent",
              fontWeight: coordMode===m ? 500 : 400,
              color: coordMode===m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}>
            {m === "ab" ? "a* b*  Cartésien" : "C* h°  Cylindrique"}
          </button>
        ))}
      </div>

      {/* ── Coord mode description ── */}
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.5, padding: "4px 6px",
        background: "var(--color-background-secondary)", borderRadius: 7 }}>
        {coordMode === "ab"
          ? <><b style={{ fontWeight: 600 }}>a*</b> rouge(+) — vert(−) &nbsp;·&nbsp; <b style={{ fontWeight: 600 }}>b*</b> jaune(+) — bleu(−)</>
          : <><b style={{ fontWeight: 600 }}>C*</b> = √(a*²+b*²) distance à l'origine = saturation &nbsp;·&nbsp; <b style={{ fontWeight: 600 }}>h°</b> = arctan(b*/a*) angle de teinte 0–360°</>}
      </div>

      {points.map((p, i) => {
        const hex = labToHex(p.L, p.a, p.b);
        const { C, h } = abToCH(p.a, p.b);
        const pc  = PCOLS[i % PCOLS.length];

        // Handlers for cylindrical mode
        const setC = (newC) => {
          const { a, b } = chToAB(newC, h);
          setPoints(pts => pts.map((pt, j) => j === i ? { ...pt, a, b } : pt));
        };
        const setH = (newH) => {
          const { a, b } = chToAB(C, newH);
          setPoints(pts => pts.map((pt, j) => j === i ? { ...pt, a, b } : pt));
        };

        return (
          <div key={i} className="cielab-card" style={{ padding: "7px 9px", marginBottom: 6 }}>
            {/* Header: swatch + number + name input + hex + delete */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: hex, flexShrink: 0, border: `1.5px solid ${pc}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: pc, flexShrink: 0 }}>{PLBLS[i]}</span>
              <input
                value={p.name || ""}
                onChange={e => setPoints(pts => pts.map((pt, j) => j === i ? { ...pt, name: e.target.value } : pt))}
                placeholder="Nom…"
                maxLength={12}
                style={{
                  flex: 1, minWidth: 0, fontSize: 10, padding: "1px 5px",
                  border: `0.5px solid ${pc}44`, borderRadius: 4,
                  background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none",
                }}
              />
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--color-text-secondary)", flexShrink: 0 }}>{hex.toUpperCase()}</span>
              <button onClick={() => setPoints(pts => pts.filter((_, j) => j !== i))}
                style={{ fontSize: 10, padding: "1px 5px", cursor: "pointer", border: "0.5px solid var(--color-border-secondary)", background: "transparent", borderRadius: 4, color: "var(--color-text-secondary)", flexShrink: 0 }}>✕</button>
            </div>

            {/* Coord badges — inline compact */}
            <div style={{ display: "flex", gap: 3, marginBottom: 5, flexWrap: "wrap" }}>
              {[
                ["L*", p.L.toFixed(1),           "#888",    true],
                ["a*", p.a.toFixed(1),            "#c0392b", coordMode === "ab"],
                ["b*", p.b.toFixed(1),            "#e6ac00", coordMode === "ab"],
                ["C*", C.toFixed(1),              "#1D9E75", coordMode === "ch"],
                ["h°", h !== null ? h.toFixed(1)+"°" : "–", "#185FA5", coordMode === "ch"],
              ].map(([k, v, c, active]) => (
                <div key={k} style={{
                  background: active ? c + "18" : "var(--color-background-secondary)",
                  borderRadius: 4, padding: "2px 5px",
                  border: active ? `0.5px solid ${c}44` : "0.5px solid transparent",
                  display: "flex", alignItems: "baseline", gap: 3,
                }}>
                  <span style={{ fontSize: 8, color: active ? c : "var(--color-text-secondary)", fontWeight: active ? 700 : 400 }}>{k}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? c : "var(--color-text-secondary)", fontFamily: "monospace" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Sliders — compact */}
            <Slider label="L*" color="#888" min={0} max={100} step={0.1} value={p.L}
              onChange={v => setPoints(pts => pts.map((pt,j) => j===i?{...pt,L:Math.round(v*10)/10}:pt))} />

            {coordMode === "ab" ? (
              <>
                <Slider label="a*" color="#c0392b" min={-ARANGE} max={ARANGE} step={0.1} value={p.a}
                  onChange={v => setPoints(pts => pts.map((pt,j) => j===i?{...pt,a:Math.round(v*10)/10}:pt))} />
                <Slider label="b*" color="#e6ac00" min={-ARANGE} max={ARANGE} step={0.1} value={p.b}
                  onChange={v => setPoints(pts => pts.map((pt,j) => j===i?{...pt,b:Math.round(v*10)/10}:pt))} />
              </>
            ) : (
              <>
                <Slider label="C*" color="#1D9E75" min={0} max={ARANGE} step={0.1} value={Math.round(C*10)/10} onChange={setC} />
                <Slider label="h°" color="#185FA5" min={0} max={359.9} step={0.1} value={Math.round(h*10)/10} onChange={setH} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Delta panel ────────────────────────────────────────────────────────────
function DeltaPanel({ points, pairA, setPairA, pairB, setPairB, compact = false }) {
  // Resolve IDs → point objects (fallback to first/second if ID not found)
  const pa = points.find(p => p.id === pairA) || points[0];
  const pb = points.find(p => p.id === pairB) || points[1];

  if (points.length < 2) return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
      Ajoutez au moins<br />2 points pour calculer ΔE
    </div>
  );

  const same = pa?.id === pb?.id;
  const de = (!same && pa && pb) ? dE(pa.L, pa.a, pa.b, pb.L, pb.a, pb.b) : 0;
  const { label, color } = interpDE(de);
  const pct = Math.min(100, (de / 20) * 100);

  const ptLabel = (p, i) => `${i + 1}${p.name ? ` · ${p.name}` : ""}`;

  return (
    <div className="cielab-card" style={{ padding: compact ? "8px 10px" : "12px 14px" }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: compact ? 7 : 10 }}>Écart colorimétrique</div>

      {/* Pair selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 5, marginBottom: compact ? 8 : 12 }}>
        {[["Standard", pairA, setPairA], ["Échantillon", pairB, setPairB]].map(([lbl, val, setter]) => {
          const pt = points.find(p => p.id === val);
          return (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: "var(--color-text-secondary)", minWidth: compact ? 52 : 62, flexShrink: 0 }}>{lbl}</span>
              <Select value={val} onValueChange={setter}>
                <SelectTrigger style={{ fontSize: compact ? 10 : 11 }}>
                  <SelectValue label={pt ? ptLabel(pt, points.indexOf(pt)) : "–"} />
                </SelectTrigger>
                <SelectContent>
                  {points.map((p, i) => (
                    <SelectItem key={p.id} value={p.id}>{ptLabel(p, i)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Swatches */}
      {pa && pb && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 5 : 8, marginBottom: compact ? 8 : 12 }}>
          {[[pa, "Std"], [pb, "Éch"]].map(([p, role]) => (
            <div key={p.id}>
              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2 }}>
                {role} — {ptLabel(p, points.indexOf(p))}
              </div>
              <div style={{ height: compact ? 18 : 28, borderRadius: 5, background: labToHex(p.L, p.a, p.b), border: "0.5px solid rgba(0,0,0,0.1)" }} />
            </div>
          ))}
        </div>
      )}

      {same ? (
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", padding: "8px 0" }}>
          Sélectionnez deux points différents
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", padding: compact ? "2px 0 4px" : "4px 0 6px" }}>
            <div style={{ fontSize: compact ? 9 : 11, color: "var(--color-text-secondary)", marginBottom: 1 }}>ΔE*ab =</div>
            <div style={{ fontSize: compact ? 32 : 44, fontWeight: 700, color, lineHeight: 1, fontFamily: "monospace" }}>{de.toFixed(2)}</div>
            <div style={{ fontSize: compact ? 9 : 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{label}</div>
          </div>
          <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden", margin: compact ? "6px 0 7px" : "8px 0 10px" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .2s, background .2s" }} />
          </div>
          {/* Decomposition */}
          <div style={{ display: "flex", gap: 3, marginBottom: compact ? 7 : 10 }}>
            {[["ΔL*", pb.L - pa.L, "#888"], ["Δa*", pb.a - pa.a, "#c0392b"], ["Δb*", pb.b - pa.b, "#e6ac00"]].map(([k, v, c]) => (
              <div key={k} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 5, padding: "4px 3px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: c, fontWeight: 700 }}>{k}</div>
                <div style={{ fontSize: compact ? 9 : 10, fontWeight: 700, fontFamily: "monospace" }}>{v > 0 ? "+" : ""}{v.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Scale legend */}
      <div style={{ fontSize: 8, color: "var(--color-text-secondary)", display: "flex", flexWrap: "wrap", gap: "2px 6px" }}>
        {[["<1","Imperceptible","#1D9E75"],["1–2","Expert","#639922"],["2–3.5","Œil nu","#EF9F27"],["3.5–5","Nette","#D85A30"],[">5","Majeure","#E24B4A"]].map(([r,l,c]) => (
          <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: 1, background: c, display: "inline-block", flexShrink: 0 }} />
            {r} {l}
          </span>
        ))}
      </div>
    </div>
  );
}


// Tabs now provided by shadcn/ui

const Sep = () => <div style={{ width: 1, height: 14, background: "var(--color-border-secondary)", alignSelf: "center", flexShrink: 0 }} />;

const CoordPill = ({ coordMode, setCoordMode }) => (
  <div style={{
    display: "flex", flexDirection: "column", gap: 3,
    background: "var(--color-background-secondary)",
    borderRadius: 9, padding: 4,
    border: "0.5px solid var(--color-border-tertiary)",
    alignSelf: "flex-start", marginTop: 30,
  }}>
    {[["ab","a*b*"],["ch","C*h°"]].map(([m, lbl]) => (
      <button key={m} onClick={() => setCoordMode(m)} style={{
        padding: "8px 6px", fontSize: 9, fontWeight: 800, cursor: "pointer",
        borderRadius: 6, border: "none", letterSpacing: ".06em",
        background: coordMode === m ? "var(--color-text-primary)" : "transparent",
        color: coordMode === m ? "var(--color-background-primary)" : "var(--color-text-secondary)",
        transition: "background .15s, color .15s",
        writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)",
        minHeight: 50, minWidth: 22,
      }}>{lbl}</button>
    ))}
  </div>
);

// ─── L* vertical axis ──────────────────────────────────────────────────────
function LAxis({ points, setPoints }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const AXIS_W = 112;  // doubled from 56
  const PAD_T = 16, PAD_B = 16;

  const lToY = useCallback((L, height) => {
    return PAD_T + ((100 - L) / 100) * (height - PAD_T - PAD_B);
  }, []);
  const yToL = useCallback((y, height) => {
    const raw = 100 - ((y - PAD_T) / (height - PAD_T - PAD_B)) * 100;
    return Math.round(Math.min(100, Math.max(0, raw)));
  }, []);

  const getHeight = () => svgRef.current?.getBoundingClientRect().height || 400;
  const getY = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return src.clientY - rect.top;
  };

  const onDown = useCallback((e, idx) => {
    dragging.current = idx;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onMove = useCallback((e) => {
    if (dragging.current === null) return;
    const y = getY(e);
    const L = yToL(y, getHeight());
    setPoints(pts => pts.map((p, i) => i === dragging.current ? { ...p, L } : p));
    e.preventDefault();
  }, [yToL, setPoints]);

  const onUp = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onMove, onUp]);

  const ticks = [];
  for (let v = 0; v <= 100; v += 10) ticks.push(v);

  return (
    <div style={{ position: "relative", width: AXIS_W, height: "100%", minHeight: 200 }}>
      <svg ref={svgRef} width="100%" height="100%" style={{ display: "block", overflow: "visible" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <AxisContent points={points} lToY={lToY} ticks={ticks} onDown={onDown} AXIS_W={AXIS_W} PAD_T={PAD_T} PAD_B={PAD_B} />
      </div>
    </div>
  );
}

function AxisContent({ points, lToY, ticks, onDown, AXIS_W, PAD_T, PAD_B }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      setHeight(entries[0].contentRect.height);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Layout: name labels on left, track, graduation numbers + badges on right
  const trackX = 52;  // x of the axis track line
  const TRACK_H = height - PAD_T - PAD_B;

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      <svg width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="lgrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Gradient track bar */}
        <rect x={trackX - 6} y={PAD_T} width={12} height={TRACK_H}
          fill="url(#lgrad2)" rx="6" />

        {/* Axis line */}
        <line x1={trackX} y1={PAD_T} x2={trackX} y2={height - PAD_B}
          stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />

        {/* L* title */}
        <text x={trackX} y={PAD_T - 6} textAnchor="middle" fontSize="10" fontWeight="800"
          fill="var(--color-text-secondary)" letterSpacing="0.06em">L*</text>

        {/* Ticks + right-side number labels */}
        {ticks.map(v => {
          const y = lToY(v, height);
          const major = v % 20 === 0;
          return (
            <g key={v}>
              <line
                x1={trackX - (major ? 8 : 4)} y1={y}
                x2={trackX + (major ? 8 : 4)} y2={y}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth={major ? 1.4 : 0.8}
                opacity={major ? 0.85 : 0.45}
              />
              {major && (
                <text
                  x={trackX + 11} y={y}
                  textAnchor="start" dominantBaseline="middle"
                  fontSize="10" fontWeight="700"
                  fill="var(--color-text-secondary)"
                  style={{ fontFamily: "monospace" }}
                >{v}</text>
              )}
            </g>
          );
        })}

        {/* Point handles — draggable, on the right of the track */}
        {points.map((p, i) => {
          const y = lToY(p.L, height);
          const hex = labToHex(p.L, p.a, p.b);
          const pc = PCOLS[i % PCOLS.length];
          const lbl = p.name ? p.name.slice(0, 5) : PLBLS[i];
          const hx = trackX; // handle centered on track

          return (
            <g key={i} style={{ cursor: "ns-resize", pointerEvents: "all" }}
              onMouseDown={e => onDown(e, i)} onTouchStart={e => onDown(e, i)}>
              {/* Horizontal guide line */}
              <line x1={0} y1={y} x2={AXIS_W} y2={y}
                stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="3 2" />
              {/* Circle handle: color fill, white inner ring, black outer border */}
              <circle cx={hx} cy={y} r={6} fill={hex} />
              <circle cx={hx} cy={y} r={6} fill="none" stroke="white" strokeWidth="1" />
              <circle cx={hx} cy={y} r={7.5} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="1" />
              {/* Name label — plain bold, white stroke halo, to the LEFT of the handle */}
              <text x={hx - 16} y={y} textAnchor="end" dominantBaseline="middle"
                fontSize="12" fontWeight="800" fill="var(--color-text-primary)"
                stroke="rgba(255,255,255,0.95)" strokeWidth="4" strokeLinejoin="round"
                paintOrder="stroke"
                style={{ pointerEvents: "none", fontFamily: "var(--font-sans)" }}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


export default function CIELABExplorer() {
  const [tab,       setTab]       = useState("carto");
  const [Lval,      setLval]      = useState(60);
  const [zoom,      setZoom]      = useState(1);
  const [showColor, setShowColor] = useState(true);
  const [showGrid,  setShowGrid]  = useState(true);
  const [showEllipse, setShowEllipse] = useState(false);
  const [ellipseDE,   setEllipseDE]   = useState(1.0);
  const [coordMode, setCoordMode] = useState("ab");
  const [points,    setPoints]    = useState([
    { id: "p1", L: 60, a: 40,  b: 15, name: "" },
    { id: "p2", L: 60, a: -28, b: 40, name: "" },
  ]);
  const exportRef = useRef(null);

  const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
  const zoomIdx = ZOOM_STEPS.findIndex(s => Math.abs(s - zoom) < 0.01);
  const handleLval = (v) => { setLval(v); };

  // pairA/pairB store stable point IDs, not array indices
  const [pairA, setPairA] = useState("p1");
  const [pairB, setPairB] = useState("p2");

  // Resolve IDs → current indices for disc line drawing
  const idxA = points.findIndex(p => p.id === pairA);
  const idxB = points.findIndex(p => p.id === pairB);

  const disc = (
    <AbDisc L={Lval} points={points} setPoints={setPoints}
      zoom={zoom} setZoom={setZoom}
      showColor={showColor} showGrid={showGrid} showEllipse={tab === "analyse" && showEllipse} ellipseDE={ellipseDE} Lval={Lval}
      coordMode={coordMode} exportRef={exportRef}
      pairA={pairA} pairB={pairB}
      showDelta={tab === "analyse"}
      pairLine={tab === "analyse" && idxA >= 0 && idxB >= 0 && idxA !== idxB ? [idxA, idxB] : null} />
  );

  const toolbar = (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5,
      padding: "6px 12px", marginBottom: 10,
      background: "var(--color-background-primary)",
      borderRadius: 10, border: "1px solid var(--color-border-secondary)",
      boxShadow: "var(--shadow-sm)",
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: ".06em" }}>L*</span>
      <input type="range" min={10} max={95} value={Lval} onChange={e => handleLval(+e.target.value)}
        style={{ width: 72, accentColor: "#18181b", cursor: "pointer" }} />
      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, fontFamily: "monospace", color: "var(--color-text-primary)" }}>{Lval}</span>
      <Sep />
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: ".06em" }}>ZOOM</span>
      <button className="cielab-tb-btn" onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIdx - 1)])} disabled={zoomIdx === 0} title="Dézoomer">
        <ZoomOut size={13} />
      </button>
      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: "center", fontFamily: "monospace" }}>×{zoom}</span>
      <button className="cielab-tb-btn" onClick={() => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIdx + 1)])} disabled={zoomIdx === ZOOM_STEPS.length - 1} title="Zoomer">
        <ZoomIn size={13} />
      </button>
      {zoom !== 1 && (
        <button className="cielab-tb-btn" onClick={() => setZoom(1)} title="Réinitialiser zoom">
          <RotateCcw size={11} />
        </button>
      )}
      <Sep />
      <button className={`cielab-tb-btn${showColor ? " active-clr" : ""}`} onClick={() => setShowColor(v => !v)} title={showColor ? "Désactiver couleur" : "Activer couleur"}>
        {showColor ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button className={`cielab-tb-btn${showGrid ? " active-grid" : ""}`} onClick={() => setShowGrid(v => !v)} title={showGrid ? "Masquer grille" : "Afficher grille"}>
        <Grid3x3 size={13} />
      </button>
      {tab === "analyse" && (
        <>
          <button className={`cielab-tb-btn${showEllipse ? " active-clr" : ""}`}
            onClick={() => setShowEllipse(v => !v)}
            title={showEllipse ? "Masquer ellipses ΔE" : "Afficher ellipses ΔE"}
            style={showEllipse ? { background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" } : {}}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "-0.5px" }}>ΔE</span>
          </button>
          {showEllipse && (
            <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--color-background-secondary)", borderRadius: 6, padding: "2px 4px", border: "1px solid #e4e4e7" }}>
              <button onClick={() => setEllipseDE(v => Math.max(0.5, Math.round((v - 1) * 10) / 10))}
                style={{ width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#525252", padding: 0, lineHeight: 1 }} title="−1">«</button>
              <button onClick={() => setEllipseDE(v => Math.max(0.5, Math.round((v - 0.1) * 10) / 10))}
                style={{ width: 16, height: 20, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#525252", padding: 0, lineHeight: 1 }} title="−0.1">‹</button>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", minWidth: 28, textAlign: "center", color: "#7c3aed" }}>{ellipseDE.toFixed(1)}</span>
              <button onClick={() => setEllipseDE(v => Math.min(20, Math.round((v + 0.1) * 10) / 10))}
                style={{ width: 16, height: 20, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#525252", padding: 0, lineHeight: 1 }} title="+0.1">›</button>
              <button onClick={() => setEllipseDE(v => Math.min(20, Math.round((v + 1) * 10) / 10))}
                style={{ width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#525252", padding: 0, lineHeight: 1 }} title="+1">»</button>
            </div>
          )}
        </>
      )}
      <div style={{ marginLeft: "auto" }}>
        <button className="cielab-export-btn" onClick={() => exportRef.current && exportRef.current()} title="Exporter PNG">
          <Download size={12} /> PNG
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", padding: "1rem 0 2rem", width: "100%" }}>
      <CSSInjector />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-2 h-9" style={{ marginLeft: 90, display: "inline-flex" }}>
          {["carto","analyse","explorer","theory"].map(v => (
            <TabsTrigger key={v} value={v} activeValue={tab} onValueChange={setTab}>
              {v === "carto" ? "CIE LAB" : v === "analyse" ? "Analyse ΔE" : v === "explorer" ? "Explorateur" : "Théorie"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── SHARED DISC LAYOUT ── */}
      {(tab === "carto" || tab === "analyse") && (
        <div>
          {toolbar}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "flex-start" }}>
            <CoordPill coordMode={coordMode} setCoordMode={setCoordMode} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ maxWidth: "calc(100vh - 140px)", display: "flex", gap: 8, alignItems: "stretch" }}>
                <div style={{ flex: 1, minWidth: 0 }}>{disc}</div>
                {tab === "analyse" && (
                  <div style={{ width: 200, flexShrink: 0, alignSelf: "flex-start" }}>
                    <DeltaPanel points={points} pairA={pairA} setPairA={setPairA} pairB={pairB} setPairB={setPairB} compact />
                  </div>
                )}
                <div style={{ width: 112, alignSelf: "stretch", flexShrink: 0 }}><LAxis points={points} setPoints={setPoints} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "explorer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Point ❶ courant</div>
            {points.length > 0 ? <>
              <div style={{ height: 60, borderRadius: 7, background: labToHex(points[0].L, points[0].a, points[0].b), marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.07)" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5, marginBottom: 10 }}>
                {[["L*",points[0].L.toFixed(1),"#888"],["a*",points[0].a.toFixed(1),"#c0392b"],["b*",points[0].b.toFixed(1),"#e6ac00"],
                  ["C*",Math.sqrt(points[0].a**2+points[0].b**2).toFixed(1),"#1D9E75"],
                  ["h°",(((Math.atan2(points[0].b,points[0].a)*180/Math.PI)+360)%360).toFixed(1)+"°","#185FA5"],
                  ["HEX",labToHex(points[0].L,points[0].a,points[0].b).toUpperCase(),"#888"]
                ].map(([k,v,c]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: 6, padding: "5px 3px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2, letterSpacing: ".04em" }}>{k}</div>
                    <div style={{ fontSize: k==="HEX"?7:12, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </> : <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-secondary)", padding: "16px 0" }}>Ajoutez un point depuis Plan a*b*</div>}
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Contrôles (point ❶)</div>
            {points.length > 0 ? <>
              <Slider label="L*" color="#888" min={0} max={100} step={0.1} value={points[0].L}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,L:Math.round(v*10)/10}:p))} />
              <Slider label="a*  rouge(+) / vert(−)" color="#c0392b" min={-ARANGE} max={ARANGE} step={0.1} value={points[0].a}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,a:Math.round(v*10)/10}:p))} />
              <Slider label="b*  jaune(+) / bleu(−)" color="#e6ac00" min={-ARANGE} max={ARANGE} step={0.1} value={points[0].b}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,b:Math.round(v*10)/10}:p))} />
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 7 }}>Préréglages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[["Rouge vif",50,72,38],["Vert herbe",72,-45,51],["Bleu nuit",32,15,-50],
                    ["Jaune soleil",85,-5,80],["Rouge profond",27,50,36],["Neutre",50,0,0]].map(([name,L,a,b]) => (
                    <button key={name} onClick={() => setPoints(pts => pts.map((p,i) => i===0?{...p,L,a,b}:p))}
                      style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", borderRadius: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: labToHex(L,a,b), flexShrink: 0 }} />{name}
                    </button>
                  ))}
                </div>
              </div>
            </> : null}
          </div>
        </div>
      )}

      {tab === "theory" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Historique CIELAB</div>
            {[["1931 — CIE XYZ","Premières valeurs tristimulus standardisées. Précis mais sans corrélation perceptive."],
              ["1905–1942 — Munsell & MacAdam","Atlas perceptif + ellipses MacAdam : non-uniformité visuelle de CIE31."],
              ["1976 — CIELAB","Transformation non-linéaire de XYZ. ΔE ≈ écart visuel perçu."]].map(([t,d]) => (
              <div key={t} style={{ padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{t}</div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Transformation XYZ → L*a*b*</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, background: "var(--color-background-secondary)", padding: "9px 11px", borderRadius: 6, lineHeight: 2 }}>
                f(t) = t^(1/3) si t {">"} 0.008856<br />
                f(t) = 7.787·t + 16/116 sinon<br /><br />
                <span style={{ color: "#888" }}>L* = 116·f(Y/Yn) − 16</span><br />
                <span style={{ color: "#c0392b" }}>a* = 500·[f(X/Xn) − f(Y/Yn)]</span><br />
                <span style={{ color: "#e6ac00" }}>b* = 200·[f(Y/Yn) − f(Z/Zn)]</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 10, color: "var(--color-text-secondary)" }}>D65/2° : Xn=95.04 · Yn=100 · Zn=108.88</div>
            </div>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Formules clés</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, background: "var(--color-background-secondary)", padding: "9px 11px", borderRadius: 6, lineHeight: 2 }}>
                <span style={{ color: "#1D9E75" }}>C* = √(a*² + b*²)  → saturation</span><br />
                <span style={{ color: "#185FA5" }}>h  = arctan(b*/a*) → teinte (0–360°)</span><br />
                <span style={{ color: "#E24B4A" }}>ΔE = √(ΔL*² + Δa*² + Δb*²)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}