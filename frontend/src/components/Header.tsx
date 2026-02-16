import { useState } from 'react';
import { Cpu, Github, BookOpen } from 'lucide-react';
import DocsModal from './DocsModal';

interface HeaderProps {
  connected: boolean;
}

export default function Header({ connected }: HeaderProps) {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass-card border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 shadow-lg shadow-teal-200">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold tracking-tight gradient-text">
                  ML Performance Benchmark
                </h1>
              </div>
            </div>

            {/* Status + Links */}
            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      connected
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      connected ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                  />
                </span>
                <span className="text-gray-500 font-medium hidden sm:inline">
                  {connected ? 'Live' : 'Connecting...'}
                </span>
              </div>

              <div className="h-5 w-px bg-gray-200" />

              <button
                onClick={() => setShowDocs(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Docs</span>
              </button>

              <a
                href="https://github.com/sidselothcodes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
    </>
  );
}
