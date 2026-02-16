"""Tests for the metrics collection and analysis layer."""

import time
import pytest
from backend.metrics.collector import MetricsCollector, InferenceMetric
from backend.metrics.analyzer import (
    compute_percentiles,
    estimate_cost_per_million_tokens,
    compute_speedup,
)


class TestMetricsCollector:
    def setup_method(self):
        self.collector = MetricsCollector()

    def test_record_and_retrieve(self):
        metric = InferenceMetric(
            optimization_mode="baseline",
            latency_ms=100.0,
            tokens_per_sec=50.0,
            memory_mb=500.0,
            tokens_generated=25,
        )
        self.collector.record(metric)
        assert len(self.collector.get_all_metrics()) == 1
        assert self.collector.get_metrics_by_mode("baseline") == [metric]
        assert self.collector.get_metrics_by_mode("quantized") == []

    def test_summary_empty(self):
        summary = self.collector.get_summary("baseline")
        assert summary["count"] == 0

    def test_summary_with_data(self):
        for lat in [100.0, 200.0, 300.0]:
            self.collector.record(InferenceMetric(
                optimization_mode="baseline",
                latency_ms=lat,
                tokens_per_sec=50.0,
                memory_mb=500.0,
                tokens_generated=25,
            ))
        summary = self.collector.get_summary("baseline")
        assert summary["count"] == 3
        assert summary["latency"]["mean"] == 200.0
        assert summary["latency"]["min"] == 100.0
        assert summary["latency"]["max"] == 300.0

    def test_max_history_eviction(self):
        collector = MetricsCollector(max_history=5)
        for i in range(10):
            collector.record(InferenceMetric(
                optimization_mode="baseline",
                latency_ms=float(i),
                tokens_per_sec=1.0,
                memory_mb=1.0,
                tokens_generated=1,
            ))
        assert len(collector.get_all_metrics()) == 5

    def test_get_recent(self):
        for i in range(5):
            self.collector.record(InferenceMetric(
                optimization_mode="baseline",
                latency_ms=float(i),
                tokens_per_sec=1.0,
                memory_mb=1.0,
                tokens_generated=1,
            ))
        recent = self.collector.get_recent(3)
        assert len(recent) == 3
        assert recent[0]["latency_ms"] == 2.0

    def test_clear(self):
        self.collector.record(InferenceMetric(
            optimization_mode="baseline",
            latency_ms=100.0,
            tokens_per_sec=50.0,
            memory_mb=500.0,
            tokens_generated=25,
        ))
        self.collector.clear()
        assert len(self.collector.get_all_metrics()) == 0


class TestAnalyzer:
    def test_compute_percentiles(self):
        values = list(range(1, 101))  # 1..100
        result = compute_percentiles(values)
        assert result["mean"] == 50.5
        assert result["p50"] == 50.5
        assert result["min"] == 1.0
        assert result["max"] == 100.0

    def test_compute_percentiles_empty(self):
        assert compute_percentiles([]) == {}

    def test_estimate_cost(self):
        cost = estimate_cost_per_million_tokens(100.0)
        assert cost > 0

    def test_estimate_cost_zero_throughput(self):
        cost = estimate_cost_per_million_tokens(0.0)
        assert cost == float("inf")

    def test_compute_speedup(self):
        assert compute_speedup(100.0, 50.0) == 2.0
        assert compute_speedup(100.0, 100.0) == 1.0
        assert compute_speedup(100.0, 0.0) == 0.0
