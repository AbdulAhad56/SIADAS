"""
SAIDAS — utils/response_builder.py

Enforces a consistent JSON response envelope across all endpoints:

Success shape
─────────────
{
  "status"    : "success",
  "message"   : "...",
  "data"      : { ... },
  "timestamp" : "2024-05-01T15:30:00.123456"
}

Error shape
───────────
{
  "status"  : "error",
  "error"   : "error_code",
  "detail"  : "Human-readable description",
  "timestamp": "..."
}
"""

from datetime import datetime, timezone
from typing import Any

from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Internal: _now_iso
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    """Returns current UTC time as an ISO-8601 string."""
    return datetime.now(tz=timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Public: build_success_response
# ---------------------------------------------------------------------------

def build_success_response(
    data: Any,
    message: str = "Request completed successfully.",
    status_code: int = 200,
) -> JSONResponse:
    """
    Wraps any payload in the standard SAIDAS success envelope.

    Parameters
    ----------
    data        : The actual payload (dict, list, or scalar).
    message     : Human-readable status message shown in UI.
    status_code : HTTP status code (default 200).

    Returns
    -------
    FastAPI JSONResponse with the envelope applied.
    """
    body = {
        "status"    : "success",
        "message"   : message,
        "data"      : data,
        "timestamp" : _now_iso(),
    }
    return JSONResponse(content=body, status_code=status_code)


# ---------------------------------------------------------------------------
# Public: build_error_response
# ---------------------------------------------------------------------------

def build_error_response(
    error: str,
    detail: str,
    status_code: int = 400,
) -> JSONResponse:
    """
    Wraps an error into the standard SAIDAS error envelope.

    Parameters
    ----------
    error       : Machine-readable error code, e.g. "invalid_target_column".
    detail      : Human-readable explanation shown to the user.
    status_code : HTTP status code (default 400).

    Returns
    -------
    FastAPI JSONResponse with the error envelope applied.
    """
    body = {
        "status"    : "error",
        "error"     : error,
        "detail"    : detail,
        "timestamp" : _now_iso(),
    }
    return JSONResponse(content=body, status_code=status_code)


# ---------------------------------------------------------------------------
# Public: build_partial_response
# ---------------------------------------------------------------------------

def build_partial_response(
    data: Any,
    warnings: list[str],
    message: str = "Request completed with warnings.",
    status_code: int = 206,
) -> JSONResponse:
    """
    Used when the pipeline completes but with non-fatal issues
    (e.g. DL training failed but ML results are available).

    Returns HTTP 206 Partial Content with a 'warnings' list.
    """
    body = {
        "status"    : "partial",
        "message"   : message,
        "warnings"  : warnings,
        "data"      : data,
        "timestamp" : _now_iso(),
    }
    return JSONResponse(content=body, status_code=status_code)


# ---------------------------------------------------------------------------
# Public: build_validation_error_response
# ---------------------------------------------------------------------------

def build_validation_error_response(
    field: str,
    detail: str,
) -> JSONResponse:
    """
    Shorthand for input-validation failures (HTTP 422).

    Example:
        build_validation_error_response(
            field="target",
            detail="Column 'label' not found in dataset."
        )
    """
    body = {
        "status"    : "error",
        "error"     : "validation_error",
        "field"     : field,
        "detail"    : detail,
        "timestamp" : _now_iso(),
    }
    return JSONResponse(content=body, status_code=422)


# ---------------------------------------------------------------------------
# Public: build_pipeline_error_response
# ---------------------------------------------------------------------------

def build_pipeline_error_response(
    stage: str,
    detail: str,
    partial_data: Any = None,
) -> JSONResponse:
    """
    Used when a specific pipeline stage fails hard.

    Parameters
    ----------
    stage        : Name of the failed stage, e.g. "data_mining".
    detail       : Exception message or description.
    partial_data : Any results collected before the failure (optional).
    """
    body = {
        "status"       : "error",
        "error"        : "pipeline_error",
        "failed_stage" : stage,
        "detail"       : detail,
        "partial_data" : partial_data,
        "timestamp"    : _now_iso(),
    }
    return JSONResponse(content=body, status_code=500)


# ---------------------------------------------------------------------------
# Public: serialize_numpy
# ---------------------------------------------------------------------------

def serialize_numpy(obj: Any) -> Any:
    """
    Recursively converts numpy/pandas types to native Python types
    so they can be safely JSON-serialized.

    Use this before passing any numpy-heavy dict to build_success_response().

    Example:
        data = serialize_numpy({"accuracy": np.float32(0.943)})
        # → {"accuracy": 0.943}
    """
    import numpy as np

    if isinstance(obj, dict):
        return {k: serialize_numpy(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [serialize_numpy(i) for i in obj]

    if isinstance(obj, np.integer):
        return int(obj)

    if isinstance(obj, np.floating):
        return float(obj)

    if isinstance(obj, np.ndarray):
        return obj.tolist()

    if isinstance(obj, np.bool_):
        return bool(obj)

    # pandas Timestamp → ISO string
    try:
        import pandas as pd
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
    except ImportError:
        pass

    return obj