"""
SAIDAS — services/data_mining.py  (STABILISED v2)

Data Mining pipeline — all 6 algorithms, safe for small–large datasets:
  1. Pearson Correlation Matrix
  2. PCA (2-D projection)
  3. K-Means + Elbow + Silhouette Score    ← ADDED silhouette
  4. Feature Importance (Random Forest)
  5. Association Rule Mining (Apriori)     ← safe, skips large datasets
  6. Outlier Detection (IQR)

CHANGES IN THIS VERSION
───────────────────────
• _safe_numeric_df()     NEW — converts every column to float, fills NaN with 0
• Row cap (2 000)        NEW — limits heavy computation on large datasets
• Apriori guard          CHANGED — skipped if rows > ROW_CAP_ASSOC
• Silhouette score       ADDED — returned inside clustering result
• All functions wrapped  CHANGED — individual try/except, never crashes pipeline
• Dynamic K ceiling      CHANGED — MAX_KMEANS_K scales with dataset size
• PCA sample cap         ADDED — scatter points capped at 600 for JSON size
"""

import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import LabelEncoder

# ---------------------------------------------------------------------------
# Tunable constants
# ---------------------------------------------------------------------------

MAX_KMEANS_K          = 10     # Hard ceiling for K search
ELBOW_MIN_K           = 2
CORR_STRONG           = 0.7    # |r| threshold for "strong" pair
MAX_FEATURES_PLOT     = 15     # Top-N features in importance chart
PCA_RANDOM_STATE      = 42
KMEANS_RANDOM         = 42
PCA_SCATTER_CAP       = 600    # Max scatter points sent to frontend
ROW_CAP               = 2000  # Rows above this → skip DL + Apriori, subsample
ROW_CAP_ASSOC         = 2000    # Apriori cap (even stricter — combinatorial)

# Apriori parameters
ASSOC_MAX_UNIQUE     = 15
ASSOC_MIN_SUPPORT    = 0.1
ASSOC_MIN_CONFIDENCE = 0.5
ASSOC_MAX_RULES      = 20

# IQR outlier fence
IQR_MULTIPLIER = 1.5


# ---------------------------------------------------------------------------
# Public entry point
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
    Runs all six data-mining algorithms.
    Each algorithm is wrapped individually — one failure never blocks others.
    Returns a single JSON-serialisable dict.
    """
    n_rows    = len(df)
    is_large  = n_rows > ROW_CAP        # flag used by callers (process.py)
    results   = {"_dataset_rows": n_rows, "_is_large": is_large}

    # ── 1. Correlation ─────────────────────────────────────────────────
    try:
        results["correlation"] = _compute_correlation(df, target)
    except Exception as e:
        results["correlation"] = {"error": str(e), "columns": [], "matrix": [], "strong_pairs": []}

    # ── 2. PCA ─────────────────────────────────────────────────────────
    try:
        results["pca"] = _compute_pca(X_train, y_train, feature_names, problem_type)
    except Exception as e:
        results["pca"] = {"error": str(e), "points": [], "explained_variance": [], "total_variance": 0}

    # ── 3. Clustering ──────────────────────────────────────────────────
    try:
        results["clustering"] = _compute_clustering(X_train, y_train, n_rows)
    except Exception as e:
        results["clustering"] = {"error": str(e), "optimal_k": 2, "elbow_curve": [], "cluster_points": [], "cluster_sizes": {}}

    # ── 4. Feature Importance ──────────────────────────────────────────
    try:
        results["feature_importance"] = _compute_feature_importance(
            X_train, y_train, feature_names, problem_type
        )
    except Exception as e:
        results["feature_importance"] = {"error": str(e), "features": [], "top_feature": None}

    # ── 5. Association Rules (skipped on large datasets) ───────────────
    if n_rows > ROW_CAP_ASSOC:
        results["association_rules"] = {
            "frequent_itemsets": [],
            "rules": [],
            "note": f"Skipped — dataset has {n_rows} rows (limit: {ROW_CAP_ASSOC}).",
        }
    else:
        try:
            results["association_rules"] = run_association_mining(df)
        except Exception as e:
            results["association_rules"] = {"frequent_itemsets": [], "rules": [], "error": str(e)}

    # ── 6. Outlier Detection ───────────────────────────────────────────
    try:
        results["outliers"] = detect_outliers(df)
    except Exception as e:
        results["outliers"] = {"outlier_count": 0, "outlier_percentage": 0.0,
                                "columns_with_outliers": [], "per_column": {}, "error": str(e)}

    return results


# ---------------------------------------------------------------------------
# Internal helper — convert entire DataFrame to safe numeric
# ---------------------------------------------------------------------------

def _safe_numeric_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    ADDED v2.
    Converts every column to float using LabelEncoder for categorical cols.
    Fills remaining NaN with 0.  Returns a clean numeric-only DataFrame.
    """
    out = df.copy()
    for col in out.columns:
        if out[col].dtype == object or str(out[col].dtype) == "category":
            le = LabelEncoder()
            # Fill NaN first so LabelEncoder doesn't choke
            out[col] = out[col].fillna("__missing__").astype(str)
            out[col] = le.fit_transform(out[col]).astype(float)
        else:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    return out.fillna(0)


# ---------------------------------------------------------------------------
# 1. Pearson Correlation Matrix
# ---------------------------------------------------------------------------

def _compute_correlation(df: pd.DataFrame, target: str) -> dict:
    """
    Pearson correlation on numeric columns.
    CHANGED v2: uses _safe_numeric_df so categorical cols are included.
    """
    numeric_df = _safe_numeric_df(df)

    # Limit to 20 columns max for readable heatmap
    cols_to_use = numeric_df.columns.tolist()
    if len(cols_to_use) > 20:
        # Keep target + top-19 most-varied columns
        variances   = numeric_df.var().drop(target, errors="ignore").nlargest(19).index.tolist()
        cols_to_use = ([target] if target in numeric_df.columns else []) + variances
        numeric_df  = numeric_df[cols_to_use]

    corr_matrix   = numeric_df.corr(method="pearson")
    columns        = corr_matrix.columns.tolist()
    matrix_values  = np.nan_to_num(corr_matrix.values, nan=0.0).tolist()

    strong_pairs = []
    for i in range(len(columns)):
        for j in range(i + 1, len(columns)):
            r = corr_matrix.iloc[i, j]
            if not np.isnan(r) and abs(r) >= CORR_STRONG:
                strong_pairs.append({
                    "col_a": columns[i],
                    "col_b": columns[j],
                    "r"    : round(float(r), 4),
                })

    return {
        "columns"     : columns,
        "matrix"      : matrix_values,
        "strong_pairs": sorted(strong_pairs, key=lambda x: abs(x["r"]), reverse=True),
    }


# ---------------------------------------------------------------------------
# 2. PCA — 2-D Projection
# ---------------------------------------------------------------------------

def _compute_pca(
    X_train     : np.ndarray,
    y_train     : np.ndarray,
    feature_names: list[str],
    problem_type: str,
) -> dict:
    """
    2-D PCA scatter.
    CHANGED v2: scatter points capped at PCA_SCATTER_CAP for JSON size.
    """
    n_components = min(2, X_train.shape[1])
    pca          = PCA(n_components=n_components, random_state=PCA_RANDOM_STATE)
    X_2d         = pca.fit_transform(X_train)
    labels       = _get_scatter_labels(y_train, problem_type)

    # Subsample scatter for large datasets
    n          = len(X_2d)
    step       = max(1, n // PCA_SCATTER_CAP)
    idx        = list(range(0, n, step))

    points = [
        {
            "x"    : round(float(X_2d[i, 0]), 5),
            "y"    : round(float(X_2d[i, 1]), 5) if n_components > 1 else 0.0,
            "label": str(labels[i]),
        }
        for i in idx
    ]

    explained = pca.explained_variance_ratio_.tolist()

    loadings = []
    for feat_idx, fname in enumerate(feature_names):
        entry = {"feature": fname, "pc1": round(float(pca.components_[0, feat_idx]), 4)}
        if n_components > 1:
            entry["pc2"] = round(float(pca.components_[1, feat_idx]), 4)
        loadings.append(entry)
    loadings.sort(key=lambda x: abs(x["pc1"]), reverse=True)

    return {
        "points"            : points,
        "explained_variance": [round(v, 4) for v in explained],
        "total_variance"    : round(sum(explained), 4),
        "loadings"          : loadings[:MAX_FEATURES_PLOT],
    }


def _get_scatter_labels(y: np.ndarray, problem_type: str) -> list:
    if "classification" in problem_type:
        return y.tolist()
    labels = pd.qcut(y, q=4, labels=["Q1", "Q2", "Q3", "Q4"], duplicates="drop")
    return labels.astype(str).tolist()


# ---------------------------------------------------------------------------
# 3. K-Means + Elbow + Silhouette Score
# ---------------------------------------------------------------------------

def _compute_clustering(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_rows : int,
) -> dict:
    """
    K-Means with elbow detection.
    ADDED v2:
      • Dynamic K ceiling (scales with dataset size)
      • Silhouette score on final clusters
      • Scatter capped at PCA_SCATTER_CAP
    """
    # Dynamic K ceiling — don't search more Ks than sqrt(rows/2)
    dynamic_max_k = min(MAX_KMEANS_K, max(2, int(np.sqrt(n_rows / 2))))
    max_k         = min(dynamic_max_k, X_train.shape[0] - 1)
    k_range       = range(ELBOW_MIN_K, max_k + 1)
    inertias      = []

    for k in k_range:
        km = KMeans(n_clusters=k, random_state=KMEANS_RANDOM, n_init=10)
        km.fit(X_train)
        inertias.append(float(km.inertia_))

    optimal_k      = _find_elbow_k(list(k_range), inertias)
    final_km       = KMeans(n_clusters=optimal_k, random_state=KMEANS_RANDOM, n_init=10)
    cluster_labels = final_km.fit_predict(X_train)

    # Silhouette score (ADDED v2)
    sil_score = None
    if optimal_k >= 2 and len(X_train) > optimal_k:
        try:
            sil_score = round(float(silhouette_score(X_train, cluster_labels, sample_size=min(500, len(X_train)))), 4)
        except Exception:
            sil_score = None

    # PCA 2-D for scatter
    n_components   = min(2, X_train.shape[1])
    pca            = PCA(n_components=n_components, random_state=PCA_RANDOM_STATE)
    X_2d           = pca.fit_transform(X_train)

    n              = len(X_2d)
    step           = max(1, n // PCA_SCATTER_CAP)
    idx            = list(range(0, n, step))

    cluster_points = [
        {
            "x"      : round(float(X_2d[i, 0]), 5),
            "y"      : round(float(X_2d[i, 1]), 5) if n_components > 1 else 0.0,
            "cluster": int(cluster_labels[i]),
        }
        for i in idx
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
            "mean_norm": round(float(np.linalg.norm(mean_vec)), 4),
        })

    return {
        "optimal_k"        : optimal_k,
        "silhouette_score" : sil_score,          # ADDED v2
        "elbow_curve"      : [
            {"k": int(k), "inertia": round(v, 2)}
            for k, v in zip(k_range, inertias)
        ],
        "cluster_points"   : cluster_points,
        "cluster_sizes"    : cluster_sizes,
        "cluster_means"    : cluster_means,
    }


def _find_elbow_k(k_range: list[int], inertias: list[float]) -> int:
    """Perpendicular-distance elbow heuristic."""
    if len(inertias) < 3:
        return k_range[0]

    x      = np.array(k_range, dtype=float)
    y      = np.array(inertias, dtype=float)
    x_norm = (x - x.min()) / (x.max() - x.min() + 1e-9)
    y_norm = (y - y.min()) / (y.max() - y.min() + 1e-9)

    vec       = np.array([x_norm[-1] - x_norm[0], y_norm[-1] - y_norm[0]])
    vec_norm  = vec / (np.linalg.norm(vec) + 1e-9)

    distances = []
    for i in range(len(x_norm)):
        pt   = np.array([x_norm[i] - x_norm[0], y_norm[i] - y_norm[0]])
        proj = np.dot(pt, vec_norm) * vec_norm
        distances.append(float(np.linalg.norm(pt - proj)))

    return int(k_range[int(np.argmax(distances))])


# ---------------------------------------------------------------------------
# 4. Feature Importance — Random Forest
# ---------------------------------------------------------------------------

def _compute_feature_importance(
    X_train     : np.ndarray,
    y_train     : np.ndarray,
    feature_names: list[str],
    problem_type: str,
) -> dict:
    """Random-Forest Gini importance. Unchanged logic, wrapped by caller."""
    rf = (
        RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
        if "classification" in problem_type
        else RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    )
    rf.fit(X_train, y_train)

    importances = rf.feature_importances_
    sorted_idx  = np.argsort(importances)[::-1]

    features = [
        {
            "feature"   : feature_names[i],
            "importance": round(float(importances[i]), 6),
            "rank"      : int(rank + 1),
        }
        for rank, i in enumerate(sorted_idx[:MAX_FEATURES_PLOT])
    ]

    return {
        "features"   : features,
        "top_feature": features[0]["feature"] if features else None,
    }


# ---------------------------------------------------------------------------
# 5. Association Rule Mining — Apriori
# ---------------------------------------------------------------------------

def run_association_mining(df: pd.DataFrame) -> dict:
    """
    Apriori on categorical columns only.
    CHANGED v2: stricter guards, better error messages, skips high-cardinality cols.
    Caller in run_data_mining() already gates on ROW_CAP_ASSOC.
    """
    empty = {"frequent_itemsets": [], "rules": []}

    try:
        from mlxtend.frequent_patterns import apriori, association_rules
    except ImportError:
        return {**empty, "error": "mlxtend not installed — run: pip install mlxtend==0.23.1"}

    try:
        cat_cols   = df.select_dtypes(include=["object", "category"]).columns.tolist()
        usable     = [c for c in cat_cols if 2 <= df[c].nunique(dropna=True) <= ASSOC_MAX_UNIQUE]

        if not usable:
            return {**empty, "note": "No suitable categorical columns for association mining."}

        ohe_df = pd.get_dummies(
            df[usable].fillna("__missing__").astype(str),
            prefix_sep="=",
        ).astype(bool)

        if len(ohe_df) < 10:
            return {**empty, "note": "Too few rows for association mining."}

        freq = apriori(ohe_df, min_support=ASSOC_MIN_SUPPORT,
                       use_colnames=True, max_len=3)

        if freq.empty:
            return {**empty, "note": f"No frequent itemsets found at support ≥ {ASSOC_MIN_SUPPORT}."}

        rules_df = association_rules(
            freq,
            metric="confidence",
            min_threshold=ASSOC_MIN_CONFIDENCE
            ).sort_values(["confidence", "lift"], ascending=False).head(ASSOC_MAX_RULES)

        serialised_itemsets = sorted(
            [{"items": sorted(list(r["itemsets"])), "support": round(float(r["support"]), 4)}
             for _, r in freq.iterrows()],
            key=lambda x: x["support"], reverse=True,
        )

        serialised_rules = [
            {
                "antecedents": sorted(list(r["antecedents"])),
                "consequents": sorted(list(r["consequents"])),
                "support"    : round(float(r["support"]),    4),
                "confidence" : round(float(r["confidence"]), 4),
                "lift"       : round(float(r["lift"]),       4),
            }
            for _, r in rules_df.iterrows()
        ]

        return {"frequent_itemsets": serialised_itemsets, "rules": serialised_rules, "min_support": ASSOC_MIN_SUPPORT, "min_confidence": ASSOC_MIN_CONFIDENCE,}

    except Exception as exc:
        return {**empty, "error": str(exc)}


# ---------------------------------------------------------------------------
# 6. Outlier Detection — IQR
# ---------------------------------------------------------------------------

def detect_outliers(df: pd.DataFrame) -> dict:
    """
    IQR fence outlier detection.
    CHANGED v2: skips columns with < 4 non-null values, never crashes.
    """
    safe = {"outlier_count": 0, "outlier_percentage": 0.0,
            "columns_with_outliers": [], "per_column": {}}
    try:
        numeric_cols   = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            return {**safe, "note": "No numeric columns."}

        total_outliers = 0
        total_valid    = 0
        cols_flagged   = []
        per_column     = {}

        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 4:
                continue

            q1  = float(series.quantile(0.25))
            q3  = float(series.quantile(0.75))
            iqr = q3 - q1
            lo  = q1 - IQR_MULTIPLIER * iqr
            hi  = q3 + IQR_MULTIPLIER * iqr

            mask       = (series < lo) | (series > hi)
            n_out      = int(mask.sum())
            n_total    = len(series)
            pct        = round(n_out / n_total * 100, 2) if n_total else 0.0

            total_outliers += n_out
            total_valid    += n_total
            per_column[col] = {
                "outlier_count": n_out,
                "outlier_pct"  : pct,
                "lower_bound"  : round(lo, 4),
                "upper_bound"  : round(hi, 4),
                "min"          : round(float(series.min()), 4),
                "max"          : round(float(series.max()), 4),
            }
            if n_out > 0:
                cols_flagged.append(col)

        overall_pct = round(total_outliers / total_valid * 100, 2) if total_valid else 0.0
        return {
            "outlier_count"        : total_outliers,
            "outlier_percentage"   : overall_pct,
            "columns_with_outliers": cols_flagged,
            "per_column"           : per_column,
        }
    except Exception as exc:
        return {**safe, "error": str(exc)}