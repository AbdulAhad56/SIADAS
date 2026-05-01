// SAIDAS — components/dashboard/AssociationRules.jsx
// Displays Apriori association rules in a sortable table.
// Props:
//   data: { frequent_itemsets: [], rules: [], note?: string, error?: string }

import { useState } from "react";

const MAX_DISPLAY = 10;

const COL_HEADERS = [
  { key: "antecedents", label: "Antecedents",  sortable: false },
  { key: "consequents", label: "Consequents",  sortable: false },
  { key: "support",     label: "Support",      sortable: true  },
  { key: "confidence",  label: "Confidence",   sortable: true  },
  { key: "lift",        label: "Lift",         sortable: true  },
];

// Confidence → colour band
function confidenceColor(v) {
  if (v >= 0.85) return { bg: "rgba(16,185,129,0.12)", color: "#059669" };
  if (v >= 0.70) return { bg: "rgba(79,70,229,0.10)",  color: "#4F46E5" };
  return              { bg: "rgba(245,158,11,0.10)",   color: "#D97706" };
}

// Lift badge colour
function liftColor(v) {
  if (v > 2)  return { bg: "rgba(16,185,129,0.12)", color: "#059669" };
  if (v > 1)  return { bg: "rgba(79,70,229,0.10)",  color: "#4F46E5" };
  return            { bg: "rgba(239,68,68,0.10)",   color: "#DC2626" };
}

function ItemBadge({ text }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium
                     bg-[var(--color-surface)] border border-[var(--color-surface-border)]
                     text-[var(--color-text-secondary)] mr-1 mb-0.5 whitespace-nowrap">
      {text}
    </span>
  );
}

export default function AssociationRules({ data }) {
  const [sortKey, setSortKey]   = useState("confidence");
  const [sortDir, setSortDir]   = useState("desc");

  // ── Empty / error states ───────────────────────────────────────────
  if (!data) return <EmptyState msg="No association rule data returned." />;

  if (data.error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl
                      bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <span className="text-lg shrink-0">⚠️</span>
        <div>
          <p className="font-semibold mb-0.5">Association mining unavailable</p>
          <p className="text-xs opacity-80">{data.error}</p>
        </div>
      </div>
    );
  }

  if (data.note && !data.rules?.length) {
    return <EmptyState msg={data.note} />;
  }

  const rules           = data.rules           || [];
  const frequentItemsets = data.frequent_itemsets || [];

  if (!rules.length) {
    return <EmptyState msg="No association rules found at the current confidence threshold (≥ 0.5)." />;
  }

  // ── Sort ───────────────────────────────────────────────────────────
  const sorted = [...rules].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    return mul * (a[sortKey] - b[sortKey]);
  });
  const displayed = sorted.slice(0, MAX_DISPLAY);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  return (
    <div className="space-y-5">

      {/* ── Summary strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatChip label="Frequent Itemsets" value={frequentItemsets.length} icon="📦" />
        <StatChip label="Rules Generated"   value={rules.length}           icon="🔗" />
        <StatChip
          label="Avg Confidence"
          value={`${(rules.reduce((s, r) => s + r.confidence, 0) / rules.length * 100).toFixed(1)}%`}
          icon="🎯"
        />
      </div>

      {/* ── Rules table ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="label">
            Top {displayed.length} rules sorted by{" "}
            <span className="text-[var(--color-primary)] font-semibold">{sortKey}</span>
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Click column headers to re-sort
          </p>
        </div>

        <div className="overflow-x-auto scrollbar-thin rounded-xl border
                        border-[var(--color-surface-border)]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b
                             border-[var(--color-surface-border)]">
                {COL_HEADERS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={[
                      "px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]",
                      "select-none whitespace-nowrap",
                      col.sortable
                        ? "cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                        : "",
                    ].join(" ")}
                  >
                    {col.label}
                    <SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((rule, i) => {
                const confStyle = confidenceColor(rule.confidence);
                const liftStyle = liftColor(rule.lift);
                return (
                  <tr
                    key={i}
                    className={[
                      "border-b border-[var(--color-surface-border)]",
                      "hover:bg-[var(--color-surface)] transition-colors duration-100",
                      i % 2 === 0 ? "bg-white" : "bg-[var(--color-surface)]",
                    ].join(" ")}
                  >
                    {/* Antecedents */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex flex-wrap gap-0.5">
                        {rule.antecedents.map((a) => (
                          <ItemBadge key={a} text={a} />
                        ))}
                      </div>
                    </td>

                    {/* Consequents */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex flex-wrap gap-0.5">
                        {rule.consequents.map((c) => (
                          <ItemBadge key={c} text={c} />
                        ))}
                      </div>
                    </td>

                    {/* Support */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[var(--color-surface-border)]
                                        rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width     : `${rule.support * 100}%`,
                              background: "var(--color-accent)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                          {(rule.support * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: confStyle.bg, color: confStyle.color }}
                      >
                        {(rule.confidence * 100).toFixed(1)}%
                      </span>
                    </td>

                    {/* Lift */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: liftStyle.bg, color: liftStyle.color }}
                      >
                        {rule.lift.toFixed(2)}×
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rules.length > MAX_DISPLAY && (
          <p className="text-[10px] text-[var(--color-text-muted)] text-right mt-2">
            Showing top {MAX_DISPLAY} of {rules.length} rules
          </p>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-[11px] text-[var(--color-text-muted)]
                      pt-1 border-t border-[var(--color-surface-border)]">
        <span>
          <strong className="text-[var(--color-text-secondary)]">Support</strong>
          {" "}— frequency of itemset in dataset
        </span>
        <span>
          <strong className="text-[var(--color-text-secondary)]">Confidence</strong>
          {" "}— P(consequent | antecedent)
        </span>
        <span>
          <strong className="text-[var(--color-text-secondary)]">Lift</strong>
          {" "}— &gt;1 means positive association
        </span>
      </div>
    </div>
  );
}

function StatChip({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                    bg-[var(--color-surface)] border border-[var(--color-surface-border)]">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-extrabold text-[var(--color-primary)] leading-none">
          {value}
        </p>
        <p className="label mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <span className="text-4xl">🔗</span>
      <p className="text-sm text-[var(--color-text-muted)] max-w-sm">{msg}</p>
    </div>
  );
}