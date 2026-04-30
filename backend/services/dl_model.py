"""
SAIDAS — services/dl_model.py

Dynamic Keras MLP:
  Input  → Dense(64, relu) → Dropout(0.25) → Dense(32, relu) → Output

Architecture adapts automatically:
  binary_classification     → sigmoid output, binary_crossentropy loss
  multiclass_classification → softmax output, sparse_categorical_crossentropy
  regression                → linear output,  mean_squared_error

Includes:
  - Adam optimiser
  - EarlyStopping on val_loss (patience=10)
  - Returns training history + final metrics
"""

import os
import numpy as np

# Suppress TensorFlow info/warning logs
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf
from keras import layers, callbacks, models, optimizers

from sklearn.metrics import (
    accuracy_score,
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
MAX_EPOCHS     = 150
EARLY_STOP_PAT = 10     # EarlyStopping patience
VAL_SPLIT      = 0.15   # Fraction of training data used for validation
RANDOM_STATE   = 42


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def train_dl_model(
    X_train: np.ndarray,
    X_test : np.ndarray,
    y_train: np.ndarray,
    y_test : np.ndarray,
    problem_type: str,
    small_data=False,
) -> dict:
    """
    Builds, compiles, and trains a dynamic Keras MLP.

    Returns a dict with:
      - model architecture description
      - training history (loss + val_loss per epoch)
      - final evaluation metrics on the test set
    """
    tf.random.set_seed(RANDOM_STATE)
    np.random.seed(RANDOM_STATE)

    if small_data and len(X_train) < 50:
        return {
            "model": "Deep Learning (MLP)",
            "skipped": True,
            "reason": "Dataset too small for deep learning"
            }

    n_features = X_train.shape[1]
    n_classes  = get_num_classes(
        # Convert y_train to a pandas Series temporarily for the helper
        __import__("pandas").Series(y_train)
    )

    # ------------------------------------------------------------------
    # Build model
    # ------------------------------------------------------------------
    model = _build_mlp(n_features, n_classes, problem_type)

    # ------------------------------------------------------------------
    # Compile
    # ------------------------------------------------------------------
    loss_fn   = get_loss_function(problem_type)
    optimizer = tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE)

    # Choose metric logged during training
    if "classification" in problem_type:
        train_metrics = ["accuracy"]
    else:
        train_metrics = ["mae"]

    model.compile(
        optimizer = optimizer,
        loss      = loss_fn,
        metrics   = train_metrics,
    )

    # ------------------------------------------------------------------
    # Callbacks
    # ------------------------------------------------------------------
    early_stop = callbacks.EarlyStopping(
        monitor             = "val_loss",
        patience            = EARLY_STOP_PAT,
        restore_best_weights= True,
        verbose             = 0,
    )

    reduce_lr = callbacks.ReduceLROnPlateau(
        monitor  = "val_loss",
        factor   = 0.5,
        patience = 5,
        min_lr   = 1e-6,
        verbose  = 0,
    )

    # ------------------------------------------------------------------
    # Train
    # ------------------------------------------------------------------
    epochs = 50 if small_data else MAX_EPOCHS

    history = model.fit(
        X_train, y_train,
        epochs          = epochs,
        batch_size      = BATCH_SIZE,
        validation_split= VAL_SPLIT,
        callbacks       = [early_stop, reduce_lr],
        verbose         = 0,
    )

    epochs_trained = len(history.history["loss"])

    # ------------------------------------------------------------------
    # Evaluate on test set
    # ------------------------------------------------------------------
    y_pred_raw = model.predict(X_test, verbose=0)
    metrics    = _compute_metrics(y_test, y_pred_raw, problem_type)

    # ------------------------------------------------------------------
    # Training history (truncated for JSON payload size)
    # ------------------------------------------------------------------
    train_history = _build_history_payload(history.history, epochs_trained)

    # ------------------------------------------------------------------
    # Architecture summary
    # ------------------------------------------------------------------
    architecture = {
        "input_units"  : n_features,
        "hidden_layers": [
            {"units": HIDDEN_1_UNITS, "activation": "relu"},
            {"type": "dropout", "rate": DROPOUT_RATE},
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
) -> tf.keras.Model:
    """
    Constructs a sequential MLP with the structure:
      Input(n_features)
        → Dense(64, relu) → Dropout(0.25)
        → Dense(32, relu)
        → Dense(output_units, output_activation)
    """
    output_units      = get_output_units(problem_type, n_classes)
    output_activation = get_output_activation(problem_type)

    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(n_features,), name="input"),

            tf.keras.layers.Dense(HIDDEN_1_UNITS, activation="relu", name="hidden_1"),
            tf.keras.layers.BatchNormalization(name="bn_1"),
            tf.keras.layers.Dropout(DROPOUT_RATE, name="dropout_1"),

            tf.keras.layers.Dense(HIDDEN_2_UNITS, activation="relu", name="hidden_2"),
            tf.keras.layers.BatchNormalization(name="bn_2"),
            tf.keras.layers.Dropout(DROPOUT_RATE, name="dropout_2"),

            tf.keras.layers.Dense(output_units, activation=output_activation, name="output"),
        ],
        name="saidas_mlp",
    )

    return model


# ---------------------------------------------------------------------------
# Internal: compute test metrics
# ---------------------------------------------------------------------------

def _compute_metrics(
    y_true    : np.ndarray,
    y_pred_raw: np.ndarray,
    problem_type: str,
) -> dict:
    """Converts raw model output to final task-specific metrics."""

    if problem_type == "binary_classification":
        y_pred = (y_pred_raw.flatten() >= 0.5).astype(int)
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        }

    if problem_type == "multiclass_classification":
        y_pred = np.argmax(y_pred_raw, axis=1)
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        }

    # Regression
    y_pred = y_pred_raw.flatten()
    rmse   = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae    = float(mean_absolute_error(y_true, y_pred))
    r2     = float(r2_score(y_true, y_pred))

    return {
        "rmse": round(rmse, 4),
        "mae" : round(mae, 4),
        "r2"  : round(r2, 4),
    }


# ---------------------------------------------------------------------------
# Internal: build history payload
# ---------------------------------------------------------------------------

def _build_history_payload(history_dict: dict, epochs_trained: int) -> dict:
    """
    Converts Keras history dict to a JSON-safe format for the frontend chart.
    Caps at 100 epochs to keep payload size reasonable.
    """
    step = max(1, epochs_trained // 100)

    def _sample(values: list) -> list:
        return [round(float(v), 5) for v in values[::step]]

    payload = {
        "epochs"   : list(range(1, epochs_trained + 1, step)),
        "loss"     : _sample(history_dict.get("loss", [])),
        "val_loss" : _sample(history_dict.get("val_loss", [])),
    }

    # Include accuracy or MAE if present
    if "accuracy" in history_dict:
        payload["accuracy"]     = _sample(history_dict["accuracy"])
        payload["val_accuracy"] = _sample(history_dict.get("val_accuracy", []))

    if "mae" in history_dict:
        payload["mae"]     = _sample(history_dict["mae"])
        payload["val_mae"] = _sample(history_dict.get("val_mae", []))

    return payload