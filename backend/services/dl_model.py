"""
SAIDAS — services/dl_model.py  (STABILISED v2)

Dynamic Keras MLP — safe for all dataset sizes.

CHANGES IN THIS VERSION
───────────────────────
• Pre-flight safety checks   NEW — empty, NaN, non-numeric, single-class guards
• try/except around fit()    CHANGED — training failure returns safe skip dict
• try/except around predict()CHANGED — prediction failure handled gracefully
• is_large flag              ADDED — skips DL when dataset > ROW_CAP rows
• Keras 3 / TF 2.16+        KEPT — `import keras` not `from tensorflow import keras`
"""

import os
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import keras
from keras import layers, callbacks
import tensorflow as tf

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

from utils.problem_detector import (
    get_output_activation,
    get_loss_function,
    get_output_units,
    get_num_classes,
)

# ---------------------------------------------------------------------------
# Hyper-parameters
# ---------------------------------------------------------------------------

HIDDEN_1_UNITS = 64
HIDDEN_2_UNITS = 32
DROPOUT_RATE   = 0.25
LEARNING_RATE  = 0.001
BATCH_SIZE     = 32
MAX_EPOCHS     = 100       # Reduced from 150 — faster with early stopping
EARLY_STOP_PAT = 10
VAL_SPLIT      = 0.15
RANDOM_STATE   = 42

# Row threshold — skip DL above this (process.py also enforces this)
DL_ROW_CAP     = 1_000


# ---------------------------------------------------------------------------
# _SKIP helper — returns a consistent "skipped" dict
# ---------------------------------------------------------------------------

def _skip(reason: str) -> dict:
    return {
        "model"  : "Deep Learning (MLP)",
        "skipped": True,
        "reason" : reason,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def train_dl_model(
    X_train     : np.ndarray,
    X_test      : np.ndarray,
    y_train     : np.ndarray,
    y_test      : np.ndarray,
    problem_type: str,
    is_large    : bool = False,   # ADDED v2 — set by process.py
) -> dict:
    """
    Builds, compiles, and trains a dynamic Keras MLP.
    Returns a safe skip dict instead of raising on any failure.
    """

    # ── Pre-flight safety checks (ADDED v2) ────────────────────────────

    if is_large:
        return _skip(f"Dataset exceeds {DL_ROW_CAP} rows — DL skipped to avoid timeout.")

    if X_train is None or len(X_train) == 0:
        return _skip("Training set is empty.")

    if len(X_train) < 30:
        return _skip(f"Too few training samples ({len(X_train)}) for deep learning.")

    # Guard: non-numeric data
    if not np.issubdtype(X_train.dtype, np.number):
        return _skip("Training features contain non-numeric data.")

    # Guard: NaN / Inf in features
    if not np.isfinite(X_train).all():
        return _skip("Training features contain NaN or Inf values.")

    # Guard: NaN in labels
    if np.isnan(y_train).any():
        return _skip("Target column contains NaN values.")

    # Guard: single-class target (classification only)
    if "classification" in problem_type:
        n_unique = len(np.unique(y_train))
        if n_unique < 2:
            return _skip(f"Target has only {n_unique} unique class — cannot train classifier.")

    # ── Build + compile ─────────────────────────────────────────────────
    try:
        tf.random.set_seed(RANDOM_STATE)
        np.random.seed(RANDOM_STATE)

        n_features = X_train.shape[1]
        n_classes  = get_num_classes(__import__("pandas").Series(y_train))
        model      = _build_mlp(n_features, n_classes, problem_type)

        model.compile(
            optimizer = keras.optimizers.Adam(learning_rate=LEARNING_RATE),
            loss      = get_loss_function(problem_type),
            metrics   = ["accuracy"] if "classification" in problem_type else ["mae"],
        )
    except Exception as exc:
        return _skip(f"Model build/compile failed: {str(exc)}")

    # ── Training (WRAPPED in try/except) ────────────────────────────────
    try:
        early_stop = callbacks.EarlyStopping(
            monitor              = "val_loss",
            patience             = EARLY_STOP_PAT,
            restore_best_weights = True,
            verbose              = 0,
        )
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor  = "val_loss",
            factor   = 0.5,
            patience = 5,
            min_lr   = 1e-6,
            verbose  = 0,
        )

        history = model.fit(
            X_train, y_train,
            epochs           = MAX_EPOCHS,
            batch_size       = BATCH_SIZE,
            validation_split = VAL_SPLIT,
            callbacks        = [early_stop, reduce_lr],
            verbose          = 0,
        )
        epochs_trained = len(history.history["loss"])

    except Exception as exc:
        return _skip(f"Training failed: {str(exc)}")

    # ── Prediction + metrics (WRAPPED in try/except) ─────────────────────
    try:
        y_pred_raw = model.predict(X_test, verbose=0)
        metrics    = _compute_metrics(y_test, y_pred_raw, problem_type)
    except Exception as exc:
        return _skip(f"Prediction/evaluation failed: {str(exc)}")

    # ── Build response ───────────────────────────────────────────────────
    train_history = _build_history_payload(history.history, epochs_trained)

    architecture = {
        "input_units"      : int(n_features),
        "hidden_layers"    : [
            {"units": HIDDEN_1_UNITS, "activation": "relu"},
            {"type" : "dropout",      "rate"      : DROPOUT_RATE},
            {"units": HIDDEN_2_UNITS, "activation": "relu"},
        ],
        "output_units"     : get_output_units(problem_type, n_classes),
        "output_activation": get_output_activation(problem_type),
        "total_params"     : int(model.count_params()),
    }

    return {
        "model"         : "Deep Learning (MLP)",
        "task"          : problem_type,
        "architecture"  : architecture,
        "epochs_trained": epochs_trained,
        "history"       : train_history,
        **metrics,
    }


# ---------------------------------------------------------------------------
# Internal: build MLP
# ---------------------------------------------------------------------------

def _build_mlp(
    n_features  : int,
    n_classes   : int,
    problem_type: str,
) -> keras.Model:
    output_units      = get_output_units(problem_type, n_classes)
    output_activation = get_output_activation(problem_type)

    return keras.Sequential(
        [
            layers.Input(shape=(n_features,), name="input"),
            layers.Dense(HIDDEN_1_UNITS, activation="relu", name="hidden_1"),
            layers.BatchNormalization(name="bn_1"),
            layers.Dropout(DROPOUT_RATE, name="dropout_1"),
            layers.Dense(HIDDEN_2_UNITS, activation="relu", name="hidden_2"),
            layers.BatchNormalization(name="bn_2"),
            layers.Dropout(DROPOUT_RATE, name="dropout_2"),
            layers.Dense(output_units, activation=output_activation, name="output"),
        ],
        name="saidas_mlp",
    )


# ---------------------------------------------------------------------------
# Internal: metrics
# ---------------------------------------------------------------------------

def _compute_metrics(
    y_true    : np.ndarray,
    y_pred_raw: np.ndarray,
    problem_type: str,
) -> dict:
    if problem_type == "binary_classification":
        y_pred = (y_pred_raw.flatten() >= 0.5).astype(int)
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),

        "precision": round(
            float(precision_score(y_true, y_pred, zero_division=0)), 4
        ),

        "recall": round(
            float(recall_score(y_true, y_pred, zero_division=0)), 4
        ),

        "f1_score": round(
            float(f1_score(y_true, y_pred, zero_division=0)), 4
        ),

        "confusion_matrix": confusion_matrix(
            y_true, y_pred
        ).tolist(),
    }
    
    if problem_type == "multiclass_classification":
        y_pred = np.argmax(y_pred_raw, axis=1)
        return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),

        "precision": round(
            float(
                precision_score(
                    y_true,
                    y_pred,
                    average="weighted",
                    zero_division=0,
                )
            ),
            4,
        ),

        "recall": round(
            float(
                recall_score(
                    y_true,
                    y_pred,
                    average="weighted",
                    zero_division=0,
                )
            ),
            4,
        ),

        "f1_score": round(
            float(
                f1_score(
                    y_true,
                    y_pred,
                    average="weighted",
                    zero_division=0,
                )
            ),
            4,
        ),
    }

    y_pred = y_pred_raw.flatten()
    return {
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "mae" : round(float(mean_absolute_error(y_true, y_pred)), 4),
        "r2"  : round(float(r2_score(y_true, y_pred)), 4),
    }


# ---------------------------------------------------------------------------
# Internal: history payload
# ---------------------------------------------------------------------------

def _build_history_payload(history_dict: dict, epochs_trained: int) -> dict:
    step = max(1, epochs_trained // 100)

    def _sample(vals):
        return [round(float(v), 5) for v in vals[::step]]

    payload = {
        "epochs"  : list(range(1, epochs_trained + 1, step)),
        "loss"    : _sample(history_dict.get("loss",     [])),
        "val_loss": _sample(history_dict.get("val_loss", [])),
    }
    if "accuracy" in history_dict:
        payload["accuracy"]     = _sample(history_dict["accuracy"])
        payload["val_accuracy"] = _sample(history_dict.get("val_accuracy", []))
    if "mae" in history_dict:
        payload["mae"]     = _sample(history_dict["mae"])
        payload["val_mae"] = _sample(history_dict.get("val_mae", []))

    return payload