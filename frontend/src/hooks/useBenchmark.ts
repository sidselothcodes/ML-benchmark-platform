import { useState, useCallback } from 'react';
import type {
  InferenceRequest,
  InferenceResponse,
  OptimizationMode,
} from '../types';
import { runInference } from '../utils/api';

export interface BenchmarkState {
  loading: boolean;
  activeMode: string | null;
  results: InferenceResponse[];
  error: string | null;
}

/**
 * Hook that manages inference requests.
 * Supports running against one or multiple optimization modes sequentially.
 */
export function useBenchmark() {
  const [state, setState] = useState<BenchmarkState>({
    loading: false,
    activeMode: null,
    results: [],
    error: null,
  });

  const run = useCallback(
    async (
      text: string,
      modes: OptimizationMode[],
      modelSize: 'gpt2' | 'gpt2-medium',
      maxNewTokens: number,
    ) => {
      setState({ loading: true, activeMode: null, results: [], error: null });
      const collected: InferenceResponse[] = [];

      for (const mode of modes) {
        setState((s) => ({ ...s, activeMode: mode }));
        try {
          const req: InferenceRequest = {
            text,
            optimization_mode: mode,
            model_size: modelSize,
            max_new_tokens: maxNewTokens,
          };
          const res = await runInference(req);
          collected.push(res);
          setState((s) => ({ ...s, results: [...collected] }));
        } catch (err: any) {
          setState((s) => ({
            ...s,
            loading: false,
            activeMode: null,
            error: `Failed on ${mode}: ${err.message}`,
          }));
          return;
        }
      }

      setState((s) => ({
        ...s,
        loading: false,
        activeMode: null,
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ loading: false, activeMode: null, results: [], error: null });
  }, []);

  return { ...state, run, reset };
}
