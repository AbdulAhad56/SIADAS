// SAIDAS — FeatureImportance.jsx
// Horizontal bar chart of top-N feature importance scores from Random Forest.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, LabelList,
} from "recharts";
import { buildFeatureImportanceData } from "@/utils/chartHelpers";

function FITip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="card py-2 px-3 text-xs shadow-(--shadow-card-lg)">
      <p className="font-semibold text-text-primary mb-1">{d.payload?.full}</p>
      <p style={{ color: "var(--color-primary)" }}>
        Importance: {(d.value * 100).toFixed(2)}%
      </p>
    </div>
  );
}

export default function FeatureImportance({ featureImportance }) {
  if (!featureImportance?.features?.length) {
    return <Empty msg="Feature importance data unavailable." />;
  }

  const data       = buildFeatureImportanceData(featureImportance.features, 14);
  const topFeature = featureImportance.top_feature;
  const total      = data.reduce((s, d) => s + d.value, 0);

  // Colour gradient: top feature gets primary, rest fade to accent
  const getColor = (index, length) => {
    const t = index / Math.max(length - 1, 1);
    return `color-mix(in srgb, var(--color-primary) ${Math.round((1 - t * 0.6) * 100)}%, var(--color-accent))`;
  };

  return (
    <div className="space-y-5">

      {/* Top feature callout */}
      {topFeature && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                        bg-primary/5
                        border border-primary/20">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs label">Most Influential Feature</p>
            <p className="font-bold text-primary text-sm">{topFeature}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs label">Importance</p>
            <p className="font-mono font-bold text-primary text-sm">
              {((featureImportance.features[0]?.importance || 0) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div style={{ width: "100%", height: Math.max(180, data.length * 32) + "px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"
              horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="name" width={130}
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<FITip />} cursor={{ fill: "rgba(79,70,229,0.04)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => `${(v * 100).toFixed(2)}%`}
                style={{ fontSize: 10, fontWeight: 600, fill: "var(--color-text-secondary)" }}
              />
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(data.length - 1 - i, data.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative importance note */}
      <div className="text-xs text-text-muted text-right">
        Top {data.length} features account for{" "}
        <span className="font-semibold text-primary">
          {(total * 100).toFixed(1)}%
        </span>{" "}
        of total importance.
      </div>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-3xl">⭐</span>
      <p className="text-sm text-text-muted">{msg}</p>
    </div>
  );
}