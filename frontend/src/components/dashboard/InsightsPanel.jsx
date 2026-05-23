// SAIDAS — InsightsPanel.jsx
// Categorised, styled insight cards with icons and colour coding.
import {
  Database,
  CheckCircle2,
  TrendingUp,
  Info,
  CircleDot,
  Network,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";

const INSIGHT_RULES = [
  {
    match: ["correlation", "correlated", "r ="],
    icon: TrendingUp,
    color: "#F97316",
  },

  {
    match: ["pca", "principal component", "variance"],
    icon: TrendingUp,
    color: "var(--color-primary)",
  },

  {
    match: ["cluster", "k-means", "segment"],
    icon: Network,
    color: "#9333EA",
  },

  {
    match: ["feature", "influential", "importance"],
    icon: Info,
    color: "#2563EB",
  },

  {
    match: ["deep learning", "mlp", "epoch"],
    icon: Lightbulb,
    color: "#EC4899",
  },

  {
    match: ["accuracy", "rmse", "r²", "best model", "outperform"],
    icon: CheckCircle2,
    color: "#16A34A",
  },

  {
    match: ["imputed", "encoded", "preprocessed", "split", "scaled"],
    icon: Database,
    color: "#2563EB",
  },

  {
    match: ["removal", "< 1%", "candidate"],
    icon: ShieldAlert,
    color: "#EF4444",
  },
];

function getStyle(text) {
  const lower = text.toLowerCase();
  for (const rule of INSIGHT_RULES) {
    if (rule.match.some((kw) => lower.includes(kw))) return rule;
  }
  return {
    icon: Lightbulb,
    color: "var(--color-primary)",
  };
}

export default function InsightsPanel({ insights }) {
  if (!insights?.length) {
    return (
      <div className="card flex flex-col items-center py-16 gap-5 rounded-3xl border border-slate-100 bg-white">
        <div
          className="
      w-16 h-16 rounded-2xl
      bg-primary/10
      flex items-center justify-center
    "
        >
          <Lightbulb className="w-8 h-8 text-primary" strokeWidth={2.2} />
        </div>

        <p className="text-sm text-text-muted">No insights generated.</p>
      </div>
    );
  }

  // Group by category icon for visual clustering
  const tagged = insights.map((text) => ({ text, style: getStyle(text) }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Insight cards */}
      {tagged.map(({ text, style }, i) => (
        <div
          key={i}
          className="
flex items-start gap-3.5
px-6 py-5 rounded-2xl
border border-slate-200
bg-white
hover:border-slate-300
hover:shadow-md
hover:-translate-y-0.5
transition-all duration-200
animate-[fadeIn_0.3s_ease]
"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          {/* Icon chip */}
          <div
  className="
    w-7 h-7
    flex items-center justify-center
    shrink-0 mt-0.5
  "
>
            <style.icon
              className="w-5 h-5"
              strokeWidth={2.2}
              style={{ color: style.color }}
            />
          </div>

          {/* Text */}
          <div className="flex-1 flex items-center">
            <p className="text-sm text-text-secondary leading-relaxed">
              {/* Highlight numbers in the insight */}
              {text
                .split(/(\d+\.?\d*%?|\|r\|[^)]+\)|r\s*=\s*[-+]?\d+\.?\d*)/g)
                .map((part, j) =>
                  /\d/.test(part) ? (
                    <span
                      key={j}
                      className="font-bold font-mono"
                      style={{ color: style.color }}
                    >
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
