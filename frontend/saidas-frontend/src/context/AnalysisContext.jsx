// SAIDAS — src/context/AnalysisContext.jsx
// Global state store — shared between UploadPage and DashboardPage.
//
// Stores:
//   uploadResult   → response from POST /api/upload
//                    { columns, preview, dataset, rows, dtypes, ... }
//   analysisResult → response from POST /api/process
//                    { summary, mining, models, insights, meta }
//   isAnalyzing    → true while the pipeline is running (shows spinner)
//   error          → last pipeline error string (null if none)

import { createContext, useContext, useState } from "react";

// ── Create context ─────────────────────────────────────────────────────────
const AnalysisContext = createContext(null);

// ── Provider component ─────────────────────────────────────────────────────
export function AnalysisProvider({ children }) {
  const [uploadResult,   setUploadResult]   = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing,    setIsAnalyzing]    = useState(false);
  const [error,          setError]          = useState(null);

  /** Clears all state — called when user uploads a new file */
  const reset = () => {
    setUploadResult(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setError(null);
  };

  const value = {
    // State
    uploadResult,
    analysisResult,
    isAnalyzing,
    error,

    // Setters (used by hooks, not components directly)
    setUploadResult,
    setAnalysisResult,
    setIsAnalyzing,
    setError,

    // Actions
    reset,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

// ── Custom hook — use this in any component ────────────────────────────────
export function useAnalysisContext() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error(
      "useAnalysisContext must be used inside <AnalysisProvider>. " +
      "Make sure main.jsx wraps the app with <AnalysisProvider>."
    );
  }
  return ctx;
}