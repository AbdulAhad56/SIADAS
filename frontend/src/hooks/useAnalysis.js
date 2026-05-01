// SAIDAS — src/hooks/useAnalysis.js
// Manages the POST /api/process pipeline call.
// Reads dataset from context, posts it, stores results back in context.

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeDataset } from "@/api/saidas";
import { useAnalysisContext } from "@/context/AnalysisContext";

export function useAnalysis() {
  const {
    uploadResult,
    setAnalysisResult,
    setIsAnalyzing,
    setError,
    isAnalyzing,
    analysisResult,
    error,
  } = useAnalysisContext();

  const navigate = useNavigate();

  /**
   * Triggers the full SAIDAS pipeline.
   * Navigates to /dashboard on success.
   *
   * @param {string} target — the column name chosen by the user
   * @returns {Promise<void>}
   */
  const runAnalysis = useCallback(async (target) => {
    if (!uploadResult?.dataset) {
      setError("No dataset found. Please upload a CSV file first.");
      return;
    }

    if (!target) {
      setError("Please select a target column before running analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeDataset(uploadResult.dataset, target);
      setAnalysisResult(result);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.message || "Analysis failed. Please try again.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadResult, setAnalysisResult, setIsAnalyzing, setError, navigate]);

  return {
    runAnalysis,
    isAnalyzing,
    analysisResult,
    error,
  };
}