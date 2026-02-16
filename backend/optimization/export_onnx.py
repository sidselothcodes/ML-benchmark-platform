"""Script to export PyTorch models to ONNX format."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPTIMIZED_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "optimized"


def export_to_onnx(model_name: str = "gpt2", output_dir: Path = OPTIMIZED_DIR) -> Path:
    """Export a Hugging Face model to ONNX format.

    Args:
        model_name: HF model identifier.
        output_dir: Directory to save the ONNX model.

    Returns:
        Path to the saved ONNX model.
    """
    logger.info("Loading model: %s", model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.eval()

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    dummy = tokenizer("Hello world", return_tensors="pt")

    output_dir.mkdir(parents=True, exist_ok=True)
    save_path = output_dir / f"{model_name.replace('/', '_')}.onnx"

    logger.info("Exporting to ONNX at %s", save_path)
    torch.onnx.export(
        model,
        (dummy["input_ids"], dummy["attention_mask"]),
        str(save_path),
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
    logger.info("ONNX export complete")

    # Verify
    import onnxruntime as ort
    import numpy as np

    session = ort.InferenceSession(str(save_path), providers=["CPUExecutionProvider"])
    inputs_np = {k: v.numpy() for k, v in dummy.items()}
    outputs = session.run(None, inputs_np)
    logger.info("Verification: output shape = %s", outputs[0].shape)

    return save_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export model to ONNX")
    parser.add_argument("--model", default="gpt2", help="Model name")
    args = parser.parse_args()
    export_to_onnx(args.model)
