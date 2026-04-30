"""
SAIDAS — services/data_mining.py

Data Mining pipeline:
  1. Pearson Correlation Matrix
  2. PCA (2-D projection for scatter plot)
  3. K-Means Clustering + Elbow Method
  4. Feature Importance via Random Forest
  5. Association Rule Mining (Apriori)   ← NEW
  6. Outlier Detection (IQR method)      ← NEW
"""

import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_KMEANS_K      = 10   # Maximum K evaluated in elbow method
ELBOW_MIN_K       = 2    # Minimum sensible K
CORR_STRONG       = 0.7  # Threshold for "strong" correlation insight
MAX_FEATURES_PLOT = 15   # Limit feature importance chart to top-N features
PCA_RANDOM_STATE  = 42
KMEANS_RANDOM     = 42

# Association rule mining constants
ASSOC_MAX_UNIQUE      = 20     # Drop categorical columns with more unique values than this
ASSOC_MIN_SUPPORT     = 0.1    # Minimum support for frequent itemsets
ASSOC_MIN_CONFIDENCE  = 0.5    # Minimum confidence for rules
ASSOC_MAX_RULES       = 20     # Return top-N rules sorted by confidence

# Outlier detection constants
IQR_MULTIPLIER = 1.5           # Standard Tukey fence multiplier


# ---------------------------------------------------------------------------
# Public entry point  (UNCHANGED — only two new lines added at the bottom)
# ---------------------------------------------------------------------------

def run_data_mining(
    df: pd.DataFrame,
    target: str,
    X_train: np.ndarray,
    y_train: np.ndarray,
    feature_names: list[str],
    problem_type: str,
) -> dict:
    """
    Orchestrates all data mining tasks and returns a single dict.

    All results are JSON-serialisable (plain Python lists/dicts/floats).
    """
    results = {}

    # 1. Correlation matrix (on original numeric columns, including target)
    results["correlation"] = _compute_correlation(df, target)

    # 2. PCA 2-D projection on the preprocessed training features
    results["pca"] = _compute_pca(X_train, y_train, feature_names, problem_type)

    # 3. K-Means + Elbow on preprocessed training features
    results["clustering"] = _compute_clustering(X_train, y_train)

    # 4. Feature importance via Random Forest
    results["feature_importance"] = _compute_feature_importance(
        X_train, y_train, feature_names, problem_type
    )

    # 5. Association Rule Mining ← NEW (non-fatal: returns empty dicts on failure)
    results["association_rules"] = run_association_mining(df)

    # 6. Outlier Detection ← NEW (non-fatal: returns safe defaults on failure)
    results["outliers"] = detect_outliers(df)

    return results


# ---------------------------------------------------------------------------
# 1. Pearson Correlation Matrix  (UNCHANGED)
# ---------------------------------------------------------------------------

def _compute_correlation(df: pd.DataFrame, target: str) -> dict:
    """
    Computes Pearson correlation for all numeric columns (including target).

    Returns:
    {
      "columns": [...],
      "matrix" : [[...], ...],     ← 2-D list (rows × cols)
      "strong_pairs": [
          {"col_a": "x", "col_b": "y", "r": 0.87}, ...
      ]
    }
    """
    numeric_df = df.select_dtypes(include=[np.number])

    # Keep target in if it is numeric (it usually is after preprocessing)
    if target not in numeric_df.columns and target in df.columns:
        try:
            numeric_df[target] = pd.to_numeric(df[target], errors="coerce")
        except Exception:
            pass

    corr_matrix = numeric_df.corr(method="pearson")
    columns     = corr_matrix.columns.tolist()

    # Replace NaN correlation values with 0 for JSON safety
    matrix_values = np.nan_to_num(corr_matrix.values, nan=0.0).tolist()

    # Extract strongly correlated pairs (excluding self-correlations)
    strong_pairs = []
    cols = corr_matrix.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = corr_matrix.iloc[i, j]
            if not np.isnan(r) and abs(r) >= CORR_STRONG:
                strong_pairs.append({
                    "col_a": cols[i],
                    "col_b": cols[j],
                    "r"    : round(float(r), 4),
                })

    return {
        "columns"     : columns,
        "matrix"      : matrix_values,
        "strong_pairs": sorted(strong_pairs, key=lambda x: abs(x["r"]), reverse=True),
    }


# ---------------------------------------------------------------------------
# 2. PCA — 2-D Projection  (UNCHANGED)
# ---------------------------------------------------------------------------

def _compute_pca(
    X_train: np.ndarray,
    y_train: np.ndarray,
    feature_names: list[str],
    problem_type: str,
) -> dict:
    """
    Projects training data onto the first 2 principal components.

    Returns:
    {
      "points"             : [{"x": .., "y": .., "label": ..}, ...],
      "explained_variance" : [0.42, 0.18],
      "total_variance"     : 0.60,
      "loadings"           : [{"feature": .., "pc1": .., "pc2": ..}, ...]
    }
    """
    n_components = min(2, X_train.shape[1])
    pca = PCA(n_components=n_components, random_state=PCA_RANDOM_STATE)
    X_2d = pca.fit_transform(X_train)

    labels = _get_scatter_labels(y_train, problem_type)

    points = [
        {
            "x"    : round(float(X_2d[i, 0]), 5),
            "y"    : round(float(X_2d[i, 1]), 5) if n_components > 1 else 0.0,
            "label": str(labels[i]),
        }
        for i in range(len(X_2d))
    ]

    explained = pca.explained_variance_ratio_.tolist()

    loadings = []
    components = pca.components_
    for idx, fname in enumerate(feature_names):
        entry = {"feature": fname, "pc1": round(float(components[0, idx]), 4)}
        if n_components > 1:
            entry["pc2"] = round(float(components[1, idx]), 4)
        loadings.append(entry)

    loadings.sort(key=lambda x: abs(x["pc1"]), reverse=True)

    return {
        "points"            : points,
        "explained_variance": [round(v, 4) for v in explained],
        "total_variance"    : round(sum(explained), 4),
        "loadings"          : loadings[:MAX_FEATURES_PLOT],
    }


def _get_scatter_labels(y: np.ndarray, problem_type: str) -> list:
    """For regression targets, bin into 4 quantile buckets for colour-coding."""
    if "classification" in problem_type:
        return y.tolist()
    labels = pd.qcut(y, q=4, labels=["Q1", "Q2", "Q3", "Q4"], duplicates="drop")
    return labels.astype(str).tolist()


# ---------------------------------------------------------------------------
# 3. K-Means Clustering + Elbow Method  (UNCHANGED)
# ---------------------------------------------------------------------------

def _compute_clustering(
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> dict:
    """
    Runs K-Means for K = 2 … MAX_KMEANS_K, records inertia (elbow curve),
    picks the optimal K using the elbow heuristic, then returns cluster
    assignments projected onto the first 2 PCA components for plotting.
    """
    max_k    = min(MAX_KMEANS_K, X_train.shape[0] - 1)
    k_range  = range(ELBOW_MIN_K, max_k + 1)
    inertias = []

    for k in k_range:
        km = KMeans(n_clusters=k, random_state=KMEANS_RANDOM, n_init=10)
        km.fit(X_train)
        inertias.append(float(km.inertia_))

    optimal_k = _find_elbow_k(list(k_range), inertias)

    final_km = KMeans(n_clusters=optimal_k, random_state=KMEANS_RANDOM, n_init=10)
    cluster_labels = final_km.fit_predict(X_train)

    n_components = min(2, X_train.shape[1])
    pca = PCA(n_components=n_components, random_state=PCA_RANDOM_STATE)
    X_2d = pca.fit_transform(X_train)

    cluster_points = [
        {
            "x"      : round(float(X_2d[i, 0]), 5),
            "y"      : round(float(X_2d[i, 1]), 5) if n_components > 1 else 0.0,
            "cluster": int(cluster_labels[i]),
        }
        for i in range(len(X_2d))
    ]

    unique, counts = np.unique(cluster_labels, return_counts=True)
    cluster_sizes  = {int(k): int(v) for k, v in zip(unique, counts)}

    cluster_means = []
    for c in range(optimal_k):
        mask = cluster_labels == c
        mean_vec = X_train[mask].mean(axis=0)
        cluster_means.append({
            "cluster"  : c,
            "size"     : int(mask.sum()),
            "mean_norm": float(np.linalg.norm(mean_vec)),
        })

    return {
        "optimal_k"     : optimal_k,
        "elbow_curve"   : [
            {"k": int(k), "inertia": round(v, 2)}
            for k, v in zip(k_range, inertias)
        ],
        "cluster_points": cluster_points,
        "cluster_sizes" : cluster_sizes,
        "cluster_means" : cluster_means,
    }


def _find_elbow_k(k_range: list[int], inertias: list[float]) -> int:
    """
    Elbow detection via the 'knee' of the inertia curve.
    Uses the distance-from-line (perpendicular) method.
    """
    if len(inertias) < 3:
        return k_range[0]

    x = np.array(k_range, dtype=float)
    y = np.array(inertias, dtype=float)

    x_norm = (x - x.min()) / (x.max() - x.min() + 1e-9)
    y_norm = (y - y.min()) / (y.max() - y.min() + 1e-9)

    vec_line      = np.array([x_norm[-1] - x_norm[0], y_norm[-1] - y_norm[0]])
    vec_line_norm = vec_line / (np.linalg.norm(vec_line) + 1e-9)

    distances = []
    for i in range(len(x_norm)):
        point = np.array([x_norm[i] - x_norm[0], y_norm[i] - y_norm[0]])
        proj  = np.dot(point, vec_line_norm) * vec_line_norm
        dist  = np.linalg.norm(point - proj)
        distances.append(dist)

    elbow_idx = int(np.argmax(distances))
    return int(k_range[elbow_idx])


# ---------------------------------------------------------------------------
# 4. Feature Importance — Random Forest  (UNCHANGED)
# ---------------------------------------------------------------------------

def _compute_feature_importance(
    X_train: np.ndarray,
    y_train: np.ndarray,
    feature_names: list[str],
    problem_type: str,
) -> dict:
    """
    Trains a fast Random Forest and extracts Gini-based feature importances.
    """
    if "classification" in problem_type:
        rf = RandomForestClassifier(
            n_estimators=100, max_depth=8, random_state=42, n_jobs=-1
        )
    else:
        rf = RandomForestRegressor(
            n_estimators=100, max_depth=8, random_state=42, n_jobs=-1
        )

    rf.fit(X_train, y_train)
    importances = rf.feature_importances_

    sorted_idx = np.argsort(importances)[::-1]

    features = [
        {
            "feature"   : feature_names[i],
            "importance": round(float(importances[i]), 6),
            "rank"      : int(rank + 1),
        }
        for rank, i in enumerate(sorted_idx[:MAX_FEATURES_PLOT])
    ]

    top_feature = features[0]["feature"] if features else None

    return {
        "features"   : features,
        "top_feature": top_feature,
    }


# ---------------------------------------------------------------------------
# 5. Association Rule Mining — Apriori  ← NEW
# ---------------------------------------------------------------------------

def run_association_mining(df: pd.DataFrame) -> dict:
    """
    Discovers frequent itemsets and association rules from categorical columns.

    Steps:
      1. Select only object/category columns
      2. Drop columns with > ASSOC_MAX_UNIQUE unique values (too sparse)
      3. One-hot encode with pd.get_dummies()
      4. Run Apriori (min_support=0.1) → frequent itemsets
      5. Generate rules (min_confidence=0.5), sort by confidence DESC
      6. Return top ASSOC_MAX_RULES rules

    Returns safe empty-list structure if dataset has no suitable columns,
    mlxtend is not installed, or any other error occurs.
    """
    # ── Safe empty result returned on any early exit ───────────────────
    empty = {"frequent_itemsets": [], "rules": []}

    try:
        from mlxtend.frequent_patterns import apriori, association_rules
    except ImportError:
        # mlxtend not installed — return gracefully, don't crash the pipeline
        return {**empty, "error": "mlxtend not installed. Run: pip install mlxtend"}

    try:
        # ── 1. Select categorical columns ─────────────────────────────
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        if not cat_cols:
            return {**empty, "note": "No categorical columns found for association mining."}

        # ── 2. Drop high-cardinality columns ──────────────────────────
        # High unique counts (e.g. IDs, names) produce meaningless rules
        usable_cols = [
            col for col in cat_cols
            if df[col].nunique(dropna=True) <= ASSOC_MAX_UNIQUE
        ]

        if not usable_cols:
            return {
                **empty,
                "note": (
                    f"All categorical columns exceed {ASSOC_MAX_UNIQUE} unique values. "
                    "Cannot generate meaningful association rules."
                ),
            }

        # ── 3. One-hot encode ─────────────────────────────────────────
        ohe_df = pd.get_dummies(
            df[usable_cols].fillna("__missing__"),
            prefix_sep="=",         # Column format: "colname=value"
        ).astype(bool)              # mlxtend requires boolean dtype

        # Need at least 10 rows for meaningful support values
        if len(ohe_df) < 10:
            return {**empty, "note": "Dataset too small for association mining (< 10 rows)."}

        # ── 4. Frequent itemsets via Apriori ──────────────────────────
        frequent_itemsets = apriori(
            ohe_df,
            min_support     = ASSOC_MIN_SUPPORT,
            use_colnames    = True,
            max_len         = 3,     # limit itemset length to keep results readable
        )

        if frequent_itemsets.empty:
            return {
                **empty,
                "note": (
                    f"No frequent itemsets found at min_support={ASSOC_MIN_SUPPORT}. "
                    "Try a dataset with more repeated categorical patterns."
                ),
            }

        # ── 5. Generate association rules ─────────────────────────────
        rules_df = association_rules(
            frequent_itemsets,
            metric          = "confidence",
            min_threshold   = ASSOC_MIN_CONFIDENCE,
            num_itemsets    = len(frequent_itemsets),
        )

        # Sort by confidence DESC, then lift DESC as tiebreaker
        rules_df = rules_df.sort_values(
            ["confidence", "lift"],
            ascending=[False, False],
        ).head(ASSOC_MAX_RULES)

        # ── 6. Serialise frequent itemsets ────────────────────────────
        serialised_itemsets = [
            {
                "items"  : sorted(list(row["itemsets"])),   # frozenset → sorted list
                "support": round(float(row["support"]), 4),
            }
            for _, row in frequent_itemsets.iterrows()
        ]

        # Sort by support DESC for display
        serialised_itemsets.sort(key=lambda x: x["support"], reverse=True)

        # ── 7. Serialise rules ────────────────────────────────────────
        serialised_rules = [
            {
                "antecedents": sorted(list(row["antecedents"])),
                "consequents": sorted(list(row["consequents"])),
                "support"    : round(float(row["support"]),    4),
                "confidence" : round(float(row["confidence"]), 4),
                "lift"       : round(float(row["lift"]),       4),
            }
            for _, row in rules_df.iterrows()
        ]

        return {
            "frequent_itemsets": serialised_itemsets,
            "rules"            : serialised_rules,
        }

    except Exception as exc:
        # Non-fatal: return empty result with error message
        return {**empty, "error": str(exc)}


# ---------------------------------------------------------------------------
# 6. Outlier Detection — IQR Method  ← NEW
# ---------------------------------------------------------------------------

def detect_outliers(df: pd.DataFrame) -> dict:
    """
    Detects outliers in every numeric column using the Tukey IQR fence method.

    For each numeric column:
      Q1  = 25th percentile  (ignoring NaN)
      Q3  = 75th percentile  (ignoring NaN)
      IQR = Q3 − Q1
      lower_bound = Q1 − 1.5 × IQR
      upper_bound = Q3 + 1.5 × IQR
      outlier     = value < lower_bound  OR  value > upper_bound

    Returns:
    {
      "outlier_count"          : int,       total outlier cells across all columns
      "outlier_percentage"     : float,     outlier_count / total_non_null_values * 100
      "columns_with_outliers"  : ["col"],   columns that have at least one outlier
      "per_column"             : {          per-column breakdown
          "col_name": {
              "outlier_count"    : int,
              "outlier_pct"      : float,
              "lower_bound"      : float,
              "upper_bound"      : float,
              "min"              : float,
              "max"              : float,
          }, ...
      }
    }

    Returns safe defaults on empty dataset or any error.
    """
    safe_default = {
        "outlier_count"        : 0,
        "outlier_percentage"   : 0.0,
        "columns_with_outliers": [],
        "per_column"           : {},
    }

    try:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        if not numeric_cols:
            return {**safe_default, "note": "No numeric columns found for outlier detection."}

        total_outliers   = 0
        total_non_null   = 0
        cols_with_outliers = []
        per_column       = {}

        for col in numeric_cols:
            series = df[col].dropna()

            if len(series) < 4:
                # Too few values to compute meaningful quartiles
                continue

            q1  = float(series.quantile(0.25))
            q3  = float(series.quantile(0.75))
            iqr = q3 - q1

            lower_bound = q1 - IQR_MULTIPLIER * iqr
            upper_bound = q3 + IQR_MULTIPLIER * iqr

            # Count values outside the fence (ignores NaN — already dropped)
            outlier_mask  = (series < lower_bound) | (series > upper_bound)
            n_outliers    = int(outlier_mask.sum())
            n_total       = len(series)
            outlier_pct   = round(n_outliers / n_total * 100, 2) if n_total else 0.0

            total_outliers += n_outliers
            total_non_null += n_total

            per_column[col] = {
                "outlier_count": n_outliers,
                "outlier_pct"  : outlier_pct,
                "lower_bound"  : round(lower_bound, 4),
                "upper_bound"  : round(upper_bound, 4),
                "min"          : round(float(series.min()), 4),
                "max"          : round(float(series.max()), 4),
            }

            if n_outliers > 0:
                cols_with_outliers.append(col)

        overall_pct = (
            round(total_outliers / total_non_null * 100, 2)
            if total_non_null > 0
            else 0.0
        )

        return {
            "outlier_count"        : total_outliers,
            "outlier_percentage"   : overall_pct,
            "columns_with_outliers": cols_with_outliers,
            "per_column"           : per_column,
        }

    except Exception as exc:
        return {**safe_default, "error": str(exc)}