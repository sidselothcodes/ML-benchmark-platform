import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import type { OptimizationMode, ModelSize } from '../types';
import { MODE_CONFIGS } from '../types';

const SAMPLE_PROMPTS = [
  'The future of artificial intelligence is',
  'In a breakthrough discovery, scientists have found that',
  'The key to building reliable machine learning systems is',
  'Once upon a time in a world powered by neural networks,',
  'The most important optimization technique in deep learning is',
];

interface BenchmarkFormProps {
  loading: boolean;
  activeMode: string | null;
  onSubmit: (
    text: string,
    modes: OptimizationMode[],
    modelSize: ModelSize,
    maxNewTokens: number,
  ) => void;
}

export default function BenchmarkForm({
  loading,
  activeMode,
  onSubmit,
}: BenchmarkFormProps) {
  const [text, setText] = useState(SAMPLE_PROMPTS[0]);
  const [modelSize, setModelSize] = useState<ModelSize>('gpt2');
  const [maxNewTokens, setMaxNewTokens] = useState(30);
  const [selectedModes, setSelectedModes] = useState<Set<OptimizationMode>>(
    new Set(['baseline', 'quantized']),
  );

  const toggleMode = (mode: OptimizationMode) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        if (next.size > 1) next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim(), Array.from(selectedModes), modelSize, maxNewTokens);
  };

  const randomPrompt = () => {
    const available = SAMPLE_PROMPTS.filter((p) => p !== text);
    setText(available[Math.floor(Math.random() * available.length)]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100">
          <Sparkles className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Benchmark Configuration
          </h2>
          <p className="text-sm text-gray-500">
            Configure and run inference benchmarks across optimization modes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Text input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Input Prompt
            </label>
            <button
              type="button"
              onClick={randomPrompt}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Random prompt
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Enter text for inference..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all resize-none text-sm"
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {text.length}/1000
          </div>
        </div>

        {/* Model + Token config row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Model
            </label>
            <div className="relative">
              <select
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value as ModelSize)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all pr-10"
              >
                <option value="gpt2">GPT-2 (124M params)</option>
                <option value="gpt2-medium">GPT-2 Medium (355M)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Max New Tokens: {maxNewTokens}
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={maxNewTokens}
              onChange={(e) => setMaxNewTokens(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Optimization mode selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Optimization Modes
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MODE_CONFIGS.map((mode) => {
              const isSelected = selectedModes.has(mode.key);
              const isRunning = activeMode === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => toggleMode(mode.key)}
                  className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? `${mode.bgColor} ${mode.borderColor} shadow-sm`
                      : 'bg-white/50 border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {isRunning && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-teal-400"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isSelected ? mode.color : '#d1d5db' }}
                  />
                  <span className={isSelected ? 'text-gray-900' : ''}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Running {activeMode}...
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Run Inference
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </form>
    </motion.div>
  );
}
