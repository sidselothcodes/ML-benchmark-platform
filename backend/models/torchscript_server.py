"""TorchScript-optimized inference server.

Due to compatibility issues between torch.jit.trace and modern
transformers (DynamicCache, complex outputs), this server skips
JIT tracing entirely and instead uses torch.compile (PyTorch 2.0+)
for graph-level optimizations.  Falls back to standard PyTorch if
torch.compile is unavailable.
"""

from __future__ import annotations

import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .base_server import BaseModelServer

logger = logging.getLogger(__name__)


class TorchScriptServer(BaseModelServer):
    """Compiled model server using torch.compile (PyTorch 2.0+).

    Originally designed for torch.jit.trace, but modern transformers
    (4.x+) return DynamicCache objects that are incompatible with the
    JIT tracer.  torch.compile provides equivalent (or better)
    graph-level optimizations without the serialization constraints.
    """

    def __init__(self, model_name: str = "gpt2", device: str | None = None):
        super().__init__(model_name, optimization_mode="torchscript", device=device)
        self._compiled = False

    def load_model(self) -> None:
        logger.info("Loading model for compiled mode: %s", self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        # Disable KV cache to sidestep DynamicCache issues
        self.model.config.use_cache = False

        # Try torch.compile for graph-level optimizations (PyTorch 2.0+)
        if hasattr(torch, "compile"):
            try:
                logger.info("Applying torch.compile optimization...")
                self.model = torch.compile(self.model, mode="reduce-overhead")
                self._compiled = True
                logger.info("torch.compile applied successfully")
            except Exception as e:
                logger.warning("torch.compile failed: %s — using standard PyTorch", e)
        else:
            logger.info("torch.compile not available (PyTorch < 2.0)")

        logger.info(
            "TorchScript/compiled model ready (compiled=%s)", self._compiled,
        )

    @torch.no_grad()
    def _run_inference(self, text: str, max_new_tokens: int = 50) -> tuple[str, int]:
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        input_len = inputs["input_ids"].shape[1]

        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.8,
            top_p=0.9,
            top_k=50,
            use_cache=False,
            pad_token_id=self.tokenizer.pad_token_id,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
        )

        # Decode the FULL sequence (input + generated) so the result
        # includes the original prompt — matching frontend expectations.
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        num_new_tokens = len(outputs[0]) - input_len
        return generated_text, num_new_tokens
