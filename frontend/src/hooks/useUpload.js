// SAIDAS — src/hooks/useUpload.js
// Manages the full file-upload flow:
//   file selection → validation → POST /api/upload → store result in context

import { useState, useCallback } from "react";
import { uploadFile } from "@/api/saidas";
import { useAnalysisContext } from "@/context/AnalysisContext";

// Client-side limits (mirrors backend guards)
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE    = MAX_FILE_SIZE_MB * 1024 * 1024;

export function useUpload() {
  const { setUploadResult, setError, reset } = useAnalysisContext();

  const [isUploading, setIsUploading] = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [localError,  setLocalError]  = useState(null);

  /**
   * Validates and uploads a File object.
   * Stores the result in AnalysisContext on success.
   *
   * @param {File} file
   * @returns {Promise<boolean>} — true on success, false on failure
   */
  const upload = useCallback(async (file) => {
    // ── Client-side validation ─────────────────────────────────────
    if (!file) {
      setLocalError("No file selected.");
      return false;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setLocalError("Only CSV files are accepted. Please select a .csv file.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }

    // ── Reset previous state ───────────────────────────────────────
    reset();
    setLocalError(null);
    setProgress(0);
    setIsUploading(true);

    try {
      const result = await uploadFile(file, setProgress);
      setUploadResult(result);
      setProgress(100);
      return true;
    } catch (err) {
      const msg = err.message || "Upload failed. Please try again.";
      setLocalError(msg);
      setError(msg);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [reset, setUploadResult, setError]);

  /** Clears only the local upload error */
  const clearError = useCallback(() => setLocalError(null), []);

  return {
    upload,
    isUploading,
    progress,
    error: localError,
    clearError,
  };
}