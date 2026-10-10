import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  units,
  Unit,
  convert,
  parseFlow,
  range,
  format,
  tableText,
} from "./flow";
import "./style.css";
type Preferences = { precision: number; unit: Unit; theme: "light" | "dark" };
function readPreferences(): Preferences {
  const defaults: Preferences = {
    precision: 2,
    unit: "m3h",
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  };
  try {
    const p = JSON.parse(
      localStorage.getItem("pumpflow.preferences") || "null",
    );
    if (p) {
      if (Number.isInteger(p.precision) && p.precision >= 0 && p.precision <= 4)
        defaults.precision = p.precision;
      if (units.some((u) => u.id === p.unit)) defaults.unit = p.unit;
      if (["light", "dark"].includes(p.theme)) defaults.theme = p.theme;
    }
  } catch {}
  return defaults;
}
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function App() {
  const [prefs, setPrefs] = useState(readPreferences);
  const [source, setSource] = useState<Unit>("m3h");
  const [raw, setRaw] = useState("10");
  const [entries, setEntries] = useState<string[]>(["10", "20", "30"]);
  const [mode, setMode] = useState<"manual" | "range">("manual");
  const [start, setStart] = useState("10");
  const [end, setEnd] = useState("100");
  const [step, setStep] = useState("10");
  const [notice, setNotice] = useState("");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    try {
      localStorage.setItem("pumpflow.preferences", JSON.stringify(prefs));
    } catch {}
  }, [prefs]);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const value = parseFlow(raw);
  const rows = entries.map(parseFlow).filter((v): v is number => v !== null);
  const invalid = entries.some((v) => v.trim() !== "" && parseFlow(v) === null);
  function generate() {
    try {
      const values = [start, end, step].map(parseFlow);
      if (values.some((v) => v === null))
        throw Error("Enter valid start, end, and step values.");
      setEntries(range(...(values as [number, number, number])).map(String));
      setNotice("Range generated.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        tableText(rows, prefs.unit, prefs.precision),
      );
      setNotice("Table copied. Paste directly into Excel.");
    } catch {
      setNotice(
        "Clipboard unavailable. Export CSV instead, or allow clipboard access.",
      );
    }
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + tableText(rows, prefs.unit, prefs.precision, ",")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pumpflow-conversions.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("CSV exported.");
  }
  return (
    <div className="shell">
      <header>
        <a className="brand" href="#">
          <img className="logo" src="./icon.svg" alt="" />
          <span>
            PumpFlow<small>ENGINEERING UTILITIES</small>
          </span>
        </a>
        <div className="header-actions">
          <span className={"status " + (!online ? "offline" : "")}>
            <i />
            {online ? "Local workspace" : "Offline mode"}
          </span>
          {install && (
            <button
              onClick={async () => {
                await install.prompt();
                await install.userChoice;
                setInstall(null);
              }}
            >
              Install app
            </button>
          )}
          <button
            aria-label="Toggle color theme"
            onClick={() =>
              setPrefs({
                ...prefs,
                theme: prefs.theme === "light" ? "dark" : "light",
              })
            }
          >
            {prefs.theme === "light" ? "☾" : "☀"}
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div className="eyebrow">PRECISION IN EVERY QUOTATION</div>
          <h1>Flow rates, made simple.</h1>
          <p>Convert, compare, and prepare your next pump quotation.</p>
        </div>
        <div className="toolbar">
          <span>
            <span className="dot" /> Six units. One accurate calculation.
          </span>
          <label>
            Decimal places{" "}
            <select
              aria-label="Decimal places"
              value={prefs.precision}
              onChange={(e) =>
                setPrefs({ ...prefs, precision: Number(e.target.value) })
              }
            >
              {[0, 1, 2, 3, 4].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <section className="card">
          <div className="section-head">
            <div>
              <span className="section-number">01</span>
              <h2>Quick converter</h2>
              <p>
                Enter a flow rate in any unit. Every other value updates
                instantly.
              </p>
            </div>
            <span className="badge">LIVE CONVERSION</span>
          </div>
          <div className="converter-grid">
            {units.map((u) => (
              <label
                className={"unit-card " + (source === u.id ? "active" : "")}
                key={u.id}
              >
                <span className="unit-heading">
                  {u.label}
                  {source === u.id && <small>INPUT</small>}
                </span>
                <input
                  aria-label={"Quick " + u.label}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="—"
                  value={
                    source === u.id
                      ? raw
                      : value === null
                        ? ""
                        : format(convert(value, source, u.id), prefs.precision)
                  }
                  onChange={(e) => {
                    setSource(u.id);
                    setRaw(e.target.value);
                  }}
                />
                <span className="unit-description">{u.name}</span>
              </label>
            ))}
          </div>
          {raw !== "" && value === null && (
            <p className="error">Enter a finite, non-negative flow rate.</p>
          )}
        </section>
        <section className="card table-card">
          <div className="section-head">
            <div>
              <span className="section-number">02</span>
              <h2>Quotation table</h2>
              <p>A clear comparison, ready for your spreadsheet.</p>
            </div>
            <div className="export-actions">
              <button disabled={!rows.length || invalid} onClick={copy}>
                ⧉ Copy for Excel
              </button>
              <button
                className="primary"
                disabled={!rows.length || invalid}
                onClick={exportCsv}
              >
                ↓ Export CSV
              </button>
            </div>
          </div>
          <div className="table-tools">
            <div className="tabs" role="group" aria-label="Entry mode">
              <button
                className={mode === "manual" ? "selected" : ""}
                onClick={() => setMode("manual")}
              >
                Manual entry
              </button>
              <button
                className={mode === "range" ? "selected" : ""}
                onClick={() => setMode("range")}
              >
                Range generator
              </button>
            </div>
            <label>
              Input unit{" "}
              <select
                aria-label="Table input unit"
                value={prefs.unit}
                onChange={(e) =>
                  setPrefs({ ...prefs, unit: e.target.value as Unit })
                }
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {mode === "range" && (
            <div className="range-tools">
              {[
                ["Start", start, setStart],
                ["End", end, setEnd],
                ["Step", step, setStep],
              ].map(([label, v, set]) => (
                <label key={label as string}>
                  {label as string}
                  <input
                    aria-label={label as string}
                    type="number"
                    min="0"
                    step="any"
                    value={v as string}
                    onChange={(e) =>
                      (set as React.Dispatch<React.SetStateAction<string>>)(
                        e.target.value,
                      )
                    }
                  />
                </label>
              ))}
              <button className="primary" onClick={generate}>
                Generate rows
              </button>
              <small>Up to 1,000 rows · inclusive end when aligned</small>
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  {units.map((u) => (
                    <th
                      scope="col"
                      className={u.id === prefs.unit ? "input-column" : ""}
                      key={u.id}
                    >
                      {u.label}
                      {u.id === prefs.unit && <small>INPUT UNIT</small>}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const n = parseFlow(entry);
                  return (
                    <tr key={i}>
                      <td className="row-number">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      {units.map((u) => (
                        <td
                          key={u.id}
                          className={u.id === prefs.unit ? "input-column" : ""}
                        >
                          {u.id === prefs.unit ? (
                            <input
                              aria-label={"Flow row " + (i + 1)}
                              aria-invalid={entry !== "" && n === null}
                              type="number"
                              min="0"
                              step="any"
                              value={entry}
                              placeholder="Enter flow"
                              onChange={(e) =>
                                setEntries(
                                  entries.map((v, j) =>
                                    j === i ? e.target.value : v,
                                  ),
                                )
                              }
                            />
                          ) : n === null ? (
                            "—"
                          ) : (
                            format(
                              convert(n, prefs.unit, u.id),
                              prefs.precision,
                            )
                          )}
                        </td>
                      ))}
                      <td>
                        <button
                          className="remove"
                          aria-label={"Remove row " + (i + 1)}
                          onClick={() =>
                            setEntries(entries.filter((_, j) => i !== j))
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!entries.length && (
              <p className="empty">
                Add a flow rate or generate a range to get started.
              </p>
            )}
          </div>
          <div className="table-footer">
            <button
              disabled={entries.length >= 1000}
              onClick={() => setEntries([...entries, ""])}
            >
              ＋ Add row
            </button>
            <span>
              {rows.length} valid {rows.length === 1 ? "row" : "rows"}
              <button
                className="text-button"
                onClick={() => {
                  setEntries([]);
                  setNotice("Table cleared.");
                }}
              >
                Clear table
              </button>
            </span>
          </div>
          {invalid && (
            <p className="error">
              Correct negative or invalid rows before exporting.
            </p>
          )}
          <p className="notice" role="status">
            {notice}
          </p>
        </section>
        <aside className="notes">
          <span>◎</span>
          <div>
            <strong>Engineered for accuracy. Available offline.</strong>
            <p>
              US gallon = 3.785411784 L · Imperial gallon = 4.54609 L.
              Calculations retain full precision; rounding applies only to
              displayed and exported values.
            </p>
            <p>
              Install through your browser menu (on iOS: Share → Add to Home
              Screen). Offline access is available after the first production
              visit finishes caching.
            </p>
          </div>
        </aside>
      </main>
      <footer>
        <span>
          PumpFlow <span className="muted">/ Flow-rate workspace</span>
        </span>
        <span>Private by design · Preferences saved on this device</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
