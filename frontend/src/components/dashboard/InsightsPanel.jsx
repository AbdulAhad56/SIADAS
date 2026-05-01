// SAIDAS — InsightsPanel.jsx
// Categorised, styled insight cards with icons and colour coding.

const INSIGHT_RULES = [
  { match: ["correlation", "correlated", "r ="],    icon: "🔗", color: "var(--color-accent)",   bg: "rgba(6,182,212,0.06)"   },
  { match: ["pca", "principal component", "variance"], icon: "🎯", color: "var(--color-primary)", bg: "rgba(79,70,229,0.06)"  },
  { match: ["cluster", "k-means", "segment"],        icon: "🫧",  color: "#8B5CF6",              bg: "rgba(139,92,246,0.06)" },
  { match: ["feature", "influential", "importance"], icon: "⭐", color: "#F59E0B",              bg: "rgba(245,158,11,0.06)" },
  { match: ["deep learning", "mlp", "epoch"],        icon: "🧠", color: "#EC4899",              bg: "rgba(236,72,153,0.06)" },
  { match: ["accuracy", "rmse", "r²", "best model", "outperform"], icon: "🏆", color: "var(--color-success)", bg: "rgba(16,185,129,0.06)" },
  { match: ["imputed", "encoded", "preprocessed", "split", "scaled"], icon: "🧹", color: "#64748B", bg: "rgba(100,116,139,0.06)" },
];

function getStyle(text) {
  const lower = text.toLowerCase();
  for (const rule of INSIGHT_RULES) {
    if (rule.match.some((kw) => lower.includes(kw))) return rule;
  }
  return { icon: "💡", color: "var(--color-primary)", bg: "rgba(79,70,229,0.06)" };
}

export default function InsightsPanel({ insights }) {
  if (!insights?.length) {
    return (
      <div className="card flex flex-col items-center py-12 gap-3">
        <span className="text-4xl">💡</span>
        <p className="text-sm text-text-muted">No insights generated.</p>
      </div>
    );
  }

  // Group by category icon for visual clustering
  const tagged = insights.map((text) => ({ text, style: getStyle(text) }));

  return (
    <div className="space-y-3">
      {/* Summary count strip */}
      <div className="flex flex-wrap gap-2 text-xs mb-1">
        {[...new Set(tagged.map((t) => t.style.icon))].map((icon) => {
          const count = tagged.filter((t) => t.style.icon === icon).length;
          return (
            <span key={icon}
              className="px-2.5 py-1 rounded-full border border-surface-border
                         bg-white text-text-secondary font-medium">
              {icon} {count}
            </span>
          );
        })}
        <span className="px-2.5 py-1 rounded-full border border-surface-border
                         bg-white text-text-secondary font-medium ml-auto">
          {insights.length} total insights
        </span>
      </div>

      {/* Insight cards */}
      {tagged.map(({ text, style }, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-xl border border-surface-border
                     bg-white hover:shadow-(--shadow-card) transition-shadow duration-200
                     animate-[fadeIn_0.3s_ease]"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          {/* Icon chip */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{ background: style.bg }}
          >
            {style.icon}
          </div>

          {/* Text */}
          <div className="flex-1 flex items-center">
            <p className="text-sm text-text-secondary leading-relaxed">
              {/* Highlight numbers in the insight */}
              {text.split(/(\d+\.?\d*%?|\|r\|[^)]+\)|r\s*=\s*[-+]?\d+\.?\d*)/g).map((part, j) =>
                /\d/.test(part) ? (
                  <span key={j} className="font-semibold font-mono" style={{ color: style.color }}>
                    {part}
                  </span>
                ) : part
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}