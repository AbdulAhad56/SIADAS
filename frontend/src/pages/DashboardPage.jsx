// SAIDAS — src/pages/DashboardPage.jsx
// Main results dashboard: reads analysisResult from context and
// renders every section. Guards against missing data with a redirect.

import {
  FileText,
  LayoutGrid,
  Orbit,
  CircleDot,
  Network,
  ChartColumn,
  ChartNoAxesColumn,
  CircleStar,
  TriangleAlert,
  Lightbulb,
  GitBranch,
} from "lucide-react";
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
  { id: "section-summary", label: "Summary", icon: FileText },
  { id: "section-correlation", label: "Correlation", icon: LayoutGrid },
  { id: "section-pca", label: "PCA", icon: Orbit },
  { id: "section-clusters", label: "Clusters", icon: Network },
  { id: "section-models", label: "Model Performance", icon: ChartColumn },
  {
    id: "section-features",
    label: "Feature Importance",
    icon: ChartNoAxesColumn,
  },
  { id: "section-association", label: "Association Rules", icon: GitBranch }, // NEW
  { id: "section-outliers", label: "Outlier Detection", icon: TriangleAlert }, // NEW
  { id: "section-insights", label: "Insights", icon: Lightbulb },
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
        className="
hidden lg:flex flex-col
fixed left-0 top-18.25
w-75 h-[calc(100vh-73px)]
shrink-0

bg-surface
border-r border-slate-200

px-6 py-7
overflow-y-auto scrollbar-thin
"
      >
        {/* Logo */}
        <div className="px-5 mb-6">
          <span className="text-lg sm:text-xl font-extrabold text-gradient">
            SMARTMINER
          </span>
          <p className="text-[12px] text-text-muted mt-0.5 leading-tight">
            Analysis Dashboard
          </p>
        </div>

        {/* Dataset pill */}
        {uploadResult?.filename && (
          <div
            className="mx-4 mb-4 px-3 py-2 rounded-lg bg-primary/5
                        border border-primary/20"
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
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer
                         text-text-secondary hover:bg-surface
                         hover:text-primary transition-colors duration-150 text-left"
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 py-6 sm:px-5 lg:px-6 space-y-8 lg:ml-75">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-xl font-extrabold text-gradient">
            SMARTMINER
          </span>
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
              {" • "}
              {problemLabel}
              {meta?.pipeline_duration_seconds && (
                <span className="text-text-muted ml-2">
                  • Completed in {meta.pipeline_duration_seconds}s
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
              <div
                className="
    w-14 h-14 rounded-xl
    bg-success
    flex items-center justify-center
    shrink-0
  "
              >
                <CircleStar className="w-7 h-7 text-white" strokeWidth={2.3} />
              </div>
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
          className="scroll-mt-20 animate-[slideUp_0.30s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Dataset Summary
          </h2>
          <SummaryCards summary={summary} />
        </section>
        <div className="divider" />
        {/* ── B: Correlation Heatmap ───────────────────────────────────── */}
        <section
          id="section-correlation"
          className="scroll-mt-20 animate-[slideUp_0.33s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Correlation Heatmap
          </h2>
          <div className="card">
            <CorrelationHeatmap correlation={mining?.correlation} />
          </div>
        </section>
        <div className="divider" />
        {/* ── C: PCA + Clusters side-by-side ──────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section
            id="section-pca"
            className="scroll-mt-20  animate-[slideUp_0.36s_ease]"
          >
            <h2 className="section-title flex items-center gap-2">
              <Orbit className="w-5 h-5 text-primary" />
              PCA Scatter Plot
            </h2>
            <div className="card h-full">
              <PCAScatterPlot pca={mining?.pca} />
            </div>
          </section>

          <section
            id="section-clusters"
            className="scroll-mt-20 mt-10 xl:mt-0 animate-[slideUp_0.36s_ease]"
          >
            <h2 className="section-title flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              Cluster Visualisation
            </h2>
            <div className="card h-full">
              <ClusterPlot clustering={mining?.clustering} />
            </div>
          </section>
        </div>
        <div className="divider" />
        {/* ── D: Model Performance ─────────────────────────────────────── */}
        <section
          id="section-models"
          className="scroll-mt-20 animate-[slideUp_0.39s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <ChartColumn className="w-5 h-5 text-primary" />
            Model Performance
          </h2>
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
          className="scroll-mt-20 animate-[slideUp_0.42s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <ChartNoAxesColumn className="w-5 h-5 text-primary" />
            Feature Importance
          </h2>
          <div className="card">
            <FeatureImportance featureImportance={mining?.feature_importance} />
          </div>
        </section>
        <div className="divider" />
        {/* ── F: Association Rules ─────────────────────────────────────── */}{" "}
        {/* NEW */}
        <section
          id="section-association"
          className="scroll-mt-20 animate-[slideUp_0.45s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Association Rules
          </h2>
          <div className="card">
            <AssociationRules data={mining?.association_rules} />
          </div>
        </section>
        <div className="divider" />
        {/* ── G: Outlier Detection ─────────────────────────────────────── */}{" "}
        {/* NEW */}
        <section
          id="section-outliers"
          className="scroll-mt-20 animate-[slideUp_0.48s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-primary" />
            Outlier Detection
          </h2>
          <div className="card">
            <OutlierSummary data={mining?.outliers} />
          </div>
        </section>
        <div className="divider" />
        {/* ── H: Insights ──────────────────────────────────────────────── */}
        <section
          id="section-insights"
          className="scroll-mt-20 animate-[slideUp_0.51s_ease]"
        >
          <h2 className="section-title flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Auto-Generated Insights
          </h2>
          <InsightsPanel insights={insights} />
        </section>
      </main>
    </div>
  );
}
