// SAIDAS — src/pages/UploadPage.jsx
// Step 1: drag-and-drop CSV upload
// Step 2: dataset preview table + target column selector
// Step 3: trigger analysis pipeline → navigate to /dashboard

import { useState, useRef, useCallback } from "react";
import { useNavigate }                    from "react-router-dom";
import { useUpload }                      from "@/hooks/useUpload";
import { useAnalysis }                    from "@/hooks/useAnalysis";
import { useAnalysisContext }             from "@/context/AnalysisContext";
import { formatBytes }                    from "@/utils/formatters";

export default function UploadPage() {
  const navigate                       = useNavigate();
  const { upload, isUploading, error: uploadError } = useUpload();
  const { runAnalysis, isAnalyzing }   = useAnalysis();
  const { uploadResult }               = useAnalysisContext();

  const [isDragging,     setIsDragging]     = useState(false);
  const [selectedFile,   setSelectedFile]   = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [localError,     setLocalError]     = useState("");

  const fileInputRef = useRef(null);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setLocalError("");
    setSelectedFile(file);
    setSelectedTarget("");
    await upload(file);
  }, [upload]);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop      = (e) => {
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

  const columns = uploadResult?.columns     || [];
  const preview = uploadResult?.preview     || [];
  const rows    = uploadResult?.rows        || 0;
  const dtypes  = uploadResult?.dtypes      || {};

  // Loading overlay
  if (isAnalyzing) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-primary
                        border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary mb-1">
            Training models… please wait
          </p>
          <p className="text-sm text-text-secondary">
            Running preprocessing → data mining → ML → Deep Learning
          </p>
        </div>
        {/* Animated pipeline steps */}
        <div className="flex flex-col gap-2 mt-2 w-72">
          {[
            "Preprocessing data…",
            "Computing correlations…",
            "Training ML models…",
            "Training Deep Learning MLP…",
            "Generating insights…",
          ].map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-3 text-sm text-text-secondary"
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary
                              animate-[pulse_1.5s_ease-in-out_infinite]"
                   style={{ animationDelay: `${i * 0.3}s` }} />
              {step}
            </div>
          ))}
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
          Upload a CSV file to begin the SAIDAS analysis pipeline.
        </p>
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload file", "Preview data", "Select target", "Analyse"].map((step, i, arr) => (
          <span key={step} className="flex items-center gap-2">
            <span className={`font-medium ${
              i === 0 && !uploadResult ? "text-primary" :
              i === 1 && uploadResult && !selectedTarget ? "text-primary" :
              i === 2 && uploadResult && !selectedTarget ? "text-text-muted" :
              uploadResult && selectedTarget && i === 2 ? "text-primary" :
              "text-text-muted"
            }`}>{step}</span>
            {i < arr.length - 1 && <span className="text-text-muted">›</span>}
          </span>
        ))}
      </div>

      {/* ── Dropzone ───────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card cursor-pointer border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center gap-4 py-14 text-center
          ${isDragging
            ? "border-primary bg-primary bg-opacity-5 scale-[1.01]"
            : uploadResult
              ? "border-success bg-success/10"
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
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
          ${uploadResult
            ? "bg-green-100"
            : "bg-primary bg-opacity-10"
          }`}>
          {isUploading ? (
            <div className="w-8 h-8 border-3 border-primary
                            border-t-transparent rounded-full animate-spin" />
          ) : uploadResult ? "✅" : "📂"}
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
            <p className="text-xs text-text-muted mt-1">
              Click to replace
            </p>
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
        <div className="flex items-start gap-3 p-4 rounded-xl
                        bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="text-lg">⚠️</span>
          <p>{uploadError || localError}</p>
        </div>
      )}

      {/* ── Dataset preview ────────────────────────────────────────────── */}
      {uploadResult && columns.length > 0 && (
        <div className="card animate-[slideUp_0.3s_ease]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Dataset Preview</h2>
            <div className="flex gap-2">
              <span className="label">{rows.toLocaleString()} rows</span>
              <span className="text-text-muted">·</span>
              <span className="label">{columns.length} columns</span>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto scrollbar-thin rounded-xl border
                          border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b
                               border-surface-border">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-semibold
                                 text-text-primary whitespace-nowrap"
                    >
                      <div>{col}</div>
                      <div className="text-[10px] font-normal text-text-muted
                                      font-mono mt-0.5">
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
                        ) : String(row[col])}
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
        <div className="card animate-[slideUp_0.4s_ease]">
          <h2 className="section-title">Select Target Variable</h2>
          <p className="text-sm text-text-secondary mb-4">
            Choose the column you want to predict. SAIDAS will auto-detect
            whether this is a classification or regression task.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
            {columns.map((col) => (
              <button
                key={col}
                onClick={() => { setSelectedTarget(col); setLocalError(""); }}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left
                            border transition-all duration-150 truncate
                  ${selectedTarget === col
                    ? "border-primary bg-primary text-white shadow-(--shadow-card)"
                    : "border-surface-border bg-surface-card text-text-secondary hover:border-primary hover:text-primary"
                  }`}
                title={col}
              >
                {col}
                <span className="block text-[10px] opacity-70 font-mono mt-0.5 font-normal">
                  {dtypes[col] || ""}
                </span>
              </button>
            ))}
          </div>

          {/* Selected target info bar */}
          {selectedTarget && (
            <div className="flex items-center gap-3 p-3 rounded-xl
                            bg-primary/5
                            border border-primary/20">
              <span className="text-lg">🎯</span>
              <div className="text-sm">
                <span className="font-semibold text-primary">
                  {selectedTarget}
                </span>
                <span className="text-text-secondary ml-1">
                  selected as target variable
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Analyse button ─────────────────────────────────────────────── */}
      {uploadResult && (
        <div className="flex items-center justify-between pt-2 animate-[slideUp_0.5s_ease]">
          <button
            onClick={() => navigate("/")}
            className="btn-ghost"
          >
            ← Back to Home
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!selectedTarget || isAnalyzing}
            className="btn-primary px-8 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? "Running pipeline…" : "Analyse Dataset →"}
          </button>
        </div>
      )}

    </div>
  );
}