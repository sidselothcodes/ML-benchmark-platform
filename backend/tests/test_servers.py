"""Tests for model servers.

These tests require model downloads and are slower.
Mark with @pytest.mark.slow to skip in CI if needed.
"""

import pytest
from backend.models.pytorch_server import PyTorchServer
from backend.models.quantized_server import QuantizedServer
from backend.models.base_server import InferenceResult


@pytest.fixture(scope="module")
def baseline_server():
    """Load the baseline server once for all tests in this module."""
    server = PyTorchServer(model_name="gpt2", device="cpu")
    server.load_model()
    return server


@pytest.fixture(scope="module")
def quantized_server():
    server = QuantizedServer(model_name="gpt2")
    server.load_model()
    return server


class TestPyTorchServer:
    def test_predict_returns_result(self, baseline_server):
        result = baseline_server.predict("Hello world", max_new_tokens=10)
        assert isinstance(result, InferenceResult)
        assert len(result.output) > 0
        assert result.latency_ms > 0
        assert result.tokens_generated > 0
        assert result.tokens_per_sec > 0

    def test_model_info(self, baseline_server):
        info = baseline_server.get_model_info()
        assert info.name == "gpt2"
        assert info.optimization_mode == "baseline"
        assert info.parameter_count > 0
        assert info.model_size_mb > 0

    def test_different_inputs(self, baseline_server):
        r1 = baseline_server.predict("The cat sat on", max_new_tokens=5)
        r2 = baseline_server.predict("Machine learning is", max_new_tokens=5)
        assert r1.output != r2.output


class TestQuantizedServer:
    def test_predict_returns_result(self, quantized_server):
        result = quantized_server.predict("Hello world", max_new_tokens=10)
        assert isinstance(result, InferenceResult)
        assert len(result.output) > 0
        assert result.latency_ms > 0

    def test_model_info(self, quantized_server):
        info = quantized_server.get_model_info()
        assert info.optimization_mode == "quantized"
