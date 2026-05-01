// SAIDAS — src/utils/chartHelpers.js
// Transforms raw backend JSON into Recharts-ready data structures.
// Pure functions — no React, no side effects.

import { CLUSTER_COLORS, CHART_COLORS } from "./constants";
import { shortenLabel } from "./formatters";


// ── Correlation heatmap ────────────────────────────────────────────────────

/**
 * Converts the flat correlation matrix into a list of cell objects
 * consumable by a custom SVG heatmap or Recharts ScatterChart.
 *
 * Input:  { columns: ["a","b","c"], matrix: [[1,0.8,...], ...] }
 * Output: [{ x: "a", y: "b", r: 0.8 }, ...]
 */
export function buildHeatmapCells(correlationData) {
  if (!correlationData?.columns || !correlationData?.matrix) return [];

  const { columns, matrix } = correlationData;
  const cells = [];

  columns.forEach((colX, i) => {
    columns.forEach((colY, j) => {
      cells.push({
        x    : shortenLabel(colX, 14),
        y    : shortenLabel(colY, 14),
        r    : typeof matrix[i]?.[j] === "number" ? matrix[i][j] : 0,
        xFull: colX,
        yFull: colY,
      });
    });
  });

  return cells;
}

/**
 * Maps a correlation value (−1 to 1) to an RGB colour string.
 * −1 → red, 0 → white, +1 → indigo
 */
export function correlationToColor(r) {
  const clamped = Math.max(-1, Math.min(1, r));

  if (clamped >= 0) {
    // White → Indigo
    const intensity = clamped;
    const red   = Math.round(248 - intensity * (248 - 79));
    const green = Math.round(250 - intensity * (250 - 70));
    const blue  = Math.round(252 - intensity * (252 - 229));
    return `rgb(${red},${green},${blue})`;
  } else {
    // White → Red
    const intensity = Math.abs(clamped);
    const red   = Math.round(248 + intensity * (239 - 248));
    const green = Math.round(250 - intensity * 250);
    const blue  = Math.round(252 - intensity * 252);
    return `rgb(${red},${green},${blue})`;
  }
}


// ── PCA scatter ────────────────────────────────────────────────────────────

/**
 * Groups PCA points by label and assigns a colour to each group.
 * Returns an array of series objects for Recharts ScatterChart.
 *
 * Input:  [{ x, y, label }, ...]
 * Output: [{ name: "0", color: "#4F46E5", data: [{x,y}, ...] }, ...]
 */
export function buildPCASeriesByLabel(points) {
  if (!points?.length) return [];

  const groups = {};
  points.forEach(({ x, y, label }) => {
    if (!groups[label]) groups[label] = [];
    groups[label].push({ x, y });
  });

  return Object.entries(groups).map(([label, data], i) => ({
    name  : label,
    color : CHART_COLORS[i % CHART_COLORS.length],
    data,
  }));
}


// ── Cluster scatter ────────────────────────────────────────────────────────

/**
 * Same as buildPCASeriesByLabel but uses the CLUSTER_COLORS palette
 * and the numeric cluster id as the grouping key.
 */
export function buildClusterSeries(clusterPoints) {
  if (!clusterPoints?.length) return [];

  const groups = {};
  clusterPoints.forEach(({ x, y, cluster }) => {
    const key = `Cluster ${cluster}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ x, y });
  });

  return Object.entries(groups).map(([name, data], i) => ({
    name,
    color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    data,
  }));
}


// ── Elbow curve ────────────────────────────────────────────────────────────

/**
 * Formats the elbow curve data for a Recharts LineChart.
 * Input:  [{ k: 2, inertia: 500 }, ...]
 * Output: same — already Recharts-compatible, just passed through.
 */
export function buildElbowData(elbowCurve) {
  return (elbowCurve || []).map(({ k, inertia }) => ({
    k,
    inertia: Math.round(inertia),
  }));
}


// ── Feature importance ─────────────────────────────────────────────────────

/**
 * Formats feature importance for a horizontal Recharts BarChart.
 * Input:  [{ feature, importance, rank }, ...]
 * Output: [{ name: "age", value: 0.231 }, ...] (top N, reversed for display)
 */
export function buildFeatureImportanceData(features, topN = 12) {
  if (!features?.length) return [];
  return features
    .slice(0, topN)
    .map(({ feature, importance }) => ({
      name : shortenLabel(feature, 22),
      value: importance,
      full : feature,
    }))
    .reverse(); // Recharts horizontal bars render bottom-up, so reverse for top→down visual
}


// ── Model comparison bar chart ─────────────────────────────────────────────

/**
 * Builds data for the model comparison bar chart.
 *
 * Input:  { models: [{ model, accuracy, ... }], metric_used: "accuracy" }
 * Output: [{ name: "Random Forest", value: 97.2 }, ...]
 */
export function buildModelComparisonData(comparison) {
  if (!comparison) return [];

  const data = [];

  // Case 1: backend provides models array
  if (comparison.models && Array.isArray(comparison.models)) {
    const metric = comparison.metric_used || "accuracy";
    const isAccuracy = metric === "accuracy";

    return comparison.models
      .filter((m) => m[metric] != null)
      .map((m) => ({
        name: m.model,
        value: isAccuracy
          ? parseFloat((m[metric] * 100).toFixed(2))
          : parseFloat(m[metric].toFixed(4)),
      }));
  }

  // Case 2: build manually from ML
  if (comparison.ml) {
    Object.entries(comparison.ml).forEach(([name, m]) => {
      if (m?.accuracy != null) {
        data.push({
          name,
          value: parseFloat((m.accuracy * 100).toFixed(2)),
        });
      }
    });
  }

  // Case 3: add DL model
  if (comparison.dl && !comparison.dl.error && comparison.dl.accuracy != null) {
    data.push({
      name: comparison.dl.model || "Deep Learning (MLP)",
      value: parseFloat((comparison.dl.accuracy * 100).toFixed(2)),
    });
  }

  return data;
}