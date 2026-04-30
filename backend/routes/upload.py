"""
SAIDAS — Upload Route
POST /api/upload

Accepts a CSV file, validates it, and returns:
  - column names
  - first 5 rows as preview
  - total row count
"""

import io
import pandas as pd

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from utils.file_handler import validate_csv_file, save_temp_file, sanitize_dataframe
from utils.response_builder import build_success_response, build_error_response

router = APIRouter()

# Maximum allowed file size: 50 MB
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

# Minimum dataset requirements
MIN_ROWS = 10
MIN_COLS = 2


@router.post("/upload", summary="Upload a CSV dataset")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file for analysis.

    Returns column names, a 5-row preview, and total row count.
    The raw file content is also returned as a JSON-serialisable list
    so the frontend can pass it directly to /process without re-uploading.
    """

    # ------------------------------------------------------------------
    # 1. Basic file-type validation
    # ------------------------------------------------------------------
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was provided.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=415,
            detail="Only CSV files are supported. Please upload a .csv file.",
        )

    # ------------------------------------------------------------------
    # 2. Read raw bytes and enforce size limit
    # ------------------------------------------------------------------
    try:
        raw_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read uploaded file: {str(exc)}",
        )

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 50 MB.",
        )

    # ------------------------------------------------------------------
    # 3. Parse CSV with pandas
    # ------------------------------------------------------------------
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="The CSV file is empty or contains no parseable data.",
        )
    except pd.errors.ParserError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"CSV parsing failed. Ensure the file is a valid CSV: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while parsing CSV: {str(exc)}",
        )

    # ------------------------------------------------------------------
    # 4. Minimum dataset size checks
    # ------------------------------------------------------------------
    if df.shape[0] < MIN_ROWS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Dataset too small. Minimum {MIN_ROWS} rows required; "
                f"your file has {df.shape[0]} row(s)."
            ),
        )

    if df.shape[1] < MIN_COLS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Dataset must have at least {MIN_COLS} columns; "
                f"your file has {df.shape[1]} column(s)."
            ),
        )

    # ------------------------------------------------------------------
    # 5. Sanitize — strip whitespace from column names and string values
    # ------------------------------------------------------------------
    df = sanitize_dataframe(df)

    # ------------------------------------------------------------------
    # 6. Save to temp_uploads/ for optional server-side reference
    # ------------------------------------------------------------------
    saved_path = save_temp_file(raw_bytes, file.filename)

    # ------------------------------------------------------------------
    # 7. Build the response payload
    # ------------------------------------------------------------------
    columns = df.columns.tolist()

    # Preview: first 5 rows, NaN → None so JSON serialisation works
    preview_df = df.head(5).where(pd.notnull(df.head(5)), other=None)
    preview_records = preview_df.to_dict(orient="records")

    # Full dataset as JSON records — sent back to client so /process
    # receives it without requiring a second file upload
    full_records = df.where(pd.notnull(df), other=None).to_dict(orient="records")

    # Column data-type map (helps frontend show smarter UI hints)
    dtype_map = {col: str(df[col].dtype) for col in columns}

    # Null counts per column (useful for frontend warnings)
    null_counts = df.isnull().sum().to_dict()

    response_data = {
        "filename": file.filename,
        "rows": int(df.shape[0]),
        "columns": columns,
        "column_count": int(df.shape[1]),
        "dtypes": dtype_map,
        "null_counts": null_counts,
        "preview": preview_records,
        "dataset": full_records,   # Full data forwarded to /process
        "saved_path": saved_path,
    }

    return build_success_response(
        data=response_data,
        message=f"File '{file.filename}' uploaded successfully.",
    )