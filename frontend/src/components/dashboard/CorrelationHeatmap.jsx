// SAIDAS — CorrelationHeatmap.jsx
// Renders a Pearson correlation matrix as a colour-coded SVG grid.
// Strong pairs listed in a table below.

import { useMemo } from "react";
import { buildHeatmapCells, correlationToColor } from "@/utils/chartHelpers";
import { shortenLabel } from "@/utils/formatters";

const CELL_SIZE    = 38;
const LABEL_OFFSET = 90;   // px reserved for row/col labels
const MAX_COLS     = 14;   // cap to avoid overflow on large datasets

export default function CorrelationHeatmap({ correlation }) {
  if (!correlation?.columns?.length) {
    return <EmptyState msg="No numeric columns found for correlation analysis." />;
  }

  // Limit to MAX_COLS most-varied columns
  const columns  = correlation.columns.slice(0, MAX_COLS);
  const nCols    = columns.length;
  const cellSize = Math.max(28, Math.min(CELL_SIZE, Math.floor(540 / nCols)));

  const cells    = useMemo(() => buildHeatmapCells({
    columns,
    matrix: correlation.matrix,
  }), [correlation]);

  const gridW = nCols * cellSize;
  const gridH = nCols * cellSize;

  return (
    <div className="space-y-5">
      {/* Heatmap SVG */}
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: LABEL_OFFSET + gridW + 20 }}>
          <svg
            width={LABEL_OFFSET + gridW}
            height={LABEL_OFFSET + gridH}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {/* Column labels (rotated, top) */}
            {columns.map((col, ci) => (
              <text
                key={`ch-${ci}`}
                x={LABEL_OFFSET + ci * cellSize + cellSize / 2}
                y={LABEL_OFFSET - 6}
                textAnchor="end"
                fontSize={Math.max(9, cellSize * 0.28)}
                fill="var(--color-text-secondary)"
                transform={`rotate(-45 ${LABEL_OFFSET + ci * cellSize + cellSize / 2} ${LABEL_OFFSET - 6})`}
              >
                {shortenLabel(col, 12)}
              </text>
            ))}

            {/* Row labels (left) */}
            {columns.map((col, ri) => (
              <text
                key={`rv-${ri}`}
                x={LABEL_OFFSET - 6}
                y={LABEL_OFFSET + ri * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                fontSize={Math.max(9, cellSize * 0.28)}
                fill="var(--color-text-secondary)"
              >
                {shortenLabel(col, 12)}
              </text>
            ))}

            {/* Cells */}
            {cells.map(({ x, y, r, xFull, yFull }, idx) => {
              const ci = columns.indexOf(xFull);
              const ri = columns.indexOf(yFull);
              if (ci < 0 || ri < 0) return null;
              const px = LABEL_OFFSET + ci * cellSize;
              const py = LABEL_OFFSET + ri * cellSize;
              const showVal = cellSize >= 32 && nCols <= 10;

              return (
                <g key={idx}>
                  <rect
                    x={px} y={py}
                    width={cellSize - 1} height={cellSize - 1}
                    fill={correlationToColor(r)}
                    rx={3}
                  >
                    <title>{`${xFull} × ${yFull}: ${r.toFixed(3)}`}</title>
                  </rect>
                  {showVal && (
                    <text
                      x={px + cellSize / 2}
                      y={py + cellSize / 2 + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="600"
                      fill={Math.abs(r) > 0.5 ? "#fff" : "var(--color-text-secondary)"}
                    >
                      {r.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Colour legend */}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>−1.0</span>
        <div className="h-3 flex-1 rounded-full" style={{
          background: "linear-gradient(to right, #EF4444, #F8FAFC, #4F46E5)"
        }} />
        <span>+1.0</span>
      </div>

      {/* Strong pairs table */}
      {correlation.strong_pairs?.length > 0 && (
        <div>
          <p className="label mb-2">Strong Correlations (|r| ≥ 0.70)</p>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-surface-border">
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">Feature A</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">Feature B</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">r</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">Strength</th>
                </tr>
              </thead>
              <tbody>
                {correlation.strong_pairs.slice(0, 8).map(({ col_a, col_b, r }, i) => (
                  <tr key={i} className={`border-b border-surface-border}
                    ${i % 2 === 0 ? "bg-white" : "bg-surface"}`}>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{col_a}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{col_b}</td>
                    <td className="px-4 py-2 font-mono text-xs font-semibold"
                        style={{ color: r > 0 ? "var(--color-primary)" : "var(--color-danger)" }}>
                      {r > 0 ? "+" : ""}{r.toFixed(3)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ background: Math.abs(r) >= 0.9 ? "var(--color-danger)"
                          : Math.abs(r) >= 0.7 ? "var(--color-warning)" : "var(--color-success)" }}>
                        {Math.abs(r) >= 0.9 ? "Very Strong" : Math.abs(r) >= 0.7 ? "Strong" : "Moderate"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <span className="text-3xl">📊</span>
      <p className="text-sm text-text-muted">{msg}</p>
    </div>
  );
}