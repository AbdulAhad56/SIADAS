// SAIDAS — ClusterPlot.jsx
// Two charts stacked:
//   Top    → K-Means scatter coloured by cluster (Recharts ScatterChart)
//   Bottom → Elbow curve inertia vs K (Recharts LineChart)

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { buildClusterSeries, buildElbowData } from "@/utils/chartHelpers";
import { CLUSTER_COLORS } from "@/utils/constants";

function ClusterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card py-2 px-3 text-xs shadow-(--shadow-card-lg)">
      <p className="font-semibold text-text-primary mb-1">
        Cluster {d.cluster ?? "—"}
      </p>
      <p className="text-text-secondary">PC1: {d.x?.toFixed(3)}</p>
      <p className="text-text-secondary">PC2: {d.y?.toFixed(3)}</p>
    </div>
  );
}

function ElbowTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card py-2 px-3 text-xs shadow-(--shadow-card-lg)">
      <p className="font-semibold text-text-primary">K = {label}</p>
      <p className="text-text-secondary">
        Inertia: {payload[0]?.value?.toLocaleString()}
      </p>
    </div>
  );
}

export default function ClusterPlot({ clustering }) {
  if (!clustering) return <Empty msg="Clustering data unavailable." />;

  const { optimal_k, elbow_curve, cluster_points, cluster_sizes } = clustering;

  // Subsample for perf
  const points =
    (cluster_points || []).length > 600
      ? (cluster_points || []).filter(
          (_, i) => i % Math.ceil(cluster_points.length / 600) === 0,
        )
      : cluster_points || [];

  const series = buildClusterSeries(points);
  const elbowData = buildElbowData(elbow_curve);
  const totalPts = cluster_points?.length || 0;

  return (
    <div className="space-y-5">
      {/* Cluster size pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(cluster_sizes || {}).map(([k, size]) => (
          <div
            key={k}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   border border-surface-border bg-white text-xs"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: CLUSTER_COLORS[parseInt(k)] || "#888" }}
            />
            <span className="font-semibold text-text-primary">Cluster {k}</span>
            <span className="text-text-muted">
              {size} ({totalPts ? ((size / totalPts) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        ))}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                        bg-primary/10
                        border border-primary/20 text-xs"
        >
          <span className="font-semibold text-primary">
            Optimal K = {optimal_k}
          </span>
        </div>
      </div>

      {/* Cluster scatter */}
      <div
        className="
    rounded-xl border border-surface-border
    bg-surface px-4 py-2.5 text-xs text-text-secondary
  "
      >
        Optimal K is selected automatically using the elbow-distance heuristic,
        which detects the point where additional clusters provide diminishing
        improvement.
      </div>
      <div>
        <p className="label mb-2">Cluster Distribution (PCA 2-D)</p>
        <div style={{ width: "100%", height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                dataKey="x"
                name="PC1"
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="PC2"
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              />
              <Tooltip content={<ClusterTip />} />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconType="circle"
                iconSize={7}
              />
              {series.map(({ name, color, data }) => (
                <Scatter
                  key={name}
                  name={name}
                  data={data}
                  fill={color}
                  fillOpacity={0.75}
                  r={3}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Elbow curve */}
      {elbowData.length > 0 && (
        <div>
          <p className="label mb-2">Elbow Method — Inertia vs K</p>
          <div style={{ width: "100%", height: "176px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={elbowData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="k"
                  label={{
                    value: "K",
                    position: "insideRight",
                    offset: 0,
                    fontSize: 10,
                    fill: "var(--color-text-muted)",
                  }}
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                  width={50}
                  tickFormatter={(v) =>
                    v > 999 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                />
                <Tooltip content={<ElbowTip />} />
                <ReferenceLine
                  x={optimal_k}
                  stroke="#EF4444"
                  strokeDasharray="4 3"
                  label={{
                    value: `K=${optimal_k}`,
                    fontSize: 10,
                    fill: "var(--color-danger)",
                    position: "top",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="inertia"
                  name="Inertia"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-text-muted mt-1">
            Red line marks the elbow point (optimal K={optimal_k}) detected via
            perpendicular-distance heuristic.
          </p>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-3xl">🫧</span>
      <p className="text-sm text-text-muted">{msg}</p>
    </div>
  );
}
