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
import { HardDrive } from 'lucide-react';
import type { ModeSummary } from '../types';
import { MODE_CONFIGS } from '../types';
import { formatMemory } from '../utils/formatters';

interface MemoryChartProps {
  summaries: Record<string, ModeSummary>;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-xl px-4 py-3 shadow-xl border border-gray-200/60 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.label}</p>
      <p className="text-gray-600">
        Avg: <span className="font-medium text-gray-900">{formatMemory(d.mean)}</span>
      </p>
      <p className="text-gray-600">
        Peak: <span className="font-medium">{formatMemory(d.peak)}</span>
      </p>
    </div>
  );
}

export default function MemoryChart({ summaries }: MemoryChartProps) {
  const data = useMemo(() => {
    return MODE_CONFIGS.filter((m) => summaries[m.key]?.count > 0).map((m) => {
      const s = summaries[m.key];
      return {
        mode: m.key,
        label: m.label,
        mean: s.memory.mean_mb,
        peak: s.memory.peak_mb,
        color: m.color,
      };
    });
  }, [summaries]);

  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-100">
          <HardDrive className="w-4 h-4 text-cyan-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Memory Usage</h3>
          <p className="text-xs text-gray-500">CPU/GPU memory (lower is better)</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No memory data yet
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }} />
            <Bar dataKey="peak" radius={[6, 6, 0, 0]} maxBarSize={50}>
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
