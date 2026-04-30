"""
SAIDAS — services/preprocessing.py

Full preprocessing pipeline:
  1. Drop columns that are entirely null
  2. Separate features (X) from target (y)
  3. Impute missing values  (median for numeric, mode for categorical)
  4. Encode categorical features
       - Binary (2 unique vals) → Label Encoding
       - Multi-category         → One-Hot Encoding
  5. Scale numeric features     (StandardScaler)
  6. Train / test split         (80 / 20, stratified where possible)
"""

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer

TEST_SIZE        = 0.20
RANDOM_STATE     = 42
BINARY_THRESHOLD = 2


def preprocess_data(df: pd.DataFrame, target: str, problem_type: str) -> dict:
    """
    Runs the full preprocessing pipeline on a raw DataFrame.
    Returns X_train, X_test, y_train, y_test, feature_names, and meta audit trail.
    """
    meta: dict = {
        "steps_applied"      : [],
        "dropped_columns"    : [],
        "imputed_columns"    : {},
        "encoded_columns"    : {},
        "scaled_columns"     : [],
        "original_shape"     : list(df.shape),
        "final_feature_count": 0,
    }

    # 1. Drop fully-null columns
    fully_null = df.columns[df.isnull().all()].tolist()
    if fully_null:
        df.drop(columns=fully_null, inplace=True)
        meta["dropped_columns"].extend(fully_null)
        meta["steps_applied"].append(f"Dropped {len(fully_null)} fully-null column(s).")

    # 2. Separate X and y
    y_raw = df[target].copy()
    X     = df.drop(columns=[target]).copy()

    # 3. Identify column types
    numeric_cols     = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

    # 4. Impute missing values
    if numeric_cols:
        num_imputer = SimpleImputer(strategy="median")
        X[numeric_cols] = num_imputer.fit_transform(X[numeric_cols])
        imputed_numeric = {col: "median" for col in numeric_cols if df[col].isnull().any()}
        meta["imputed_columns"].update(imputed_numeric)

    if categorical_cols:
        cat_imputer = SimpleImputer(strategy="most_frequent")
        X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])
        imputed_cat = {col: "mode" for col in categorical_cols if df[col].isnull().any()}
        meta["imputed_columns"].update(imputed_cat)

    if meta["imputed_columns"]:
        meta["steps_applied"].append(
            f"Imputed missing values in {len(meta['imputed_columns'])} column(s)."
        )

    # 5. Encode categorical features
    label_encoded_cols = []
    ohe_cols           = []

    for col in categorical_cols:
        n_unique = X[col].nunique()
        if n_unique <= BINARY_THRESHOLD:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoded_cols.append(col)
            meta["encoded_columns"][col] = {
                "method" : "label_encoding",
                "classes": le.classes_.tolist(),
            }
        else:
            ohe_cols.append(col)

    if ohe_cols:
        X = pd.get_dummies(X, columns=ohe_cols, drop_first=False)
        for col in ohe_cols:
            new_cols = [c for c in X.columns if c.startswith(f"{col}_")]
            meta["encoded_columns"][col] = {
                "method"     : "one_hot_encoding",
                "new_columns": new_cols,
            }

    if label_encoded_cols or ohe_cols:
        meta["steps_applied"].append(
            f"Label-encoded {len(label_encoded_cols)} binary column(s); "
            f"One-Hot encoded {len(ohe_cols)} multi-category column(s)."
        )

    X = X.astype(float)

    # 6. Encode target
    y, target_meta = _encode_target(y_raw, problem_type)
    meta["target_encoding"] = target_meta

    # 7. StandardScaler
    feature_names = X.columns.tolist()
    scaler        = StandardScaler()
    X_scaled      = scaler.fit_transform(X)
    meta["scaled_columns"] = feature_names
    meta["steps_applied"].append(
        f"Applied StandardScaler to all {len(feature_names)} feature(s)."
    )

    # 8. Train/test split
    stratify = y if "classification" in problem_type else None
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=stratify
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
        )

    meta["steps_applied"].append(
        f"Split → train ({len(X_train)} rows) / test ({len(X_test)} rows)."
    )
    meta["final_feature_count"] = len(feature_names)

    return {
        "X_train"      : X_train,
        "X_test"       : X_test,
        "y_train"      : y_train,
        "y_test"       : y_test,
        "feature_names": feature_names,
        "meta"         : meta,
    }


def _encode_target(y_raw: pd.Series, problem_type: str) -> tuple:
    """Label-encode classification targets; cast regression targets to float."""
    if "classification" in problem_type:
        le = LabelEncoder()
        y_encoded = le.fit_transform(y_raw.astype(str))
        return y_encoded, {"method": "label_encoding", "classes": le.classes_.tolist()}

    y_encoded = pd.to_numeric(y_raw, errors="coerce")
    y_encoded = y_encoded.fillna(y_encoded.median()).to_numpy(dtype=float)
    return y_encoded, {"method": "none (continuous)"}