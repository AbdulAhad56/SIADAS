"""
SAIDAS — services/ml_models.py

Trains and evaluates two classical ML models:
  - Logistic Regression  (classification)  /  Ridge Regression (regression)
  - Random Forest        (classification / regression)

Returns per-model metrics:
  Classification → accuracy, precision, recall, f1, confusion_matrix
  Regression     → rmse, mae, r2
"""

import numpy as np
import pandas as pd

from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)

RANDOM_STATE = 42


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def train_ml_models(
    X_train: np.ndarray,
    X_test : np.ndarray,
    y_train: np.ndarray,
    y_test : np.ndarray,
    problem_type: str,
) -> dict:
    """
    Trains Logistic/Ridge Regression and Random Forest.

    Returns a dict keyed by model name, each containing its metrics.
    {
      "Logistic Regression": { "accuracy": 0.94, ... },
      "Random Forest"      : { "accuracy": 0.97, ... },
    }
    """
    results = {}

    if "classification" in problem_type:
        results["Logistic Regression"] = _train_logistic(
            X_train, X_test, y_train, y_test, problem_type
        )
        results["Random Forest"] = _train_rf_classifier(
            X_train, X_test, y_train, y_test, problem_type
        )
    else:
        results["Ridge Regression"] = _train_ridge(
            X_train, X_test, y_train, y_test
        )
        results["Random Forest"] = _train_rf_regressor(
            X_train, X_test, y_train, y_test
        )

    return results


# ---------------------------------------------------------------------------
# Classification models
# ---------------------------------------------------------------------------

def _train_logistic(
    X_train, X_test, y_train, y_test, problem_type: str
) -> dict:
    """Logistic Regression with liblinear (fast, handles small datasets well)."""

    multi_class = "ovr" if problem_type == "binary_classification" else "multinomial"

    model = LogisticRegression(
        solver     = "lbfgs",
        multi_class= multi_class,
        max_iter   = 1000,
        random_state= RANDOM_STATE,
        C          = 1.0,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    return _classification_metrics(y_test, y_pred, model_name="Logistic Regression")


def _train_rf_classifier(
    X_train, X_test, y_train, y_test, problem_type: str
) -> dict:
    """Random Forest Classifier — 200 trees, moderate depth."""

    model = RandomForestClassifier(
        n_estimators = 200,
        max_depth    = 10,
        min_samples_split = 4,
        random_state = RANDOM_STATE,
        n_jobs       = -1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    return _classification_metrics(y_test, y_pred, model_name="Random Forest")


# ---------------------------------------------------------------------------
# Regression models
# ---------------------------------------------------------------------------

def _train_ridge(X_train, X_test, y_train, y_test) -> dict:
    """Ridge Regression — L2 regularised linear model."""

    model = Ridge(alpha=1.0, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    return _regression_metrics(y_test, y_pred, model_name="Ridge Regression")


def _train_rf_regressor(X_train, X_test, y_train, y_test) -> dict:
    """Random Forest Regressor."""

    model = RandomForestRegressor(
        n_estimators = 200,
        max_depth    = 10,
        min_samples_split = 4,
        random_state = RANDOM_STATE,
        n_jobs       = -1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    return _regression_metrics(y_test, y_pred, model_name="Random Forest")


# ---------------------------------------------------------------------------
# Metric helpers
# ---------------------------------------------------------------------------

def _classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str,
) -> dict:
    """
    Computes accuracy, precision, recall, F1, and confusion matrix.
    Handles binary and multi-class transparently.
    """
    average = "binary" if len(np.unique(y_true)) == 2 else "weighted"

    accuracy  = float(accuracy_score(y_true, y_pred))
    precision = float(precision_score(y_true, y_pred, average=average, zero_division=0))
    recall    = float(recall_score(y_true, y_pred, average=average, zero_division=0))
    f1        = float(f1_score(y_true, y_pred, average=average, zero_division=0))
    cm        = confusion_matrix(y_true, y_pred).tolist()

    return {
        "model"           : model_name,
        "task"            : "classification",
        "accuracy"        : round(accuracy, 4),
        "precision"       : round(precision, 4),
        "recall"          : round(recall, 4),
        "f1_score"        : round(f1, 4),
        "confusion_matrix": cm,
    }


def _regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str,
) -> dict:
    """
    Computes RMSE, MAE, and R² for regression tasks.
    """
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae  = float(mean_absolute_error(y_true, y_pred))
    r2   = float(r2_score(y_true, y_pred))

    return {
        "model": model_name,
        "task" : "regression",
        "rmse" : round(rmse, 4),
        "mae"  : round(mae, 4),
        "r2"   : round(r2, 4),
    }