import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Server, Cpu, Database, Wifi } from 'lucide-react';
import { getHealth, getModels } from '../utils/api';
import type { HealthResponse, ModelInfo } from '../types';

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [, setModels] = useState<Record<string, ModelInfo>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const [h, m] = await Promise.all([getHealth(), getModels()]);
        setHealth(h);
        setModels(m);
        setError(false);
      } catch {
        setError(true);
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  const isHealthy = health?.status === 'healthy' && !error;

  const services = [
    { name: 'API', icon: Server, ok: isHealthy },
    { name: 'Models', icon: Cpu, ok: (health?.loaded_servers?.length ?? 0) > 0 },
    { name: 'Metrics', icon: Database, ok: isHealthy },
    { name: 'Stream', icon: Wifi, ok: isHealthy },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100">
            <Heart className="w-4 h-4 text-pink-600" />
          </div>
          <h3 className="font-semibold text-gray-900">System Health</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isHealthy
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isHealthy ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {isHealthy ? 'All Systems Healthy' : 'Degraded'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${
              svc.ok
                ? 'bg-emerald-50/50 border-emerald-100'
                : 'bg-red-50/50 border-red-100'
            }`}
          >
            <svc.icon
              className={`w-5 h-5 ${
                svc.ok ? 'text-emerald-600' : 'text-red-400'
              }`}
            />
            <span className="text-xs font-medium text-gray-600">
              {svc.name}
            </span>
            <span
              className={`text-xs font-semibold ${
                svc.ok ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {svc.ok ? '✓ Online' : '✗ Down'}
            </span>
          </div>
        ))}
      </div>

      {/* Loaded models info */}
      {health?.loaded_servers && health.loaded_servers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Loaded Models:</p>
          <div className="flex flex-wrap gap-2">
            {health.loaded_servers.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
