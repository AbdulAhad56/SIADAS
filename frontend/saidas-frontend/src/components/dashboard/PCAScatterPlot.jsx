// SAIDAS — PCAScatterPlot.jsx
// 2-D PCA scatter coloured by class label (classification) or quartile (regression)
// Uses Recharts ScatterChart

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { buildPCASeriesByLabel } from "@/utils/chartHelpers";
import { CHART_COLORS }          from "@/utils/constants";

// Custom tooltip
function PCATip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card py-2 px-3 text-xs shadow-(--shadow-card-lg)">
      <p className="font-semibold text-text-primary mb-1">Label: {d.label ?? d.z}</p>
      <p className="text-text-secondary">PC1: {d.x?.toFixed(3)}</p>
      <p className="text-text-secondary">PC2: {d.y?.toFixed(3)}</p>
    </div>
  );
}

export default function PCAScatterPlot({ pca }) {
  if (!pca?.points?.length) {
    return <Empty msg="PCA data unavailable." />;
  }

  // Subsample to max 600 points for performance
  const points  = pca.points.length > 600
    ? pca.points.filter((_, i) => i % Math.ceil(pca.points.length / 600) === 0)
    : pca.points;

  const series  = buildPCASeriesByLabel(points);
  const ev      = pca.explained_variance || [];
  const total   = pca.total_variance     || 0;

  return (
    <div className="space-y-4">
      {/* Variance badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {ev.map((v, i) => (
          <span key={i}
            className="px-2.5 py-1 rounded-full font-medium text-white"
            style={{ background: CHART_COLORS[i] }}>
            PC{i + 1}: {(v * 100).toFixed(1)}%
          </span>
        ))}
        <span className="px-2.5 py-1 rounded-full font-medium bg-surface
                         border border-surface-border text-text-secondary">
          Total: {(total * 100).toFixed(1)}%
        </span>
      </div>

      {/* Scatter chart */}
      <div style={{ width: "100%", height: "288px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number" dataKey="x"
              name="PC1"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              label={{ value: `PC1 (${ev[0] ? (ev[0]*100).toFixed(1)+"%" : ""})`,
                       position: "insideBottom", offset: -2,
                       fontSize: 10, fill: "var(--color-text-muted)" }}
            />
            <YAxis
              type="number" dataKey="y"
              name="PC2"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              label={{ value: `PC2 (${ev[1] ? (ev[1]*100).toFixed(1)+"%" : ""})`,
                       angle: -90, position: "insideLeft",
                       fontSize: 10, fill: "var(--color-text-muted)" }}
            />
            <Tooltip content={<PCATip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle" iconSize={8}
            />
            {series.map(({ name, color, data }) => (
              <Scatter
                key={name}
                name={String(name)}
                data={data}
                fill={color}
                fillOpacity={0.7}
                r={3}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Top PC1 loadings */}
      {pca.loadings?.length > 0 && (
        <div>
          <p className="label mb-2">Top PC1 Loadings</p>
          <div className="space-y-1.5">
            {pca.loadings.slice(0, 6).map(({ feature, pc1 }) => {
              const pct = Math.abs(pc1) * 100;
              return (
                <div key={feature} className="flex items-center gap-3 text-xs">
                  <span className="w-28 text-text-secondary truncate">{feature}</span>
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden
                                  border border-surface-border">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct * 5)}%`,
                        background: pc1 >= 0 ? "var(--color-primary)" : "var(--color-danger)",
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-text-muted">
                    {pc1 >= 0 ? "+" : ""}{pc1.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-3xl">🎯</span>
      <p className="text-sm text-text-muted">{msg}</p>
    </div>
  );
}