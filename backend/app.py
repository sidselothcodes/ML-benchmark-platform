"""FastAPI application for the ML Benchmark Platform."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .batching.dynamic_batcher import DynamicBatcher
from .metrics.collector import InferenceMetric, MetricsCollector
from .metrics.storage import MetricsStorage
from .metrics.analyzer import generate_comparison_report
from .models.pytorch_server import PyTorchServer
from .models.quantized_server import QuantizedServer
from .models.torchscript_server import TorchScriptServer
from .models.onnx_server import ONNXServer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
servers: dict[str, object] = {}
batcher: DynamicBatcher | None = None
metrics_collector = MetricsCollector()
metrics_storage = MetricsStorage()


class OptimizationMode(str, Enum):
    baseline = "baseline"
    quantized = "quantized"
    torchscript = "torchscript"
    onnx = "onnx"
    batched = "batched"


class ModelSize(str, Enum):
    small = "gpt2"          # 124M params
    medium = "gpt2-medium"  # 355M params


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Load models on startup, clean up on shutdown."""
    global batcher

    logger.info("Loading model servers...")

    # Load baseline first (used by batcher too)
    baseline = PyTorchServer(model_name="gpt2")
    baseline.load_model()
    baseline.warmup(num_runs=2)
    servers["baseline"] = baseline

    # Load other servers lazily to speed up startup
    # They'll be initialized on first request
    servers["quantized"] = QuantizedServer(model_name="gpt2")
    servers["torchscript"] = TorchScriptServer(model_name="gpt2")
    servers["onnx"] = ONNXServer(model_name="gpt2")

    # Set up dynamic batcher using baseline server
    batcher = DynamicBatcher(server=baseline, max_batch_size=8, max_wait_time_ms=50.0)
    await batcher.start()
    servers["batched"] = batcher

    logger.info("All servers initialized. Platform ready.")
    yield

    # Shutdown
    if batcher:
        await batcher.stop()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="ML Benchmark Platform",
    description="Real-time multi-modal AI performance benchmarking platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class InferenceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="Input text for inference")
    optimization_mode: OptimizationMode = Field(default=OptimizationMode.baseline)
    model_size: ModelSize = Field(default=ModelSize.small)
    max_new_tokens: int = Field(default=50, ge=1, le=200)


class InferenceResponse(BaseModel):
    result: str
    latency_ms: float
    tokens_per_sec: float
    tokens_generated: int
    memory_mb: float
    optimization_mode: str
    model_size: str


class BenchmarkRequest(BaseModel):
    num_requests: int = Field(default=10, ge=1, le=100)
    text: str = Field(default="The future of artificial intelligence is")
    max_new_tokens: int = Field(default=50, ge=1, le=200)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    loaded = [mode for mode, srv in servers.items() if mode != "batched" and getattr(srv, "_loaded", False)]
    return {
        "status": "healthy",
        "loaded_servers": loaded,
        "total_inferences": metrics_collector.get_recent(1).__len__() > 0,
        "timestamp": time.time(),
    }


@app.post("/api/inference", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest):
    """Submit a single inference request."""
    mode = request.optimization_mode.value

    if mode == "batched":
        if batcher is None:
            raise HTTPException(500, "Batcher not initialized")
        try:
            result = await batcher.submit(request.text, request.max_new_tokens)
            _record_metric(mode, result)
            return InferenceResponse(
                result=result["output"],
                latency_ms=round(result["latency_ms"], 2),
                tokens_per_sec=round(result["tokens_per_sec"], 2),
                tokens_generated=result["tokens_generated"],
                memory_mb=round(result["memory_mb"], 2),
                optimization_mode=mode,
                model_size=request.model_size.value,
            )
        except Exception as e:
            logger.exception("Batched inference failed")
            raise HTTPException(500, str(e))

    server = servers.get(mode)
    if server is None:
        raise HTTPException(400, f"Unknown optimization mode: {mode}")

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: server.predict(request.text, request.max_new_tokens),
        )
    except Exception as e:
        logger.exception("Inference failed for mode %s", mode)
        raise HTTPException(500, f"Inference failed: {e}")

    _record_metric(mode, {
        "latency_ms": result.latency_ms,
        "tokens_per_sec": result.tokens_per_sec,
        "memory_mb": result.memory_mb,
        "tokens_generated": result.tokens_generated,
    })

    return InferenceResponse(
        result=result.output,
        latency_ms=round(result.latency_ms, 2),
        tokens_per_sec=round(result.tokens_per_sec, 2),
        tokens_generated=result.tokens_generated,
        memory_mb=round(result.memory_mb, 2),
        optimization_mode=mode,
        model_size=request.model_size.value,
    )


@app.get("/api/metrics")
async def get_metrics():
    """Get aggregate benchmark statistics across all optimization modes."""
    summaries = metrics_collector.get_all_summaries()
    report = generate_comparison_report(summaries)
    return {
        "summaries": summaries,
        "comparison": report,
        "total_inferences": len(metrics_collector.get_all_metrics()),
    }


@app.get("/api/metrics/stream")
async def stream_metrics():
    """SSE endpoint for live metric updates."""
    async def event_generator() -> AsyncGenerator[str, None]:
        last_count = 0
        while True:
            all_metrics = metrics_collector.get_all_metrics()
            current_count = len(all_metrics)

            if current_count > last_count:
                recent = metrics_collector.get_recent(current_count - last_count)
                summaries = metrics_collector.get_all_summaries()
                data = {
                    "recent": recent,
                    "summaries": summaries,
                    "total": current_count,
                }
                yield f"data: {json.dumps(data)}\n\n"
                last_count = current_count

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/benchmark")
async def run_benchmark(request: BenchmarkRequest):
    """Run an automated benchmark suite across all optimization modes."""
    modes = ["baseline", "quantized", "torchscript", "onnx", "batched"]
    results: dict[str, list[dict]] = {mode: [] for mode in modes}

    for mode in modes:
        for i in range(request.num_requests):
            try:
                req = InferenceRequest(
                    text=request.text,
                    optimization_mode=OptimizationMode(mode),
                    max_new_tokens=request.max_new_tokens,
                )
                response = await run_inference(req)
                results[mode].append({
                    "iteration": i + 1,
                    "latency_ms": response.latency_ms,
                    "tokens_per_sec": response.tokens_per_sec,
                    "memory_mb": response.memory_mb,
                })
            except Exception as e:
                logger.warning("Benchmark iteration %d failed for %s: %s", i, mode, e)
                results[mode].append({"iteration": i + 1, "error": str(e)})

    summaries = metrics_collector.get_all_summaries()
    return {
        "results": results,
        "summaries": summaries,
        "comparison": generate_comparison_report(summaries),
    }


@app.get("/api/metrics/history")
async def get_history(mode: str | None = None, limit: int = 100):
    """Get historical metrics from persistent storage."""
    history = metrics_storage.get_history(mode=mode, limit=limit)
    return {
        "history": history,
        "total_stored": metrics_storage.get_total_count(),
    }


@app.get("/api/models")
async def get_models():
    """Get info about loaded models."""
    info = {}
    for mode, server in servers.items():
        if mode == "batched":
            info[mode] = {"type": "dynamic_batcher", "status": "active"}
            continue
        loaded = getattr(server, "_loaded", False)
        if loaded:
            model_info = server.get_model_info()
            info[mode] = {
                "name": model_info.name,
                "parameter_count": model_info.parameter_count,
                "model_size_mb": round(model_info.model_size_mb, 2),
                "device": model_info.device,
                "dtype": model_info.dtype,
                "status": "loaded",
            }
        else:
            info[mode] = {"name": server.model_name, "status": "not_loaded"}
    return info


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _record_metric(mode: str, result: dict) -> None:
    """Record a metric to both the in-memory collector and persistent storage."""
    metric = InferenceMetric(
        optimization_mode=mode,
        latency_ms=result["latency_ms"],
        tokens_per_sec=result["tokens_per_sec"],
        memory_mb=result["memory_mb"],
        tokens_generated=result["tokens_generated"],
    )
    metrics_collector.record(metric)
    metrics_storage.save(
        optimization_mode=mode,
        latency_ms=result["latency_ms"],
        tokens_per_sec=result["tokens_per_sec"],
        memory_mb=result["memory_mb"],
        tokens_generated=result["tokens_generated"],
    )
