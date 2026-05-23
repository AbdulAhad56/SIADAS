// SAIDAS — ModelPerformance.jsx
// Fixed: explicit px heights for Recharts containers (avoids Tailwind v4 timing issue)
// Fixed: SVG fill/stroke use hardcoded hex — CSS vars only work in style={}, not SVG attrs

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { CircleStar } from "lucide-react";
import { buildModelComparisonData } from "@/utils/chartHelpers";

// ── Hardcoded hex palette for SVG attributes ──────────────────────────────
// CSS custom properties (var(--color-*)) do NOT resolve inside SVG fill/stroke
// attributes — they only work in CSS `style` properties. Use hex here always.
const HEX = {
  primary: "#4F46E5",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  violet: "#8B5CF6",
  border: "#E2E8F0",
  textMuted: "#94A3B8",
  textSub: "#475569",
};

// Ordered palette for multi-model bars
const BAR_COLORS = [HEX.accent, HEX.violet, HEX.warning, HEX.success];

// Card accent colours (used in HTML style={}, so CSS vars work fine here)
const CARD_COLORS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-warning)",
  "var(--color-success)",
];

// ── Tooltip ───────────────────────────────────────────────────────────────
function BarTip({ active, payload, label, isClf }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="card py-2 px-3 text-xs"
      style={{ boxShadow: "var(--shadow-card-lg)" }}
    >
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      <p style={{ color: "var(--color-primary)" }}>
        {isClf ? "Accuracy" : "RMSE"}: {payload[0]?.value}
        {isClf ? "%" : ""}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ModelPerformance({
  comparison,
  mlResults,
  dlResults,
  problemType,
}) {
  if (!comparison?.models?.length) {
    return <Empty msg="No model results available." />;
  }

  const isClf = problemType?.includes("classification");
  const data = buildModelComparisonData(comparison);
  const best = comparison.best_model;

  return (
    <div className="space-y-8">
      {/* ── Comparison bar chart ─────────────────────────────────────── */}
      <div>
        <p className="label mb-4">
          {isClf ? "Accuracy (%)" : "RMSE"} Comparison — All Models
        </p>

        {data.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">
            Chart data unavailable.
          </p>
        ) : (
          /* FIX 1: explicit px height — Recharts measures DOM before Tailwind v4 injects classes */
          <div style={{ width: "100%", height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 24, right: 24, left: 0, bottom: 8 }}
                barCategoryGap="40%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  /* FIX 2: hardcoded hex for SVG stroke — CSS vars don't work in SVG attrs */
                  stroke={HEX.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: HEX.textSub }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={isClf ? [0, 100] : ["auto", "auto"]}
                  tick={{ fontSize: 10, fill: HEX.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (isClf ? `${v}%` : v)}
                />
                <Tooltip
                  content={<BarTip isClf={isClf} />}
                  cursor={{ fill: "rgba(79,70,229,0.05)" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v) => (isClf ? `${v}%` : v)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: HEX.textSub,
                    }}
                  />
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      /* Best model = full primary, others = palette at 75% opacity */
                      fill={
                        entry.name === best
                          ? HEX.primary
                          : BAR_COLORS[i % BAR_COLORS.length]
                      }
                      fillOpacity={entry.name === best ? 1 : 0.72}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Best performing model callout */}
        {best && (
          <div
            className="mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 hover:-translate-y-1
hover:shadow-md
hover:border-slate-300

transition-all duration-300"
            style={{
              background: "rgba(79,70,229,0.05)",
              borderColor: "rgba(79,70,229,0.15)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: "rgba(79,70,229,0.12)",
              }}
            >
              <CircleStar className="w-7 h-7 text-primary" strokeWidth={2.3} />
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">
                Best Performing Model
              </span>

              <span className="text-sm font-bold text-primary">{best}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Per-model metric cards ──────────────────────────────────── */}
      <div>
        <p className="label mb-3">Detailed Metrics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(mlResults || {}).map(([name, metrics], i) => (
            <ModelCard
              key={name}
              name={name}
              metrics={metrics}
              isClf={isClf}
              isBest={name === best}
              accentColor={CARD_COLORS[i]}
            />
          ))}
          {dlResults && !dlResults.error && (
            <ModelCard
              name={dlResults.model || "Deep Learning (MLP)"}
              metrics={dlResults}
              isClf={isClf}
              isBest={
                dlResults.model === best || "Deep Learning (MLP)" === best
              }
              accentColor="var(--color-warning)"
            />
          )}
        </div>
      </div>

      {/* ── DL training history ─────────────────────────────────────── */}
      {dlResults?.history?.epochs?.length > 0 && (
        <div>
          <p className="label mb-3">
            Deep Learning Training History{" "}
            <span className="normal-case font-normal text-text-muted">
              ({dlResults.epochs_trained} epochs, early stopping)
            </span>
          </p>

          {/* FIX 1 applied here too */}
          <div style={{ width: "100%", height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dlResults.history.epochs.map((ep, i) => ({
                  epoch: ep,
                  loss: dlResults.history.loss?.[i],
                  val_loss: dlResults.history.val_loss?.[i],
                }))}
                margin={{ top: 5, right: 24, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={HEX.border} />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 9, fill: HEX.textMuted }}
                  label={{
                    value: "Epoch",
                    position: "insideBottomRight",
                    offset: -4,
                    fontSize: 9,
                    fill: HEX.textMuted,
                  }}
                />
                <YAxis tick={{ fontSize: 9, fill: HEX.textMuted }} width={42} />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: `1px solid ${HEX.border}`,
                  }}
                  formatter={(v) => v?.toFixed(4)}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {/* FIX 2: hex stroke for SVG Line elements */}
                <Line
                  type="monotone"
                  dataKey="loss"
                  name="Train Loss"
                  stroke={HEX.primary}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: HEX.primary }}
                />
                <Line
                  type="monotone"
                  dataKey="val_loss"
                  name="Val Loss"
                  stroke={HEX.danger}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: HEX.danger }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Per-model card ────────────────────────────────────────────────────────
function ModelCard({ name, metrics, isClf, isBest, accentColor }) {
  if (!metrics || metrics.error) {
    return (
      <div className="card border-dashed opacity-60">
        <p className="text-sm font-semibold text-text-primary mb-1">{name}</p>
        <p className="text-xs text-danger">Training failed</p>
      </div>
    );
  }

  return (
    <div
      className="card relative overflow-hidden transition-shadow duration-200
                 hover:shadow-(--shadow-card-md)"
      style={
        isBest
          ? {
              borderColor: "rgba(79,70,229,0.45)",
              boxShadow: "0 0 0 3px rgba(79,70,229,0.08)",
            }
          : {}
      }
    >
      {isBest && (
        <span
          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5
                     rounded-full text-white"
          style={{ background: "var(--color-primary)" }}
        >
          Best
        </span>
      )}

      {/* Colour accent bar — uses style={} so CSS vars work fine */}
      <div
        className="h-1 w-12 rounded-full mb-4"
        style={{ background: accentColor }}
      />

      <p className="text-sm font-bold text-text-primary mb-4 pr-10">{name}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        {isClf ? (
          <>
            <Metric
              label="Accuracy"
              value={`${(metrics.accuracy * 100).toFixed(2)}%`}
              highlight
            />
            <Metric label="F1 Score" value={metrics.f1_score?.toFixed(4)} />
            <Metric label="Precision" value={metrics.precision?.toFixed(4)} />
            <Metric label="Recall" value={metrics.recall?.toFixed(4)} />
          </>
        ) : (
          <>
            <Metric label="RMSE" value={metrics.rmse?.toFixed(4)} highlight />
            <Metric label="R²" value={metrics.r2?.toFixed(4)} />
            <Metric label="MAE" value={metrics.mae?.toFixed(4)} />
          </>
        )}
      </div>

      {/* Confusion matrix (binary classification) */}
      {isClf && metrics.confusion_matrix?.length === 2 && (
        <div className="mt-4 pt-3 border-t border-surface-border">
          <p className="label mb-2">Confusion Matrix</p>
          <div className="grid grid-cols-2 gap-1 w-fit">
            {metrics.confusion_matrix.flat().map((v, i) => (
              <div
                key={i}
                className="w-11 h-11 flex items-center justify-center
                           rounded-lg text-sm font-bold text-white"
                style={{
                  background: i === 0 || i === 3 ? HEX.primary : HEX.danger,
                  opacity: i === 0 || i === 3 ? 1 : 0.75,
                }}
              >
                {v}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-text-muted">
            <span>↖ TP / TN</span>
            <span style={{ color: HEX.danger }}>↗ FP / FN</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">
        {label}
      </p>
      <p
        className="font-mono font-semibold"
        style={{
          color: highlight
            ? "var(--color-primary)"
            : "var(--color-text-primary)",
        }}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-3xl">📊</span>
      <p className="text-sm text-text-muted">{msg}</p>
    </div>
  );
}
