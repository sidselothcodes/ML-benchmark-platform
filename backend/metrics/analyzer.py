"""Analysis utilities for benchmark metrics."""

from __future__ import annotations

import numpy as np

# Estimated cost per 1M tokens based on cloud GPU pricing (rough estimates)
COST_PER_GPU_HOUR = 1.50  # A10G-equivalent


def compute_percentiles(values: list[float], percentiles: list[int] | None = None) -> dict:
    """Compute percentile statistics for a list of values."""
    if not values:
        return {}
    if percentiles is None:
        percentiles = [50, 90, 95, 99]
    arr = np.array(values)
    result = {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
    }
    for p in percentiles:
        result[f"p{p}"] = float(np.percentile(arr, p))
    return result


def estimate_cost_per_million_tokens(tokens_per_sec: float) -> float:
    """Estimate cost per 1M tokens based on throughput.

    Assumes a cloud GPU at $COST_PER_GPU_HOUR per hour.
    """
    if tokens_per_sec <= 0:
        return float("inf")
    seconds_per_million = 1_000_000 / tokens_per_sec
    hours_per_million = seconds_per_million / 3600
    return round(hours_per_million * COST_PER_GPU_HOUR, 4)


def compute_speedup(baseline_latency: float, optimized_latency: float) -> float:
    """Compute speedup factor relative to baseline."""
    if optimized_latency <= 0:
        return 0.0
    return round(baseline_latency / optimized_latency, 2)


def generate_comparison_report(summaries: dict) -> dict:
    """Generate a comparison report across all optimization modes."""
    if "baseline" not in summaries or summaries["baseline"]["count"] == 0:
        return {"error": "No baseline metrics available for comparison"}

    baseline_latency = summaries["baseline"]["latency"]["mean"]
    report = {}

    for mode, summary in summaries.items():
        if summary["count"] == 0:
            continue
        mean_latency = summary["latency"]["mean"]
        mean_throughput = summary["throughput"]["mean_tokens_per_sec"]

        report[mode] = {
            **summary,
            "speedup": compute_speedup(baseline_latency, mean_latency),
            "estimated_cost_per_1m_tokens": estimate_cost_per_million_tokens(mean_throughput),
        }

    return report
