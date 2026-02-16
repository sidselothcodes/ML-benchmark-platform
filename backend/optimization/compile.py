"""Script to compile PyTorch models using TorchScript."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPTIMIZED_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "optimized"


def compile_model(model_name: str = "gpt2", output_dir: Path = OPTIMIZED_DIR) -> Path:
    """Compile a model to TorchScript using tracing.

    Args:
        model_name: HF model identifier.
        output_dir: Directory to save compiled model.

    Returns:
        Path to the saved TorchScript model.
    """
    logger.info("Loading model: %s", model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.eval()

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    dummy = tokenizer("Hello world", return_tensors="pt")

    logger.info("Tracing model with torch.jit.trace...")
    with torch.no_grad():
        traced = torch.jit.trace(
            model,
            example_kwarg_inputs={
                "input_ids": dummy["input_ids"],
                "attention_mask": dummy["attention_mask"],
            },
            strict=False,
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    save_path = output_dir / f"{model_name.replace('/', '_')}_torchscript.pt"
    torch.jit.save(traced, str(save_path))
    logger.info("TorchScript model saved to %s", save_path)

    return save_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compile model to TorchScript")
    parser.add_argument("--model", default="gpt2", help="Model name")
    args = parser.parse_args()
    compile_model(args.model)
