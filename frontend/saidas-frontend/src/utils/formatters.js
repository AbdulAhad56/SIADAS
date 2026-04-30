// SAIDAS — src/utils/formatters.js
// Pure formatting helpers — no React, no side effects.

/**
 * Converts a 0–1 float to a percentage string.
 * toPercent(0.9421) → "94.21%"
 * toPercent(0.9421, 0) → "94%"
 */
export function toPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Rounds a number to N decimal places as a string.
 * toFixed(0.12345, 3) → "0.123"
 */
export function toFixed(value, decimals = 4) {
  if (value == null || isNaN(value)) return "N/A";
  return Number(value).toFixed(decimals);
}

/**
 * Formats large integers with commas.
 * formatNumber(12345) → "12,345"
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return "N/A";
  return Number(value).toLocaleString();
}

/**
 * Truncates a string to maxLen characters and appends "…" if needed.
 * shortenLabel("very_long_feature_name", 16) → "very_long_featur…"
 */
export function shortenLabel(str, maxLen = 20) {
  if (!str) return "";
  const s = String(str);
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/**
 * Returns a human-readable file size string.
 * formatBytes(1048576) → "1.00 MB"
 */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Capitalises the first letter of each word.
 * titleCase("random forest") → "Random Forest"
 */
export function titleCase(str) {
  if (!str) return "";
  return str
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}