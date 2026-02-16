import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, Zap, HardDrive } from 'lucide-react';
import type { InferenceResponse } from '../types';
import { getModeConfig } from '../types';
import { formatLatency } from '../utils/formatters';

interface ResultsDisplayProps {
  results: InferenceResponse[];
}

export default function ResultsDisplay({ results }: ResultsDisplayProps) {
  if (results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100">
          <MessageSquare className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Inference Results</h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {results.map((r, i) => {
            const cfg = getModeConfig(r.optimization_mode);
            return (
              <motion.div
                key={`${r.optimization_mode}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl border-l-4 bg-white/60 p-4`}
                style={{ borderLeftColor: cfg.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="font-semibold text-sm text-gray-900">
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLatency(r.latency_ms)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {r.tokens_per_sec.toFixed(1)} tok/s
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {r.memory_mb.toFixed(1)} MB
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 rounded-lg px-3 py-2">
                  {r.result || '(empty output)'}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
