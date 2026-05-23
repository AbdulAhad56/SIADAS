// SAIDAS — src/pages/UploadPage.jsx
// Step 1: drag-and-drop CSV upload
// Step 2: dataset preview table + target column selector
// Step 3: trigger analysis pipeline → navigate to /dashboard

import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "@/hooks/useUpload";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAnalysisContext } from "@/context/AnalysisContext";
import { formatBytes } from "@/utils/formatters";
import TargetSelector from "@/components/upload/TargetSelector";

export default function UploadPage() {
  const navigate = useNavigate();
  const { upload, isUploading, error: uploadError } = useUpload();
  const { runAnalysis, isAnalyzing } = useAnalysis();
  const { uploadResult } = useAnalysisContext();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [localError, setLocalError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  const fileInputRef = useRef(null);

  // ── Pipeline step progression ────────────────────────────────────────────
  const pipelineSteps = [
    "Preprocessing data…",
    "Computing correlations…",
    "Training ML models…",
    "Training Deep Learning (MLP)…",
    "Generating insights…",
  ];

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < pipelineSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    return () => clearInterval(stepInterval);
  }, [isAnalyzing, pipelineSteps.length]);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setLocalError("");
      setSelectedFile(file);
      setSelectedTarget("");
      await upload(file);
    },
    [upload],
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Run analysis ─────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedTarget) {
      setLocalError("Please select a target column before continuing.");
      return;
    }
    setLocalError("");
    await runAnalysis(selectedTarget);
  };

  const columns = uploadResult?.columns || [];
  const preview = uploadResult?.preview || [];
  const rows = uploadResult?.rows || 0;
  const dtypes = uploadResult?.dtypes || {};
  const uniqueCounts = uploadResult?.unique_counts || {};

  // Loading overlay
  if (isAnalyzing) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <div
          className="w-12 h-12 border-4 border-primary
                        border-t-transparent rounded-full animate-spin"
        />
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary mb-1">
            Running analysis pipeline
          </p>
          <p className="text-sm text-text-secondary">
            Running Preprocessing → Data Mining → ML → Deep Learning (MLP)
          </p>
        </div>
        {/* Animated pipeline steps */}
        <div className="flex flex-col gap-3 mt-4 w-80">
          {pipelineSteps.map((step, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            const isUpcoming = i > currentStep;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isUpcoming ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isCompleted ? (
                    <span className="text-success text-base">✓</span>
                  ) : isActive ? (
                    <div
                      className="w-2 h-2 rounded-full bg-primary
                                  animate-[pulse_1.5s_ease-in-out_infinite]"
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                  )}
                </div>
                <span
                  className={`${
                    isActive
                      ? "text-text-primary font-medium"
                      : "text-text-secondary"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8 animate-[fadeIn_0.35s_ease]">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1">
          Upload Dataset
        </h1>
        <p className="text-text-secondary">
          Upload a CSV file to begin the SMARTMINER analysis pipeline.
        </p>
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload file", "Preview data", "Select target", "Analyse"].map(
          (step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  i === 0 && !uploadResult
                    ? "text-primary"
                    : i === 1 && uploadResult && !selectedTarget
                      ? "text-primary"
                      : i === 2 && uploadResult && !selectedTarget
                        ? "text-text-muted"
                        : uploadResult && selectedTarget && i === 2
                          ? "text-primary"
                          : "text-text-muted"
                }`}
              >
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-text-muted">›</span>}
            </span>
          ),
        )}
      </div>

      {/* ── Dropzone ───────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card cursor-pointer border-2 border-dashed shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300
          flex flex-col items-center justify-center gap-4 py-10 text-center
          ${
            isDragging
              ? "border-primary bg-primary bg-opacity-5 scale-[1.01]"
              : uploadResult
                ? "border-emerald-400 bg-emerald-50"
                : "border-surface-border hover:border-primary"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />

        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center
  ${
    isUploading
      ? "bg-primary/10"
      : uploadResult
        ? "bg-emerald-100 shadow-sm"
        : "bg-primary"
  }`}
        >
          {isUploading ? (
            <div
              className="w-8 h-8 border-3 border-primary
                            border-t-transparent rounded-full animate-spin"
            />
          ) : uploadResult ? (
            <CheckCircle2
              className="w-10 h-10 text-emerald-600"
              strokeWidth={2.4}
            />
          ) : (
            <UploadCloud
              className="w-10 h-10"
              strokeWidth={2.2}
              style={{ color: "white" }}
            />
          )}
        </div>

        {/* Text */}
        {isUploading ? (
          <div>
            <p className="font-semibold text-text-primary">Uploading…</p>
            <p className="text-sm text-text-secondary">
              Reading and parsing your CSV file
            </p>
          </div>
        ) : uploadResult ? (
          <div>
            <p className="font-semibold text-success">
              ✓ {uploadResult.filename}
            </p>
            <p className="text-sm text-text-secondary">
              {rows.toLocaleString()} rows · {columns.length} columns ·{" "}
              {selectedFile && formatBytes(selectedFile.size)}
            </p>
            <p className="text-xs text-text-muted mt-1">Click to replace</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-text-primary">
              Drag & drop your CSV here
            </p>
            <p className="text-sm text-text-secondary mt-1">
              or click to browse — max 50 MB
            </p>
          </div>
        )}
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {(uploadError || localError) && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl
                        bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{uploadError || localError}</p>
        </div>
      )}

      {/* ── Dataset preview ────────────────────────────────────────────── */}
      {uploadResult && columns.length > 0 && (
        <div className="card shadow-sm hover:shadow-md transition-all duration-300 animate-[slideUp_0.3s_ease]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Dataset Preview</h2>
            <div className="flex gap-2">
              <span className="label">{rows.toLocaleString()} rows</span>
              <span className="text-text-muted">·</span>
              <span className="label">{columns.length} columns</span>
            </div>
          </div>

          {/* Scrollable table */}
          <div
            className="overflow-x-auto scrollbar-thin rounded-xl border
                          border-surface-border"
          >
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr
                  className="bg-surface border-b
                               border-surface-border"
                >
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-semibold
                                 text-text-primary whitespace-nowrap"
                    >
                      <div>{col}</div>
                      <div
                        className="text-[10px] font-normal text-text-muted
                                      font-mono mt-0.5"
                      >
                        {dtypes[col] || ""}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-b border-surface-border
                      ${ri % 2 === 0 ? "bg-surface-card" : "bg-surface"}`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2.5 text-text-secondary
                                   whitespace-nowrap font-mono text-xs"
                      >
                        {row[col] == null ? (
                          <span className="text-text-muted italic">null</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-muted mt-3">
            Showing first {preview.length} of {rows.toLocaleString()} rows
          </p>
        </div>
      )}

      {/* ── Target column selector ─────────────────────────────────────── */}
      {uploadResult && columns.length > 0 && (
        <div className="animate-[slideUp_0.4s_ease] shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
          <TargetSelector
            columns={columns}
            dtypes={dtypes}
            nullCounts={{}}
            uniqueCounts={uniqueCounts}
            value={selectedTarget}
            onChange={(col) => {
              setSelectedTarget(col);
              setLocalError("");
            }}
          />
        </div>
      )}
      {/* ── Analyse button ─────────────────────────────────────────────── */}
      {uploadResult && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 animate-[slideUp_0.5s_ease]">
          <button onClick={() => navigate("/")} className="btn-ghost">
            ← Back to Home
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!selectedTarget || isAnalyzing}
            className="btn-primary px-8 py-3 text-base hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? "Running pipeline…" : "Analyse Dataset →"}
          </button>
        </div>
      )}
    </div>
  );
}
