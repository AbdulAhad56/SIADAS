// SAIDAS — components/dashboard/OutlierSummary.jsx
// Displays IQR-based outlier detection results.
// Props:
//   data: {
//     outlier_count, outlier_percentage,
//     columns_with_outliers: string[],
//     per_column: { [col]: { outlier_count, outlier_pct, lower_bound, upper_bound, min, max } }
//   }

import { useState } from "react";
import {
  TriangleAlert,
  ShieldCheck,
  Search,
  Activity,
  AlertCircle,
  BarChart3,
} from "lucide-react";

// Severity thresholds by outlier percentage
function severityOf(pct) {
  if (pct >= 15) return { label: "High",   color: "#DC2626", bg: "rgba(239,68,68,0.10)"   };
  if (pct >= 5)  return { label: "Medium", color: "#D97706", bg: "rgba(245,158,11,0.10)"  };
  return              { label: "Low",    color: "#059669", bg: "rgba(16,185,129,0.10)"  };
}

export default function OutlierSummary({ data }) {
  const [expanded, setExpanded] = useState(null);

  // ── Guards ─────────────────────────────────────────────────────────
  if (!data) return <EmptyState msg="No outlier data returned." />;

  if (data.error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl
                      bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <TriangleAlert
  className="w-5 h-5 shrink-0 mt-0.5 text-amber-600"
/>
        <p>{data.error}</p>
      </div>
    );
  }

  const {
    outlier_count         = 0,
    outlier_percentage    = 0,
    columns_with_outliers = [],
    per_column            = {},
  } = data;

  const totalCols    = Object.keys(per_column).length;
  const affectedCols = columns_with_outliers.length;
  const severity     = severityOf(outlier_percentage);
  const cleanCols    = Object.keys(per_column).filter(
    (c) => !columns_with_outliers.includes(c)
  );

  return (
    <div className="space-y-6">

      {/* ── Top summary row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ">
        {/* Total outliers */}
        <div className="card text-center py-4 sm:py-5 px-2 hover:-translate-y-1
hover:shadow-md
transition-all duration-300">
          <p className="text-3xl font-extrabold text-danger leading-none mb-1">
            {outlier_count.toLocaleString()}
          </p>
          <p className="label">Total Outliers</p>
        </div>

        {/* Outlier % */}
        <div className="card text-center py-4 sm:py-5 px-2 hover:-translate-y-1
hover:shadow-md
transition-all duration-300">
          <p
            className="text-3xl font-extrabold leading-none mb-1"
            style={{ color: severity.color }}
          >
            {outlier_percentage.toFixed(1)}%
          </p>
          <p className="label">Outlier Rate</p>
        </div>

        {/* Affected columns */}
        <div className="card text-center py-4 sm:py-5 px-2 hover:-translate-y-1
hover:shadow-md
transition-all duration-300">
          <p className="text-3xl font-extrabold text-warning leading-none mb-1">
            {affectedCols}
          </p>
          <p className="label">Affected Columns</p>
        </div>

        {/* Severity */}
        <div
          className="card text-center py-4 sm:py-5 px-2 hover:-translate-y-1
hover:shadow-md
transition-all duration-300"
          style={{ background: severity.bg, borderColor: severity.color + "40" }}
        >
          <p
            className="text-2xl font-extrabold leading-none mb-1"
            style={{ color: severity.color }}
          >
            {severity.label}
          </p>
          <p className="label">Severity</p>
        </div>
      </div>

      {/* ── Affected column badges ───────────────────────────────────── */}
      {affectedCols > 0 && (
        <div>
          <p className="label mb-2">
            Columns with outliers ({affectedCols} of {totalCols})
          </p>
          <div className="flex flex-wrap gap-2">
            {columns_with_outliers.map((col) => {
              const info = per_column[col];
              const sev  = severityOf(info?.outlier_pct || 0);
              return (
                <button
                  key={col}
                  onClick={() => setExpanded(expanded === col ? null : col)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                             font-semibold border transition-all duration-200 hover:-translate-y-0.5
hover:shadow-sm"
                  style={{
                    background : expanded === col ? sev.color : sev.bg,
                    color      : expanded === col ? "#fff"     : sev.color,
                    borderColor: sev.color + "50",
                  }}
                >
                  <TriangleAlert className="w-3.5 h-3.5" />
                  {col}
                  <span className="opacity-75">
                    ({info?.outlier_pct?.toFixed(1)}%)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expanded column detail card */}
          {expanded && per_column[expanded] && (
            <ColumnDetail col={expanded} info={per_column[expanded]} />
          )}
        </div>
      )}

      {/* ── Per-column breakdown table ───────────────────────────────── */}
      {Object.keys(per_column).length > 0 && (
        <div>
          <p className="label mb-2">Per-Column IQR Analysis</p>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border
                          border-surface-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface border-b
                               border-surface-border">
                  {["Column", "Outliers", "Rate", "Lower Fence", "Upper Fence", "Range"].map((h) => (
                    <th key={h}
                      className="px-4 py-3 text-left font-semibold
                                 text-text-primary whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Affected columns first */}
                {[...columns_with_outliers,
                  ...Object.keys(per_column).filter(c => !columns_with_outliers.includes(c))
                ].map((col, i) => {
                  const info    = per_column[col];
                  if (!info) return null;
                  const hasOut  = info.outlier_count > 0;
                  const sev     = severityOf(info.outlier_pct);

                  return (
                    <tr key={col}
                      className={[
                        "border-b border-surface-border",
                        "hover:bg-slate-50 transition-all duration-150",
                        i % 2 === 0 ? "bg-white" : "bg-surface",
                      ].join(" ")}
                    >
                      {/* Column name */}
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-text-primary">
                          {col}
                        </span>
                      </td>

                      {/* Count */}
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {hasOut ? (
                          <span style={{ color: sev.color }} className="font-bold">
                            {info.outlier_count}
                          </span>
                        ) : (
                          <span className="text-success">0</span>
                        )}
                      </td>

                      {/* Rate bar */}
                      <td className="px-4 py-2.5">
                        {hasOut ? (
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-surface-border
                                            rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width     : `${Math.min(100, info.outlier_pct)}%`,
                                  background: sev.color,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono" style={{ color: sev.color }}>
                              {info.outlier_pct.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success">
  <ShieldCheck className="w-3.5 h-3.5" />
  Clean
</span>
                        )}
                      </td>

                      {/* Fences */}
                      <td className="px-4 py-2.5 font-mono text-xs
                                     text-text-muted">
                        {info.lower_bound}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs
                                     text-text-muted">
                        {info.upper_bound}
                      </td>

                      {/* Min–Max */}
                      <td className="px-4 py-2.5 font-mono text-xs
                                     text-text-muted">
                        [{info.min} — {info.max}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Clean columns ────────────────────────────────────────────── */}
      {cleanCols.length > 0 && (
        <div>
          <p className="label mb-2">Clean columns (no outliers)</p>
          <div className="flex flex-wrap gap-2">
            {cleanCols.map((col) => (
              <span
                key={col}
                className="px-3 py-1 rounded-full text-xs font-medium
                           bg-[rgba(16,185,129,0.08)]
                           border border-[rgba(16,185,129,0.25)]
                           text-success"
              >
                ✓ {col}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expanded column detail ─────────────────────────────────────────────────
function ColumnDetail({ col, info }) {
  const sev = severityOf(info.outlier_pct);
  return (
    <div
      className="mt-4 p-5 rounded-2xl border
shadow-sm
animate-[fadeIn_0.25s_ease]"
      style={{ background: sev.bg, borderColor: sev.color + "40" }}
    >
      <p className="font-semibold text-sm mb-3" style={{ color: sev.color }}>
        <div className="flex items-center gap-2">
  <BarChart3 className="w-4 h-4" />
  <span>{col} — detailed view</span>
</div>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        {[
          { label: "Outlier Count",  value: info.outlier_count },
          { label: "Outlier Rate",   value: `${info.outlier_pct.toFixed(2)}%` },
          { label: "Lower Fence",    value: info.lower_bound },
          { label: "Upper Fence",    value: info.upper_bound },
          { label: "Dataset Min",    value: info.min },
          { label: "Dataset Max",    value: info.max },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="label mb-0.5">{label}</p>
            <p className="font-mono font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-muted mt-3">
        Values below {info.lower_bound} or above {info.upper_bound} are flagged as outliers
        (Q1 − 1.5×IQR / Q3 + 1.5×IQR).
      </p>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        py-14 gap-4 text-center
      "
    >
      <div
        className="
          w-16 h-16 rounded-2xl
          bg-primary/10
          flex items-center justify-center
        "
      >
        <Search
          className="w-8 h-8 text-primary"
          strokeWidth={2.2}
        />
      </div>

      <p className="text-sm text-text-muted max-w-sm">
        {msg}
      </p>
    </div>
  );
}