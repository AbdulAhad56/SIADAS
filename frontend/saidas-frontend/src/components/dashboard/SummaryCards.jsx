// SAIDAS — SummaryCards.jsx
// Four stat cards: Rows, Columns, Features, Problem Type
// Plus a preprocessing steps timeline below

import { PROBLEM_LABELS } from "@/utils/constants";

const PROBLEM_ICONS = {
  binary_classification     : { icon: "⚡", color: "var(--color-primary)" },
  multiclass_classification : { icon: "🎯", color: "var(--color-accent)"  },
  regression                : { icon: "📈", color: "var(--color-success)"  },
};

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const { rows, columns, feature_count, problem_type, preprocessing } = summary;
  const pLabel  = PROBLEM_LABELS[problem_type] || problem_type;
  const pStyle  = PROBLEM_ICONS[problem_type]  || { icon: "🔬", color: "var(--color-primary)" };

  const cards = [
    {
      label   : "Total Rows",
      value   : rows?.toLocaleString()   ?? "—",
      icon    : "🗂️",
      sub     : "data samples",
      color   : "var(--color-primary)",
      bg      : "rgba(79,70,229,0.06)",
    },
    {
      label   : "Columns",
      value   : columns ?? "—",
      icon    : "📐",
      sub     : "original columns",
      color   : "var(--color-accent)",
      bg      : "rgba(6,182,212,0.06)",
    },
    {
      label   : "Features",
      value   : feature_count ?? "—",
      icon    : "✨",
      sub     : "after encoding",
      color   : "var(--color-success)",
      bg      : "rgba(16,185,129,0.06)",
    },
    {
      label   : "Task Type",
      value   : pStyle.icon,
      icon    : null,
      sub     : pLabel,
      color   : pStyle.color,
      bg      : `color-mix(in srgb, ${pStyle.color} 8%, transparent)`,
      isType  : true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon, sub, color, bg, isType }) => (
          <div
            key={label}
            className="card flex flex-col gap-3 group
                       hover:shadow-(--shadow-card-md) transition-shadow duration-200"
          >
            {/* Icon chip */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: bg }}
            >
              {isType ? value : icon}
            </div>

            {/* Value */}
            <div>
              {isType ? (
                <p className="text-sm font-bold" style={{ color }}>{sub}</p>
              ) : (
                <>
                  <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
                  <p className="text-xs text-text-muted mt-0.5">{sub}</p>
                </>
              )}
              <p className="label mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preprocessing steps */}
      {preprocessing?.steps_applied?.length > 0 && (
        <div className="card bg-surface">
          <p className="label mb-3">Preprocessing Steps Applied</p>
          <div className="flex flex-col gap-2">
            {preprocessing.steps_applied.map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div
                  className="mt-1 w-5 h-5 rounded-full flex items-center justify-center
                             text-white text-[10px] font-bold shrink-0"
                  style={{ background: "var(--color-primary)" }}
                >
                  {i + 1}
                </div>
                <p className="text-text-secondary leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}