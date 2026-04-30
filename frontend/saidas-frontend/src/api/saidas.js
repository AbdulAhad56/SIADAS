// SAIDAS — src/api/saidas.js
// Central API module — all backend calls live here.
// Components and hooks import from this file only; no raw fetch() anywhere.

import axios from "axios";

// ── Axios instance ─────────────────────────────────────────────────────────
// Base URL reads from .env (VITE_API_BASE_URL) or defaults to the Vite proxy.
// In development the Vite proxy forwards /api → http://localhost:8000/api
// so we can leave baseURL as "" and let the proxy handle it.

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 300_000, // 5 minutes — DL training can be slow on CPU
  headers: {
    Accept: "application/json",
  },
});

// ── Response interceptor — unwrap the SAIDAS envelope ─────────────────────
// Every successful response from our backend has shape:
//   { status: "success", message: "...", data: { ... }, timestamp: "..." }
// We unwrap `.data.data` so callers get the payload directly.

api.interceptors.response.use(
  (response) => {
    // HTTP 2xx — return the inner `data` payload
    const body = response.data;
    if (body && body.status === "success" && "data" in body) {
      return body.data;
    }
    // Partial result (206)
    if (body && body.status === "partial") {
      return { ...body.data, _warnings: body.warnings };
    }
    return response.data;
  },
  (error) => {
    // HTTP error — extract the detail message from our error envelope
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(detail));
  }
);


// ── API functions ──────────────────────────────────────────────────────────

/**
 * POST /api/upload
 * Uploads a CSV file and returns column metadata + preview rows.
 *
 * @param {File} file — the File object from the file input / dropzone
 * @param {Function} onProgress — optional (0–100) progress callback
 * @returns {Promise<object>} — { columns, preview, dataset, rows, dtypes, ... }
 */
export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    },
  });
}

/**
 * POST /api/process
 * Sends the full dataset + chosen target column to run the SAIDAS pipeline.
 *
 * @param {Array<object>} dataset — list of row dicts (from upload response)
 * @param {string}        target  — name of the target column
 * @returns {Promise<object>} — { summary, mining, models, insights, meta }
 */
export async function analyzeDataset(dataset, target) {
  return api.post("/api/process", { dataset, target });
}

export default api;