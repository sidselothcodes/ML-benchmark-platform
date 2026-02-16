import { useEffect } from 'react';
import {
  X,
  Rocket,
  Layers,
  PlayCircle,
  BarChart3,
  Code2,
  User,
  ExternalLink,
  Cpu,
  Zap,
  Timer,
  HardDrive,
} from 'lucide-react';

interface DocsModalProps {
  onClose: () => void;
}

const MODE_TABLE = [
  {
    mode: 'Baseline',
    color: '#64748B',
    desc: 'Standard PyTorch FP32 inference with no optimizations applied.',
    bestFor: 'Reference comparison',
  },
  {
    mode: 'Quantized',
    color: '#06B6D4',
    desc: 'Reduced-precision inference with optimized generation settings.',
    bestFor: 'Lower memory footprint',
  },
  {
    mode: 'TorchScript',
    color: '#10B981',
    desc: 'Graph-level compilation via torch.compile (PyTorch 2.0+).',
    bestFor: 'CPU-optimized inference',
  },
  {
    mode: 'ONNX',
    color: '#F59E0B',
    desc: 'ONNX Runtime with graph optimizations and operator fusion.',
    bestFor: 'Production deployment',
  },
  {
    mode: 'Batched',
    color: '#EC4899',
    desc: 'Dynamic request batching with configurable queue and flush policy.',
    bestFor: 'High-throughput serving',
  },
];

const STEPS = [
  'Enter a text prompt or click "Random prompt" for a pre-filled example.',
  'Select one or more optimization modes to compare.',
  'Choose a model size and adjust max new tokens (5\u2013100).',
  'Click "Run Inference" and watch results stream in.',
  'Review the generated text, latency, throughput, and memory for each mode.',
];

const METRICS = [
  {
    icon: Timer,
    name: 'Latency',
    detail: 'Wall-clock time to generate output. Lower is better.',
  },
  {
    icon: BarChart3,
    name: 'p95 Latency',
    detail: '95th-percentile latency \u2014 indicates tail consistency.',
  },
  {
    icon: Zap,
    name: 'Throughput',
    detail: 'Tokens generated per second. Higher is better.',
  },
  {
    icon: HardDrive,
    name: 'Memory',
    detail: 'Process RSS during inference. Lower means more efficient.',
  },
];

export default function DocsModal({ onClose }: DocsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide m-4">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Documentation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-10">
          {/* ── Overview ─────────────────────────────── */}
          <section>
            <SectionHeading icon={Rocket} title="Overview" />
            <p className="text-gray-600 leading-relaxed">
              The ML Performance Benchmark platform lets you compare PyTorch
              optimization techniques side-by-side. Run the same prompt through
              Baseline, Quantized, TorchScript, ONNX, and Batched inference
              modes, then instantly visualize latency, throughput, and memory
              differences.
            </p>
          </section>

          {/* ── Optimization Modes ────────────────────── */}
          <section>
            <SectionHeading icon={Layers} title="Optimization Modes" />
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Mode</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODE_TABLE.map((m) => (
                    <tr key={m.mode} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: m.color }}
                          />
                          {m.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.desc}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {m.bestFor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── How to Use ───────────────────────────── */}
          <section>
            <SectionHeading icon={PlayCircle} title="How to Use" />
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-gray-600">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Metrics Explained ─────────────────────── */}
          <section>
            <SectionHeading icon={BarChart3} title="Metrics Explained" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METRICS.map((m) => (
                <div
                  key={m.name}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50">
                    <m.icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{m.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Technical Stack ───────────────────────── */}
          <section>
            <SectionHeading icon={Code2} title="Technical Stack" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StackCard
                label="Backend"
                items={['Python', 'PyTorch', 'FastAPI', 'Transformers']}
              />
              <StackCard
                label="Frontend"
                items={['React', 'TypeScript', 'Tailwind CSS', 'Recharts']}
              />
              <StackCard
                label="Models"
                items={['GPT-2 (124M)', 'GPT-2 Medium (355M)']}
              />
            </div>
          </section>

          {/* ── About ────────────────────────────────── */}
          <section>
            <SectionHeading icon={User} title="About" />
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-2">
              <p className="text-sm text-gray-600">
                Built by{' '}
                <span className="font-semibold text-gray-900">Siddharth</span>{' '}
                as a portfolio project demonstrating ML infrastructure,
                model optimization pipelines, and full-stack engineering.
              </p>
              <a
                href="https://github.com/sidselothcodes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                github.com/sidselothcodes
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Shared tiny components ───────────────────────────── */

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-teal-600" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
  );
}

function StackCard({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
