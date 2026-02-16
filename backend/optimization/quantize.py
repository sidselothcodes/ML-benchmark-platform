"""Script to quantize PyTorch models to INT8."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import torch
from torch.quantization import quantize_dynamic
from transformers import AutoModelForCausalLM, AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPTIMIZED_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "optimized"


def quantize_model(model_name: str = "gpt2", output_dir: Path = OPTIMIZED_DIR) -> Path:
    """Quantize a Hugging Face model using dynamic INT8 quantization.

    Args:
        model_name: HF model identifier.
        output_dir: Directory to save quantized model.

    Returns:
        Path to the saved quantized state dict.
    """
    logger.info("Loading model: %s", model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.eval()

    original_size = sum(p.nelement() * p.element_size() for p in model.parameters())
    logger.info("Original model size: %.2f MB", original_size / (1024 * 1024))

    logger.info("Applying dynamic INT8 quantization to Linear layers...")
    quantized = quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)

    output_dir.mkdir(parents=True, exist_ok=True)
    save_path = output_dir / f"{model_name.replace('/', '_')}_int8.pt"
    torch.save(quantized.state_dict(), save_path)
    logger.info("Quantized model saved to %s", save_path)

    # Verify with a quick inference
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    inputs = tokenizer("Hello", return_tensors="pt")
    with torch.no_grad():
        output = quantized.generate(**inputs, max_new_tokens=10)
    text = tokenizer.decode(output[0], skip_special_tokens=True)
    logger.info("Verification output: %s", text)

    return save_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quantize a model to INT8")
    parser.add_argument("--model", default="gpt2", help="Model name")
    args = parser.parse_args()
    quantize_model(args.model)
