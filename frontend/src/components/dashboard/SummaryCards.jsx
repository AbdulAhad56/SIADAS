// SAIDAS — SummaryCards.jsx
// Four stat cards: Rows, Columns, Features, Problem Type
// Plus a preprocessing steps timeline below

import { PROBLEM_LABELS } from "@/utils/constants";
import {
  Database,
  Columns3,
  ChartNoAxesColumn,
  BadgeCheck,
  Binary,
  Target,
  TrendingUp,
} from "lucide-react";

const PROBLEM_ICONS = {
  binary_classification: {
    icon: Binary,
    color: "var(--color-primary)",
  },

  multiclass_classification: {
    icon: Target,
    color: "var(--color-accent)",
  },

  regression: {
    icon: TrendingUp,
    color: "var(--color-success)",
  },
};

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const {
    rows,
    columns,
    feature_count,
    problem_type,
    preprocessing,
    missing_values = 0,
    columns_with_missing = 0,
  } = summary;
  const pLabel = PROBLEM_LABELS[problem_type] || problem_type;
  const pStyle = PROBLEM_ICONS[problem_type] || {
    icon: Database,
    color: "var(--color-primary)",
  };

  const cards = [
    {
      label: "Total Rows",
      value: rows?.toLocaleString() ?? "—",
      icon: Database,
      sub: "data samples",
      color: "var(--color-primary)",
      bg: "rgba(79,70,229,0.06)",
    },
    {
      label: "Columns",
      value: columns ?? "—",
      icon: Columns3,
      sub: "original columns",
      color: "var(--color-accent)",
      bg: "rgba(6,182,212,0.06)",
    },
    {
      label: "Features",
      value: feature_count ?? "—",
      icon: ChartNoAxesColumn,
      sub: "after encoding",
      color: "var(--color-success)",
      bg: "rgba(16,185,129,0.06)",
    },
    {
      label: "Missing Values",
      value: missing_values?.toLocaleString() ?? "0",
      icon: missing_values > 0 ? Target : BadgeCheck,
      sub:
        missing_values > 0
          ? `${columns_with_missing} columns affected`
          : "no missing values",
      color:
        missing_values > 0 ? "var(--color-warning)" : "var(--color-success)",
      bg:
        missing_values > 0 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
    },
    {
      label: "Task Type",
      value: pStyle.icon,
      icon: null,
      sub: pLabel,
      color: pStyle.color,
      bg: `color-mix(in srgb, ${pStyle.color} 8%, transparent)`,
      isType: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
  {cards.map(({ label, value, icon, sub, color, bg, isType }) => (
    <div
      key={label}
      className="
card

min-h-[150px]
sm:min-h-[170px]
xl:min-h-[210px]

p-4 md:p-5

flex flex-col
items-center text-center
xl:items-start xl:text-left

gap-4

rounded-3xl

hover:-translate-y-1
hover:shadow-lg

transition-all duration-300
"
    >
      {/* Icon chip */}
      <div
        className="
w-10 h-10
md:w-12 md:h-12

rounded-2xl
flex items-center justify-center
"
        style={{ background: bg }}
      >
        {(() => {
          const Icon = isType ? value : icon;

          return (
            <Icon
              className="w-5 h-5 md:w-6 md:h-6"
              strokeWidth={2.3}
              style={{ color }}
            />
          );
        })()}
      </div>

      {/* Content */}
      <div className="w-full">
        {isType ? (
          <p
            className="
text-base md:text-lg
font-bold
leading-tight
"
            style={{ color }}
          >
            {sub}
          </p>
        ) : (
          <>
            <p
              className="
text-3xl md:text-4xl
font-black tracking-tight
"
              style={{ color }}
            >
              {value}
            </p>

            <p className="text-xs text-text-muted mt-1">
              {sub}
            </p>
          </>
        )}

        <p className="label mt-3 tracking-wide uppercase">
          {label}
        </p>
      </div>
    </div>
  ))}
</div>

      {/* Preprocessing steps */}
      {preprocessing?.steps_applied?.length > 0 && (
        <div className="card bg-surface rounded-3xl
    border border-slate-100
    shadow-sm">
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
