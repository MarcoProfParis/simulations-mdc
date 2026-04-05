import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../ThemeContext";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { EXAMPLE_FILES } from "./exampleFiles";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

// ─── utilitaires ──────────────────────────────────────────────────────────────

const DEFAULT_FACTORS = [
  { id: "X1", name: "Facteur 1", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
  { id: "X2", name: "Facteur 2", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
];
const DEFAULT_RESPONSES = [{ id: "Y1", name: "Réponse 1", unit: "" }];
const DEFAULT_CENTER = { present: false, replicates: 1 };

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

function quadPureTerm(id) { return id + "2"; }
function isQuadPure(t, factors) { return factors.some(f => t === quadPureTerm(f.id)); }
function isInteraction(t, factors) {
  return factors.filter(f => t.includes(f.id)).length >= 2 && !isQuadPure(t, factors);
}

function getAllPossibleTerms(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const t = [...ids];
  ids.forEach(id => t.push(quadPureTerm(id)));
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
  if (preset === "synergie") {
    const t = [...ids];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    return t;
  }
  if (preset === "quadratic") {
    const t = [...ids];
    ids.forEach(id => t.push(quadPureTerm(id)));
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
  if (isQuadPure(t, factors)) return 2;
  return factors.filter(f => t.includes(f.id)).length;
}

function formatTermDisplay(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return "X" + (i + 1) + "²";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X" + (i + 1)); });
  return s;
}

function termSubScript(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return (i + 1) + "" + (i + 1);
  let s = t;
  factors.forEach((f, i) => { s = s.replaceAll(f.id, (i + 1).toString()); });
  return s;
}

function formatTermHTML(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id))
      return "X<sub>" + (i + 1) + "</sub><sup>2</sup>";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X<sub>" + (i + 1) + "</sub>"); });
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

function loadExampleData(exFile) {
  const f = exFile.factors.map(fac => {
    const base = { id: fac.id, name: fac.name, unit: fac.unit || "", continuous: fac.continuous };
    if (fac.continuous) {
      base.low = { real: fac.low.real, coded: -1 };
      base.high = { real: fac.high.real, coded: 1 };
    } else {
      base.low = { label: fac.low.label || "", coded: -1 };
      base.high = { label: fac.high.label || "", coded: 1 };
    }
    return base;
  });
  const r = exFile.responses.map(resp => ({ id: resp.id, name: resp.name, unit: resp.unit || "" }));
  const cp = exFile.center_point
    ? { present: exFile.center_point.present, replicates: exFile.center_point.replicates }
    : { ...DEFAULT_CENTER };
  const md = exFile.model_default || computeDefaultModel(f);

  // Construire la matrice depuis les runs du JSON
  // Chaque run peut avoir plusieurs réplicats — on crée une ligne par réplicat
  let matrix = null;
  if (exFile.runs && exFile.runs.length > 0) {
    matrix = [];
    let rowId = 1;
    exFile.runs.forEach(run => {
      const reps = run.replicates || [];
      reps.forEach(rep => {
        const responses = {};
        r.forEach(resp => {
          responses[resp.id] = rep[resp.id] !== undefined ? rep[resp.id] : "";
        });
        matrix.push({
          id: rowId++,
          coded: { ...run.coded },
          real: { ...run.real },
          center: run.center || false,
          responses,
        });
      });
      // Si pas de réplicats définis, créer une ligne vide
      if (reps.length === 0) {
        const responses = {};
        r.forEach(resp => { responses[resp.id] = ""; });
        matrix.push({
          id: rowId++,
          coded: { ...run.coded },
          real: { ...run.real },
          center: run.center || false,
          responses,
        });
      }
    });
  }

  return { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix };
}

// ─── composant principal ──────────────────────────────────────────────────────

export default function PlanFactoriel() {
  const { theme } = useTheme();
  void ChevronDownIcon;

  const [part, setPart] = useState(1);
  const [factors, setFactors] = useState(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
  const [responses, setResponses] = useState(DEFAULT_RESPONSES.map(r => ({ ...r })));
  const [centerPoint, setCenterPoint] = useState({ ...DEFAULT_CENTER });
  const [matrix, setMatrix] = useState(null);
  const [modelDefault, setModelDefault] = useState(() => computeDefaultModel(DEFAULT_FACTORS));
  const [modelActive, setModelActive] = useState(() => computeDefaultModel(DEFAULT_FACTORS));
  const [modelPreset, setModelPreset] = useState("default");
  const [addRowLevels, setAddRowLevels] = useState(null);
  const [showRandomDialog, setShowRandomDialog] = useState(false);
  const [showRandomDone, setShowRandomDone] = useState(false);
  const [showCubicDialog, setShowCubicDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedExampleId, setLoadedExampleId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editMeta, setEditMeta] = useState({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });

  const loadExample = async (ex) => {
    setLoadError(null);
    try {
      const res = await fetch(ex.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${ex.url}`);
      const data = await res.json();
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModelActive([...md]);
      setModelPreset("default");
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setSidebarOpen(false);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  const resetToNew = () => {
    setFactors(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
    setResponses(DEFAULT_RESPONSES.map(r => ({ ...r })));
    setCenterPoint({ ...DEFAULT_CENTER });
    const def = computeDefaultModel(DEFAULT_FACTORS);
    setModelDefault(def);
    setModelActive([...def]);
    setModelPreset("default");
    setMatrix(null);
    setLoadedExampleId(null);
    setEditMode(false);
    setEditMeta({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });
    setSidebarOpen(false);
  };

  // ── édition exemple ──
  const loadForEdit = async (ex) => {
    setLoadError(null);
    try {
      const res = await fetch(ex.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${ex.url}`);
      const data = await res.json();
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModelActive([...md]);
      setModelPreset("default");
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setEditMeta({
        id: data.meta?.id || ex.file.replace(".json", ""),
        title: data.meta?.title || ex.title,
        context: data.meta?.context || ex.context,
        difficulty: data.meta?.difficulty || ex.difficulty,
        real_data: data.meta?.real_data ?? ex.real_data,
        source: data.meta?.source || "",
      });
      setEditMode(true);
      setSidebarOpen(false);
      setPart(1);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  const exportJSON = () => {
    // Reconstruit les runs depuis la matrice courante
    // Regroupe les lignes qui partagent les mêmes niveaux codés (réplicats)
    const runsMap = new Map();
    (matrix || []).forEach((row) => {
      const key = JSON.stringify(row.coded);
      if (!runsMap.has(key)) {
        runsMap.set(key, { coded: row.coded, real: row.real, center: row.center, replicates: [] });
      }
      const rep = { rep: runsMap.get(key).replicates.length + 1 };
      responses.forEach(r => { rep[r.id] = row.responses[r.id] ?? ""; });
      runsMap.get(key).replicates.push(rep);
    });
    const runs = Array.from(runsMap.values()).map((r, i) => ({ id: i + 1, ...r }));

    const json = {
      meta: {
        id: editMeta.id,
        title: editMeta.title,
        context: editMeta.context,
        difficulty: editMeta.difficulty,
        real_data: editMeta.real_data,
        source: editMeta.source,
      },
      factors: factors.map(f => {
        const base = { id: f.id, name: f.name, unit: f.unit || null, continuous: f.continuous };
        if (f.continuous) { base.low = { real: f.low.real, coded: -1 }; base.high = { real: f.high.real, coded: 1 }; }
        else { base.low = { label: f.low.label || "", coded: -1 }; base.high = { label: f.high.label || "", coded: 1 }; }
        return base;
      }),
      responses: responses.map(r => ({ id: r.id, name: r.name, unit: r.unit || null })),
      center_point: centerPoint,
      model_default: modelDefault,
      runs,
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editMeta.id || "plan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goTo = (n) => {
    if (n === 2 && !matrix) setMatrix(genMatrix(factors, responses, centerPoint));
    setPart(n);
  };

  const buildMatrix = () => {
    // Si une matrice a déjà été chargée depuis un exemple, on la conserve
    // Sinon on génère une matrice vide
    const m = matrix || genMatrix(factors, responses, centerPoint);
    const def = computeDefaultModel(factors);
    setMatrix(m);
    setModelDefault(def);
    setModelActive([...def]);
    setModelPreset("default");
    setPart(2);
  };

  const recompModel = (f) => {
    const def = computeDefaultModel(f);
    setModelDefault(def); setModelActive([...def]); setModelPreset("default");
    setMatrix(null);
  };

  const updateFactor = (i, key, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [key]: val };
    if (key === "continuous") {
      if (val) f[i].low = { real: 0, coded: -1 }, f[i].high = { real: 1, coded: 1 };
      else f[i].low = { label: "", coded: -1 }, f[i].high = { label: "", coded: 1 };
    }
    setFactors(f); recompModel(f);
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
    setFactors(f); recompModel(f);
  };
  const removeFactor = (i) => {
    const f = factors.filter((_, j) => j !== i).map((fac, j) => ({ ...fac, id: "X" + (j + 1) }));
    setFactors(f); recompModel(f);
  };

  const updateResponse = (i, key, val) => {
    const r = [...responses]; r[i] = { ...r[i], [key]: val }; setResponses(r);
  };
  const addResponse = () => {
    const n = responses.length + 1;
    setResponses([...responses, { id: "Y" + n, name: "Réponse " + n, unit: "" }]);
  };
  const removeResponse = (i) => setResponses(responses.filter((_, j) => j !== i));

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
    setShowRandomDialog(false);
    setShowRandomDone(true);
  };

  const toggleTerm = (t) => {
    const idx = modelActive.indexOf(t);
    if (idx >= 0) setModelActive(modelActive.filter(x => x !== t));
    else setModelActive([...modelActive, t]);
    setModelPreset("custom");
  };
  const applyPreset = (p) => {
    if (p === "cubic" && factors.length < 3) { setShowCubicDialog(true); return; }
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
    let key;
    if (termOrder(t, factors) === 1) key = "1";
    else if (isQuadPure(t, factors)) key = "quad";
    else key = String(termOrder(t, factors));
    if (!byOrder[key]) byOrder[key] = [];
    byOrder[key].push(t);
  });
  const orderLabels = {
    "1": "Effets principaux",
    "quad": "Termes quadratiques purs (X²)",
    "2": "Interactions ordre 2",
    "3": "Interactions ordre 3",
    "4": "Interactions ordre 4",
  };
  const orderedKeys = ["1", "quad", "2", "3", "4"].filter(k => byOrder[k]);

  const diffBadgeCls = {
    "débutant": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    "intermédiaire": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "avancé": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ── BARRE LATÉRALE ── */}
      {part === 1 && (
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/50 transition-opacity duration-300 ease-in-out data-closed:opacity-0"
          />
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                <DialogPanel
                  transition
                  className="pointer-events-auto w-72 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
                >
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                      <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <BookOpenIcon className="size-4" />
                        Exemples &amp; nouveau plan
                      </DialogTitle>
                      <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    <div className="px-4 pt-4 pb-2">
                      <button onClick={resetToNew}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                        <PlusIcon className="size-4" />
                        Nouveau plan vide
                      </button>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Exemples</p>
                      <div className="flex flex-col gap-2">
                        {EXAMPLE_FILES.map((ex) => (
                          <div key={ex.file} className={`rounded-lg border transition-all ${
                              loadedExampleId === ex.file
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}>
                            <button onClick={() => loadExample(ex)} className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{ex.title}</span>
                                {ex.real_data && (
                                  <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">réel</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">{ex.context}</p>
                              <span className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${diffBadgeCls[ex.difficulty] || diffBadgeCls["débutant"]}`}>
                                {ex.difficulty}
                              </span>
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex justify-end">
                              <button onClick={() => loadForEdit(ex)}
                                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Éditer cet exemple">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                </svg>
                                Éditer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    {loadError && (
                      <div className="mx-4 mt-2 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Erreur de chargement</p>
                        <p className="text-[11px] text-red-500 dark:text-red-400 break-all">{loadError}</p>
                      </div>
                    )}
                    </div>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── STEPPER ── */}
      <nav className="flex items-center gap-1 mb-6">
        {[{ n: 1, l: "Facteurs & réponses" }, { n: 2, l: "Matrice" }, { n: 3, l: "Modèle" }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-1 shrink-0">
            {i > 0 && <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 mx-1" />}
            <button onClick={() => goTo(s.n)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                part > s.n ? "bg-emerald-500 text-white" :
                part === s.n ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" :
                "border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
              }`}>
                {part > s.n ? "✓" : s.n}
              </span>
              <span className={`text-sm ${part === s.n ? "font-medium text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                {s.l}
              </span>
            </button>
          </div>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════ PARTIE 1 */}
      {part === 1 && (
        <>
          {/* bandeau mode édition + bouton export */}
          {editMode && (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 mb-4 gap-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-500">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Mode édition — {editMeta.title || loadedExampleId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditMode(false); }}
                  className="rounded-md border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                  Annuler
                </button>
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              <Bars3Icon className="size-4" />
              {loadedExampleId
                ? <span>Exemple chargé : <span className="font-medium">{EXAMPLE_FILES.find(e => e.file === loadedExampleId)?.title}</span></span>
                : "Charger un exemple / Nouveau plan"}
            </button>
          </div>

          {/* Section métadonnées — visible uniquement en mode édition */}
          {editMode && (
            <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-3">Métadonnées de l'exemple</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID fichier</label>
                    <input value={editMeta.id} onChange={e => setEditMeta({ ...editMeta, id: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulté</label>
                    <select value={editMeta.difficulty} onChange={e => setEditMeta({ ...editMeta, difficulty: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="débutant">Débutant</option>
                      <option value="intermédiaire">Intermédiaire</option>
                      <option value="avancé">Avancé</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Titre</label>
                  <input value={editMeta.title} onChange={e => setEditMeta({ ...editMeta, title: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contexte</label>
                  <input value={editMeta.context} onChange={e => setEditMeta({ ...editMeta, context: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
                  <input value={editMeta.source} onChange={e => setEditMeta({ ...editMeta, source: e.target.value })}
                    placeholder="Auteur, publication, année…"
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMeta.real_data} onChange={e => setEditMeta({ ...editMeta, real_data: e.target.checked })}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Données réelles (badge "réel")</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Facteurs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Facteurs</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", "Type", "Niveau bas", "Niveau haut", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f, i) => (
                    <tr key={f.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{f.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.name} onChange={e => updateFactor(i, "name", e.target.value)}
                          className="w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.unit || ""} placeholder="°C, g…" onChange={e => updateFactor(i, "unit", e.target.value)}
                          className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={String(f.continuous)} onChange={e => updateFactor(i, "continuous", e.target.value === "true")}
                          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="true">Continu</option>
                          <option value="false">Discret</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.low.real} onChange={e => updateFactorLevel(i, "low", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.low.label || ""} placeholder="Label −1" onChange={e => updateFactorLabel(i, "low", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.high.real} onChange={e => updateFactorLevel(i, "high", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.high.label || ""} placeholder="Label +1" onChange={e => updateFactorLabel(i, "high", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {factors.length > 2 && (
                          <button onClick={() => removeFactor(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {factors.length < 6
              ? <button onClick={addFactor}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
                  <PlusIcon className="size-3.5" /> Ajouter un facteur
                </button>
              : <p className="mt-3 text-xs text-gray-400">Maximum 6 facteurs atteint.</p>
            }
          </div>

          {/* Réponses */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Réponses</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{r.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={e => updateResponse(i, "name", e.target.value)}
                          className="w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.unit || ""} placeholder="%, nm…" onChange={e => updateResponse(i, "unit", e.target.value)}
                          className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        {responses.length > 1 && (
                          <button onClick={() => removeResponse(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addResponse}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
              <PlusIcon className="size-3.5" /> Ajouter une réponse
            </button>
          </div>

          {/* Point central */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Point central</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={centerPoint.present}
                  onChange={e => setCenterPoint({ ...centerPoint, present: e.target.checked })}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Inclure un point central</span>
              </label>
              {centerPoint.present && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Répétitions :</span>
                  <input type="number" min={1} max={10} value={centerPoint.replicates}
                    onChange={e => setCenterPoint({ ...centerPoint, replicates: Math.max(1, +e.target.value) })}
                    className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Plan 2<sup>{factors.length}</sup> = <strong className="text-gray-600 dark:text-gray-300">{1 << factors.length}</strong> essai(s)
              {centerPoint.present ? ` + ${centerPoint.replicates} point(s) central` : ""}
            </p>
            <button onClick={buildMatrix}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 transition-colors shadow-sm">
              Construire la table de données →
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 2 */}
      {part === 2 && matrix && (
        <>
          {/* Dialog ajout ligne */}
          <Dialog open={addRowLevels !== null} onClose={() => setAddRowLevels(null)} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Nouvelle ligne — choisir les niveaux
                </DialogTitle>
                {addRowLevels && factors.map(f => {
                  const sel = addRowLevels[f.id];
                  return (
                    <div key={f.id} className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{f.id} — {f.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: -1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === -1 ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          −1{f.continuous ? ` (${f.low.real}${f.unit ? " " + f.unit : ""})` : (f.low.label ? " " + f.low.label : "")}
                        </button>
                        {f.continuous && (
                          <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 0 })}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 0 ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                            0 ({+((f.low.real + f.high.real) / 2).toFixed(2)}{f.unit ? " " + f.unit : ""})
                          </button>
                        )}
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          +1{f.continuous ? ` (${f.high.real}${f.unit ? " " + f.unit : ""})` : (f.high.label ? " " + f.high.label : "")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setAddRowLevels(null)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Annuler
                  </button>
                  <button onClick={confirmAddRow}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    Ajouter
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog confirmation remplissage aléatoire */}
          <Dialog open={showRandomDialog} onClose={setShowRandomDialog} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <ExclamationTriangleIcon className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Remplir avec des valeurs aléatoires ?
                </DialogTitle>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Des valeurs fictives (entre 20 et 100) seront générées pour toutes les réponses manquantes.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowRandomDialog(false)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Annuler
                  </button>
                  <button onClick={fillRandom}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    Confirmer
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog remplissage effectué */}
          <Dialog open={showRandomDone} onClose={setShowRandomDone} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Valeurs générées</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Les réponses manquantes ont été remplies avec des valeurs aléatoires fictives.
                </p>
                <button onClick={() => setShowRandomDone(false)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  OK
                </button>
              </DialogPanel>
            </div>
          </Dialog>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Matrice d'expériences</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{matrix.length} essai(s)</span>
                <button onClick={openAddRow}
                  className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <PlusIcon className="size-3.5" /> Ligne
                </button>
              </div>
            </div>

            {hasMissing && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 gap-3">
                <span className="text-xs text-amber-700 dark:text-amber-300">{missingRows.length} ligne(s) sans réponse complète.</span>
                <button onClick={() => setShowRandomDialog(true)}
                  className="shrink-0 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors">
                  Remplir valeurs aléatoires…
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-[11px] font-medium text-gray-400 pb-2 px-2 w-8 text-center">#</th>
                    {factors.map(f => (
                      <th key={f.id} className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2 whitespace-nowrap">
                        {f.id}<br />
                        <span className="text-[10px] font-normal text-gray-300 dark:text-gray-600">{f.name}{f.unit ? ` (${f.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                    {responses.map(r => (
                      <th key={r.id} className="text-left text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pb-2 px-2 whitespace-nowrap">
                        {r.id}<br />
                        <span className="text-[10px] font-normal text-emerald-400 dark:text-emerald-600">{r.name}{r.unit ? ` (${r.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, ri) => {
                    const isMissing = missingRows.includes(ri);
                    return (
                      <tr key={ri} className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${row.center ? "bg-amber-50/40 dark:bg-amber-900/10" : isMissing ? "bg-red-50/40 dark:bg-red-900/10" : ""}`}>
                        <td className="px-2 py-1.5 text-center text-[11px] text-gray-400">{row.center ? "PC" : ri + 1}</td>
                        {factors.map(f => {
                          const c = row.coded[f.id];
                          const rv = row.real[f.id];
                          const cLabel = c === 0 ? "0" : c === -1 ? "−1" : "+1";
                          const cCls = c === -1 ? "text-red-500 dark:text-red-400" : c === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500";
                          if (row.center && !f.continuous) return (
                            <td key={f.id} className="px-2 py-1.5 text-center text-xs text-gray-300 dark:text-gray-600">—</td>
                          );
                          return (
                            <td key={f.id} className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-[10px] w-6 shrink-0 ${cCls}`}>({cLabel})</span>
                                {f.continuous
                                  ? <input type="number" value={rv} onChange={e => updateCell(ri, f.id, e.target.value)}
                                      className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors" />
                                  : <span className="text-xs text-gray-500 dark:text-gray-400">{rv ?? "—"}</span>
                                }
                              </div>
                            </td>
                          );
                        })}
                        <td className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                        {responses.map(r => {
                          const v = row.responses[r.id];
                          const isEmpty = v === "" || v === null || v === undefined;
                          return (
                            <td key={r.id} className="px-2 py-1.5">
                              <input type="number" value={isEmpty ? "" : v} placeholder="—"
                                onChange={e => updateResp(ri, r.id, e.target.value)}
                                className={`w-16 rounded border bg-transparent px-1 py-0.5 text-xs text-emerald-700 dark:text-emerald-300 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors ${isEmpty ? "border-red-300 dark:border-red-700" : "border-transparent"}`} />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeRun(ri)}
                            className="p-1 rounded text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => goTo(1)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Retour
            </button>
            <div className="flex items-center gap-3">
              {editMode && (
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              )}
              {hasMissing && <span className="text-xs text-red-500 dark:text-red-400">Compléter les réponses pour continuer</span>}
              <button onClick={() => { if (!hasMissing) goTo(3); }} disabled={hasMissing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Choisir le modèle →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 3 */}
      {part === 3 && (
        <>
          {/* Dialog cubique impossible */}
          <Dialog open={showCubicDialog} onClose={setShowCubicDialog} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <ExclamationTriangleIcon className="size-6 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Modèle impossible</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Le modèle cubique (ordre 3) nécessite au moins 3 facteurs.
                </p>
                <button onClick={() => setShowCubicDialog(false)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  Fermer
                </button>
              </DialogPanel>
            </div>
          </Dialog>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Modèle de régression</p>
              {!isDefaultModel && (
                <button onClick={resetModel}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <ArrowPathIcon className="size-3.5" /> Défaut JSON
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "linear", label: "Linéaire (ordre 1)" },
                { id: "synergie", label: "Synergie (ordre 1+2)" },
                { id: "quadratic", label: "Quadratique (ordre 2)" },
                { id: "cubic", label: "Cubique (ordre 3)" },
                { id: "default", label: "Défaut (JSON)" },
              ].map(p => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    modelPreset === p.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />

            <div className="mb-3">
              <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 px-3 py-1 text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 mr-2">α₀</span>
              <span className="text-xs text-gray-400">constante — toujours incluse</span>
            </div>

            {orderedKeys.map(order => (
              <div key={order} className="mb-3">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{orderLabels[order]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {byOrder[order].map(t => {
                    const isOn = modelActive.includes(t);
                    return (
                      <button key={t} onClick={() => toggleTerm(t)}
                        title={modelDefault.includes(t) ? "Présent dans le modèle par défaut" : ""}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium transition-all ${
                          isOn
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50 line-through"
                        }`}>
                        {formatTermDisplay(t, factors)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="h-px bg-gray-100 dark:bg-gray-800 mt-4 mb-3" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Termes actifs :</span>
              <strong className="text-sm text-gray-700 dark:text-gray-200">{modelActive.length + 1}</strong>
              <span className="text-xs text-gray-400">(+ constante)</span>
              {!isDefaultModel
                ? <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Modifié</span>
                : <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Défaut JSON</span>
              }
            </div>
          </div>

          {/* Équation */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Équation</p>
            <div className="font-mono text-sm text-gray-700 dark:text-gray-200 leading-loose">
              <span>Ŷ = α₀</span>
              {modelActive.map(t => (
                <span key={t}>
                  {" "}+ α<sub>{termSubScript(t, factors)}</sub>·<span dangerouslySetInnerHTML={{ __html: formatTermHTML(t, factors) }} />
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => goTo(2)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Retour
            </button>
            <div className="flex items-center gap-3">
              {editMode && (
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              )}
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                Continuer →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}