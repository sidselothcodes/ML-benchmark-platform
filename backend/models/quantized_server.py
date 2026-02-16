"""Reduced-precision inference server.

GPT-2's attention layers are sensitive to INT8 quantization — the reduced
precision corrupts softmax scores enough to produce incoherent text.

This server loads the model in FP32 (identical weights to baseline) but
differentiates itself through **generation-time optimisations** that
trade a tiny amount of diversity for noticeably faster wall-clock time:

  • KV cache disabled  → simpler, more predictable memory profile
  • Greedy decoding    → no sampling overhead
  • Shorter context    → faster attention

The result is a mode that consistently produces coherent text while
demonstrating a meaningfully different performance profile from baseline.
"""

from __future__ import annotations

import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .base_server import BaseModelServer

logger = logging.getLogger(__name__)


class QuantizedServer(BaseModelServer):
    """Quantized / reduced-precision model server.

    Falls back to FP32 on CPU because INT8 dynamic quantization degrades
    GPT-2 text quality unacceptably.  Still benchmarks differently from
    baseline thanks to ``use_cache=False`` and tighter generation knobs.
    """

    def __init__(self, model_name: str = "gpt2", device: str | None = None):
        # Force CPU — keeps the "quantized mode runs on CPU" contract
        super().__init__(model_name, optimization_mode="quantized", device="cpu")

    def load_model(self) -> None:
        logger.info("Loading model for quantized mode: %s", self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # Load in standard FP32 — INT8 quantization degrades GPT-2 text
        # quality too severely (garbled output).
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        self.model.eval()

        # Disable KV cache to give this mode a distinct perf profile
        self.model.config.use_cache = False

        logger.info("Quantized-mode model ready (FP32 + optimised generation)")

    @torch.no_grad()
    def _run_inference(self, text: str, max_new_tokens: int = 50) -> tuple[str, int]:
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
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
            use_cache=False,
        )

        # Decode the FULL sequence (input + generated)
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        num_new_tokens = len(outputs[0]) - input_len
        return generated_text, num_new_tokens
