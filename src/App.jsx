import { useMemo, useState } from "react";
import "./App.css";

// Objectifs 
const OBJECTIFS = [
  { key: "sedentaire", label: "Sédentaire", min: 0.8, max: 1.0 },
  { key: "endurance", label: "Endurance", min: 1.2, max: 1.6 },
  { key: "conservation", label: "Conservation de la masse musculaire", min: 1.6, max: 1.8 },
  { key: "prise", label: "Prise de masse musculaire", min: 1.8, max: 2.2 },
];

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function generateWeights(minW, maxW, rows) {
  if (rows <= 1) return [Math.round(minW)];
  const step = (maxW - minW) / (rows - 1);
  return Array.from({ length: rows }, (_, i) => Math.round(minW + i * step));
}

function formatRange(gMin, gMax) {
  return `${Math.round(gMin)} – ${Math.round(gMax)} g/jour`;
}

// Export CSV 
function downloadCSV(filename, rows) {

  const BOM = "\uFEFF";
  const csv = BOM + rows.map((r) => r.map(escapeCSVCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function escapeCSVCell(value) {
  const s = String(value ?? "");
  if (/[;"\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export default function App() {
  const [minWeight, setMinWeight] = useState(50);
  const [maxWeight, setMaxWeight] = useState(100);
  const [rows, setRows] = useState(6);
  const [selected, setSelected] = useState(() => new Set(["sedentaire"]));

  const toggleObjective = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const errors = useMemo(() => {
    const list = [];

    if (!Number.isFinite(minWeight) || !Number.isFinite(maxWeight) || !Number.isFinite(rows)) {
      list.push("Certains champs ne sont pas des nombres valides.");
      return list;
    }

    if (minWeight <= 0 || maxWeight <= 0) list.push("Les poids doivent être strictement positifs.");
    if (minWeight >= maxWeight) list.push("Le poids minimum doit être inférieur au poids maximum.");
    if (rows < 2) list.push("Le nombre de lignes doit être ≥ 2.");
    if (rows > 50) list.push("Le nombre de lignes doit être ≤ 50 (pour garder le tableau lisible).");
    if (selected.size === 0) list.push("Sélectionne au moins un objectif.");
    if (minWeight > 400 || maxWeight > 400) list.push("Poids très élevé (> 400 kg). Vérifie la saisie.");

    return list;
  }, [minWeight, maxWeight, rows, selected]);

  const selectedObjectives = useMemo(
    () => OBJECTIFS.filter((o) => selected.has(o.key)),
    [selected]
  );

  const weights = useMemo(() => {
    if (errors.length > 0) return [];
    return generateWeights(minWeight, maxWeight, rows);
  }, [minWeight, maxWeight, rows, errors]);

  const buildCSVRows = () => {
    const header = ["Poids (kg)", ...selectedObjectives.map((o) => o.label)];
    const body = weights.map((w) => [
      w,
      ...selectedObjectives.map((o) => formatRange(w * o.min, w * o.max)),
    ]);
    return [header, ...body];
  };

  const handleExport = () => {
    const csvRows = buildCSVRows();
    const filename = `besoins-proteines_${minWeight}-${maxWeight}kg_${rows}lignes.csv`;
    downloadCSV(filename, csvRows);
  };

  const reset = () => {
    setMinWeight(50);
    setMaxWeight(100);
    setRows(6);
    setSelected(new Set(["sedentaire"]));
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Générateur de besoins en protéines</h1>
        <p className="subtitle">
          Génère dynamiquement un tableau de besoins journaliers en protéines selon le poids et l’objectif.
        </p>
      </header>

      <section className="card">
        <div className="cardHeader">
          <h2>Paramètres</h2>

          <div className="actions">
            <button className="btn" type="button" onClick={reset}>
              Réinitialiser
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={handleExport}
              disabled={errors.length > 0}
              title={errors.length > 0 ? "Corrige les erreurs avant d’exporter" : "Exporter le tableau en CSV"}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid">
          <label className="field">
            <span>Poids minimum (kg)</span>
            <input
              type="number"
              min="1"
              value={minWeight}
              onChange={(e) => setMinWeight(toNumber(e.target.value, 50))}
            />
          </label>

          <label className="field">
            <span>Poids maximum (kg)</span>
            <input
              type="number"
              min="1"
              value={maxWeight}
              onChange={(e) => setMaxWeight(toNumber(e.target.value, 100))}
            />
          </label>

          <label className="field">
            <span>Nombre de lignes (2–50)</span>
            <input
              type="number"
              min="2"
              max="50"
              value={rows}
              onChange={(e) => setRows(clamp(toNumber(e.target.value, 6), 2, 50))}
            />
          </label>
        </div>

        <div className="objectifs">
          <h3>Objectifs</h3>
          <div className="chips">
            {OBJECTIFS.map((o) => (
              <label key={o.key} className={`chip ${selected.has(o.key) ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.has(o.key)}
                  onChange={() => toggleObjective(o.key)}
                />
                <span>
                  {o.label} <small>({o.min}–{o.max} g/kg/j)</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="errors" role="alert">
            <strong>À corriger :</strong>
            <ul>
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Tableau généré</h2>

        {errors.length > 0 ? (
          <p className="muted">Le tableau s’affichera dès que les paramètres seront valides.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Poids (kg)</th>
                  {selectedObjectives.map((o) => (
                    <th key={o.key}>{o.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weights.map((w) => (
                  <tr key={w}>
                    <td>{w}</td>
                    {selectedObjectives.map((o) => (
                      <td key={o.key}>{formatRange(w * o.min, w * o.max)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
