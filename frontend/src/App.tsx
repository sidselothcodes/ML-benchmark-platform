import { motion } from 'framer-motion';
import { Cpu, AlertCircle } from 'lucide-react';

import Header from './components/Header';
import BenchmarkForm from './components/BenchmarkForm';
import StatsOverview from './components/StatsOverview';
import LiveLatencyChart from './components/LiveLatencyChart';
import ThroughputChart from './components/ThroughputChart';
import MemoryChart from './components/MemoryChart';
import MetricsTable from './components/MetricsTable';
import ResultsDisplay from './components/ResultsDisplay';
import SystemHealth from './components/SystemHealth';

import { useMetrics } from './hooks/useMetrics';
import { useBenchmark } from './hooks/useBenchmark';

function App() {
  const {
    summaries,
    comparison,
    totalInferences,
    connected,
  } = useMetrics();

  const benchmark = useBenchmark();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Header connected={connected} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full mb-5">
            <Cpu className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">
              PyTorch Optimization Benchmark Suite
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-500 pb-2 leading-tight">
            Model Inference Benchmarking Platform
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
            Compare PyTorch optimization techniques in real-time with detailed performance metrics
          </p>
        </motion.section>

        {/* Benchmark form */}
        <BenchmarkForm
          loading={benchmark.loading}
          activeMode={benchmark.activeMode}
          onSubmit={benchmark.run}
        />

        {/* Results from last run */}
        <ResultsDisplay results={benchmark.results} />

        {/* Error display */}
        {benchmark.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-red-50 border-l-4 border-red-500 px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-0.5">
                  Inference Failed
                </h4>
                <p className="text-sm text-red-700">{benchmark.error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats overview */}
        <StatsOverview
          summaries={summaries}
          totalInferences={totalInferences}
          connected={connected}
        />

        {/* Main latency chart — full width */}
        <LiveLatencyChart summaries={summaries} />

        {/* Two-column chart row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ThroughputChart summaries={summaries} />
          <MemoryChart summaries={summaries} />
        </div>

        {/* Detailed table */}
        <MetricsTable summaries={summaries} comparison={comparison} />

        {/* System health */}
        <SystemHealth />

        {/* Footer */}
        <footer className="text-center py-10 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Built with PyTorch, FastAPI, React &amp; Recharts —{' '}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-600 transition-colors"
            >
              View Source
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
