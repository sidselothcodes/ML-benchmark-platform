import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Timer } from 'lucide-react';
import type { ModeSummary } from '../types';
import { MODE_CONFIGS } from '../types';
import { formatLatency } from '../utils/formatters';

interface LiveLatencyChartProps {
  summaries: Record<string, ModeSummary>;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-xl px-4 py-3 shadow-xl border border-gray-200/60 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.label}</p>
      <div className="space-y-0.5 text-gray-600">
        <p>Mean: <span className="font-medium text-gray-900">{formatLatency(d.mean)}</span></p>
        <p>p50: <span className="font-medium">{formatLatency(d.p50)}</span></p>
        <p>p95: <span className="font-medium">{formatLatency(d.p95)}</span></p>
        <p>p99: <span className="font-medium">{formatLatency(d.p99)}</span></p>
      </div>
    </div>
  );
}

export default function LiveLatencyChart({ summaries }: LiveLatencyChartProps) {
  const data = useMemo(() => {
    return MODE_CONFIGS.filter((m) => summaries[m.key]?.count > 0).map((m) => {
      const s = summaries[m.key];
      return {
        mode: m.key,
        label: m.label,
        mean: s.latency.mean,
        p50: s.latency.p50,
        p95: s.latency.p95,
        p99: s.latency.p99,
        color: m.color,
      };
    });
  }, [summaries]);

  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100">
          <Timer className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Latency Comparison</h3>
          <p className="text-xs text-gray-500">Mean inference latency by mode (lower is better)</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Run an inference to see latency data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}ms`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }} />
            <Bar dataKey="mean" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {data.map((entry) => (
                <Cell key={entry.mode} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Percentile legend */}
      {hasData && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          {data.map((d) => (
            <div key={d.mode} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-gray-600">
                {d.label}: p95={formatLatency(d.p95)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
