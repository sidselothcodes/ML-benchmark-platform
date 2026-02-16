"""Metrics collection for inference benchmarking."""

from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field

import numpy as np


@dataclass
class InferenceMetric:
    """A single recorded inference measurement."""
    optimization_mode: str
    latency_ms: float
    tokens_per_sec: float
    memory_mb: float
    tokens_generated: int
    timestamp: float = field(default_factory=time.time)


class MetricsCollector:
    """Thread-safe collector that records inference metrics and computes aggregates."""

    def __init__(self, max_history: int = 10_000):
        self._metrics: list[InferenceMetric] = []
        self._lock = threading.Lock()
        self._max_history = max_history

    def record(self, metric: InferenceMetric) -> None:
        with self._lock:
            self._metrics.append(metric)
            if len(self._metrics) > self._max_history:
                self._metrics = self._metrics[-self._max_history:]

    def get_metrics_by_mode(self, mode: str) -> list[InferenceMetric]:
        with self._lock:
            return [m for m in self._metrics if m.optimization_mode == mode]

    def get_all_metrics(self) -> list[InferenceMetric]:
        with self._lock:
            return list(self._metrics)

    def get_summary(self, mode: str) -> dict:
        """Compute aggregate statistics for a given optimization mode."""
        metrics = self.get_metrics_by_mode(mode)
        if not metrics:
            return {
                "mode": mode,
                "count": 0,
                "latency": {},
                "throughput": {},
                "memory": {},
            }

        latencies = np.array([m.latency_ms for m in metrics])
        throughputs = np.array([m.tokens_per_sec for m in metrics])
        memories = np.array([m.memory_mb for m in metrics])

        return {
            "mode": mode,
            "count": len(metrics),
            "latency": {
                "mean": float(np.mean(latencies)),
                "p50": float(np.percentile(latencies, 50)),
                "p95": float(np.percentile(latencies, 95)),
                "p99": float(np.percentile(latencies, 99)),
                "min": float(np.min(latencies)),
                "max": float(np.max(latencies)),
            },
            "throughput": {
                "mean_tokens_per_sec": float(np.mean(throughputs)),
                "max_tokens_per_sec": float(np.max(throughputs)),
                "requests_per_sec": len(metrics) / max(
                    metrics[-1].timestamp - metrics[0].timestamp, 0.001
                ) if len(metrics) > 1 else 0.0,
            },
            "memory": {
                "mean_mb": float(np.mean(memories)),
                "peak_mb": float(np.max(memories)),
            },
        }

    def get_all_summaries(self) -> dict:
        """Get summaries for all optimization modes."""
        modes = set()
        with self._lock:
            for m in self._metrics:
                modes.add(m.optimization_mode)

        return {mode: self.get_summary(mode) for mode in sorted(modes)}

    def get_recent(self, n: int = 50) -> list[dict]:
        """Get the most recent n metrics as dicts for SSE streaming."""
        with self._lock:
            recent = self._metrics[-n:]
        return [
            {
                "mode": m.optimization_mode,
                "latency_ms": round(m.latency_ms, 2),
                "tokens_per_sec": round(m.tokens_per_sec, 2),
                "memory_mb": round(m.memory_mb, 2),
                "tokens_generated": m.tokens_generated,
                "timestamp": m.timestamp,
            }
            for m in recent
        ]

    def clear(self) -> None:
        with self._lock:
            self._metrics.clear()
