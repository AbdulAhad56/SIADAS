"""
SAIDAS — utils/file_handler.py

Handles all file I/O concerns:
  - CSV validation
  - Temporary file saving (with collision-safe naming)
  - DataFrame sanitization (column names, whitespace, types)
"""

import os
import uuid
import hashlib
from datetime import datetime

import pandas as pd
import numpy as np


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEMP_DIR = "temp_uploads"
ALLOWED_EXTENSIONS = {".csv"}

# Columns with this many unique values or fewer are treated as categorical
CATEGORICAL_UNIQUE_THRESHOLD = 20


# ---------------------------------------------------------------------------
# Public: validate_csv_file
# ---------------------------------------------------------------------------

def validate_csv_file(filename: str, size_bytes: int) -> None:
    """
    Raises ValueError if the file extension or size is unacceptable.
    Called before reading bytes so we fail fast.
    """
    _, ext = os.path.splitext(filename.lower())

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. Only .csv files are accepted."
        )

    if size_bytes == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")


# ---------------------------------------------------------------------------
# Public: save_temp_file
# ---------------------------------------------------------------------------

def save_temp_file(raw_bytes: bytes, original_filename: str) -> str:
    """
    Saves raw CSV bytes to temp_uploads/ with a collision-safe filename.

    Naming convention:
        <timestamp>_<short_uuid>_<original_name>
    Example:
        20240501_153012_a3f2_iris.csv

    Returns the full path to the saved file.
    """
    os.makedirs(TEMP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    short_id  = str(uuid.uuid4())[:8]

    # Sanitize the original filename (remove spaces / special chars)
    safe_name = "".join(
        c if (c.isalnum() or c in "._-") else "_"
        for c in original_filename
    )

    saved_filename = f"{timestamp}_{short_id}_{safe_name}"
    saved_path     = os.path.join(TEMP_DIR, saved_filename)

    with open(saved_path, "wb") as f:
        f.write(raw_bytes)

    return saved_path


# ---------------------------------------------------------------------------
# Public: sanitize_dataframe
# ---------------------------------------------------------------------------

def sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans a raw DataFrame before any analysis:

    1. Strip leading/trailing whitespace from column names
    2. Replace empty-string column names with 'unnamed_N'
    3. Strip whitespace from all string cell values
    4. Replace pandas NA / NaN sentinels uniformly (keeps NaN for numerics)
    5. Drop fully-duplicate rows
    6. Reset index
    """

    # ── 1. Clean column names ────────────────────────────────────────────
    cleaned_columns = []
    for i, col in enumerate(df.columns):
        col_str = str(col).strip()
        if col_str == "" or col_str.lower() in ("nan", "none"):
            col_str = f"unnamed_{i}"
        cleaned_columns.append(col_str)
    df.columns = cleaned_columns

    # ── 2. Deduplicate column names (append suffix if clashes) ───────────
    seen: dict[str, int] = {}
    deduped = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            deduped.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            deduped.append(col)
    df.columns = deduped

    # ── 3. Strip whitespace from string cells ────────────────────────────
    str_cols = df.select_dtypes(include=["object"]).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
        # Re-introduce NaN for cells that were empty strings or "nan"
        df[col] = df[col].replace({"nan": np.nan, "": np.nan, "None": np.nan})

    # ── 4. Drop fully-duplicate rows ─────────────────────────────────────
    before = len(df)
    df = df.drop_duplicates()
    duplicates_removed = before - len(df)

    # ── 5. Reset index ───────────────────────────────────────────────────
    df = df.reset_index(drop=True)

    # Attach metadata as a DataFrame attribute (accessible downstream)
    df.attrs["duplicates_removed"] = duplicates_removed

    return df


# ---------------------------------------------------------------------------
# Public: get_column_summary
# ---------------------------------------------------------------------------

def get_column_summary(df: pd.DataFrame) -> list[dict]:
    """
    Returns a per-column summary list used in the /upload response.

    Each entry contains:
      - name        : column name
      - dtype       : pandas dtype string
      - null_count  : number of missing values
      - null_pct    : percentage of missing values (rounded to 2 dp)
      - unique_count: number of unique non-null values
      - is_numeric  : boolean
      - sample      : up to 5 unique sample values
    """
    summary = []
    n_rows  = len(df)

    for col in df.columns:
        series       = df[col]
        null_count   = int(series.isnull().sum())
        unique_count = int(series.nunique(dropna=True))
        is_numeric   = pd.api.types.is_numeric_dtype(series)

        sample_values = (
            series.dropna().unique()[:5].tolist()
            if not is_numeric
            else []
        )

        summary.append(
            {
                "name"        : col,
                "dtype"       : str(series.dtype),
                "null_count"  : null_count,
                "null_pct"    : round(null_count / n_rows * 100, 2) if n_rows else 0,
                "unique_count": unique_count,
                "is_numeric"  : is_numeric,
                "sample"      : sample_values,
            }
        )

    return summary


# ---------------------------------------------------------------------------
# Public: compute_file_hash
# ---------------------------------------------------------------------------

def compute_file_hash(raw_bytes: bytes) -> str:
    """
    Returns the SHA-256 hex digest of the file bytes.
    Useful for detecting duplicate uploads without storing content.
    """
    return hashlib.sha256(raw_bytes).hexdigest()


# ---------------------------------------------------------------------------
# Public: cleanup_old_temp_files
# ---------------------------------------------------------------------------

def cleanup_old_temp_files(max_age_hours: int = 24) -> int:
    """
    Deletes files from temp_uploads/ that are older than `max_age_hours`.
    Returns the number of files deleted.
    Call this from a scheduled job or on each startup.
    """
    if not os.path.exists(TEMP_DIR):
        return 0

    now_ts    = datetime.now().timestamp()
    threshold = max_age_hours * 3600
    deleted   = 0

    for fname in os.listdir(TEMP_DIR):
        fpath = os.path.join(TEMP_DIR, fname)
        try:
            file_age = now_ts - os.path.getmtime(fpath)
            if file_age > threshold:
                os.remove(fpath)
                deleted += 1
        except OSError:
            pass  # File may have already been removed

    return deleted