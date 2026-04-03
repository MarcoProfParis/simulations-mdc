import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

const SPECTRUM_LOCUS = [
  { nm: 380, x: 0.1741, y: 0.0050 },
  { nm: 390, x: 0.1740, y: 0.0042 },
  { nm: 400, x: 0.1733, y: 0.0048 },
  { nm: 410, x: 0.1726, y: 0.0069 },
  { nm: 420, x: 0.1714, y: 0.0119 },
  { nm: 430, x: 0.1689, y: 0.0208 },
  { nm: 440, x: 0.1641, y: 0.0180 },
  { nm: 450, x: 0.1566, y: 0.0177 },
  { nm: 460, x: 0.1440, y: 0.0297 },
  { nm: 470, x: 0.1241, y: 0.0578 },
  { nm: 475, x: 0.1096, y: 0.0868 },
  { nm: 480, x: 0.0913, y: 0.1327 },
  { nm: 485, x: 0.0687, y: 0.2007 },
  { nm: 490, x: 0.0454, y: 0.2950 },
  { nm: 495, x: 0.0235, y: 0.4127 },
  { nm: 500, x: 0.0082, y: 0.5384 },
  { nm: 505, x: 0.0039, y: 0.6548 },
  { nm: 510, x: 0.0139, y: 0.7502 },
  { nm: 520, x: 0.0743, y: 0.8338 },
  { nm: 530, x: 0.1547, y: 0.8059 },
  { nm: 540, x: 0.2296, y: 0.7543 },
  { nm: 550, x: 0.3016, y: 0.6923 },
  { nm: 560, x: 0.3731, y: 0.6245 },
  { nm: 570, x: 0.4441, y: 0.5547 },
  { nm: 580, x: 0.5125, y: 0.4866 },
  { nm: 590, x: 0.5752, y: 0.4242 },
  { nm: 600, x: 0.6270, y: 0.3725 },
  { nm: 610, x: 0.6658, y: 0.3340 },
  { nm: 620, x: 0.6915, y: 0.3083 },
  { nm: 630, x: 0.7006, y: 0.2993 },
  { nm: 640, x: 0.7170, y: 0.2830 },
  { nm: 650, x: 0.7260, y: 0.2740 },
  { nm: 700, x: 0.7347, y: 0.2653 },
  { nm: 780, x: 0.7347, y: 0.2653 },
];


// planckXY used at module level to place illuminants on the Planckian locus
const _planckXY = (T) => {
  let x;
  if (T >= 1667 && T <= 4000) x = -0.2661239e9/(T*T*T) - 0.2343580e6/(T*T) + 0.8776956e3/T + 0.179910;
  else if (T > 4000 && T <= 25000) x = -3.0258469e9/(T*T*T) + 2.1070379e6/(T*T) + 0.2226347e3/T + 0.240390;
  else return null;
  let y;
  if (T >= 1667 && T <= 2222) y = -1.1063814*x*x*x - 1.34811020*x*x + 2.18555832*x - 0.20219683;
  else if (T > 2222 && T <= 4000) y = -0.9549476*x*x*x - 1.37418593*x*x + 2.09137015*x - 0.16748867;
  else y = 3.0817580*x*x*x - 5.87338670*x*x + 3.75112997*x - 0.37001483;
  return { x, y };
};

const ILLUMINANTS = {
  D65: { ...(_planckXY(6504) || { x: 0.3127, y: 0.3290 }), label: "D65 (Lumière du jour)", cct: 6504 },
  A:   { ...(_planckXY(2856) || { x: 0.4476, y: 0.4074 }), label: "A (Lampe incandescente)", cct: 2856 },
  C:   { ...(_planckXY(6774) || { x: 0.3101, y: 0.3162 }), label: "C (Lumière naturelle moyenne)", cct: 6774 },
  E:   { x: 0.3333, y: 0.3333, label: "E (Blanc égal)", cct: null },
};

const PRIMARY_SETS = {
  sRGB: {
    r: { x: 0.6400, y: 0.3300 }, g: { x: 0.3000, y: 0.6000 }, b: { x: 0.1500, y: 0.0600 },
    label: "sRGB / HDTV"
  },
  AdobeRGB: {
    r: { x: 0.6400, y: 0.3300 }, g: { x: 0.2100, y: 0.7100 }, b: { x: 0.1500, y: 0.0600 },
    label: "Adobe RGB"
  },
  DCI_P3: {
    r: { x: 0.6800, y: 0.3200 }, g: { x: 0.2650, y: 0.6900 }, b: { x: 0.1500, y: 0.0600 },
    label: "DCI-P3 (Cinéma)"
  },
};

function nmToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  let factor = 1;
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700 && nm <= 780) factor = 0.3 + 0.7 * (780 - nm) / 80;
  r = Math.round(Math.pow(Math.max(r * factor, 0), 0.8) * 255);
  g = Math.round(Math.pow(Math.max(g * factor, 0), 0.8) * 255);
  b = Math.round(Math.pow(Math.max(b * factor, 0), 0.8) * 255);
  return `rgb(${r},${g},${b})`;
}

const W = 780, H = 780;
const PAD = { l: 48, r: 28, t: 28, b: 48 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

function toC(x, y) {
  const cx = PAD.l + x * PW / 0.85;
  const cy = PAD.t + (1 - y / 0.85) * PH;
  return [cx, cy];
}

const ChromaticityDiagram = forwardRef(function ChromaticityDiagram({ illuminant, onHover, userPoints = [], onAddPoint, onMovePoint, showReticle = true, onToggleReticle, showPlanckian = false, onTogglePlanckian, macadamFactor = 0, onSetMacadam, showColorFill = true, onToggleColorFill, onDblClickPoint, onToggleAllSat, allSatOn = false, annotations = [], onAnnotationsChange }, ref) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));
  // Viewport in chromaticity coords: [xMin, yMin, xMax, yMax]
  const [view, setView] = useState([0, 0, 0.85, 0.85]);
  const viewRef = useRef([0, 0, 0.85, 0.85]);
  const [mode, setMode] = useState("point"); // "point" | "pan"
  const modeRef = useRef("point");
  const switchMode = (m) => { modeRef.current = m; setMode(m); };
  const panStartRef = useRef(null);
  const dragPointRef = useRef(null); // id of point being dragged
  const mouseDownPosRef = useRef(null); // {cpx,cpy} to detect real click vs drag
  const [nearPoint, setNearPoint] = useState(false); // true when cursor is over a user point
  const drawingRef = useRef(null); // current stroke being drawn {points:[]}
  const textInputRef = useRef(null); // pending text annotation position

  // Convert chromaticity (x,y) → canvas pixel using current view
  const toCv = useCallback((x, y, v) => {
    const [x0, y0, x1, y1] = v;
    const cx = PAD.l + (x - x0) / (x1 - x0) * (W - PAD.l - PAD.r);
    const cy = PAD.t + (1 - (y - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
    return [cx, cy];
  }, []);

  const draw = useCallback((v) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const [vx0, vy0, vx1, vy1] = v;
    // Local toCanvas using current viewport
    const toC = (x, y) => {
      const cx = PAD.l + (x - vx0) / (vx1 - vx0) * (W - PAD.l - PAD.r);
      const cy = PAD.t + (1 - (y - vy0) / (vy1 - vy0)) * (H - PAD.t - PAD.b);
      return [cx, cy];
    };

    // Build spectrum locus path starting at 380nm
    // Smooth zones: 400-460nm (UV concavity) and 505-530nm (green bend)
    const LOCUS_380 = SPECTRUM_LOCUS.filter(p => p.nm >= 380);

    const buildLocusPath = (path, toCfn) => {
      let started = false;
      let skipUntil460 = false;
      const pts = LOCUS_380;
      for (let i = 0; i < pts.length; i++) {
        const { nm, x, y } = pts[i];
        const [cx, cy] = toCfn(x, y);
        if (!started) { path.moveTo(cx, cy); started = true; continue; }

        // 400-460nm: draw a single gently curved segment (quadratic bezier)
        if (nm === 460 && skipUntil460) {
          // Get the 400nm point to find control point for the curve
          const p400 = pts.find(p => p.nm === 400);
          if (p400) {
            const [x400, y400] = toCfn(p400.x, p400.y);
            // Midpoint between 400 and 460, nudged slightly toward the interior
            const cpx = (x400 + cx) / 2 + (cy - y400) * 0.15; // slight inward bow
            const cpy = (y400 + cy) / 2 - (cx - x400) * 0.15;
            path.quadraticCurveTo(cpx, cpy, cx, cy);
          } else {
            path.lineTo(cx, cy);
          }
          skipUntil460 = false;
          continue;
        }
        if (nm > 400 && nm < 460) { skipUntil460 = true; continue; }
        if (nm === 400 && !skipUntil460) { skipUntil460 = true; path.lineTo(cx, cy); continue; }

        // 505-530nm: smooth Catmull-Rom
        if (nm > 505 && nm <= 530) {
          const prev = pts[i - 1];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          const pp   = pts[Math.max(i - 2, 0)];
          const [px2, py2] = toCfn(prev.x, prev.y);
          const [nx2, ny2] = toCfn(next.x, next.y);
          const [ppx, ppy] = toCfn(pp.x, pp.y);
          const cp1x = px2 + (cx - ppx) / 6;
          const cp1y = py2 + (cy - ppy) / 6;
          const cp2x = cx - (nx2 - px2) / 6;
          const cp2y = cy - (ny2 - py2) / 6;
          path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cx, cy);
        } else {
          path.lineTo(cx, cy);
        }
      }
    };

    const locusPath = new Path2D();
    buildLocusPath(locusPath, toC);
    locusPath.closePath();

    // Render into offscreen canvas first (putImageData ignores clip regions)
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    const imgData = octx.createImageData(W, H);
    const pdata = imgData.data;
    const gam = (v) => {
      const c = Math.max(0, Math.min(1, v));
      return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    };
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const chrx = vx0 + (px - PAD.l) / drawW * (vx1 - vx0);
        const chry = vy0 + (1 - (py - PAD.t) / drawH) * (vy1 - vy0);
        if (chrx < 0 || chry < 0.001 || chrx + chry > 1) continue;
        const X = chrx / chry;
        const Z = (1 - chrx - chry) / chry;
        let r =  3.2406 * X - 1.5372 - 0.4986 * Z;
        let g = -0.9689 * X + 1.8758 + 0.0415 * Z;
        let b2 = 0.0557 * X - 0.2040 + 1.0570 * Z;
        const mx = Math.max(r, g, b2, 0.001);
        r /= mx; g /= mx; b2 /= mx;
        const ii = (py * W + px) * 4;
        pdata[ii]   = Math.round(gam(r) * 255);
        pdata[ii+1] = Math.round(gam(g) * 255);
        pdata[ii+2] = Math.round(gam(b2) * 255);
        pdata[ii+3] = 255;
      }
    }
    octx.putImageData(imgData, 0, 0);

    // Now clip to locus and draw offscreen onto main canvas (if fill enabled)
    if (showColorFill) {
      ctx.save();
      ctx.clip(locusPath);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    // Draw grid OVER the colors so it's always visible
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 0.85; v += 0.05) {
      const isMajor = Math.round(v * 100) % 10 === 0;
      ctx.setLineDash(isMajor ? [] : [4, 4]);
      ctx.strokeStyle = isMajor ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)";
      const [x0, y0] = toC(0, v);
      const [x1] = toC(0.85, v);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      const [ax, ay] = toC(v, 0);
      const [, ay1] = toC(v, 0.85);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay1); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Stroke the locus outline (same path, smooth 495-540nm)
    ctx.beginPath();
    buildLocusPath(ctx, toC);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (illuminant && ILLUMINANTS[illuminant]) {
      const ill = ILLUMINANTS[illuminant];
      const [cx, cy] = toC(ill.x, ill.y);
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30,30,30,0.9)"; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(30,30,30,0.9)";
      ctx.fillText(illuminant, cx + 9, cy - 4);
    }

    // Draw annotations (strokes + texts)
    annotations.forEach(ann => {
      if (ann.type === "stroke" && ann.points.length > 1) {
        ctx.beginPath();
        ann.points.forEach(([x2, y2], i) => {
          const [cx2, cy2] = toC(x2, y2);
          i === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
        });
        ctx.strokeStyle = ann.color || "rgba(220,50,50,0.85)";
        ctx.lineWidth = ann.width || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([]);
        ctx.stroke();
      } else if (ann.type === "text") {
        const [cx2, cy2] = toC(ann.x, ann.y);
        ctx.font = `bold ${ann.size || 13}px sans-serif`;
        ctx.fillStyle = ann.color || "rgba(220,50,50,0.9)";
        ctx.textAlign = "left";
        ctx.fillText(ann.text, cx2, cy2);
      }
    });

    // Draw MacAdam tolerance ellipses — circle in (u',v') → ellipse in (x,y)
    if (macadamFactor > 0) {
      const r = macadamFactor * 0.0011;
      const nPts = 72;
      userPoints.forEach((pt) => {
        const { u: uc, v: vc } = xyToUV(pt.x, pt.y);
        // Find the rightmost point of the ellipse to place the label
        let labelX = -Infinity, labelY = 0;
        ctx.beginPath();
        for (let i = 0; i <= nPts; i++) {
          const angle = (2 * Math.PI * i) / nPts;
          const u2 = uc + r * Math.cos(angle);
          const v2 = vc + r * Math.sin(angle);
          const denom = 6*u2 - 16*v2 + 12;
          const ex = 9*u2/denom;
          const ey = 4*v2/denom;
          const [px2, py2] = toC(ex, ey);
          if (px2 > labelX) { labelX = px2; labelY = py2; }
          i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(20,20,20,0.8)";
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Factor label next to ellipse
        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle = "rgba(20,20,20,0.75)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`×${macadamFactor}`, labelX + 4, labelY);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      });
    }

        // Draw Planckian (blackbody) locus if enabled
    if (showPlanckian) {
      const planckXY = _planckXY; // use module-level function

      // Sample temperatures: logarithmic scale 1667K → 20000K
      const Tmin = 1667, Tmax = 20000, steps = 300;
      const planckPts = [];
      for (let i = 0; i <= steps; i++) {
        const logT = Math.log(Tmin) + (Math.log(Tmax) - Math.log(Tmin)) * i / steps;
        const T = Math.exp(logT);
        const pt2 = planckXY(T);
        if (pt2) planckPts.push({ T, ...pt2 });
      }

      // Draw curve — black, 2.5px
      ctx.beginPath();
      planckPts.forEach(({ x, y }, i) => {
        const [px2, py2] = toC(x, y);
        i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      });
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Helper: outward normal at a Planckian point (perpendicular to curve direction)
      const planckNormal = (T) => {
        const dt = T * 0.01;
        const p1 = planckXY(Math.max(1667, T - dt));
        const p2 = planckXY(Math.min(20000, T + dt));
        if (!p1 || !p2) return { nx: 0, ny: -1 };
        const [c1x, c1y] = toC(p1.x, p1.y);
        const [c2x, c2y] = toC(p2.x, p2.y);
        const dx2 = c2x - c1x, dy2 = c2y - c1y;
        const len = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
        // perpendicular, pointing "outward" (away from center of diagram)
        return { nx: -dy2/len, ny: dx2/len };
      };

      // Main labeled temps + dense intermediate ticks
      const labelTemps = [1700, 2000, 2500, 3000, 4000, 5000, 6500, 8000, 10000, 15000, 20000];

      // 3 intermediate ticks spread across the whole curve
      const intermediateTicks = [1850, 3500, 7500];
      intermediateTicks.forEach(T => {
        const pt3 = planckXY(T);
        if (!pt3) return;
        const [px2, py2] = toC(pt3.x, pt3.y);
        ctx.beginPath(); ctx.arc(px2, py2, 1.8, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fill();
      });

      // Draw labeled temps with outward normal positioning
      ctx.font = "bold 11px sans-serif";
      labelTemps.forEach(T => {
        const pt3 = planckXY(T);
        if (!pt3) return;
        const [px2, py2] = toC(pt3.x, pt3.y);
        const { nx, ny } = planckNormal(T);

        // Labels ≤ 4000K: above curve (normal points away from center → use -normal to go above)
        // Labels > 4000K: below curve
        const above = T <= 4000;
        const sign = above ? -1 : 1;
        const offset = 32;
        const lx = px2 + sign * nx * offset;
        const ly = py2 + sign * ny * offset;

        // Dot
        ctx.beginPath(); ctx.arc(px2, py2, 3.5, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fill();

        // Short tick line from dot to label
        ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(lx, ly);
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.8; ctx.stroke();

        // Label
        const lbl = T + " K";
        ctx.fillStyle = "rgba(0,0,0,0.88)";
        ctx.textAlign = "center";
        ctx.textBaseline = above ? "bottom" : "top";
        ctx.fillText(lbl, lx, ly + (above ? -1 : 1));
      });
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }

        userPoints.forEach((pt, idx) => {
      const [cx, cy] = toC(pt.x, pt.y);
      // Draw saturation line if active
      if (pt.showSat && illuminant && ILLUMINANTS[illuminant]) {
        const ill = ILLUMINANTS[illuminant];
        const [ix, iy] = toC(ill.x, ill.y);
        // Find intersection of ray from illuminant through pt with spectrum locus
        const dx = pt.x - ill.x, dy = pt.y - ill.y;
        let bestT = Infinity, bx = pt.x, by = pt.y;
        const locus = SPECTRUM_LOCUS;
        for (let k = 0; k < locus.length - 1; k++) {
          const ax = locus[k].x, ay = locus[k].y;
          const bx2 = locus[k+1].x, by2 = locus[k+1].y;
          const ex = bx2 - ax, ey = by2 - ay;
          const denom = dx * ey - dy * ex;
          if (Math.abs(denom) < 1e-10) continue;
          const t = ((ax - ill.x) * ey - (ay - ill.y) * ex) / denom;
          const s = ((ax - ill.x) * dy - (ay - ill.y) * dx) / denom;
          if (t > 0.001 && s >= 0 && s <= 1 && t < bestT) { bestT = t; bx = ill.x + t * dx; by = ill.y + t * dy; }
        }
        // Also check closing line (locus[last] -> locus[0])
        {
          const ax = locus[locus.length-1].x, ay = locus[locus.length-1].y;
          const bx2 = locus[0].x, by2 = locus[0].y;
          const ex = bx2 - ax, ey = by2 - ay;
          const denom = dx * ey - dy * ex;
          if (Math.abs(denom) > 1e-10) {
            const t = ((ax - ill.x) * ey - (ay - ill.y) * ex) / denom;
            const s = ((ax - ill.x) * dy - (ay - ill.y) * dx) / denom;
            if (t > 0.001 && s >= 0 && s <= 1 && t < bestT) { bestT = t; bx = ill.x + t * dx; by = ill.y + t * dy; }
          }
        }
        // Check if forward ray hit purple line (closing segment = complementary)
        const lastIdx = locus.length - 1;
        // Detect purple: closing segment is locus[last]->locus[0]
        // Recompute which segment bestT belongs to
        let hitPurple = false;
        {
          const ax2 = locus[lastIdx].x, ay2 = locus[lastIdx].y;
          const bx3 = locus[0].x, by3 = locus[0].y;
          const ex3 = bx3 - ax2, ey3 = by3 - ay2;
          const denom2 = dx * ey3 - dy * ex3;
          if (Math.abs(denom2) > 1e-10) {
            const t2 = ((ax2 - ill.x) * ey3 - (ay2 - ill.y) * ex3) / denom2;
            const s2 = ((ax2 - ill.x) * dy - (ay2 - ill.y) * dx) / denom2;
            if (t2 > 0.001 && s2 >= 0 && s2 <= 1 && Math.abs(t2 - bestT) < 1e-6) hitPurple = true;
          }
        }

        const [ex2, ey2] = toC(bx, by);

        if (hitPurple) {
          // Purple line hit: draw gray dashed forward (ill→purple locus) to show direction
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ex2, ey2);
          ctx.strokeStyle = "rgba(140,100,160,0.5)"; ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
          // Find and draw the COMPLEMENTARY (backward) ray → opposite locus point
          let cBestT = Infinity, cbx = pt.x, cby = pt.y;
          const cdx = -dx, cdy = -dy;
          for (let k = 0; k < locus.length - 1; k++) {
            const ax3 = locus[k].x, ay3 = locus[k].y;
            const bx4 = locus[k+1].x, by4 = locus[k+1].y;
            const cex = bx4 - ax3, cey = by4 - ay3;
            const cdenom = cdx * cey - cdy * cex;
            if (Math.abs(cdenom) < 1e-10) continue;
            const ct = ((ax3 - ill.x) * cey - (ay3 - ill.y) * cex) / cdenom;
            const cs = ((ax3 - ill.x) * cdy - (ay3 - ill.y) * cdx) / cdenom;
            if (ct > 0.001 && cs >= 0 && cs <= 1 && ct < cBestT) { cBestT = ct; cbx = ill.x + ct*cdx; cby = ill.y + ct*cdy; }
          }
          const [cex2, cey2] = toC(cbx, cby);
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cex2, cey2);
          ctx.strokeStyle = "rgba(20,20,20,0.55)"; ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(cex2, cey2, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(20,20,20,0.7)"; ctx.fill();
        } else {
          // Normal: solid/dashed line illuminant → locus
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ex2, ey2);
          ctx.strokeStyle = "rgba(20,20,20,0.55)"; ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(ex2, ey2, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(20,20,20,0.7)"; ctx.fill();
          // Wavelength label at locus intersection
          if (!hitPurple) {
            // Find which segment the forward hit belongs to for wavelength
            const wl = computeSaturation(pt, illuminant);
            if (wl && wl.domWl !== null) {
              ctx.font = "bold 10px sans-serif";
              ctx.fillStyle = "rgba(20,20,20,0.85)";
              ctx.textAlign = "left"; ctx.textBaseline = "bottom";
              ctx.fillText(wl.domWl + " nm", ex2 + 6, ey2 - 2);
            }
          }
        }
        if (hitPurple) {
          // Wavelength label for complementary (already drawn cex2,cey2 above)
          const wl2 = computeSaturation(pt, illuminant);
          if (wl2 && wl2.domWl !== null) {
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = "rgba(140,60,0,0.85)";
            ctx.textAlign = "left"; ctx.textBaseline = "bottom";
            ctx.fillText(wl2.domWl + " nm (c)", ex2 + 6, ey2 - 2);
          }
        }
      }
      // Circle (empty — no number inside)
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,20,20,0.85)"; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      // Label outside (name or #i)
      const label = pt.name ? pt.name : ("#" + (idx + 1));
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(20,20,20,0.9)";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(label, cx, cy - 9);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });



    if (hovered && showReticle) {
      const [cx, cy] = toC(hovered.x, hovered.y);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(20,20,20,0.45)";

      // Full-width horizontal line
      ctx.beginPath();
      ctx.moveTo(PAD.l, cy);
      ctx.lineTo(W - PAD.r, cy);
      ctx.stroke();

      // Full-height vertical line
      ctx.beginPath();
      ctx.moveTo(cx, PAD.t);
      ctx.lineTo(cx, H - PAD.b);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();

      // Small crosshair circle at intersection
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20,20,20,0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Coordinate label — position it to avoid edges
      const label = "x=" + hovered.x.toFixed(3) + "  y=" + hovered.y.toFixed(3);
      ctx.font = "bold 11px sans-serif";
      const tw = ctx.measureText(label).width;
      const labelPad = 5;
      const labelW = tw + labelPad * 2;
      const labelH = 18;
      let lx = cx + 10;
      if (lx + labelW > W - PAD.r) lx = cx - labelW - 10;
      let ly = cy - 24;
      if (ly < PAD.t + labelH) ly = cy + 8;

      ctx.fillStyle = "rgba(20,20,20,0.82)";
      ctx.beginPath();
      ctx.roundRect(lx, ly, labelW, labelH, 4);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.fillText(label, lx + labelPad, ly + 13);
    }

    ctx.fillStyle = "rgba(30,30,30,0.9)";
    ctx.font = "bold 11px sans-serif";
    for (let v = 0; v <= 0.8; v += 0.1) {
      const [x0, y0] = toC(0, v);
      ctx.fillText(v.toFixed(1), x0 - 34, y0 + 4);
      const [ax, ay] = toC(v, 0);
      ctx.fillText(v.toFixed(1), ax - 8, ay + 16);
    }
    ctx.fillStyle = "rgba(30,30,30,0.9)";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("x", W / 2, H - 4);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("y", 0, 0); ctx.restore();

    // Wavelength tick marks and labels every 10nm
    const LABEL_NMS = new Set([
      380, 400, 460, 470,
      480, 485, 490, 495, 500, 505, 510, 520,
      530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 700
    ]);
    const labeled = LOCUS_380.filter(p => LABEL_NMS.has(p.nm));
    labeled.forEach(({ nm, x, y }, i) => {
      const [cx, cy] = toC(x, y);
      // Compute outward normal from locus by looking at neighbors
      const prev = labeled[i - 1] || labeled[i];
      const next = labeled[i + 1] || labeled[i];
      const [px2, py2] = toC(prev.x, prev.y);
      const [nx2, ny2] = toC(next.x, next.y);
      const dx = nx2 - px2, dy = ny2 - py2;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      // outward normal (perpendicular, pointing away from locus interior)
      let nx = dy / len, ny = -dx / len;
      // flip if pointing inward (toward center ~0.33,0.33)
      const [ccx, ccy] = toC(0.33, 0.33);
      if ((cx + nx * 10 - ccx) * (cx - ccx) + (cy + ny * 10 - ccy) * (cy - ccy) < 0) {
        nx = -nx; ny = -ny;
      }
      // tick mark
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + nx * 6, cy + ny * 6);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // label
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "rgba(10,10,10,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(nm, cx + nx * 18, cy + ny * 18);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";


  }, [illuminant, hovered, userPoints, toCv, showReticle, showPlanckian, macadamFactor, showColorFill, annotations]);

  useEffect(() => { draw(viewRef.current); }, [draw]);

  const getXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (e.clientX - rect.left) * scale;
    const cpy = (e.clientY - rect.top) * scale;
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    const x = vx0 + (cpx - PAD.l) / drawW * (vx1 - vx0);
    const y = vy0 + (1 - (cpy - PAD.t) / drawH) * (vy1 - vy0);
    return { x: +x.toFixed(4), y: +y.toFixed(4), valid: x >= 0 && x <= 0.85 && y >= 0 && y <= 0.85 };
  };

  const handleMouseMove = (e) => {
    if (panStartRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      const cpx = (e.clientX - rect.left) * scale;
      const cpy = (e.clientY - rect.top) * scale;
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
      const dx = -(cpx - panStartRef.current.cpx) / drawW * (vx1 - vx0);
      const dy =  (cpy - panStartRef.current.cpy) / drawH * (vy1 - vy0);
      const nv = [panStartRef.current.vx0 + dx, panStartRef.current.vy0 + dy,
                  panStartRef.current.vx1 + dx, panStartRef.current.vy1 + dy];
      viewRef.current = nv;
      setView(nv);
      draw(nv);
      return;
    }
    // Draw mode — accumulate stroke points
    if (modeRef.current === "draw" && drawingRef.current) {
      const { x, y, valid } = getXY(e);
      if (valid) {
        drawingRef.current.points.push([x, y]);
        // Redraw with current stroke overlaid
        draw(viewRef.current);
        const [cx2, cy2] = toCv(x, y, viewRef.current);
        const ctx2 = canvasRef.current.getContext("2d");
        if (drawingRef.current.points.length > 1) {
          const [px2, py2] = toCv(drawingRef.current.points[drawingRef.current.points.length-2][0],
                                   drawingRef.current.points[drawingRef.current.points.length-2][1], viewRef.current);
          ctx2.beginPath(); ctx2.moveTo(px2, py2); ctx2.lineTo(cx2, cy2);
          ctx2.strokeStyle = "rgba(220,50,50,0.85)"; ctx2.lineWidth = 2;
          ctx2.lineCap = "round"; ctx2.lineJoin = "round"; ctx2.stroke();
        }
      }
      return;
    }
    // Drag point — works in "point" mode when dragPointRef is active
    if (dragPointRef.current) {
      const { x, y, valid } = getXY(e);
      if (valid) onMovePoint && onMovePoint(dragPointRef.current, x, y);
      return;
    }
    const { x, y, valid } = getXY(e);
    if (valid) {
      setHovered({ x, y });
      onHover && onHover({ x, y });
      // Detect proximity to a user point for cursor + hover tooltip
      if (userPoints && userPoints.length > 0) {
        const [vx0,,vx1,] = viewRef.current;
        const threshold = (vx1 - vx0) * 0.025;
        let closestId = null, bestD = Infinity;
        userPoints.forEach(pt => {
          const d = Math.sqrt((pt.x-x)**2+(pt.y-y)**2);
          if (d < threshold && d < bestD) { bestD = d; closestId = pt.id; }
        });
        setNearPoint(!!closestId);
      } else {
        setNearPoint(false);
      }
    } else {
      setHovered(null);
      setNearPoint(false);
      onHover && onHover(null);
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (e.clientX - rect.left) * scale;
    const cpy = (e.clientY - rect.top) * scale;
    mouseDownPosRef.current = { cpx, cpy };

    if (modeRef.current === "pan") {
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      panStartRef.current = { cpx, cpy, vx0, vy0, vx1, vy1 };
      return;
    }
    if (modeRef.current === "draw") {
      const { x, y, valid } = getXY(e);
      if (valid) drawingRef.current = { points: [[x, y]] };
      return;
    }
    if (modeRef.current === "point") {
      const { x, y } = getXY(e);
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      const threshold = (vx1 - vx0) * 0.025;
      let closest = null, bestD = Infinity;
      if (userPoints) userPoints.forEach(pt => {
        const d = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
        if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
      });
      if (closest) {
        dragPointRef.current = closest; // drag existing point
      } else {
        // Start drag-to-pan (canvas moves while holding)
        panStartRef.current = { cpx, cpy, vx0, vy0, vx1, vy1, isPanFromPoint: true };
      }
    }
  };

  const handleMouseUp = () => {
    if (modeRef.current === "draw" && drawingRef.current) {
      const stroke = drawingRef.current;
      drawingRef.current = null;
      if (stroke.points.length > 1) {
        onAnnotationsChange && onAnnotationsChange(prev => [...prev, { type: "stroke", id: Date.now(), points: stroke.points, color: "rgba(220,50,50,0.85)", width: 2 }]);
      }
    }
    panStartRef.current = null;
    dragPointRef.current = null;
    setNearPoint(false);
  };

  const handleDblClick = (e) => {
    const { x, y } = getXY(e);
    if (!userPoints || !userPoints.length) return;
    const [vx0,,vx1,] = viewRef.current;
    const threshold = (vx1 - vx0) * 0.04;
    let closest = null, bestD = Infinity;
    userPoints.forEach(pt => {
      const d = Math.sqrt((pt.x - x)**2 + (pt.y - y)**2);
      if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
    });
    if (closest) onDblClickPoint && onDblClickPoint(closest);
  };

  const handleClick = (e) => {
    if (modeRef.current === "pan") return;
    if (dragPointRef.current) return; // was a point drag
    // Detect if mouse actually moved (drag vs click) by pixel distance
    if (mouseDownPosRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      const cpx = (e.clientX - rect.left) * scale;
      const cpy = (e.clientY - rect.top) * scale;
      const moved = Math.sqrt((cpx - mouseDownPosRef.current.cpx)**2 + (cpy - mouseDownPosRef.current.cpy)**2);
      if (moved > 5) return; // was a drag, not a click
    }
    const { x, y, valid } = getXY(e);
    if (!valid) return;
    const [vx0,,vx1,] = viewRef.current;
    const threshold = (vx1 - vx0) * 0.025;
    const near = userPoints && userPoints.some(pt => Math.sqrt((pt.x-x)**2+(pt.y-y)**2) < threshold);
    if (modeRef.current === "text") {
      if (valid) {
        const label = window.prompt("Texte à ajouter :");
        if (label && label.trim()) {
          onAnnotationsChange && onAnnotationsChange(prev => [...prev, { type: "text", id: Date.now(), x, y, text: label.trim(), color: "rgba(20,20,20,0.9)", size: 13 }]);
        }
      }
      return;
    }
    if (!near) onAddPoint && onAddPoint({ x, y });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (e.clientX - rect.left) * scale;
    const cpy = (e.clientY - rect.top) * scale;
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    // Mouse position in chromaticity coords
    const mx = vx0 + (cpx - PAD.l) / drawW * (vx1 - vx0);
    const my = vy0 + (1 - (cpy - PAD.t) / drawH) * (vy1 - vy0);
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const nx0 = mx + (vx0 - mx) * factor;
    const ny0 = my + (vy0 - my) * factor;
    const nx1 = mx + (vx1 - mx) * factor;
    const ny1 = my + (vy1 - my) * factor;
    // Clamp
    const span = Math.min(nx1 - nx0, ny1 - ny0);
    if (span < 0.03 || span > 1.2) return;
    const nv = [nx0, ny0, nx1, ny1];
    viewRef.current = nv;
    setView(nv);
    draw(nv);
  };

  const resetZoom = () => {
    const nv = [0, 0, 0.85, 0.85];
    viewRef.current = nv;
    setView(nv);
    draw(nv);
  };
  const isZoomed = view[1] > 0.001 || view[0] > 0.001 || view[2] < 0.84 || view[3] < 0.84;

  const btnBase = { background: "white", border: "0.5px solid rgba(0,0,0,0.2)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 };
  const btnActive = { ...btnBase, background: "rgba(20,20,20,0.1)", border: "1px solid rgba(0,0,0,0.35)" };

  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  const [macadamOpen, setMacadamOpen] = useState(false);
  const macadamRef = useRef(null);
  useEffect(() => {
    if (!macadamOpen) return;
    const handler = (e) => {
      if (macadamRef.current && !macadamRef.current.contains(e.target)) setMacadamOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [macadamOpen]);
  useEffect(() => {
    if (!showInfo) return;
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {/* Tool buttons — LEFT of canvas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
        <button
          title={showReticle ? "Masquer le réticule" : "Afficher le réticule"}
          onClick={() => onToggleReticle && onToggleReticle()}
          style={showReticle ? btnActive : btnBase}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
        <button
          title={showPlanckian ? "Masquer le locus des corps noirs" : "Afficher le locus des corps noirs (K)"}
          onClick={() => onTogglePlanckian && onTogglePlanckian()}
          style={{ ...(showPlanckian ? { ...btnActive, border: "1px solid rgba(180,80,0,0.6)", background: "rgba(180,80,0,0.12)" } : btnBase), flexDirection: "column", height: 34, gap: 1 }}
        >
          <svg width="16" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 13 Q4 10 6 8 Q9 5 14 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.6"/>
            <circle cx="10" cy="5.5" r="1.5" fill="currentColor" opacity="0.6"/>
          </svg>
          <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1, letterSpacing: "0.02em" }}>K</span>
        </button>
        <button
          title={showColorFill ? "Masquer le fond coloré" : "Afficher le fond coloré"}
          onClick={() => onToggleColorFill && onToggleColorFill()}
          style={showColorFill
            ? { ...btnBase, background: "transparent", border: "1px solid rgba(0,0,0,0.25)", overflow: "hidden" }
            : { ...btnBase, background: "rgba(200,200,200,0.3)" }}
        >
          {showColorFill ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: "-6px" }}>
              <defs>
                <linearGradient id="cgOn" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2200"/>
                  <stop offset="25%" stopColor="#ffcc00"/>
                  <stop offset="50%" stopColor="#00cc44"/>
                  <stop offset="75%" stopColor="#0066ff"/>
                  <stop offset="100%" stopColor="#cc00ff"/>
                </linearGradient>
              </defs>
              <rect width="28" height="28" fill="url(#cgOn)"/>
              <path d="M4 24 Q14 4 24 24 Z" fill="rgba(255,255,255,0.25)"/>
              <path d="M4 24 Q14 4 24 24" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" fill="none"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 14 Q8 2 14 14 Z" fill="rgba(160,160,160,0.4)"/>
              <path d="M2 14 Q8 2 14 14" stroke="rgba(100,100,100,0.6)" strokeWidth="1.3" fill="none"/>
              <line x1="3" y1="3" x2="13" y2="13" stroke="rgba(180,50,50,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.12)", margin: "2px 0" }} />
        <div style={{ position: "relative" }}>
          <div ref={macadamRef}>
            <button
              title="Tolérance colorimétrique (ellipses MacAdam)"
              onClick={() => setMacadamOpen(v => !v)}
              style={macadamFactor > 0 ? { ...btnActive, border: "1px solid rgba(0,0,0,0.5)" } : btnBase}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="8" cy="8" rx="6" ry="3.5" stroke="currentColor" strokeWidth="1.3" transform="rotate(-30 8 8)"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            {macadamOpen && (
              <div style={{ position: "absolute", left: 34, top: 0, zIndex: 10, background: "white", border: "0.5px solid rgba(0,0,0,0.18)", borderRadius: 8, padding: "8px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", whiteSpace: "nowrap" }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)", margin: "0 0 6px" }}>Tolérance colorimétrique</p>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 5, 10].map(f => (
                    <button key={f} onClick={() => { onSetMacadam && onSetMacadam(f); if (f === 0) setMacadamOpen(false); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 4, cursor: "pointer",
                        border: macadamFactor === f ? "1.5px solid rgba(0,0,0,0.7)" : "0.5px solid rgba(0,0,0,0.2)",
                        background: macadamFactor === f ? "rgba(0,0,0,0.85)" : "none",
                        color: macadamFactor === f ? "white" : "var(--color-text-primary)" }}
                    >{f === 0 ? "✕" : `×${f}`}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          title={allSatOn ? "Masquer toutes les saturations" : "Activer toutes les saturations"}
          onClick={() => onToggleAllSat && onToggleAllSat()}
          style={allSatOn ? { ...btnActive, fontSize: 13, fontWeight: 700 } : { ...btnBase, fontSize: 13, fontWeight: 700 }}
        >%</button>
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.12)", margin: "2px 0" }} />
        <button title="Dessiner (crayon)" onClick={() => switchMode(mode === "draw" ? "point" : "draw")} style={mode === "draw" ? btnActive : btnBase}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M11 2 L13 4 L5 12 L2 13 L3 10 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="9" y1="4" x2="11" y2="6" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>
        <button title="Ajouter du texte" onClick={() => switchMode(mode === "text" ? "point" : "text")} style={mode === "text" ? btnActive : btnBase}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><text x="2" y="12" fontSize="11" fontWeight="bold" fill="currentColor">T</text></svg>
        </button>
        {annotations.length > 0 && (
          <button title="Effacer les annotations" onClick={() => onAnnotationsChange && onAnnotationsChange(() => [])} style={{ ...btnBase, fontSize: 11 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.12)", margin: "2px 0" }} />
        <div style={{ position: "relative" }} ref={infoRef}>
          <button title="Aide" onClick={() => setShowInfo(v => !v)} style={showInfo ? btnActive : btnBase}>?</button>
          {showInfo && (
            <div style={{
              position: "absolute", left: 34, top: 0, zIndex: 10,
              background: "white", border: "0.5px solid rgba(0,0,0,0.18)", borderRadius: 8,
              padding: "12px 14px", width: 240, fontSize: 12, lineHeight: 1.6,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", color: "var(--color-text-primary)"
            }}>
              <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13 }}>Comment utiliser l'espace Colorimétrique</p>
              <p style={{ margin: "0 0 8px" }}>🖱️ <strong>Cliquer</strong> sur le graphique pour ajouter un point et pour le déplacer ensuite. Utiliser la fonction réticule si nécessaire <strong>⊕</strong> ou la molette de la souris pour zoomer.</p>
              <p style={{ margin: "0 0 6px" }}><strong>⊕ Réticule</strong> — affiche/masque le réticule de visée avec les coordonnées.</p>
              <p style={{ margin: "0 0 6px" }}><strong>Courbe K</strong> — affiche le locus de Planck (corps noir) de 1667 K à 20 000 K.</p>
              <p style={{ margin: "0 0 6px" }}>Ajouter ou supprimer le remplissage chromatique du diagramme.</p>
              <p style={{ margin: "0 0 12px" }}><strong>Ellipses</strong> — tolérance colorimétrique MacAdam (facteurs ×1, ×2, ×5, ×10).</p>
              <hr style={{ border: "none", borderTop: "0.5px solid var(--color-border-tertiary)", margin: "0 0 10px" }}/>
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Panneau de droite (par point) :</p>
              <p style={{ margin: "0 0 6px" }}><strong>◎ Saturation</strong> — trace la droite illuminant→point→locus et calcule d₁, d₂, le % de saturation, la longueur d'onde dominante (ou complémentaire).</p>
              <p style={{ margin: 0 }}>⬇ En haut à droite, <strong>Exporter</strong> — télécharge le diagramme et les données en PNG haute résolution.</p>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", flex: 1 }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: "100%", height: "auto", borderRadius: 8, cursor: panStartRef.current ? "grabbing" : modeRef.current === "draw" ? "crosshair" : modeRef.current === "text" ? "text" : (dragPointRef.current ? "grabbing" : nearPoint ? "grab" : "crosshair"), display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { panStartRef.current = null; setHovered(null); setNearPoint(false); onHover && onHover(null); }}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onWheel={handleWheel}
        />
        {isZoomed && (
          <button
            onClick={resetZoom}
            style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.9)", border: "0.5px solid rgba(0,0,0,0.25)", borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "rgba(20,20,20,0.85)", fontWeight: 500 }}
          >↺ Zoom</button>
        )}
      </div>
    </div>
  );
});

// CIE 1976 (u',v') conversions
function xyToUV(x, y) {
  const denom = -2 * x + 12 * y + 3;
  return { u: 4 * x / denom, v: 9 * y / denom };
}
function uvToXY(u, v) {
  const denom = 6 * u - 16 * v + 12;
  return { x: 9 * u / denom, y: 4 * v / denom };
}

// Δu'v' distance
function deltaUV(x1, y1, x2, y2) {
  const p1 = xyToUV(x1, y1);
  const p2 = xyToUV(x2, y2);
  return Math.sqrt((p2.u - p1.u) ** 2 + (p2.v - p1.v) ** 2);
}

// SDCM step
function sdcmStep(x1, y1, x2, y2) {
  return deltaUV(x1, y1, x2, y2) / 0.0011;
}

// Returns intersection parameter t and segment index for a ray from (ox,oy) in direction (dx,dy)
function rayLocus(ox, oy, dx, dy, minT = 0.001) {
  const locus = SPECTRUM_LOCUS;
  let bestT = Infinity, bestS = 0, bestK = -1;
  const segs = locus.length;
  for (let k = 0; k < segs; k++) {
    const a = locus[k], b = locus[(k + 1) % segs];
    const ex = b.x - a.x, ey = b.y - a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) continue;
    const t = ((a.x - ox) * ey - (a.y - oy) * ex) / denom;
    const s = ((a.x - ox) * dy - (a.y - oy) * dx) / denom;
    if (t > minT && s >= 0 && s <= 1 && t < bestT) { bestT = t; bestS = s; bestK = k; }
  }
  return { t: bestT, s: bestS, k: bestK };
}

// Interpolate dominant wavelength at a locus segment hit
function segmentWavelength(k, s) {
  const locus = SPECTRUM_LOCUS;
  const a = locus[k], b = locus[(k + 1) % locus.length];
  // Closing segment (purple line) has no real wavelength
  const lastReal = locus.length - 3; // last nm=700 index before 780 phantom points
  if (k >= locus.length - 1) return null; // closing line = purples
  // Check if either endpoint is a "phantom" point (nm >= 700 closing segment)
  if (a.nm >= 700 && b.nm >= 380 && b.nm <= 400) return null; // purple line (closing)
  if (a.nm >= 700 || b.nm > 700) return null;
  return a.nm + s * (b.nm - a.nm);
}

function computeSaturation(pt, illuminantKey) {
  if (!illuminantKey || !ILLUMINANTS[illuminantKey]) return null;
  const ill = ILLUMINANTS[illuminantKey];
  const dx = pt.x - ill.x, dy = pt.y - ill.y;
  const d1 = Math.sqrt(dx * dx + dy * dy);

  // Forward ray: illuminant → pt → locus
  const fwd = rayLocus(ill.x, ill.y, dx, dy);
  if (!isFinite(fwd.t)) return null;
  const d_total = fwd.t * d1; // t is in units of |(dx,dy)|=d1
  const d2 = Math.max(0, d_total - d1);
  const sat = d1 / d_total * 100;

  // Try dominant wavelength from forward intersection
  let domWl = null;
  let complementary = false;
  const fwdWl = segmentWavelength(fwd.k, fwd.s);
  if (fwdWl !== null) {
    domWl = fwdWl;
  } else {
    // Forward hit the purple line → use complementary (backward ray)
    const bwd = rayLocus(ill.x, ill.y, -dx, -dy);
    if (isFinite(bwd.t)) {
      const bwdWl = segmentWavelength(bwd.k, bwd.s);
      if (bwdWl !== null) { domWl = bwdWl; complementary = true; }
    }
  }

  return {
    d1: d1.toFixed(5),
    d2: d2.toFixed(5),
    sat: sat.toFixed(1),
    domWl: domWl !== null ? Math.round(domWl) : null,
    complementary,
  };
}

export default function AppCouleur() {
  const [illuminant, setIlluminant] = useState("D65");
  const [hovered, setHovered] = useState(null);
  const [tab, setTab] = useState("diagram");
  const [userPoints, setUserPoints] = useState([]);
  const diagramRef = useRef(null);
  const toggleSat = (id) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, showSat: !p.showSat } : p));
  const setPointName = (id, name) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  const [showReticle, setShowReticle] = useState(true);
  const [showPlanckian, setShowPlanckian] = useState(false);
  const [popupPointId, setPopupPointId] = useState(null);
  const popupRef = useRef(null);
  useEffect(() => {
    if (!popupPointId) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopupPointId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popupPointId]);
  const [macadamFactor, setMacadamFactor] = useState(0);
  const [showColorFill, setShowColorFill] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [annotations, setAnnotations] = useState([]);


  const tabs = [
    { id: "diagram", label: "Diagramme de chromaticité" },
    { id: "info", label: "À propos" },
  ];

  const exportPNG = () => {
    const diagCanvas = diagramRef.current?.getCanvas();
    if (!diagCanvas) return;

    // High-DPI: scale up diagram canvas 3× for crisp export
    const SCALE = 3;
    const DW = diagCanvas.width * SCALE, DH = diagCanvas.height * SCALE;
    const PAD = 36 * SCALE, COL = 340 * SCALE, ROWH = 22 * SCALE, FONT = 14 * SCALE;
    const date = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });

    // Header height
    const HEADER = 80 * SCALE;
    // Points section height
    let pointsH = 50 * SCALE;
    userPoints.forEach(pt => {
      pointsH += ROWH * 2 + 10 * SCALE;
      if (pt.showSat && illuminant) {
        const s = computeSaturation(pt, illuminant);
        if (s) pointsH += ROWH * 3 + 6 * SCALE;
      }
    });
    const totalH = Math.max(DH + HEADER + PAD * 2, pointsH + HEADER + PAD * 2);
    const totalW = DW + PAD * 3 + COL;

    const out = document.createElement("canvas");
    out.width = totalW;
    out.height = totalH;
    const ctx = out.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalW, totalH);

    // Header
    ctx.fillStyle = "#111111";
    ctx.font = `bold ${20 * SCALE}px sans-serif`;
    ctx.fillText("Espace colorimétrique CIE 1931", PAD, PAD + 22 * SCALE);
    ctx.fillStyle = "#555555";
    ctx.font = `${13 * SCALE}px sans-serif`;
    ctx.fillText("Diagramme de chromaticité xy · Observateur 2° · Illuminant : " + (illuminant || "Aucun"), PAD, PAD + 42 * SCALE);
    ctx.fillStyle = "#999999";
    ctx.font = `${11 * SCALE}px sans-serif`;
    ctx.fillText("Exporté le " + date, PAD, PAD + 60 * SCALE);

    // Diagram — drawn scaled up
    ctx.drawImage(diagCanvas, 0, 0, diagCanvas.width, diagCanvas.height, PAD, HEADER + PAD, DW, DH);
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = SCALE;
    ctx.strokeRect(PAD, HEADER + PAD, DW, DH);

    // Vertical separator
    const sepX = PAD * 2 + DW;
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = SCALE;
    ctx.beginPath(); ctx.moveTo(sepX, HEADER + PAD); ctx.lineTo(sepX, totalH - PAD); ctx.stroke();

    // Points column
    const colX = sepX + PAD;
    let y = HEADER + PAD + 10 * SCALE;

    ctx.fillStyle = "#111111";
    ctx.font = `bold ${15 * SCALE}px sans-serif`;
    ctx.fillText("Points ajoutés", colX, y);
    y += 28 * SCALE;

    if (userPoints.length === 0) {
      ctx.fillStyle = "#aaaaaa";
      ctx.font = `italic ${13 * SCALE}px sans-serif`;
      ctx.fillText("Aucun point", colX, y);
    } else {
      userPoints.forEach((pt, i) => {
        const label = pt.name || ("#" + (i + 1));
        ctx.fillStyle = "#111111";
        ctx.font = `bold ${14 * SCALE}px sans-serif`;
        ctx.fillText(label, colX, y); y += ROWH;

        ctx.fillStyle = "#333333";
        ctx.font = `${13 * SCALE}px sans-serif`;
        ctx.fillText("x = " + pt.x.toFixed(4) + "   y = " + pt.y.toFixed(4), colX, y); y += ROWH;

        if (pt.showSat && illuminant) {
          const s = computeSaturation(pt, illuminant);
          if (s) {
            ctx.fillStyle = "#555555";
            ctx.font = `${12 * SCALE}px sans-serif`;
            ctx.fillText("d₁ = " + s.d1 + "   d₂ = " + s.d2, colX, y); y += ROWH - 2 * SCALE;
            ctx.fillText("Saturation : " + s.sat + "%", colX, y); y += ROWH - 2 * SCALE;
            if (s.domWl !== null) {
              ctx.fillText((s.complementary ? "λ compl. : " : "λ dom. : ") + s.domWl + " nm" + (s.complementary ? " (pourpre)" : ""), colX, y); y += ROWH - 2 * SCALE;
            }
          }
        }

        // Separator line
        ctx.strokeStyle = "#eeeeee";
        ctx.lineWidth = SCALE;
        ctx.beginPath(); ctx.moveTo(colX, y + 5 * SCALE); ctx.lineTo(colX + COL - PAD, y + 5 * SCALE); ctx.stroke();
        y += 16 * SCALE;
      });
    }

    // Footer
    ctx.fillStyle = "#bbbbbb";
    ctx.font = `${11 * SCALE}px sans-serif`;
    ctx.fillText("CIE 1931 · CIE 015:2018 · Observateur standard 2°", PAD, totalH - 12 * SCALE);

    // Download as PNG
    out.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cie1931_chromaticite.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  };

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", color: "var(--color-text-primary)", maxWidth: 1040, margin: "0 auto", padding: "1rem 0" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>Espace colorimétrique CIE 1931</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Diagramme de chromaticité xy · Observateur standard 2°
        </p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", padding: "8px 16px", cursor: "pointer",
              fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >{t.label}</button>
        ))}
        <button
          onClick={exportPNG}
          style={{
            marginLeft: "auto", background: "none", border: "0.5px solid var(--color-border-secondary)",
            padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 500,
            color: "var(--color-text-primary)", borderRadius: 5, display: "flex", alignItems: "center", gap: 5,
            marginBottom: 4
          }}
        >⬇ Exporter</button>
      </div>

      {tab === "diagram" && (
        <div>
          {/* Illuminants bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, padding: "10px 16px", background: "var(--color-background-secondary)", borderRadius: 8, border: "1px solid var(--color-border-secondary)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Illuminant</span>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              {[...Object.entries(ILLUMINANTS), ["", { label: "Aucun" }]].map(([k, v]) => (
                <label key={k || "none"} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: illuminant === k ? 600 : 400, color: illuminant === k ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                  <input
                    type="radio"
                    name="illuminant-bar"
                    checked={illuminant === k}
                    onChange={() => setIlluminant(k)}
                    style={{ accentColor: "rgba(20,20,20,0.85)", width: 15, height: 15, cursor: "pointer" }}
                  />
                  {k || "Aucun"}
                </label>
              ))}
            </div>
            {illuminant && ILLUMINANTS[illuminant] && (
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4 }}>
                — {ILLUMINANTS[illuminant].label} · x={ILLUMINANTS[illuminant].x.toFixed(4)}, y={ILLUMINANTS[illuminant].y.toFixed(4)}
              </span>
            )}
          </div>

          {/* Main row: tools + canvas + points panel */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {/* Canvas with tool buttons (already rendered by ChromaticityDiagram wrapper) */}
            <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
              <button
                onClick={() => setShowSidebar(v => !v)}
                title={showSidebar ? "Masquer le panneau" : "Afficher le panneau"}
                style={{
                  position: "absolute", top: 8, right: 8, zIndex: 5,
                  background: "rgba(255,255,255,0.88)", border: "0.5px solid rgba(0,0,0,0.2)",
                  borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer",
                  color: "rgba(20,20,20,0.8)", fontWeight: 500,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                }}
              >{showSidebar ? "◀" : "▶"}</button>
              <ChromaticityDiagram
                ref={diagramRef}
                illuminant={illuminant}
                onHover={setHovered}
                userPoints={userPoints}
                showReticle={showReticle}
                onToggleReticle={() => setShowReticle(v => !v)}
                showPlanckian={showPlanckian}
                onTogglePlanckian={() => setShowPlanckian(v => !v)}
                macadamFactor={macadamFactor}
                onSetMacadam={setMacadamFactor}
                showColorFill={showColorFill}
                onToggleColorFill={() => setShowColorFill(v => !v)}
                onDblClickPoint={(id) => setPopupPointId(id)}
                allSatOn={userPoints.length > 0 && userPoints.every(p => p.showSat)}
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                onToggleAllSat={() => { const allOn = userPoints.every(p => p.showSat); setUserPoints(prev => prev.map(p => ({ ...p, showSat: !allOn }))); }}
                onAddPoint={(p) => setUserPoints(prev => [...prev, { ...p, id: Date.now(), name: "" }])}
                onMovePoint={(id, x, y) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))}
              />
            </div>

            {/* Popup on double-click */}
            {popupPointId && (() => {
              const pt = userPoints.find(p => p.id === popupPointId);
              if (!pt) return null;
              const i = userPoints.indexOf(pt);
              const s = illuminant ? computeSaturation(pt, illuminant) : null;
              return (
                <div ref={popupRef} style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 20,
                  background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)",
                  borderRadius: 8, padding: "12px 14px", minWidth: 210, maxWidth: 250,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)", fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{pt.name || ("#" + (i+1))}</span>
                    <button onClick={() => setPopupPointId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                  <input type="text" placeholder={"Nom Point #" + (i+1)} value={pt.name || ""}
                    onChange={e => setUserPoints(prev => prev.map(p => p.id === pt.id ? {...p, name: e.target.value} : p))}
                    style={{ width: "100%", fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 12, marginBottom: 6, color: "var(--color-text-secondary)", fontSize: 12 }}>
                    <div>y = <strong>{pt.y.toFixed(4)}</strong></div>
                    <div>x = <strong>{pt.x.toFixed(4)}</strong></div>
                  </div>
                  {!pt.showSat && (
                    <button onClick={() => setUserPoints(prev => prev.map(p => p.id === pt.id ? {...p, showSat: true} : p))}
                      style={{ width: "100%", fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: 5, cursor: "pointer",
                        border: "1px solid rgba(30,30,30,0.25)", background: "rgba(20,20,20,0.06)", color: "var(--color-text-primary)", marginBottom: 6 }}>
                      ◎ Saturation
                    </button>
                  )}
                  {pt.showSat && s && (() => {
                    const satPct = parseFloat(s.sat);
                    const domColor = s.domWl ? nmToRGB(s.domWl) : "rgb(180,180,180)";
                    return (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>
                          d₁ = <strong>{s.d1}</strong> <span style={{ color: "var(--color-text-secondary)" }}>({illuminant} → {pt.name || "#"+(i+1)})</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                          d₂ = <strong>{s.d2}</strong> <span style={{ color: "var(--color-text-secondary)" }}>({pt.name || "#"+(i+1)} → locus)</span>
                        </div>
                        <div style={{ borderRadius: 5, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)", position: "relative", marginBottom: 6 }}>
                          <button onClick={() => setUserPoints(prev => prev.map(p => p.id === pt.id ? {...p, showSat: false} : p))}
                            style={{ position: "absolute", top: 3, right: 4, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 10, lineHeight: 1, color: "white", zIndex: 2, padding: "2px 3px", display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>✕</button>
                          <div style={{ background: `linear-gradient(to right, ${domColor} 0%, ${domColor} ${satPct}%, rgba(220,220,220,0.3) ${satPct}%, rgba(220,220,220,0.3) 100%)`,
                            padding: "5px 8px", textAlign: "center", position: "relative" }}>
                            <span style={{ fontSize: 10, color: "var(--color-text-secondary)", position: "relative", zIndex: 1 }}>Saturation </span>
                            <span style={{ fontWeight: 700, fontSize: 14, position: "relative", zIndex: 1 }}>{s.sat}%</span>
                          </div>
                        </div>
                        {s.domWl !== null && (
                          <div style={{ padding: "4px 6px", background: "rgba(20,20,20,0.04)", borderRadius: 4, textAlign: "center" }}>
                            <div style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>{s.complementary ? "λ complémentaire" : "λ dominante"}</div>
                            <strong style={{ fontSize: 14 }}>{s.domWl} nm</strong>
                            {s.complementary && <span style={{ fontSize: 9, color: "var(--color-text-secondary)", display: "block" }}>(pourpre — opposé)</span>}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Points panel — right column, collapsible */}
            {showSidebar && <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, maxHeight: 780, overflowY: "auto" }}>
              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Points ajoutés</p>
              {userPoints.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>Cliquez sur le diagramme pour ajouter un point</p>
              ) : (
                <>
                  <button onClick={() => setUserPoints([])} style={{ fontSize: 11, fontWeight: 600, background: "rgba(220,50,50,0.08)", border: "1px solid rgba(200,40,40,0.3)", borderRadius: 5, padding: "5px 10px", cursor: "pointer", alignSelf: "stretch", color: "rgba(180,30,30,0.9)" }}>✕ Tout effacer</button>

                  {[...userPoints].reverse().map((pt, ri) => { const i = userPoints.length - 1 - ri; return (
                    <div key={pt.id} style={{ background: "var(--color-background-primary)", border: pt.showSat ? "1px solid rgba(20,20,20,0.3)" : "0.5px solid var(--color-border-tertiary)", borderRadius: 6, padding: "6px 8px", fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: 12, color: "var(--color-text-secondary)" }}>#{i + 1}</span>
                        <button onClick={() => setUserPoints(prev => prev.filter(p => p.id !== pt.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: "0 2px", lineHeight: 1 }}>×</button>
                      </div>
                      <input
                        type="text"
                        placeholder={"Nom Point #" + (i + 1)}
                        value={pt.name || ""}
                        onChange={e => setPointName(pt.id, e.target.value)}
                        style={{ width: "100%", fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box", marginBottom: 4 }}
                      />
                      <div style={{ display: "flex", gap: 10, marginBottom: 5 }}>
                        <div style={{ color: "var(--color-text-secondary)" }}>y = <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{pt.y.toFixed(4)}</span></div>
                        <div style={{ color: "var(--color-text-secondary)" }}>x = <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{pt.x.toFixed(4)}</span></div>
                      </div>
                      {!pt.showSat && (
                        <button
                          onClick={() => toggleSat(pt.id)}
                          style={{
                            width: "100%", fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: 5,
                            cursor: "pointer", letterSpacing: "0.02em",
                            border: "1px solid rgba(30,30,30,0.25)",
                            background: "rgba(20,20,20,0.06)",
                            color: "var(--color-text-primary)",
                            transition: "all 0.15s"
                          }}
                        >◎ Saturation</button>
                      )}
                      {pt.showSat && illuminant && (() => {
                        const s = computeSaturation(pt, illuminant);
                        if (!s) return null;
                        return (
                          <div style={{ marginTop: 5, paddingTop: 5, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                            <div style={{ color: "var(--color-text-secondary)", marginBottom: 2, fontSize: 10 }}>
                              d₁ = <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{s.d1}</span>
                              <span style={{ color: "var(--color-text-secondary)", marginLeft: 4 }}>({illuminant} → {pt.name || ("#"+(userPoints.indexOf(pt)+1))})</span>
                            </div>
                            <div style={{ color: "var(--color-text-secondary)", marginBottom: 2, fontSize: 10 }}>
                              d₂ = <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{s.d2}</span>
                              <span style={{ color: "var(--color-text-secondary)", marginLeft: 4 }}>({pt.name || ("#"+(userPoints.indexOf(pt)+1))} → locus)</span>
                            </div>
                            {(() => {
                              const satPct = parseFloat(s.sat);
                              const domColor = s.domWl ? nmToRGB(s.domWl) : "rgb(180,180,180)";
                              return (
                                <div style={{ marginTop: 6, borderRadius: 5, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)", position: "relative" }}>
                                  <button onClick={() => toggleSat(pt.id)} style={{ position: "absolute", top: 3, right: 4, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 10, lineHeight: 1, color: "white", zIndex: 2, padding: "2px 3px", display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>✕</button>
                                  <div style={{
                                    background: `linear-gradient(to right, ${domColor} 0%, ${domColor} ${satPct}%, rgba(220,220,220,0.3) ${satPct}%, rgba(220,220,220,0.3) 100%)`,
                                    padding: "5px 8px", textAlign: "center", position: "relative"
                                  }}>
                                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)", position: "relative", zIndex: 1 }}>Saturation </span>
                                    <span style={{ fontWeight: 700, fontSize: 14, position: "relative", zIndex: 1 }}>{s.sat}%</span>
                                  </div>
                                </div>
                              );
                            })()}
                            {s.domWl !== null && (
                              <div style={{ marginTop: 4, padding: "3px 6px", background: "rgba(20,20,20,0.04)", borderRadius: 4, textAlign: "center", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                                <div style={{ color: "var(--color-text-secondary)", fontSize: 10, marginBottom: 1 }}>
                                  {s.complementary ? "λ complémentaire" : "λ dominante"}
                                </div>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{s.domWl} nm</span>
                                {s.complementary && <span style={{ fontSize: 9, color: "var(--color-text-secondary)", display: "block" }}>(pourpre — opposé)</span>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );})}
                </>
              )}
            </div>}
          </div>
        </div>
      )}

      {tab === "info" && (
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Le modèle CIE 1931</h3>
          <p>L'espace colorimétrique CIE 1931 XYZ est fondé sur des expériences psychophysiques d'égalisation des couleurs à partir de trois primaires monochromatiques : 700 nm (rouge), 546,1 nm (vert) et 435,8 nm (bleu), frappant la fovéa sous un angle de 2°.</p>
          <p>Le diagramme de chromaticité xy est obtenu par projection : x = X/(X+Y+Z), y = Y/(X+Y+Z). Il représente la teinte et la saturation indépendamment de la luminance.</p>
          <p>Le <em>spectrum locus</em> est la courbe enveloppant le diagramme, sur laquelle se trouvent toutes les couleurs monochromatiques. Les couleurs réelles d'un écran sont contenues dans un triangle (gamut) dont les sommets sont les primaires R, G, B.</p>
          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: 8, fontSize: 12 }}>
            <p style={{ margin: "0 0 4px" }}><strong style={{ color: "var(--color-text-primary)" }}>Source :</strong> Mathieu Hébert, « Mesurer les couleurs », <em>Photoniques</em>, 2021, 106, pp.44–47</p>
            <p style={{ margin: "0 0 4px" }}><strong style={{ color: "var(--color-text-primary)" }}>Données :</strong> CIE 015:2018, fonctions d'égalisation 2° CIE 1931</p>
            <p style={{ margin: 0 }}><strong style={{ color: "var(--color-text-primary)" }}>Ellipses MacAdam :</strong>{" "}
              <a href="https://datalore.jetbrains.com/report/static/N3ySXyPhUwg0hxmd2Mzq8Y/BhQs3wmfC7jZdxnP3yJPpe" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-primary)", textDecoration: "underline", wordBreak: "break-all" }}>
                datalore.jetbrains.com — MacAdam Calculations
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}