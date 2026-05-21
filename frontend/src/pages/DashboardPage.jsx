// SAIDAS — src/pages/DashboardPage.jsx
// Main results dashboard: reads analysisResult from context and
// renders every section. Guards against missing data with a redirect.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalysisContext } from "@/context/AnalysisContext";
import { PROBLEM_LABELS } from "@/utils/constants";

// ── Existing dashboard components (unchanged) ─────────────────────────────
import SummaryCards from "@/components/dashboard/SummaryCards";
import CorrelationHeatmap from "@/components/dashboard/CorrelationHeatmap";
import PCAScatterPlot from "@/components/dashboard/PCAScatterPlot";
import ClusterPlot from "@/components/dashboard/ClusterPlot";
import ModelPerformance from "@/components/dashboard/ModelPerformance";
import FeatureImportance from "@/components/dashboard/FeatureImportance";
import InsightsPanel from "@/components/dashboard/InsightsPanel";

// ── New components ────────────────────────────────────────────────────────
import AssociationRules from "@/components/dashboard/AssociationRules";
import OutlierSummary from "@/components/dashboard/OutlierSummary";

// ── Sidebar nav (two new entries added at the end) ────────────────────────
const NAV_SECTIONS = [
  { id: "section-summary", label: "Summary", icon: "📋" },
  { id: "section-correlation", label: "Correlation", icon: "🔥" },
  { id: "section-pca", label: "PCA", icon: "🎯" },
  { id: "section-clusters", label: "Clusters", icon: "🫧" },
  { id: "section-models", label: "Model Performance", icon: "📊" },
  { id: "section-features", label: "Feature Importance", icon: "⭐" },
  { id: "section-association", label: "Association Rules", icon: "🔗" }, // NEW
  { id: "section-outliers", label: "Outlier Detection", icon: "🔍" }, // NEW
  { id: "section-insights", label: "Insights", icon: "💡" },
];

function scrollTo(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { analysisResult, uploadResult, reset } = useAnalysisContext();

  // Guard: if no analysis data, send back to upload
  useEffect(() => {
    if (!analysisResult) navigate("/upload", { replace: true });
  }, [analysisResult, navigate]);

  if (!analysisResult) return null;

  const { summary, mining, models, insights, meta } = analysisResult;
  const problemLabel =
    PROBLEM_LABELS[summary?.problem_type] || summary?.problem_type;

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Sticky sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-screen
                        bg-white border-r border-surface-border
                        py-6 overflow-y-auto scrollbar-thin"
      >
        {/* Logo */}
        <div className="px-5 mb-6">
          <span className="text-xl font-extrabold text-gradient">SAIDAS</span>
          <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
            Analysis Dashboard
          </p>
        </div>

        {/* Dataset pill */}
        {uploadResult?.filename && (
          <div
            className="mx-4 mb-4 px-3 py-2 rounded-lg bg-surface
                          border border-surface-border"
          >
            <p className="text-[10px] label mb-0.5">Dataset</p>
            <p className="text-xs font-medium text-text-primary truncate">
              {uploadResult.filename}
            </p>
            <p className="text-[10px] text-text-muted">
              {summary?.rows?.toLocaleString()} rows · {summary?.feature_count}{" "}
              features
            </p>
          </div>
        )}

        {/* Problem type badge */}
        <div
          className="mx-4 mb-5 px-3 py-1.5 rounded-lg text-center text-xs font-semibold
                        bg-primary/10
                        text-primary
                        border border-primary/20"
        >
          {problemLabel}
        </div>

        {/* Section navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_SECTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                         text-text-secondary hover:bg-surface
                         hover:text-primary transition-colors duration-150 text-left"
            >
              <span>{icon}</span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-4 mt-4 space-y-2">
          <button
            onClick={() => {
              reset();
              navigate("/upload");
            }}
            className="w-full btn-secondary text-xs py-2 px-3"
          >
            ↑ New Analysis
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full btn-ghost text-xs py-2 px-3"
          >
            ← Home
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-xl font-extrabold text-gradient">SAIDAS</span>
          <button
            onClick={() => {
              reset();
              navigate("/upload");
            }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            New Analysis
          </button>
        </div>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-start justify-between gap-4
                        animate-[fadeIn_0.3s_ease]"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Analysis Results
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Target:{" "}
              <span className="font-semibold text-primary">
                {summary?.target}
              </span>
              {" · "}
              {problemLabel}
              {meta?.pipeline_duration_seconds && (
                <span className="text-text-muted ml-2">
                  · completed in {meta.pipeline_duration_seconds}s
                </span>
              )}
            </p>
          </div>

          {/* Best model badge */}
          {models?.comparison?.best_model && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                            bg-success/10
                            border border-success/30"
            >
              <span>🏆</span>
              <div className="text-sm">
                <p className="text-[10px] label text-success">
                  Best Performing Model
                </p>
                <p className="font-semibold text-success leading-none">
                  {models.comparison.best_model}
                </p>
              </div>
            </div>
          )}
        </div>
        {/* ── A: Summary Cards ─────────────────────────────────────────── */}
        <section
          id="section-summary"
          className="scroll-mt-6 animate-[slideUp_0.30s_ease]"
        >
          <h2 className="section-title">📋 Dataset Summary</h2>
          <SummaryCards summary={summary} />
        </section>
        <div className="divider" />
        {/* ── B: Correlation Heatmap ───────────────────────────────────── */}
        <section
          id="section-correlation"
          className="scroll-mt-6 animate-[slideUp_0.33s_ease]"
        >
          <h2 className="section-title">🔥 Correlation Heatmap</h2>
          <div className="card">
            <CorrelationHeatmap correlation={mining?.correlation} />
          </div>
        </section>
        <div className="divider" />
        {/* ── C: PCA + Clusters side-by-side ──────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section
            id="section-pca"
            className="scroll-mt-6 animate-[slideUp_0.36s_ease]"
          >
            <h2 className="section-title">🎯 PCA Scatter Plot</h2>
            <div className="card h-full">
              <PCAScatterPlot pca={mining?.pca} />
            </div>
          </section>

          <section
            id="section-clusters"
            className="scroll-mt-6 animate-[slideUp_0.36s_ease]"
          >
            <h2 className="section-title">🫧 Cluster Visualisation</h2>
            <div className="card h-full">
              <ClusterPlot clustering={mining?.clustering} />
            </div>
          </section>
        </div>
        <div className="divider" />
        {/* ── D: Model Performance ─────────────────────────────────────── */}
        <section
          id="section-models"
          className="scroll-mt-6 animate-[slideUp_0.39s_ease]"
        >
          <h2 className="section-title">📊 Model Performance</h2>
          <div className="card">
            <ModelPerformance
              comparison={models?.comparison}
              mlResults={models?.ml}
              dlResults={models?.dl}
              problemType={summary?.problem_type}
            />
          </div>
        </section>
        <div className="divider" />
        {/* ── E: Feature Importance ────────────────────────────────────── */}
        <section
          id="section-features"
          className="scroll-mt-6 animate-[slideUp_0.42s_ease]"
        >
          <h2 className="section-title">⭐ Feature Importance</h2>
          <div className="card">
            <FeatureImportance featureImportance={mining?.feature_importance} />
          </div>
        </section>
        <div className="divider" />
        {/* ── F: Association Rules ─────────────────────────────────────── */}{" "}
        {/* NEW */}
        <section
          id="section-association"
          className="scroll-mt-6 animate-[slideUp_0.45s_ease]"
        >
          <h2 className="section-title">🔗 Association Rules</h2>
          <div className="card">
            <AssociationRules data={mining?.association_rules} />
          </div>
        </section>
        <div className="divider" />
        {/* ── G: Outlier Detection ─────────────────────────────────────── */}{" "}
        {/* NEW */}
        <section
          id="section-outliers"
          className="scroll-mt-6 animate-[slideUp_0.48s_ease]"
        >
          <h2 className="section-title">🔍 Outlier Detection</h2>
          <div className="card">
            <OutlierSummary data={mining?.outliers} />
          </div>
        </section>
        <div className="divider" />
        {/* ── H: Insights ──────────────────────────────────────────────── */}
        <section
          id="section-insights"
          className="scroll-mt-6 animate-[slideUp_0.51s_ease]"
        >
          <h2 className="section-title">💡 Auto-Generated Insights</h2>
          <InsightsPanel insights={insights} />
        </section>
        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="pt-8 pb-4 text-center">
          <p className="text-xs text-text-muted">
            SAIDAS · Semi-Automated Intelligent Data Analysis System
          </p>
        </footer>
      </main>
    </div>
  );
}
