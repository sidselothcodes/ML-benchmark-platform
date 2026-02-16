import { useState, useEffect, useCallback, useRef } from 'react';
import type { MetricsResponse, SSEData, RecentMetric, ModeSummary } from '../types';
import { getMetrics } from '../utils/api';

/**
 * Hook that manages metrics state:
 *  - Fetches initial summary via REST
 *  - Subscribes to SSE for live updates
 *  - Accumulates recent data points for charts
 */
export function useMetrics() {
  const [summaries, setSummaries] = useState<Record<string, ModeSummary>>({});
  const [comparison, setComparison] = useState<Record<string, any>>({});
  const [recentPoints, setRecentPoints] = useState<RecentMetric[]>([]);
  const [totalInferences, setTotalInferences] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial fetch
  const fetchMetrics = useCallback(async () => {
    try {
      const data: MetricsResponse = await getMetrics();
      setSummaries(data.summaries);
      setComparison(data.comparison);
      setTotalInferences(data.total_inferences);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch metrics');
    }
  }, []);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource('/api/metrics/stream');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data: SSEData = JSON.parse(event.data);
        setSummaries(data.summaries);
        setTotalInferences(data.total);
        setRecentPoints((prev) => {
          const merged = [...prev, ...data.recent];
          // Keep last 200 points for charts
          return merged.slice(-200);
        });
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    summaries,
    comparison,
    recentPoints,
    totalInferences,
    connected,
    error,
    refresh: fetchMetrics,
  };
}
