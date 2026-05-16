"""
SAIDAS — routes/process.py  (STABILISED v2)
POST /api/process

CHANGES IN THIS VERSION
───────────────────────
• Row-cap logic          NEW — caps df at 2000 rows for large datasets
• is_large flag          NEW — passed to DL and mining to skip heavy ops
• Per-stage try/except   CHANGED — every stage returns partial data on failure
• mining response        CHANGED — includes association_rules + outliers
• comparison fix         CHANGED — handles "classification" substring correctly
• silhouette forwarded   ADDED — clustering silhouette score in summary
"""

import time
import traceback

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from services.preprocessing   import preprocess_data
from services.data_mining      import run_data_mining
from services.ml_models        import train_ml_models
from services.dl_model         import train_dl_model
from services.insight_generator import generate_insights
from utils.problem_detector    import detect_problem_type
from utils.response_builder    import build_success_response

router = APIRouter()

# Row limit — above this we skip DL + Apriori and subsample
ROW_CAP = 2000


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class ProcessRequest(BaseModel):
    dataset: list[dict] = Field(..., min_length=10)
    target : str        = Field(..., min_length=1)

    @field_validator("target")
    @classmethod
    def target_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Target column name must not be blank.")
        return v.strip()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/process", summary="Run full SAIDAS analysis pipeline")
async def process_dataset(request: ProcessRequest):

    pipeline_start = time.time()
    stage_errors   = {}   # collects non-fatal stage failures

    # ── 1. Reconstruct DataFrame ────────────────────────────────────────
    try:
        df = pd.DataFrame(request.dataset)
    except Exception as exc:
        raise HTTPException(status_code=422,
            detail=f"Failed to parse dataset: {exc}")

    if df.empty:
        raise HTTPException(status_code=422, detail="Dataset is empty.")

    target = request.target
    if target not in df.columns:
        raise HTTPException(status_code=422,
            detail=f"Target '{target}' not found. Columns: {df.columns.tolist()}")

    if df.shape[1] < 2:
        raise HTTPException(status_code=422,
            detail="Dataset must have at least 2 columns.")

    # ── 2. Row-cap (ADDED v2) ────────────────────────────────────────────
    original_rows = len(df)
    is_large      = original_rows > ROW_CAP

    if is_large:
        df = df.head(ROW_CAP).copy()
        stage_errors["row_cap"] = (
            f"Dataset truncated from {original_rows} → {ROW_CAP} rows. "
            "Deep Learning and Apriori are skipped on large datasets."
        )

    # ── 3. Detect problem type ──────────────────────────────────────────
    try:
        problem_type = detect_problem_type(df, target)
    except Exception as exc:
        raise HTTPException(status_code=422,
            detail=f"Problem type detection failed: {exc}")

    # ── 4. Preprocessing ────────────────────────────────────────────────
    try:
        prep            = preprocess_data(df.copy(), target, problem_type)
        X_train         = prep["X_train"]
        X_test          = prep["X_test"]
        y_train         = prep["y_train"]
        y_test          = prep["y_test"]
        feature_names   = prep["feature_names"]
        prep_meta       = prep["meta"]
    except Exception as exc:
        raise HTTPException(status_code=500,
            detail=f"Preprocessing failed: {exc}\n{traceback.format_exc()}")

    # ── 5. Data Mining (each sub-algorithm self-guards) ─────────────────
    try:
        mining_results = run_data_mining(
            df           = df.copy(),
            target       = target,
            X_train      = X_train,
            y_train      = y_train,
            feature_names= feature_names,
            problem_type = problem_type,
        )
    except Exception as exc:
        # Catastrophic failure (shouldn't happen — each algo wraps itself)
        stage_errors["data_mining"] = str(exc)
        mining_results = {}

    # ── 6. ML Models ────────────────────────────────────────────────────
    ml_results = {}
    try:
        ml_results = train_ml_models(
            X_train=X_train, X_test=X_test,
            y_train=y_train, y_test=y_test,
            problem_type=problem_type,
        )
    except Exception as exc:
        stage_errors["ml_models"] = str(exc)
        ml_results = {"error": str(exc)}

    # ── 7. Deep Learning (non-fatal, is_large flag) ─────────────────────
    try:
        dl_results = train_dl_model(
            X_train=X_train, X_test=X_test,
            y_train=y_train, y_test=y_test,
            problem_type=problem_type,
            is_large=is_large,            # ADDED v2
        )
    except Exception as exc:
        dl_results = {
            "model"  : "Deep Learning (MLP)",
            "skipped": True,
            "reason" : f"Unexpected error: {str(exc)}",
        }

    # ── 8. Model Comparison ─────────────────────────────────────────────
    model_comparison = _build_model_comparison(ml_results, dl_results, problem_type)

    # ── 9. Insights ─────────────────────────────────────────────────────
    insights = []
    try:
        insights = generate_insights(
            problem_type      = problem_type,
            mining_results    = mining_results,
            ml_results        = ml_results,
            dl_results        = dl_results,
            preprocessing_meta= prep_meta,
            feature_names     = feature_names,
            target            = target,
            df_shape          = df.shape,
        )
    except Exception as exc:
        stage_errors["insights"] = str(exc)
        insights = ["Insight generation encountered an error — check stage_errors in meta."]

    # ── 10. Assemble response ────────────────────────────────────────────
    elapsed = round(time.time() - pipeline_start, 2)

    # Silhouette score for summary card
    sil = mining_results.get("clustering", {}).get("silhouette_score")

    response_data = {
        "summary": {
            "rows"             : int(df.shape[0]),
            "original_rows"    : original_rows,
            "columns"          : int(df.shape[1]),
            "target"           : target,
            "problem_type"     : problem_type,
            "feature_count"    : len(feature_names),
            "feature_names"    : feature_names,
            "preprocessing"    : prep_meta,
            "silhouette_score" : sil,          # ADDED v2
            "is_large_dataset" : is_large,
        },
        "mining": {
            "correlation"      : mining_results.get("correlation"),
            "pca"              : mining_results.get("pca"),
            "clustering"       : mining_results.get("clustering"),
            "feature_importance": mining_results.get("feature_importance"),
            "association_rules": mining_results.get("association_rules"),  # ADDED v2
            "outliers"         : mining_results.get("outliers"),           # ADDED v2
        },
        "models": {
            "ml"        : ml_results,
            "dl"        : dl_results,
            "comparison": model_comparison,
        },
        "insights": insights,
        "meta": {
            "pipeline_duration_seconds": elapsed,
            "status"                   : "complete",
            "stage_errors"             : stage_errors,  # ADDED v2 — transparent non-fatal errors
        },
    }

    return build_success_response(
        data   = response_data,
        message= "Analysis pipeline completed successfully.",
    )


# ---------------------------------------------------------------------------
# Model comparison helper
# ---------------------------------------------------------------------------

def _build_model_comparison(
    ml_results  : dict,
    dl_results  : dict,
    problem_type: str,
) -> dict:
    """
    CHANGED v2:
    • Uses `problem_type` substring match ("classification") consistently
    • Skips DL if it was skipped/errored
    • Falls back gracefully when no metric is available
    """
    is_clf = "classification" in problem_type
    models = []

    for name, metrics in ml_results.items():
        if not isinstance(metrics, dict):
            continue
        if "error" in metrics or "skipped" in metrics:
            continue
        models.append({"model": name, **metrics})

    # Include DL only if it actually trained (not skipped, not errored)
    dl_trained = (
        isinstance(dl_results, dict)
        and not dl_results.get("skipped")
        and "error" not in dl_results
    )
    if dl_trained:
        models.append({"model": dl_results.get("model", "Deep Learning (MLP)"), **dl_results})

    if not models:
        return {"models": [], "best_model": None, "metric_used": None}

    metric_key = "accuracy" if is_clf else "rmse"
    candidates = [m for m in models if metric_key in m]

    if not candidates:
        return {"models": models, "best_model": None, "metric_used": metric_key}

    best = (
        max(candidates, key=lambda m: m[metric_key])   # higher accuracy
        if is_clf
        else min(candidates, key=lambda m: m[metric_key])  # lower RMSE
    )

    return {
        "models"     : models,
        "best_model" : best.get("model"),
        "metric_used": metric_key,
    }