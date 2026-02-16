import type {
  InferenceRequest,
  InferenceResponse,
  MetricsResponse,
  HealthResponse,
  BenchmarkRequest,
  ModelInfo,
} from '../types';

const BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/* ---- Endpoints ---- */

export const runInference = (body: InferenceRequest) =>
  request<InferenceResponse>('/inference', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getMetrics = () => request<MetricsResponse>('/metrics');

export const getHealth = () => request<HealthResponse>('/health');

export const getModels = () =>
  request<Record<string, ModelInfo>>('/models');

export const runBenchmark = (body: BenchmarkRequest) =>
  request<any>('/benchmark', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getHistory = (mode?: string, limit = 100) => {
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  params.set('limit', String(limit));
  return request<{ history: any[]; total_stored: number }>(
    `/metrics/history?${params}`,
  );
};
