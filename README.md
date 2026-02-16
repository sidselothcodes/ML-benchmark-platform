---
title: ML Performance Benchmark
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# ML Performance Benchmarking Platform

Interactive platform for comparing PyTorch optimization techniques in real-time.

## 🚀 Live Demo

Try it here: [Hugging Face Space](https://huggingface.co/spaces/sidselothcodes/ml-benchmark-platform)

## Features

- **5 Optimization Modes:** Baseline PyTorch, INT8 Quantization, TorchScript, ONNX Runtime, Dynamic Batching
- **Real-time Metrics:** Latency (p95), throughput (tokens/sec), memory usage
- **Visual Comparisons:** Interactive charts comparing performance
- **Live Benchmarking:** Test with custom prompts

## Tech Stack

**Backend:**
- Python, PyTorch, FastAPI, Transformers
- ONNX Runtime for optimized inference
- SQLite for metrics storage

**Frontend:**
- React, TypeScript, Vite
- Tailwind CSS, Recharts

## Performance Results

| Mode | Latency | Throughput | Speedup |
|------|---------|------------|---------||------|---------|-----tok/s |------|---------|------------8.|------|--2.|------|---line |------|------tok/s | 1.0x |

## Local Development

### Backend
```bash
cd backend
pip install -r requpip install -r requpip install -r requpip install -r requpip install -r requpip inpip install -r rv
```

## Author

Built by [Siddharth](https://github.com/sidselothcodes)

## License

MIT
