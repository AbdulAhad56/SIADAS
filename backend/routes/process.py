"""
SAIDAS — Process Route
POST /api/process

Accepts:
  - dataset  : list of row dicts (from /upload response)
  - target   : name of the target column

Orchestrates the full analysis pipeline:
  1. Preprocessing
  2. Data Mining  (correlation, PCA, clustering, feature importance)
  3. ML Models    (Logistic Regression / Random Forest)
  4. DL Model     (Keras MLP)
  5. Insight Generation

Returns a single structured JSON containing all results.
"""

import time
import traceback

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from services.preprocessing import preprocess_data
from services.data_mining import run_data_mining
from services.ml_models import train_ml_models
from services.dl_model import train_dl_model
from services.insight_generator import generate_insights
from utils.problem_detector import detect_problem_type
from utils.response_builder import build_success_response, build_error_response

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class ProcessRequest(BaseModel):
    """
    Request body for /process.
    dataset : list of dicts — each dict is one CSV row
    target  : name of the column to predict
    """

    dataset: list[dict] = Field(
        ...,
        min_length=10,
        description="Full dataset as list of row dicts (from /upload).",
    )
    target: str = Field(
        ...,
        min_length=1,
        description="Name of the target variable column.",
    )

    @field_validator("target")
    @classmethod
    def target_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Target column name must not be blank.")
        return v.strip()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/process", summary="Run full SAIDAS analysis pipeline")
async def process_dataset(request: ProcessRequest):
    """
    Runs the complete SAIDAS pipeline on the provided dataset and returns
    mining results, model metrics, and human-readable insights.
    """

    pipeline_start = time.time()

    # ------------------------------------------------------------------
    # 1. Reconstruct DataFrame
    # ------------------------------------------------------------------
    try:
        df = pd.DataFrame(request.dataset)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to reconstruct DataFrame from dataset: {str(exc)}",
        )
    
    dataset_size = len(df)
    small_data = dataset_size < 100

    if df.empty:
        raise HTTPException(status_code=422, detail="The provided dataset is empty.")

    # ------------------------------------------------------------------
    # 2. Validate target column
    # ------------------------------------------------------------------
    target = request.target

    if target not in df.columns:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Target column '{target}' not found in dataset. "
                f"Available columns: {df.columns.tolist()}"
            ),
        )

    # Require at least one feature column besides the target
    if df.shape[1] < 2:
        raise HTTPException(
            status_code=422,
            detail="Dataset must contain at least one feature column in addition to the target.",
        )

    # ------------------------------------------------------------------
    # 3. Detect problem type  (classification / regression)
    # ------------------------------------------------------------------
    try:
        problem_type = detect_problem_type(df, target)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Problem type detection failed: {str(exc)}",
        )

    # ------------------------------------------------------------------
    # 4. Preprocessing
    # ------------------------------------------------------------------
    try:
        preprocessing_result = preprocess_data(df.copy(), target, problem_type)
        X_train = preprocessing_result["X_train"]
        X_test  = preprocessing_result["X_test"]
        y_train = preprocessing_result["y_train"]
        y_test  = preprocessing_result["y_test"]
        feature_names  = preprocessing_result["feature_names"]
        preprocessing_meta = preprocessing_result["meta"]
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Preprocessing failed: {str(exc)}\n{traceback.format_exc()}",
        )

    # ------------------------------------------------------------------
    # 5. Data Mining
    # ------------------------------------------------------------------
    try:
        mining_results = run_data_mining(
            df=df.copy(),
            target=target,
            X_train=X_train,
            y_train=y_train,
            feature_names=feature_names,
            problem_type=problem_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Data mining failed: {str(exc)}\n{traceback.format_exc()}",
        )

    # ------------------------------------------------------------------
    # 6. ML Models  (Logistic Regression + Random Forest)
    # ------------------------------------------------------------------
    try:
        ml_results = train_ml_models(
            X_train=X_train,
            X_test=X_test,
            y_train=y_train,
            y_test=y_test,
            problem_type=problem_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"ML training failed: {str(exc)}\n{traceback.format_exc()}",
        )

    # ------------------------------------------------------------------
    # 7. Deep Learning Model  (Keras MLP)
    # ------------------------------------------------------------------
    try:
        dl_results = train_dl_model(
            X_train=X_train,
            X_test=X_test,
            y_train=y_train,
            y_test=y_test,
            problem_type=problem_type,
            small_data=small_data,
        )
    except Exception as exc:
        # DL failure is non-fatal — return partial results with error note
        dl_results = {
            "model": "Deep Learning (MLP)",
            "error": str(exc),
            "status": "failed",
        }

    # ------------------------------------------------------------------
    # 8. Model Comparison  — unified metrics table
    # ------------------------------------------------------------------
    model_comparison = _build_model_comparison(ml_results, dl_results, problem_type)

    # ------------------------------------------------------------------
    # 9. Insight Generation
    # ------------------------------------------------------------------
    try:
        insights = generate_insights(
            problem_type=problem_type,
            mining_results=mining_results,
            ml_results=ml_results,
            dl_results=dl_results,
            preprocessing_meta=preprocessing_meta,
            feature_names=feature_names,
            target=target,
            df_shape=df.shape,
        )
    except Exception as exc:
        insights = [f"Insight generation encountered an error: {str(exc)}"]

    # ------------------------------------------------------------------
    # 10. Assemble final response
    # ------------------------------------------------------------------
    elapsed = round(time.time() - pipeline_start, 2)

    response_data = {
        # ── Dataset summary ────────────────────────────────────────────
        "summary": {
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "target": target,
            "problem_type": problem_type,
            "feature_count": len(feature_names),
            "feature_names": feature_names,
            "preprocessing": preprocessing_meta,
        },

        # ── Data mining outputs ────────────────────────────────────────
        "mining": {
            "correlation": mining_results.get("correlation"),
            "pca": mining_results.get("pca"),
            "clustering": mining_results.get("clustering"),
            "feature_importance": mining_results.get("feature_importance"),
        },

        # ── Model metrics ──────────────────────────────────────────────
        "models": {
            "ml": ml_results,
            "dl": dl_results,
            "comparison": model_comparison,
        },

        # ── Human-readable insights ────────────────────────────────────
        "insights": insights,

        # ── Pipeline metadata ──────────────────────────────────────────
        "meta": {
            "pipeline_duration_seconds": elapsed,
            "status": "complete",
        },
    }

    return build_success_response(
        data=response_data,
        message="Analysis pipeline completed successfully.",
    )


# ---------------------------------------------------------------------------
# Helper — build a unified comparison table across all models
# ---------------------------------------------------------------------------

def _build_model_comparison(
    ml_results: dict,
    dl_results: dict,
    problem_type: str,
) -> dict:
    """
    Merges ML and DL metrics into a single comparison structure.

    Classification → ranks by accuracy (higher is better).
    Regression     → ranks by RMSE (lower is better).
    """

    models = []

    # Pull each ML model's metrics
    for model_name, metrics in ml_results.items():
        if isinstance(metrics, dict) and "error" not in metrics:
            entry = {"model": model_name, **metrics}
            models.append(entry)

    # Pull DL metrics if training succeeded
    if "error" not in dl_results and not dl_results.get("skipped"):
        entry = {"model": dl_results.get("model", "Deep Learning (MLP)"), **dl_results}
        models.append(entry)

    if not models:
        return {"models": [], "best_model": None}

    # Determine best model
    if problem_type == "classification":
        # Higher accuracy wins
        best = max(
            (m for m in models if "accuracy" in m),
            key=lambda m: m["accuracy"],
            default=None,
        )
        metric_used = "accuracy"
    else:
        # Lower RMSE wins
        best = min(
            (m for m in models if "rmse" in m),
            key=lambda m: m["rmse"],
            default=None,
        )
        metric_used = "rmse"

    return {
        "models": models,
        "best_model": best.get("model") if best else None,
        "metric_used": metric_used,
    }