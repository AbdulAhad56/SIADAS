"""
SAIDAS — utils/problem_detector.py

Detects whether the ML task is:
  - "binary_classification"     → 2 unique target values
  - "multiclass_classification" → 3–20 unique target values
  - "regression"                → continuous numeric target

Also provides helper functions used by services downstream.
"""

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Constants — tune these thresholds to match your domain expectations
# ---------------------------------------------------------------------------

# If the target has ≤ this many unique values it is treated as classification
MAX_UNIQUE_FOR_CLASSIFICATION = 20

# If the target is numeric but has ≤ this many unique integer values,
# treat it as classification (e.g. 0/1, 1/2/3 ratings)
NUMERIC_UNIQUE_CLASSIFICATION_THRESHOLD = 15


# ---------------------------------------------------------------------------
# Public: detect_problem_type
# ---------------------------------------------------------------------------

def detect_problem_type(df: pd.DataFrame, target: str) -> str:
    """
    Infers the ML problem type from the target column.

    Returns one of:
      "binary_classification"
      "multiclass_classification"
      "regression"

    Decision logic
    --------------
    1. If the column dtype is object / string → classification.
    2. If the column is boolean              → binary_classification.
    3. If the column is numeric:
         a. Count unique non-null values.
         b. If unique count ≤ NUMERIC_UNIQUE_CLASSIFICATION_THRESHOLD
            AND all values are integers (or floats that equal their int)
            → classification.
         c. Otherwise → regression.
    """
    series = df[target].dropna()

    if series.empty:
        raise ValueError(
            f"Target column '{target}' contains only missing values — "
            "cannot determine problem type."
        )

    # ── Boolean ─────────────────────────────────────────────────────────
    if pd.api.types.is_bool_dtype(series):
        return "binary_classification"

    # ── Categorical / string ─────────────────────────────────────────────
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_categorical_dtype(series):
        n_unique = series.nunique()
        if n_unique > MAX_UNIQUE_FOR_CLASSIFICATION:
            raise ValueError(
                f"Target column '{target}' is a string type but has "
                f"{n_unique} unique values (max allowed: {MAX_UNIQUE_FOR_CLASSIFICATION}). "
                "Please provide a proper classification target."
            )
        return "binary_classification" if n_unique == 2 else "multiclass_classification"

    # ── Numeric ──────────────────────────────────────────────────────────
    if pd.api.types.is_numeric_dtype(series):
        n_unique = series.nunique()

        # Check if all values are whole numbers (e.g. 0.0, 1.0, 2.0)
        all_integers = bool((series == series.apply(np.floor)).all())

        if all_integers and n_unique <= NUMERIC_UNIQUE_CLASSIFICATION_THRESHOLD:
            return (
                "binary_classification"
                if n_unique == 2
                else "multiclass_classification"
            )

        return "regression"

    # ── Fallback ─────────────────────────────────────────────────────────
    raise ValueError(
        f"Cannot determine problem type for column '{target}' "
        f"with dtype '{series.dtype}'."
    )


# ---------------------------------------------------------------------------
# Public: get_num_classes
# ---------------------------------------------------------------------------

def get_num_classes(series: pd.Series) -> int:
    """
    Returns the number of unique classes in a classification target.
    For regression tasks, returns 1 (single output node).
    """
    return int(series.nunique())


# ---------------------------------------------------------------------------
# Public: is_classification
# ---------------------------------------------------------------------------

def is_classification(problem_type: str) -> bool:
    """Returns True for any classification variant."""
    return "classification" in problem_type


# ---------------------------------------------------------------------------
# Public: is_binary
# ---------------------------------------------------------------------------

def is_binary(problem_type: str) -> bool:
    """Returns True only for binary classification."""
    return problem_type == "binary_classification"


# ---------------------------------------------------------------------------
# Public: get_output_activation
# ---------------------------------------------------------------------------

def get_output_activation(problem_type: str) -> str:
    """
    Returns the Keras output activation function name for the given task.

    binary_classification     → "sigmoid"  (single output node, 0–1)
    multiclass_classification → "softmax"  (N output nodes)
    regression                → "linear"   (single output node, unbounded)
    """
    mapping = {
        "binary_classification"     : "sigmoid",
        "multiclass_classification" : "softmax",
        "regression"                : "linear",
    }
    return mapping.get(problem_type, "linear")


# ---------------------------------------------------------------------------
# Public: get_loss_function
# ---------------------------------------------------------------------------

def get_loss_function(problem_type: str) -> str:
    """
    Returns the appropriate Keras loss function name.

    binary_classification     → "binary_crossentropy"
    multiclass_classification → "sparse_categorical_crossentropy"
    regression                → "mean_squared_error"
    """
    mapping = {
        "binary_classification"     : "binary_crossentropy",
        "multiclass_classification" : "sparse_categorical_crossentropy",
        "regression"                : "mean_squared_error",
    }
    return mapping.get(problem_type, "mean_squared_error")


# ---------------------------------------------------------------------------
# Public: get_output_units
# ---------------------------------------------------------------------------

def get_output_units(problem_type: str, n_classes: int) -> int:
    """
    Returns the number of neurons in the DL model's output layer.

    binary_classification     → 1   (sigmoid on one node)
    multiclass_classification → N   (one node per class)
    regression                → 1   (single continuous value)
    """
    if problem_type == "binary_classification":
        return 1
    if problem_type == "multiclass_classification":
        return n_classes
    return 1  # regression


# ---------------------------------------------------------------------------
# Public: describe_problem
# ---------------------------------------------------------------------------

def describe_problem(problem_type: str, target: str, n_classes: int = 0) -> str:
    """
    Returns a human-readable one-liner about the detected task.
    Used in the insights panel.

    Example outputs:
      "Binary classification — predicting 'survived' (2 classes)"
      "Regression — predicting continuous variable 'house_price'"
    """
    if problem_type == "binary_classification":
        return (
            f"Binary classification — predicting '{target}' "
            f"with {n_classes} classes."
        )
    if problem_type == "multiclass_classification":
        return (
            f"Multi-class classification — predicting '{target}' "
            f"across {n_classes} classes."
        )
    return f"Regression — predicting the continuous variable '{target}'."