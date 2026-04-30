"""
SAIDAS — services/insight_generator.py

Generates human-readable insights from all pipeline outputs.

Insight categories:
  1. Dataset overview
  2. Correlation insights
  3. PCA / dimensionality insights
  4. Clustering insights
  5. Feature importance insights
  6. Model performance insights
  7. Model comparison / winner
"""

import numpy as np


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_insights(
    problem_type    : str,
    mining_results  : dict,
    ml_results      : dict,
    dl_results      : dict,
    preprocessing_meta: dict,
    feature_names   : list[str],
    target          : str,
    df_shape        : tuple,
) -> list[str]:
    """
    Produces a list of human-readable insight strings.
    Each string is one self-contained observation.
    """
    insights: list[str] = []

    insights += _dataset_insights(df_shape, problem_type, target, preprocessing_meta)
    insights += _correlation_insights(mining_results.get("correlation", {}))
    insights += _pca_insights(mining_results.get("pca", {}))
    insights += _clustering_insights(mining_results.get("clustering", {}))
    insights += _feature_importance_insights(mining_results.get("feature_importance", {}))
    insights += _model_performance_insights(ml_results, dl_results, problem_type)
    insights += _model_comparison_insights(ml_results, dl_results, problem_type)

    rows, _ = df_shape
    if rows < 100 and not dl_results.get("skipped"):
        insights.append(
            "Deep Learning underperformed due to small dataset size. "
            "Consider using more data for better results."
            )

    return insights


# ---------------------------------------------------------------------------
# 1. Dataset overview insights
# ---------------------------------------------------------------------------

def _dataset_insights(
    df_shape          : tuple,
    problem_type      : str,
    target            : str,
    preprocessing_meta: dict,
) -> list[str]:
    rows, cols = df_shape
    insights   = []

    task_label = {
        "binary_classification"     : "binary classification",
        "multiclass_classification" : "multi-class classification",
        "regression"                : "regression",
    }.get(problem_type, problem_type)

    insights.append(
        f"Dataset contains {rows:,} rows and {cols} columns. "
        f"This is a {task_label} task targeting '{target}'."
    )

    dropped = preprocessing_meta.get("dropped_columns", [])
    if dropped:
        insights.append(
            f"{len(dropped)} fully-empty column(s) were removed before training: "
            f"{', '.join(dropped)}."
        )

    imputed = preprocessing_meta.get("imputed_columns", {})
    if imputed:
        num_imputed = sum(1 for v in imputed.values() if v == "median")
        cat_imputed = sum(1 for v in imputed.values() if v == "mode")
        parts = []
        if num_imputed:
            parts.append(f"{num_imputed} numeric column(s) via median")
        if cat_imputed:
            parts.append(f"{cat_imputed} categorical column(s) via mode")
        insights.append(
            f"Missing values were imputed in {len(imputed)} column(s): {'; '.join(parts)}."
        )

    n_features = preprocessing_meta.get("final_feature_count", 0)
    insights.append(
        f"After preprocessing, the model was trained on {n_features} feature(s)."
    )

    return insights


# ---------------------------------------------------------------------------
# 2. Correlation insights
# ---------------------------------------------------------------------------

def _correlation_insights(corr_data: dict) -> list[str]:
    if not corr_data:
        return []

    insights     = []
    strong_pairs = corr_data.get("strong_pairs", [])

    if not strong_pairs:
        insights.append(
            "No strong linear correlations (|r| ≥ 0.70) were detected between numeric features."
        )
        return insights

    # Top 3 strongest correlations
    for pair in strong_pairs[:3]:
        direction = "positive" if pair["r"] > 0 else "negative"
        strength  = "very strong" if abs(pair["r"]) >= 0.90 else "strong"
        insights.append(
            f"{strength.capitalize()} {direction} correlation detected between "
            f"'{pair['col_a']}' and '{pair['col_b']}' (r = {pair['r']:.2f})."
        )

    if len(strong_pairs) > 3:
        insights.append(
            f"{len(strong_pairs) - 3} additional strong correlation(s) exist in the dataset — "
            "consider feature selection to reduce multicollinearity."
        )

    return insights


# ---------------------------------------------------------------------------
# 3. PCA insights
# ---------------------------------------------------------------------------

def _pca_insights(pca_data: dict) -> list[str]:
    if not pca_data:
        return []

    insights         = []
    explained        = pca_data.get("explained_variance", [])
    total_variance   = pca_data.get("total_variance", 0)
    loadings         = pca_data.get("loadings", [])

    if explained:
        insights.append(
            f"PCA: the first two principal components explain "
            f"{total_variance * 100:.1f}% of total variance "
            f"(PC1: {explained[0]*100:.1f}%, PC2: {explained[1]*100:.1f}%)."
            if len(explained) > 1
            else f"(PC1: {explained[0]*100:.1f}%)."
        )

    if loadings:
        top = loadings[0]
        insights.append(
            f"'{top['feature']}' is the dominant contributor to the first principal component "
            f"(loading: {top['pc1']:.3f})."
        )

    if total_variance < 0.50:
        insights.append(
            "Two components capture less than 50% of variance — "
            "the dataset has high intrinsic dimensionality."
        )
    elif total_variance >= 0.80:
        insights.append(
            "Two components capture ≥ 80% of variance — "
            "the dataset is effectively low-dimensional."
        )

    return insights


# ---------------------------------------------------------------------------
# 4. Clustering insights
# ---------------------------------------------------------------------------

def _clustering_insights(cluster_data: dict) -> list[str]:
    if not cluster_data:
        return []

    insights  = []
    optimal_k = cluster_data.get("optimal_k", 2)
    sizes     = cluster_data.get("cluster_sizes", {})
    means     = cluster_data.get("cluster_means", [])

    insights.append(
        f"K-Means elbow analysis identified {optimal_k} natural cluster(s) in the data."
    )

    if sizes:
        largest_cluster  = max(sizes, key=sizes.get)
        smallest_cluster = min(sizes, key=sizes.get)
        total            = sum(sizes.values())

        insights.append(
            f"Cluster {largest_cluster} is the largest, containing "
            f"{sizes[largest_cluster]:,} samples "
            f"({sizes[largest_cluster]/total*100:.1f}% of training data)."
        )

        if sizes[smallest_cluster] / total < 0.10:
            insights.append(
                f"Cluster {smallest_cluster} is a minority cluster "
                f"({sizes[smallest_cluster]:,} samples, "
                f"{sizes[smallest_cluster]/total*100:.1f}%) — "
                "may represent outliers or a niche segment."
            )

    # Identify high-value cluster (highest mean norm in feature space)
    if means:
        high_cluster = max(means, key=lambda c: c["mean_norm"])
        insights.append(
            f"Cluster {high_cluster['cluster']} shows the highest average feature magnitude "
            f"— it likely represents high-value or extreme-behaviour samples."
        )

    return insights


# ---------------------------------------------------------------------------
# 5. Feature importance insights
# ---------------------------------------------------------------------------

def _feature_importance_insights(fi_data: dict) -> list[str]:
    if not fi_data:
        return []

    insights    = []
    features    = fi_data.get("features", [])
    top_feature = fi_data.get("top_feature")

    if not features:
        return insights

    top3 = features[:3]

    if top_feature:
        top_imp = features[0]["importance"]
        insights.append(
            f"'{top_feature}' is the most influential feature "
            f"(importance score: {top_imp:.4f})."
        )

    if len(top3) >= 3:
        names = [f["feature"] for f in top3]
        total_imp = sum(f["importance"] for f in top3)
        insights.append(
            f"The top 3 features — {', '.join(names)} — "
            f"collectively account for {total_imp*100:.1f}% of total predictive importance."
        )

    # Warn if bottom features have near-zero importance
    low_importance = [f for f in features if f["importance"] < 0.01]
    if low_importance:
        insights.append(
            f"{len(low_importance)} feature(s) have importance < 1% and may be candidates "
            "for removal to simplify the model."
        )

    return insights


# ---------------------------------------------------------------------------
# 6. Individual model performance insights
# ---------------------------------------------------------------------------

def _model_performance_insights(
    ml_results  : dict,
    dl_results  : dict,
    problem_type: str,
) -> list[str]:
    insights = []
    is_clf   = "classification" in problem_type

    for model_name, metrics in ml_results.items():
        if not isinstance(metrics, dict) or "error" in metrics:
            continue

        if is_clf:
            acc = metrics.get("accuracy", 0)
            f1  = metrics.get("f1_score", 0)
            insights.append(
                f"{model_name}: accuracy = {acc*100:.2f}%, F1 = {f1:.4f}."
            )
        else:
            rmse = metrics.get("rmse", 0)
            r2   = metrics.get("r2", 0)
            insights.append(
                f"{model_name}: RMSE = {rmse:.4f}, R² = {r2:.4f}."
            )

    if dl_results and "error" not in dl_results and not dl_results.get("skipped"):
        if is_clf:
            acc = dl_results.get("accuracy", 0)
            ep  = dl_results.get("epochs_trained", "?")
            insights.append(
                f"Deep Learning MLP: accuracy = {acc*100:.2f}% "
                f"(trained for {ep} epoch(s) with early stopping)."
            )
        else:
            rmse = dl_results.get("rmse", 0)
            r2   = dl_results.get("r2", 0)
            ep   = dl_results.get("epochs_trained", "?")
            insights.append(
                f"Deep Learning MLP: RMSE = {rmse:.4f}, R² = {r2:.4f} "
                f"({ep} epoch(s) with early stopping)."
            )
    elif dl_results and dl_results.get("skipped"):
        insights.append("Deep Learning model was skipped due to insufficient data.")

    return insights


# ---------------------------------------------------------------------------
# 7. Cross-model comparison insights
# ---------------------------------------------------------------------------

def _model_comparison_insights(
    ml_results  : dict,
    dl_results  : dict,
    problem_type: str,
) -> list[str]:
    insights = []
    is_clf   = "classification" in problem_type

    # Collect (model_name, primary_metric) pairs
    scores = {}

    for name, metrics in ml_results.items():
        if not isinstance(metrics, dict) or "error" in metrics:
            continue
        key = "accuracy" if is_clf else "rmse"
        if key in metrics:
            scores[name] = metrics[key]

    if dl_results and "error" not in dl_results and not dl_results.get("skipped"):
        key = "accuracy" if is_clf else "rmse"
        if key in dl_results:
            scores["Deep Learning (MLP)"] = dl_results[key]

    if not scores:
        return insights

    if is_clf:
        best_name  = max(scores, key=scores.get)
        worst_name = min(scores, key=scores.get)
        best_score = scores[best_name]
        gap        = best_score - scores[worst_name]

        insights.append(
            f"Best performing model: {best_name} "
            f"(accuracy: {best_score*100:.2f}%)."
        )

        if gap > 0.02:
            insights.append(
                f"{best_name} outperforms {worst_name} by "
                f"{gap*100:.2f} percentage points."
            )

        dl_score = scores.get("Deep Learning (MLP)")
        ml_best  = max(
            {k: v for k, v in scores.items() if k != "Deep Learning (MLP)"},
            key=lambda k: scores[k],
            default=None,
        )
        if dl_score and ml_best:
            diff = dl_score - scores[ml_best]
            if diff > 0:
                insights.append(
                    f"Deep Learning outperformed the best ML model ({ml_best}) "
                    f"by {diff*100:.2f}%."
                )
            elif diff < 0:
                insights.append(
                    f"Classical ML ({ml_best}) matched or outperformed Deep Learning "
                    f"— likely due to dataset size or linearity."
                )

    else:
        # Regression: lower RMSE wins
        best_name  = min(scores, key=scores.get)
        best_score = scores[best_name]

        insights.append(
            f"Best performing model: {best_name} (RMSE: {best_score:.4f})."
        )

        dl_score = scores.get("Deep Learning (MLP)")
        ml_best  = min(
            {k: v for k, v in scores.items() if k != "Deep Learning (MLP)"},
            key=lambda k: scores[k],
            default=None,
        )
        if dl_score and ml_best:
            diff = scores[ml_best] - dl_score
            if diff > 0:
                insights.append(
                    f"Deep Learning achieved lower RMSE than {ml_best} "
                    f"by {diff:.4f} — better generalisation on this dataset."
                )
            elif diff < 0:
                insights.append(
                    f"Classical ML ({ml_best}) achieved lower RMSE than Deep Learning "
                    f"— simpler models may be more appropriate for this dataset size."
                )

    return insights