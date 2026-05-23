// SAIDAS — components/upload/DataPreviewTable.jsx
//
// Displays the first N rows of the uploaded dataset in a responsive table.
// Props:
//   columns   string[]        — column names in order
//   rows      object[]        — array of row dicts (from /upload preview)
//   dtypes    object          — { colName: "float64" | "int64" | "object" … }
//   totalRows number          — total dataset row count (for "showing X of Y" label)
//   maxPreview number         — how many rows to show (default 5)

import { useState } from "react";
import {
  Table2,
} from "lucide-react";

// Dtype → short tag label + colour
const DTYPE_TAG = {
  float64  : { label: "float",   color: "var(--color-accent)"   },
  float32  : { label: "float",   color: "var(--color-accent)"   },
  int64    : { label: "int",     color: "var(--color-primary)"  },
  int32    : { label: "int",     color: "var(--color-primary)"  },
  int8     : { label: "int",     color: "var(--color-primary)"  },
  bool     : { label: "bool",    color: "var(--color-success)"  },
  object   : { label: "str",     color: "var(--color-warning)"  },
  category : { label: "cat",     color: "#8B5CF6"               },
};

function getDtypeTag(dtype = "") {
  const key = Object.keys(DTYPE_TAG).find((k) => dtype.startsWith(k));
  return DTYPE_TAG[key] || { label: dtype.slice(0, 5) || "?", color: "#64748B" };
}

function CellValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="italic text-text-muted">null</span>;
  }
  const str = String(value);
  if (str === "" || str.toLowerCase() === "nan") {
    return <span className="italic text-text-muted">—</span>;
  }
  return <span>{str}</span>;
}

export default function DataPreviewTable({
  columns    = [],
  rows       = [],
  dtypes     = {},
  totalRows  = 0,
  maxPreview = 5,
}) {
  const [highlightCol, setHighlightCol] = useState(null);

  const visibleRows = rows.slice(0, maxPreview);

  if (!columns.length) {
    return (
      <div className="card flex flex-col items-center py-10 gap-3 text-center">
        <div
  className="
    w-16 h-16 rounded-2xl
    bg-primary/10
    flex items-center justify-center
  "
>
  <Table2
    className="w-8 h-8 text-primary"
    strokeWidth={2.2}
  />
</div>
        <p className="text-sm text-text-muted">
          No dataset loaded yet. Upload a CSV file to see a preview.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary">
            Dataset Preview
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Showing{" "}
            <span className="font-mono font-semibold text-text-secondary">
              {visibleRows.length}
            </span>{" "}
            of{" "}
            <span className="font-mono font-semibold text-text-secondary">
              {totalRows.toLocaleString()}
            </span>{" "}
            rows ·{" "}
            <span className="font-mono font-semibold text-text-secondary">
              {columns.length}
            </span>{" "}
            columns
          </p>
        </div>

        {/* Dtype legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          {Object.entries(DTYPE_TAG)
            .filter(([k]) => ["int64","float64","object","bool"].includes(k))
            .map(([, { label, color }]) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: color }}
                />
                <span className="text-text-muted">{label}</span>
              </span>
            ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto scrollbar-thin rounded-xl border
                      border-surface-border">
        <table className="w-full text-sm border-collapse">

          {/* Column headers */}
          <thead>
            <tr className="bg-surface border-b
                           border-surface-border">
              {/* Row number column */}
              <th className="px-3 py-3 text-left w-10">
                <span className="label">#</span>
              </th>

              {columns.map((col) => {
                const tag = getDtypeTag(dtypes[col] || "");
                return (
                  <th
                    key={col}
                    onMouseEnter={() => setHighlightCol(col)}
                    onMouseLeave={() => setHighlightCol(null)}
                    className={[
                      "px-4 py-3 text-left whitespace-nowrap cursor-default",
                      "transition-colors duration-100",
                      highlightCol === col
                        ? "bg-primary bg-opacity-5"
                        : "",
                    ].join(" ")}
                  >
                    {/* Column name */}
                    <span className="font-semibold text-text-primary block">
                      {col}
                    </span>
                    {/* Dtype tag */}
                    <span
                      className="inline-block mt-0.5 text-[10px] font-mono font-medium
                                 px-1.5 py-0.5 rounded-md"
                      style={{
                        color     : tag.color,
                        background: `color-mix(in srgb, ${tag.color} 10%, transparent)`,
                      }}
                    >
                      {tag.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {visibleRows.map((row, ri) => (
              <tr
                key={ri}
                className={[
                  "border-b border-surface-border",
                  "hover:bg-surface transition-colors duration-100",
                  ri % 2 === 0 ? "bg-white" : "bg-surface",
                ].join(" ")}
              >
                {/* Row number */}
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-mono text-text-muted">
                    {ri + 1}
                  </span>
                </td>

                {columns.map((col) => (
                  <td
                    key={col}
                    className={[
                      "px-4 py-2.5 font-mono text-xs text-text-secondary",
                      "whitespace-nowrap max-w-45 truncate",
                      "transition-colors duration-100",
                      highlightCol === col
                        ? "bg-primary bg-opacity-[0.03]"
                        : "",
                    ].join(" ")}
                    title={row[col] != null ? String(row[col]) : "null"}
                  >
                    <CellValue value={row[col]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      {totalRows > maxPreview && (
        <p className="text-xs text-text-muted text-right">
          … and{" "}
          <span className="font-semibold font-mono text-text-secondary">
            {(totalRows - maxPreview).toLocaleString()}
          </span>{" "}
          more rows not shown
        </p>
      )}
    </div>
  );
}