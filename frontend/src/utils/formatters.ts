/** Format a latency in milliseconds with appropriate precision. */
export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format tokens/sec with SI suffix. */
export function formatThroughput(tps: number): string {
  if (tps < 1) return tps.toFixed(2);
  if (tps < 1000) return tps.toFixed(1);
  return `${(tps / 1000).toFixed(1)}k`;
}

/** Format memory in MB. */
export function formatMemory(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** Format cost as dollar amount. */
export function formatCost(dollars: number): string {
  if (!isFinite(dollars)) return '—';
  if (dollars < 0.01) return '<$0.01';
  return `$${dollars.toFixed(2)}`;
}

/** Format a speedup factor. */
export function formatSpeedup(factor: number): string {
  if (factor <= 0 || !isFinite(factor)) return '—';
  if (factor >= 10) return `${factor.toFixed(0)}×`;
  return `${factor.toFixed(1)}×`;
}

/** Format a large number with commas. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Relative time ago string. */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
