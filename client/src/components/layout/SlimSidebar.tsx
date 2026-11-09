import React from 'react';
import { Activity, Layers, BookOpen, Github } from 'lucide-react';

interface SlimSidebarProps {
  activeTab: 'console' | 'positions';
  setActiveTab: (tab: 'console' | 'positions') => void;
}

export const SlimSidebar: React.FC<SlimSidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="w-12 shrink-0 h-full border-r border-hairline bg-surface flex flex-col items-center justify-between py-3 select-none z-20">
      {/* Top Brand Monogram */}
      <div className="flex flex-col items-center gap-4">
        <div
          title="ExecuTrade Blotter"
          className="w-7 h-7 rounded-control border border-hairline flex items-center justify-center bg-raised text-brass font-mono font-semibold text-xs tracking-tighter transition-colors"
        >
          ET
        </div>

        {/* Navigation Rail */}
        <nav className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => setActiveTab('console')}
            title="Execution Console"
            className={`w-9 h-9 rounded-control relative flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'console'
                ? 'text-primary bg-raised before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-brass'
                : 'text-secondary hover:text-primary hover:bg-raised'
            }`}
          >
            <Activity className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            title="Live MT5 Positions"
            className={`w-9 h-9 rounded-control relative flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'positions'
                ? 'text-primary bg-raised before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-brass'
                : 'text-secondary hover:text-primary hover:bg-raised'
            }`}
          >
            <Layers className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="API Documentation (Swagger)"
            className="w-9 h-9 rounded-control flex items-center justify-center text-secondary hover:text-primary hover:bg-raised transition-colors"
          >
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />
          </a>
        </nav>
      </div>

      {/* Bottom Rail Info */}
      <div className="flex flex-col items-center gap-3">
        <a
          href="https://github.com/ishandutta084-sys/ExecuTrade"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
          className="w-9 h-9 rounded-control flex items-center justify-center text-secondary hover:text-primary hover:bg-raised transition-colors"
        >
          <Github className="w-4 h-4" strokeWidth={1.5} />
        </a>

        <span className="text-[10px] font-mono text-tertiary">
          v2.0
        </span>
      </div>
    </aside>
  );
};
