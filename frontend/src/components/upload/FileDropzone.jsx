// SAIDAS — components/upload/FileDropzone.jsx
//
// Drag-and-drop CSV uploader.
// Props:
//   onUploadSuccess(result)  — called with the /upload API response
//   onUploadError(message)   — called with error string
//   disabled                 — disables interaction while pipeline is running

import { useState, useRef, useCallback } from "react";
import { uploadFile }                     from "@/api/saidas";
import { formatBytes }                    from "@/utils/formatters";

const MAX_SIZE_MB    = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Upload state machine
const STATE = {
  IDLE      : "idle",
  DRAGGING  : "dragging",
  UPLOADING : "uploading",
  SUCCESS   : "success",
  ERROR     : "error",
};

export default function FileDropzone({
  onUploadSuccess,
  onUploadError,
  disabled = false,
}) {
  const [status,   setStatus]   = useState(STATE.IDLE);
  const [progress, setProgress] = useState(0);
  const [file,     setFile]     = useState(null);   // the selected File object
  const [errMsg,   setErrMsg]   = useState("");

  const inputRef = useRef(null);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (f) => {
    if (!f)                                    return "No file selected.";
    if (!f.name.toLowerCase().endsWith(".csv")) return "Only .csv files are accepted.";
    if (f.size === 0)                          return "The file is empty (0 bytes).";
    if (f.size > MAX_SIZE_BYTES)               return `File too large — max ${MAX_SIZE_MB} MB.`;
    return null;
  };

  // ── Core upload handler ─────────────────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    const validationError = validate(f);
    if (validationError) {
      setStatus(STATE.ERROR);
      setErrMsg(validationError);
      onUploadError?.(validationError);
      return;
    }

    setFile(f);
    setStatus(STATE.UPLOADING);
    setProgress(0);
    setErrMsg("");

    try {
      const result = await uploadFile(f, (pct) => setProgress(pct));
      setStatus(STATE.SUCCESS);
      setProgress(100);
      onUploadSuccess?.(result);
    } catch (err) {
      const msg = err.message || "Upload failed. Please try again.";
      setStatus(STATE.ERROR);
      setErrMsg(msg);
      onUploadError?.(msg);
    }
  }, [onUploadSuccess, onUploadError]);

  // ── Drag events ─────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setStatus(STATE.DRAGGING); };
  const onDragLeave = (e) => { e.preventDefault(); setStatus(status === STATE.SUCCESS ? STATE.SUCCESS : STATE.IDLE); };
  const onDrop      = (e) => {
    e.preventDefault();
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
    else setStatus(STATE.IDLE);
  };

  // ── Input change ────────────────────────────────────────────────────────
  const onInputChange = (e) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
    // Reset input so same file can be re-selected after an error
    e.target.value = "";
  };

  // ── Reset to idle ────────────────────────────────────────────────────────
  const reset = (e) => {
    e.stopPropagation();
    setStatus(STATE.IDLE);
    setFile(null);
    setProgress(0);
    setErrMsg("");
  };

  // ── Derived styles ──────────────────────────────────────────────────────
  const borderStyle = {
    [STATE.IDLE]      : "border-[var(--color-surface-border)] hover:border-[var(--color-primary)]",
    [STATE.DRAGGING]  : "border-[var(--color-primary)] scale-[1.015]",
    [STATE.UPLOADING] : "border-[var(--color-accent)] cursor-not-allowed",
    [STATE.SUCCESS]   : "border-[var(--color-success)]",
    [STATE.ERROR]     : "border-[var(--color-danger)]",
  }[status];

  const bgStyle = {
    [STATE.IDLE]      : "bg-white",
    [STATE.DRAGGING]  : "bg-[var(--color-primary)] bg-opacity-[0.03]",
    [STATE.UPLOADING] : "bg-[var(--color-surface)]",
    [STATE.SUCCESS]   : "bg-green-50",
    [STATE.ERROR]     : "bg-red-50",
  }[status];

  return (
    <div className="w-full space-y-3">
      {/* ── Drop zone ────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="CSV file upload dropzone"
        onClick={() => !disabled && status !== STATE.UPLOADING && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "relative w-full rounded-2xl border-2 border-dashed",
          "flex flex-col items-center justify-center gap-4 py-14 px-6 text-center",
          "transition-all duration-200 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          borderStyle,
          bgStyle,
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled || status === STATE.UPLOADING}
        />

        {/* ── Icon ─────────────────────────────────────────────────── */}
        <DropzoneIcon status={status} progress={progress} />

        {/* ── Body text ────────────────────────────────────────────── */}
        <DropzoneText
          status={status}
          file={file}
          errMsg={errMsg}
          maxSizeMb={MAX_SIZE_MB}
        />

        {/* ── Progress bar (uploading) ──────────────────────────────── */}
        {status === STATE.UPLOADING && (
          <div className="w-64 h-1.5 bg-surface-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width     : `${progress}%`,
                background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
              }}
            />
          </div>
        )}

        {/* ── Replace / retry hint ─────────────────────────────────── */}
        {(status === STATE.SUCCESS || status === STATE.ERROR) && !disabled && (
          <button
            onClick={reset}
            className="mt-1 text-xs text-text-muted
                       hover:text-primary underline
                       underline-offset-2 transition-colors"
          >
            {status === STATE.SUCCESS ? "Click to replace file" : "Try a different file"}
          </button>
        )}
      </div>

      {/* ── File metadata strip (success) ────────────────────────── */}
      {status === STATE.SUCCESS && file && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                        bg-green-50 border border-green-200 text-sm">
          <span className="text-base">📄</span>
          <span className="font-medium text-green-800 truncate flex-1">{file.name}</span>
          <span className="text-green-600 shrink-0 font-mono text-xs">
            {formatBytes(file.size)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function DropzoneIcon({ status, progress }) {
  const wrapCls = "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl";

  if (status === STATE.UPLOADING) {
    return (
      <div className={`${wrapCls} bg-accent bg-opacity-10 relative`}>
        {/* Spinning ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin"
             viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none"
            stroke="var(--color-accent)" strokeOpacity="0.2" strokeWidth="4" />
          <circle cx="32" cy="32" r="28" fill="none"
            stroke="var(--color-accent)" strokeWidth="4"
            strokeDasharray={`${progress * 1.759} 175.9`}
            strokeLinecap="round" />
        </svg>
        <span className="relative text-sm font-bold text-accent">
          {progress}%
        </span>
      </div>
    );
  }

  const map = {
    [STATE.IDLE]    : { emoji: "📂", bg: "bg-[var(--color-primary)] bg-opacity-10" },
    [STATE.DRAGGING]: { emoji: "📥", bg: "bg-[var(--color-primary)] bg-opacity-15" },
    [STATE.SUCCESS] : { emoji: "✅", bg: "bg-green-100" },
    [STATE.ERROR]   : { emoji: "⚠️", bg: "bg-red-100"  },
  };

  const { emoji, bg } = map[status] || map[STATE.IDLE];
  return <div className={`${wrapCls} ${bg}`}>{emoji}</div>;
}

function DropzoneText({ status, file, errMsg, maxSizeMb }) {
  if (status === STATE.UPLOADING) {
    return (
      <div>
        <p className="font-semibold text-text-primary">Uploading…</p>
        <p className="text-sm text-text-secondary mt-0.5">
          Parsing <span className="font-medium">{file?.name}</span>
        </p>
      </div>
    );
  }

  if (status === STATE.SUCCESS) {
    return (
      <div>
        <p className="font-semibold text-success">Upload successful!</p>
        <p className="text-sm text-text-secondary mt-0.5">
          Dataset is ready — scroll down to select a target column.
        </p>
      </div>
    );
  }

  if (status === STATE.ERROR) {
    return (
      <div>
        <p className="font-semibold text-danger">Upload failed</p>
        <p className="text-sm text-red-600 mt-0.5 max-w-xs">{errMsg}</p>
      </div>
    );
  }

  if (status === STATE.DRAGGING) {
    return (
      <div>
        <p className="font-semibold text-primary">Drop to upload</p>
        <p className="text-sm text-text-secondary mt-0.5">Release to start uploading</p>
      </div>
    );
  }

  // Idle default
  return (
    <div className="space-y-1">
      <p className="font-semibold text-text-primary">
        Drag & drop your CSV file here
      </p>
      <p className="text-sm text-text-secondary">
        or{" "}
        <span className="text-primary font-medium underline underline-offset-2">
          click to browse
        </span>
      </p>
      <p className="text-xs text-text-muted mt-1">
        .csv only · max {maxSizeMb} MB · min 10 rows
      </p>
    </div>
  );
}