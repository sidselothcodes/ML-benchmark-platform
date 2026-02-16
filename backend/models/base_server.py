"""Abstract base class for all model servers."""

from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import torch
import psutil

logger = logging.getLogger(__name__)


@dataclass
class InferenceResult:
    """Result from a single inference call."""
    output: str
    latency_ms: float
    tokens_generated: int
    memory_mb: float
    tokens_per_sec: float


@dataclass
class ModelInfo:
    """Metadata about a loaded model."""
    name: str
    optimization_mode: str
    parameter_count: int = 0
    model_size_mb: float = 0.0
    device: str = "cpu"
    dtype: str = "float32"


class BaseModelServer(ABC):
    """Abstract base class that all model servers must implement.

    Handles common concerns: device selection, memory tracking,
    latency measurement, and a uniform predict interface.
    """

    def __init__(self, model_name: str, optimization_mode: str, device: str | None = None):
        self.model_name = model_name
        self.optimization_mode = optimization_mode
        self.device = self._resolve_device(device)
        self.model = None
        self.tokenizer = None
        self._loaded = False
        logger.info(
            "Initializing %s server for %s on %s",
            optimization_mode, model_name, self.device,
        )

    @staticmethod
    def _resolve_device(device: str | None) -> str:
        if device:
            return device
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    @abstractmethod
    def load_model(self) -> None:
        """Load and prepare the model for inference."""

    @abstractmethod
    def _run_inference(self, text: str, max_new_tokens: int = 50) -> tuple[str, int]:
        """Execute model-specific inference.

        Returns:
            Tuple of (generated_text, token_count).
        """

    def predict(self, text: str, max_new_tokens: int = 50) -> InferenceResult:
        """Run inference with full instrumentation.

        Measures latency, memory, and throughput automatically.
        """
        if not self._loaded:
            self.load_model()
            self._loaded = True

        start = time.perf_counter()

        output_text, token_count = self._run_inference(text, max_new_tokens)

        elapsed = time.perf_counter() - start
        latency_ms = elapsed * 1000
        tokens_per_sec = token_count / elapsed if elapsed > 0 else 0.0

        # Report absolute memory usage of the process (or GPU).
        # The previous delta approach (after − before) often yields 0.0 on
        # CPU because RSS doesn't change within a single inference call.
        memory_mb = self._get_memory_mb()

        return InferenceResult(
            output=output_text,
            latency_ms=latency_ms,
            tokens_generated=token_count,
            memory_mb=memory_mb,
            tokens_per_sec=tokens_per_sec,
        )

    def get_model_info(self) -> ModelInfo:
        """Return metadata about the loaded model."""
        param_count = 0
        model_size = 0.0
        dtype_str = "float32"

        if self.model is not None and hasattr(self.model, "parameters"):
            params = list(self.model.parameters())
            param_count = sum(p.numel() for p in params)
            model_size = sum(p.nelement() * p.element_size() for p in params) / (1024 * 1024)
            if params:
                dtype_str = str(params[0].dtype).replace("torch.", "")

        return ModelInfo(
            name=self.model_name,
            optimization_mode=self.optimization_mode,
            parameter_count=param_count,
            model_size_mb=model_size,
            device=self.device,
            dtype=dtype_str,
        )

    def _get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        if self.device == "cuda" and torch.cuda.is_available():
            return torch.cuda.max_memory_allocated() / (1024 * 1024)
        process = psutil.Process()
        return process.memory_info().rss / (1024 * 1024)

    def warmup(self, num_runs: int = 3) -> None:
        """Warm up the model with dummy inference calls."""
        logger.info("Warming up %s server with %d runs", self.optimization_mode, num_runs)
        for _ in range(num_runs):
            self.predict("Hello world", max_new_tokens=10)
        logger.info("Warmup complete for %s", self.optimization_mode)
