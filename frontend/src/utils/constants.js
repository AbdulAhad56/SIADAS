// SAIDAS — src/utils/constants.js
// Single source of truth for app-wide constants.

// ── API ────────────────────────────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// ── Chart colour palette ───────────────────────────────────────────────────
// Consistent across all Recharts components
export const CHART_COLORS = [
  "#4F46E5", // primary   — Indigo-600
  "#06B6D4", // accent    — Cyan-500
  "#10B981", // success   — Emerald-500
  "#F59E0B", // warning   — Amber-500
  "#EF4444", // danger    — Red-500
  "#8B5CF6", // violet    — Purple-500
  "#EC4899", // pink      — Pink-500
  "#14B8A6", // teal      — Teal-500
];

// Heatmap colour scale (low → high correlation)
export const HEATMAP_COLORS = {
  negative : "#EF4444", // red   — strong negative correlation
  neutral  : "#F8FAFC", // white — near-zero correlation
  positive : "#4F46E5", // indigo — strong positive correlation
};

// Cluster colours (up to 8 clusters)
export const CLUSTER_COLORS = [
  "#4F46E5", "#06B6D4", "#10B981",
  "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6",
];

// ── Model display names ────────────────────────────────────────────────────
export const MODEL_LABELS = {
  "Logistic Regression" : "Logistic Regression",
  "Ridge Regression"    : "Ridge Regression",
  "Random Forest"       : "Random Forest",
  "Deep Learning (MLP)" : "Deep Learning (MLP)",
};

// ── Problem type labels ────────────────────────────────────────────────────
export const PROBLEM_LABELS = {
  binary_classification     : "Binary Classification",
  multiclass_classification : "Multi-class Classification",
  regression                : "Regression",
};

// ── File upload constraints ────────────────────────────────────────────────
export const MAX_FILE_SIZE_MB   = 50;
export const ACCEPTED_FILETYPES = [".csv", "text/csv"];

// ── Dashboard section IDs — used for scroll-to links in Navbar ────────────
export const SECTION_IDS = {
  summary    : "section-summary",
  correlation: "section-correlation",
  pca        : "section-pca",
  clusters   : "section-clusters",
  models     : "section-models",
  features   : "section-features",
  insights   : "section-insights",
};