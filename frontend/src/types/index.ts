/* ------------------------------------------------------------------ */
/*  API request / response types                                      */
/* ------------------------------------------------------------------ */

export type OptimizationMode =
  | 'baseline'
  | 'quantized'
  | 'torchscript'
  | 'onnx'
  | 'batched';

export type ModelSize = 'gpt2' | 'gpt2-medium';

export interface InferenceRequest {
  text: string;
  optimization_mode: OptimizationMode;
  model_size: ModelSize;
  max_new_tokens: number;
}

export interface InferenceResponse {
  result: string;
  latency_ms: number;
  tokens_per_sec: number;
  tokens_generated: number;
  memory_mb: number;
  optimization_mode: string;
  model_size: string;
}

export interface BenchmarkRequest {
  num_requests: number;
  text: string;
  max_new_tokens: number;
}

/* ------------------------------------------------------------------ */
/*  Metrics                                                            */
/* ------------------------------------------------------------------ */

export interface LatencyStats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface ThroughputStats {
  mean_tokens_per_sec: number;
  max_tokens_per_sec: number;
  requests_per_sec: number;
}

export interface MemoryStats {
  mean_mb: number;
  peak_mb: number;
}

export interface ModeSummary {
  mode: string;
  count: number;
  latency: LatencyStats;
  throughput: ThroughputStats;
  memory: MemoryStats;
}

export interface ComparisonEntry extends ModeSummary {
  speedup: number;
  estimated_cost_per_1m_tokens: number;
}

export interface MetricsResponse {
  summaries: Record<string, ModeSummary>;
  comparison: Record<string, ComparisonEntry>;
  total_inferences: number;
}

export interface RecentMetric {
  mode: string;
  latency_ms: number;
  tokens_per_sec: number;
  memory_mb: number;
  tokens_generated: number;
  timestamp: number;
}

export interface SSEData {
  recent: RecentMetric[];
  summaries: Record<string, ModeSummary>;
  total: number;
}

/* ------------------------------------------------------------------ */
/*  Health & Models                                                    */
/* ------------------------------------------------------------------ */

export interface HealthResponse {
  status: string;
  loaded_servers: string[];
  timestamp: number;
}

export interface ModelInfo {
  name: string;
  parameter_count: number;
  model_size_mb: number;
  device: string;
  dtype: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  UI helpers                                                         */
/* ------------------------------------------------------------------ */

export interface ModeConfig {
  key: OptimizationMode;
  label: string;
  color: string;
  description: string;
}

export const MODE_CONFIGS: ModeConfig[] = [
  {
    key: 'baseline',
    label: 'Baseline',
    color: '#64748B',
    description: 'Standard PyTorch FP32 inference',
  },
  {
    key: 'quantized',
    label: 'Quantized',
    color: '#06B6D4',
    description: 'INT8 dynamic quantization',
  },
  {
    key: 'torchscript',
    label: 'TorchScript',
    color: '#10B981',
    description: 'TorchScript traced compilation',
  },
  {
    key: 'onnx',
    label: 'ONNX',
    color: '#F59E0B',
    description: 'ONNX Runtime optimized inference',
  },
  {
    key: 'batched',
    label: 'Batched',
    color: '#EC4899',
    description: 'Dynamic batching with queue',
  },
];

export const getModeConfig = (mode: string): ModeConfig =>
  MODE_CONFIGS.find((m) => m.key === mode) ?? MODE_CONFIGS[0];
