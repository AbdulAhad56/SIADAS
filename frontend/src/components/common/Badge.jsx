// SAIDAS — Badge.jsx
// Small pill badge for labels like "Classification", "Regression", "Best".
const VARIANTS = {
  primary  : { bg: "rgba(79,70,229,0.10)",  color: "var(--color-primary)",  border: "rgba(79,70,229,0.25)"  },
  accent   : { bg: "rgba(6,182,212,0.10)",  color: "var(--color-accent)",   border: "rgba(6,182,212,0.25)"  },
  success  : { bg: "rgba(16,185,129,0.10)", color: "var(--color-success)",  border: "rgba(16,185,129,0.25)" },
  warning  : { bg: "rgba(245,158,11,0.10)", color: "var(--color-warning)",  border: "rgba(245,158,11,0.25)" },
  danger   : { bg: "rgba(239,68,68,0.10)",  color: "var(--color-danger)",   border: "rgba(239,68,68,0.25)"  },
  neutral  : { bg: "rgba(100,116,139,0.08)", color: "#64748B",              border: "rgba(100,116,139,0.2)" },
};

export default function Badge({ label, variant = "primary", className = "" }) {
  const s = VARIANTS[variant] || VARIANTS.primary;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                  border ${className}`}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {label}
    </span>
  );
}