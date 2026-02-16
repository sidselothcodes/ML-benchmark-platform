"""Tests for the FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient

from backend.app import app


@pytest.fixture(scope="module")
def client():
    """Create a test client that triggers lifespan (model loading)."""
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


class TestInferenceEndpoint:
    def test_baseline_inference(self, client):
        resp = client.post("/api/inference", json={
            "text": "Hello world",
            "optimization_mode": "baseline",
            "max_new_tokens": 10,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "result" in data
        assert data["latency_ms"] > 0
        assert data["optimization_mode"] == "baseline"

    def test_invalid_mode(self, client):
        resp = client.post("/api/inference", json={
            "text": "Hello",
            "optimization_mode": "invalid_mode",
        })
        assert resp.status_code == 422

    def test_empty_text_rejected(self, client):
        resp = client.post("/api/inference", json={
            "text": "",
            "optimization_mode": "baseline",
        })
        assert resp.status_code == 422


class TestMetricsEndpoint:
    def test_metrics_returns_200(self, client):
        # First run an inference to generate metrics
        client.post("/api/inference", json={
            "text": "Test input",
            "optimization_mode": "baseline",
            "max_new_tokens": 5,
        })
        resp = client.get("/api/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "summaries" in data
        assert "total_inferences" in data


class TestModelsEndpoint:
    def test_models_returns_info(self, client):
        resp = client.get("/api/models")
        assert resp.status_code == 200
        data = resp.json()
        assert "baseline" in data
