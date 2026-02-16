import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Zap, Clock } from 'lucide-react';
import type { ModeSummary } from '../types';

interface StatsOverviewProps {
  summaries: Record<string, ModeSummary>;
  totalInferences: number;
  connected: boolean;
}

/** Animated counter that smoothly interpolates between values. */
function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = start + (end - start) * eased;
      setDisplay(current);
      ref.current = current;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function StatsOverview({
  summaries,
  totalInferences,
  connected: _connected,
}: StatsOverviewProps) {
  // Compute aggregated stats
  const modes = Object.values(summaries);
  const avgLatency =
    modes.length > 0
      ? modes.reduce((s, m) => s + (m.latency?.mean ?? 0), 0) / modes.length
      : 0;
  const bestThroughput =
    modes.length > 0
      ? Math.max(...modes.map((m) => m.throughput?.mean_tokens_per_sec ?? 0))
      : 0;
  const activeModes = modes.filter((m) => m.count > 0).length;

  const cards = [
    {
      label: 'Active Modes',
      value: activeModes,
      decimals: 0,
      suffix: ` / ${5}`,
      icon: Activity,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      ringColor: 'ring-teal-100',
    },
    {
      label: 'Total Inferences',
      value: totalInferences,
      decimals: 0,
      suffix: '',
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      ringColor: 'ring-cyan-100',
    },
    {
      label: 'Best Throughput',
      value: bestThroughput,
      decimals: 1,
      suffix: ' tok/s',
      icon: Zap,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      ringColor: 'ring-emerald-100',
    },
    {
      label: 'Avg Latency',
      value: avgLatency,
      decimals: 1,
      suffix: ' ms',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      ringColor: 'ring-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="glass-card glass-card-hover rounded-2xl p-5 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl ${card.bgColor} ring-1 ${card.ringColor}`}
            >
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            <AnimatedNumber
              value={card.value}
              decimals={card.decimals}
              suffix={card.suffix}
            />
          </div>
          <div className="text-sm text-gray-500 mt-0.5 font-medium">
            {card.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
