"""Standard PyTorch FP32 inference server."""

from __future__ import annotations

import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .base_server import BaseModelServer

logger = logging.getLogger(__name__)


class PyTorchServer(BaseModelServer):
    """Baseline PyTorch FP32 model server using Hugging Face transformers."""

    def __init__(self, model_name: str = "gpt2", device: str | None = None):
        super().__init__(model_name, optimization_mode="baseline", device=device)

    def load_model(self) -> None:
        logger.info("Loading baseline PyTorch model: %s", self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        info = self.get_model_info()
        logger.info(
            "Model loaded: %d params, %.1f MB, dtype=%s",
            info.parameter_count, info.model_size_mb, info.dtype,
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
            pad_token_id=self.tokenizer.pad_token_id,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
        )

        # Decode the FULL sequence (input + generated) so the result
        # includes the original prompt — matching frontend expectations.
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        num_new_tokens = len(outputs[0]) - input_len
        return generated_text, num_new_tokens
