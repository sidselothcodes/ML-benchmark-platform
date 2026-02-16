"""ONNX Runtime inference server.

Exports the model to ONNX and runs token-by-token generation through
``onnxruntime``.  If the export or ORT session fails (common with newer
transformers due to DynamicCache / opset issues), the server falls back
to standard PyTorch inference so the mode never returns a 500.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .base_server import BaseModelServer

logger = logging.getLogger(__name__)

OPTIMIZED_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "optimized"


class ONNXServer(BaseModelServer):
    """ONNX Runtime inference server with automatic fallback."""

    def __init__(self, model_name: str = "gpt2", device: str | None = None):
        super().__init__(model_name, optimization_mode="onnx", device="cpu")
        self._ort_session = None
        self._use_ort = False  # True only when export + session load succeed

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------
    def load_model(self) -> None:
        logger.info("Loading model for ONNX mode: %s", self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # Always load a PyTorch model (used as fallback *and* for
        # get_model_info()).
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        self.model.eval()

        # Try the ONNX path — export → load session
        onnx_path = OPTIMIZED_DIR / f"{self.model_name.replace('/', '_')}.onnx"
        try:
            if not onnx_path.exists():
                self._export_to_onnx(onnx_path)
            self._load_ort_session(onnx_path)
            self._use_ort = True
            logger.info("ONNX Runtime model ready")
        except Exception as e:
            logger.warning(
                "ONNX export/load failed: %s — falling back to PyTorch", e,
            )
            self._use_ort = False
            # Clean up a half-written export so the next restart retries
            if onnx_path.exists():
                onnx_path.unlink(missing_ok=True)

    # ------------------------------------------------------------------
    # ONNX export
    # ------------------------------------------------------------------
    def _export_to_onnx(self, onnx_path: Path) -> None:
        """Export the PyTorch model to ONNX format.

        Disables ``use_cache`` so the tracer never enters DynamicCache
        code paths (avoids "'Tensor' has no attribute 'get_seq_length'").
        """
        logger.info("Exporting model to ONNX at %s …", onnx_path)
        export_model = AutoModelForCausalLM.from_pretrained(self.model_name)
        export_model.eval()
        export_model.config.use_cache = False

        dummy = self.tokenizer("Hello world", return_tensors="pt")

        OPTIMIZED_DIR.mkdir(parents=True, exist_ok=True)

        torch.onnx.export(
            export_model,
            (dummy["input_ids"], dummy["attention_mask"]),
            str(onnx_path),
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch", 1: "sequence"},
                "attention_mask": {0: "batch", 1: "sequence"},
                "logits": {0: "batch", 1: "sequence"},
            },
            opset_version=14,
            do_constant_folding=True,
        )
        logger.info("ONNX export complete: %s", onnx_path)

    # ------------------------------------------------------------------
    # ORT session
    # ------------------------------------------------------------------
    def _load_ort_session(self, onnx_path: Path) -> None:
        import onnxruntime as ort

        providers = ["CPUExecutionProvider"]
        if self.device == "cuda":
            providers.insert(0, "CUDAExecutionProvider")

        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = 4

        self._ort_session = ort.InferenceSession(
            str(onnx_path), opts, providers=providers,
        )
        logger.info("ORT session loaded with providers: %s", providers)

    # ------------------------------------------------------------------
    # Forward helpers
    # ------------------------------------------------------------------
    def _onnx_forward(
        self, input_ids: np.ndarray, attention_mask: np.ndarray,
    ) -> np.ndarray:
        """Single forward pass through ONNX Runtime → logits."""
        return self._ort_session.run(
            None,
            {"input_ids": input_ids, "attention_mask": attention_mask},
        )[0]

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    @torch.no_grad()
    def _run_inference(self, text: str, max_new_tokens: int = 50) -> tuple[str, int]:
        if self._use_ort:
            return self._run_ort_inference(text, max_new_tokens)
        return self._run_pytorch_fallback(text, max_new_tokens)

    # ---- ORT path (token-by-token with numpy + sampling) ----
    def _run_ort_inference(self, text: str, max_new_tokens: int) -> tuple[str, int]:
        inputs = self.tokenizer(
            text, return_tensors="np", truncation=True, max_length=512,
        )
        input_ids = inputs["input_ids"]
        attention_mask = inputs["attention_mask"]
        input_len = input_ids.shape[1]

        temperature = 0.8
        top_k = 50
        ngram_size = 3
        generated: list[int] = []

        for _ in range(max_new_tokens):
            logits = self._onnx_forward(input_ids, attention_mask)
            next_logits = logits[0, -1, :].copy()

            # Repetition penalty (1.2×)
            for tid in set(generated):
                s = next_logits[tid]
                next_logits[tid] = s / 1.2 if s > 0 else s * 1.2

            # N-gram blocking
            if len(generated) >= ngram_size - 1:
                tail = generated[-(ngram_size - 1):]
                for i in range(len(generated) - ngram_size + 1):
                    if generated[i : i + ngram_size - 1] == tail:
                        next_logits[generated[i + ngram_size - 1]] = -float("inf")

            # Temperature scaling
            next_logits = next_logits / temperature

            # Top-k filtering: keep only the top_k highest logits
            top_k_indices = np.argpartition(next_logits, -top_k)[-top_k:]
            top_k_logits = next_logits[top_k_indices]

            # Softmax over top-k
            top_k_logits -= top_k_logits.max()  # numerical stability
            probs = np.exp(top_k_logits)
            probs /= probs.sum()

            # Sample from distribution
            chosen_idx = np.random.choice(len(top_k_indices), p=probs)
            next_token = int(top_k_indices[chosen_idx])

            if next_token == self.tokenizer.eos_token_id:
                break

            generated.append(next_token)
            nid = np.array([[next_token]], dtype=input_ids.dtype)
            input_ids = np.concatenate([input_ids, nid], axis=1)
            attention_mask = np.concatenate(
                [attention_mask, np.ones((1, 1), dtype=attention_mask.dtype)],
                axis=1,
            )

        full_text = self.tokenizer.decode(input_ids[0], skip_special_tokens=True)
        return full_text, input_ids.shape[1] - input_len

    # ---- PyTorch fallback ----
    def _run_pytorch_fallback(self, text: str, max_new_tokens: int) -> tuple[str, int]:
        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512,
        )
        input_len = inputs["input_ids"].shape[1]

        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.8,
            top_p=0.9,
            top_k=50,
            pad_token_id=self.tokenizer.pad_token_id,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
        )

        full_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return full_text, len(outputs[0]) - input_len
