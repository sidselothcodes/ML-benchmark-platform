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
import { Zap } from 'lucide-react';
import type { ModeSummary } from '../types';
import { MODE_CONFIGS } from '../types';

interface ThroughputChartProps {
  summaries: Record<string, ModeSummary>;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-xl px-4 py-3 shadow-xl border border-gray-200/60 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.label}</p>
      <p className="text-gray-600">
        Avg: <span className="font-medium text-gray-900">{d.mean.toFixed(1)} tok/s</span>
      </p>
      <p className="text-gray-600">
        Peak: <span className="font-medium">{d.max.toFixed(1)} tok/s</span>
      </p>
    </div>
  );
}

export default function ThroughputChart({ summaries }: ThroughputChartProps) {
  const data = useMemo(() => {
    return MODE_CONFIGS.filter((m) => summaries[m.key]?.count > 0).map((m) => {
      const s = summaries[m.key];
      return {
        mode: m.key,
        label: m.label,
        mean: s.throughput.mean_tokens_per_sec,
        max: s.throughput.max_tokens_per_sec,
        color: m.color,
      };
    });
  }, [summaries]);

  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100">
          <Zap className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Throughput</h3>
          <p className="text-xs text-gray-500">Tokens per second (higher is better)</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No throughput data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
            <Bar dataKey="mean" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {data.map((entry) => (
                <Cell key={entry.mode} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
