import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Table2 } from 'lucide-react';
import type { ModeSummary, ComparisonEntry } from '../types';
import { MODE_CONFIGS } from '../types';
import { formatLatency, formatMemory, formatCost } from '../utils/formatters';
import SpeedupBadge from './SpeedupBadge';

interface MetricsTableProps {
  summaries: Record<string, ModeSummary>;
  comparison: Record<string, ComparisonEntry>;
}

export default function MetricsTable({
  summaries,
  comparison,
}: MetricsTableProps) {
  const rows = useMemo(() => {
    return MODE_CONFIGS.filter((m) => summaries[m.key]?.count > 0).map((m) => {
      const s = summaries[m.key];
      const c = comparison[m.key];
      return {
        mode: m.key,
        label: m.label,
        color: m.color,
        count: s.count,
        meanLatency: s.latency.mean,
        p95Latency: s.latency.p95,
        p99Latency: s.latency.p99,
        throughput: s.throughput.mean_tokens_per_sec,
        peakMemory: s.memory.peak_mb,
        cost: c?.estimated_cost_per_1m_tokens ?? 0,
        speedup: c?.speedup ?? 0,
      };
    });
  }, [summaries, comparison]);

  if (rows.length === 0) {
    return null;
  }

  // Find the best values for highlighting
  const bestLatency = Math.min(...rows.map((r) => r.meanLatency));
  const bestThroughput = Math.max(...rows.map((r) => r.throughput));
  const bestMemory = Math.min(...rows.map((r) => r.peakMemory));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
          <Table2 className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Detailed Comparison</h3>
          <p className="text-xs text-gray-500">
            Side-by-side metrics across all optimization modes
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Mode
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Runs
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Latency
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                p95
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Throughput
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Memory
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Cost/1M
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Speedup
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={row.mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {row.label}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-gray-600 tabular-nums">
                  {row.count}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  <span
                    className={
                      row.meanLatency === bestLatency
                        ? 'text-emerald-600 font-semibold'
                        : 'text-gray-900'
                    }
                  >
                    {formatLatency(row.meanLatency)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-gray-600 tabular-nums">
                  {formatLatency(row.p95Latency)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  <span
                    className={
                      row.throughput === bestThroughput
                        ? 'text-emerald-600 font-semibold'
                        : 'text-gray-900'
                    }
                  >
                    {row.throughput.toFixed(1)}
                  </span>
                  <span className="text-gray-400 ml-0.5">tok/s</span>
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  <span
                    className={
                      row.peakMemory === bestMemory
                        ? 'text-emerald-600 font-semibold'
                        : 'text-gray-900'
                    }
                  >
                    {formatMemory(row.peakMemory)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-gray-900 tabular-nums">
                  {formatCost(row.cost)}
                </td>
                <td className="py-3 px-3 text-right">
                  <SpeedupBadge speedup={row.speedup} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
