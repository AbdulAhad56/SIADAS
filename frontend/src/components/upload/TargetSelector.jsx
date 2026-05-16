// SAIDAS — components/upload/TargetSelector.jsx

import { useState, useMemo } from "react";

const PILL_THRESHOLD = 20;

// Heuristic hints
const TARGET_HINTS = [
  "target",
  "label",
  "class",
  "output",
  "y",
  "result",
  "survived",
  "price",
  "sale",
  "churn",
  "fraud",
  "spam",
  "heartdisease",
  "diabetes",
  "stroke",
  "income",
];

// Improved target detection
function likelyTarget(col, dtypes = {}, uniqueCounts = {}) {
  const lower = col.toLowerCase();

  // Name-based hints
  const hasHint = TARGET_HINTS.some((hint) => lower.includes(hint));

  const dtype = dtypes[col] || "";
  const unique = uniqueCounts[col] || 0;

  // Binary / categorical-like target detection
  const isNumeric = dtype.startsWith("int") || dtype.startsWith("float");

  const looksLikeTarget =
    (!isNumeric && unique >= 2 && unique <= 6) || dtype === "bool";

  return hasHint || looksLikeTarget;
}

// dtype helpers
function getDtypeVariant(dtype = "") {
  if (dtype.startsWith("float") || dtype.startsWith("int")) return "numeric";
  if (dtype === "bool") return "bool";
  return "text";
}

const DTYPE_PILL = {
  numeric: {
    label: "num",
    bg: "rgba(79,70,229,0.10)",
    color: "var(--color-primary)",
  },
  bool: {
    label: "bool",
    bg: "rgba(16,185,129,0.10)",
    color: "var(--color-success)",
  },
  text: {
    label: "str",
    bg: "rgba(245,158,11,0.10)",
    color: "var(--color-warning)",
  },
};

export default function TargetSelector({
  columns = [],
  dtypes = {},
  nullCounts = {},
  uniqueCounts = {},
  value = "",
  onChange,
}) {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  const usePills = columns.length <= PILL_THRESHOLD;

  // Sort targets first
  const sorted = useMemo(() => {
    return [...columns].sort((a, b) => {
      const aHint = likelyTarget(a, dtypes, uniqueCounts) ? 0 : 1;
      const bHint = likelyTarget(b, dtypes, uniqueCounts) ? 0 : 1;

      if (aHint !== bHint) return aHint - bHint;

      return a.localeCompare(b);
    });
  }, [columns, dtypes, uniqueCounts]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;

    return sorted.filter((c) => c.toLowerCase().includes(search.toLowerCase()));
  }, [sorted, search]);

  const handleSelect = (col) => {
    if (onChange) onChange(col);
  };

  if (!columns.length) return null;

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-text-primary mb-1">
          Select Target Variable
        </h3>

        <p className="text-sm text-text-secondary leading-snug">
          Choose the column you want to predict. SAIDAS will auto-detect whether
          this is a{" "}
          <span className="font-medium text-primary">classification</span> or{" "}
          <span className="font-medium text-accent">regression</span> task.
        </p>
      </div>

      {/* Search */}
      {usePills && columns.length > 8 && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            🔍
          </span>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter columns…"
            className="w-full pl-8 pr-4 py-2 text-sm rounded-xl
                       border border-surface-border
                       bg-surface
                       text-text-primary
                       placeholder:text-text-muted
                       focus:outline-none focus:ring-2
                       focus:ring-primary
                       focus:ring-opacity-30
                       focus:border-primary
                       transition-all duration-150"
          />
        </div>
      )}

      {/* Pill mode */}
      {usePills ? (
        <>
          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted py-2 text-center">
              No columns match "{search}"
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filtered.map((col) => {
                const dtv = getDtypeVariant(dtypes[col] || "");
                const tag = DTYPE_PILL[dtv];

                const nulls = nullCounts[col] || 0;

                const hint = likelyTarget(col, dtypes, uniqueCounts);

                const active = col === value;
                const hoverActive = hovered === col;

                return (
                  <button
                    key={col}
                    onClick={() => handleSelect(col)}
                    onMouseEnter={() => setHovered(col)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${col} · ${dtypes[col] || "?"} · ${nulls} nulls`}
                    className={[
                      "relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl",
                      "border text-left transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-30",
                      active || hoverActive
                        ? "border-primary bg-primary shadow-(--shadow-card)"
                        : [
                            "border-surface-border bg-white",
                            "hover:border-primary",
                            "hover:bg-primary hover:bg-opacity-[0.03]",
                          ].join(" "),
                    ].join(" ")}
                  >
                    {/* Suggested target */}
                    {hint && !active && (
                      <span
                        className="absolute top-1.5 right-2 text-[10px]"
                        title="Suggested target column"
                      >
                        ⭐
                      </span>
                    )}

                    {/* Name */}
                    <span
                      className={[
                        "text-sm font-medium truncate w-full pr-4 leading-snug",
                        active || hoverActive ? "text-white" : "text-text-primary",
                      ].join(" ")}
                    >
                      {col}
                    </span>

                    {/* Meta */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md"
                        style={
                          active || hoverActive
                            ? {
                                background: "rgba(255,255,255,0.2)",
                                color: "#fff",
                              }
                            : {
                                background: tag.bg,
                                color: tag.color,
                              }
                        }
                      >
                        {tag.label}
                      </span>

                      {nulls > 0 && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                          style={
                            active || hoverActive
                              ? {
                                  background: "rgba(255,255,255,0.2)",
                                  color: "#fff",
                                }
                              : {
                                  background: "rgba(245,158,11,0.1)",
                                  color: "var(--color-warning)",
                                }
                          }
                        >
                          {nulls} null{nulls > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Dropdown mode */
        <div className="space-y-3">
          <select
            value={value}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium
                       border border-surface-border
                       bg-white text-text-primary
                       focus:outline-none focus:ring-2
                       focus:ring-primary focus:ring-opacity-30
                       focus:border-primary
                       transition-all duration-150 cursor-pointer"
          >
            <option value="" disabled>
              — Choose target column —
            </option>

            {/* Suggested */}
            {sorted.some((c) => likelyTarget(c, dtypes, uniqueCounts)) && (
              <optgroup label="⭐ Suggested targets">
                {sorted
                  .filter((c) => likelyTarget(c, dtypes, uniqueCounts))
                  .map((col) => (
                    <option key={col} value={col}>
                      {col} ({dtypes[col] || "?"})
                    </option>
                  ))}
              </optgroup>
            )}

            {/* Others */}
            <optgroup label="All columns">
              {sorted
                .filter((c) => !likelyTarget(c, dtypes, uniqueCounts))
                .map((col) => (
                  <option key={col} value={col}>
                    {col} ({dtypes[col] || "?"})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* Selected */}
      {value ? (
        <SelectedBar
          col={value}
          dtype={dtypes[value]}
          nulls={nullCounts[value] || 0}
          uniqueCounts={uniqueCounts[value] || 0}
        />
      ) : (
        <p className="text-xs text-text-muted text-center py-1">
          Select a column above to continue
        </p>
      )}
    </div>
  );
}

function SelectedBar({ col, dtype = "", nulls = 0, uniqueCounts = 0 }) {
  const dtv = getDtypeVariant(dtype);
  const tag = DTYPE_PILL[dtv];

  const taskGuess =
    uniqueCounts <= 10
      ? "Likely classification task — SAIDAS will auto-detect."
      : "Likely regression task — SAIDAS will auto-detect.";

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border
                 transition-all duration-200"
      style={{
        background: "color-mix(in srgb, var(--color-primary) 5%, transparent)",
        borderColor:
          "color-mix(in srgb, var(--color-primary) 25%, transparent)",
      }}
    >
      <span className="text-xl mt-0.5">🎯</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-primary text-sm">{col}</span>

          <span
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: tag.bg,
              color: tag.color,
            }}
          >
            {dtype || "?"}
          </span>

          {nulls > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{
                background: "rgba(245,158,11,0.1)",
                color: "var(--color-warning)",
              }}
            >
              {nulls} null{nulls > 1 ? "s" : ""} — will be imputed
            </span>
          )}
        </div>

        <p className="text-xs text-text-secondary mt-0.5">{taskGuess}</p>
      </div>

      <span className="text-success text-lg shrink-0">✓</span>
    </div>
  );
}
