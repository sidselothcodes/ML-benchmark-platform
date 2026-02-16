import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SpeedupBadgeProps {
  speedup: number;
}

export default function SpeedupBadge({ speedup }: SpeedupBadgeProps) {
  if (!speedup || !isFinite(speedup) || speedup === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <Minus className="w-3 h-3" />
        N/A
      </span>
    );
  }

  if (speedup >= 1.1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <TrendingUp className="w-3 h-3" />
        {speedup.toFixed(1)}x faster
      </span>
    );
  }

  if (speedup <= 0.9) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <TrendingDown className="w-3 h-3" />
        {(1 / speedup).toFixed(1)}x slower
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      ~{speedup.toFixed(1)}x (similar)
    </span>
  );
}
