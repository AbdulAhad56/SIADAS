// SAIDAS — src/pages/HomePage.jsx
// Landing page: hero section, feature highlights, CTA to upload
import {
  Upload,
  Sparkles,
  Database,
  BrainCircuit,
  BarChart3,
  Lightbulb,
  Cpu,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// ── Feature card data ──────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Sparkles,
    title: "Smart Preprocessing",
    desc: "Auto-imputation, label encoding, one-hot encoding, and StandardScaler applied in one pipeline.",
  },
  {
    icon: Database,
    title: "Mining & Pattern Discovery",
    desc: "Pearson correlation heatmap, PCA scatter, K-Means clustering with elbow detection.",
  },
  {
    icon: Cpu,
    title: "ML Models",
    desc: "Logistic Regression and Random Forest trained and evaluated automatically.",
  },
  {
    icon: BrainCircuit,
    title: "Deep Learning",
    desc: "Dynamic Keras MLP with dropout, batch normalisation, and early stopping.",
  },
  {
    icon: BarChart3,
    title: "Model Comparison",
    desc: "Side-by-side accuracy / RMSE comparison across all models with best-model highlight.",
  },
  {
    icon: Lightbulb,
    title: "Auto Insights",
    desc: "Human-readable observations generated from correlation, clustering, and performance results.",
  },
];

// ── Steps ──────────────────────────────────────────────────────────────────
const STEPS = [
  { number: "01", label: "Upload CSV", desc: "Drag and drop any CSV dataset." },
  {
    number: "02",
    label: "Select Target",
    desc: "Choose the column you want to predict.",
  },
  {
    number: "03",
    label: "Run Analysis",
    desc: "SMARTMINER trains all models automatically.",
  },
  {
    number: "04",
    label: "Explore Results",
    desc: "Interactive charts, metrics, and insights.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background blobs */}
        <div
          className="absolute -top-32 -left-32 w-75 h-75 md:w-125 md:h-125 rounded-full
                        bg-primary opacity-5 blur-3xl pointer-events-none"
        />
        <div
          className="absolute -top-16 right-0 w-75 h-100 rounded-full
                        bg-accent opacity-5 blur-3xl pointer-events-none"
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-14 sm:pb-16 text-center overflow-hidden">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-primary/10
                          border border-primary border-opacity-20
                          text-primary text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Data Mining & Predictive Analytics
          </div>

          {/* Title */}
          <h1 className="text-4xl xs:text-5xl sm:text-6xl font-extrabold tracking-[-0.03em] mb-6 leading-none">
            <span className="text-gradient">SMARTMINER</span>
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-text-primary mb-3">
            AI-Powered Data Mining & Predictive Analysis Platform
          </p>

          <p
            className="text-text-secondary text-sm sm:text-base md:text-lg
                        max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            UUpload any CSV dataset and instantly generate preprocessing, data
            mining, machine learning, and deep learning insights through an
            automated AI-powered pipeline.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate("/upload")}
              className="btn-primary text-base px-8 py-3 shadow-(--shadow-card-md) hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Get Started — Upload CSV
              </span>
            </button>
            <a href="#how-it-works" className="btn-ghost text-base px-6 py-3">
              See how it works ↓
            </a>
          </div>

          {/* Stat strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {[
              { value: "3", label: "ML/DL Models" },
              { value: "4", label: "Mining Techniques" },
              { value: "Auto", label: "Preprocessing" },
              { value: "AI", label: "Insights" },
            ].map(({ value, label }) => (
              <div key={label} className="card text-center py-4 sm:py-5 px-2">
                <div className="text-xl sm:text-3xl font-extrabold text-primary mb-1 leading-tight wrap-break-words">
                  {value}
                </div>
                <div className="label text-text-secondary font-medium wrap-break-words leading-snug">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-3">
            Everything in one pipeline
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            From raw CSV to trained models and insights — fully automated.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card group
hover:-translate-y-1
hover:shadow-(--shadow-card-lg)
hover:border-primary hover:border-opacity-40
transition-all duration-300"
            >
              <div
                className="
        w-14 h-14 rounded-xl
        bg-primary/10
        flex items-center justify-center
        mb-4
        group-hover:bg-primary/15
        transition-colors
      "
              >
                <Icon className="w-7 h-7 text-primary" strokeWidth={2.2} />
              </div>

              <h3 className="font-semibold text-text-primary mb-1.5">
                {title}
              </h3>

              <p className="text-sm text-text-secondary leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="bg-surface-card border-t border-surface-border py-20"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              How it works
            </h2>
            <p className="text-text-secondary">
              Four steps from raw data to actionable insights.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div
              className="hidden sm:block absolute top-8 left-[calc(12.5%-1px)]
                            right-[calc(12.5%-1px)] h-0.5
                            bg-linear-to-r from-primary
                            to-accent opacity-20"
            />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
              {STEPS.map(({ number, label, desc }) => (
                <div
                  key={number}
                  className="flex flex-col items-center text-center relative"
                >
                  {/* Step circle */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center
                                  bg-linear-to-br from-primary
                                  to-accent text-white font-bold text-lg
                                  shadow-(--shadow-card-md) mb-4 relative z-10"
                  >
                    {number}
                  </div>
                  <h4 className="font-semibold text-text-primary mb-1">
                    {label}
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto py-14">
        <div className="card text-center py-12 px-6">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to uncover insights from your data?
          </h2>
          <p className="text-text-secondary mb-8">
            Upload a CSV file and let SMARTMINER handle the rest. No
            configuration needed.
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="btn-primary text-base px-10 py-3
                     shadow-(--shadow-card-lg)"
          >
            Upload Dataset →
          </button>
        </div>
      </section>
    </div>
  );
}
