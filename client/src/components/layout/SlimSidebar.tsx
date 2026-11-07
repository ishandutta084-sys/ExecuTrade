import React from 'react';
import { Terminal, Shield, BookOpen, Github, Activity, Layers } from 'lucide-react';

interface SlimSidebarProps {
  activeTab: 'console' | 'positions';
  setActiveTab: (tab: 'console' | 'positions') => void;
}

export const SlimSidebar: React.FC<SlimSidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="w-16 shrink-0 h-full border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#080C14] flex flex-col items-center justify-between py-4 select-none z-20">
      {/* Top Brand Monogram */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 group cursor-pointer">
          <span className="font-mono font-black text-sm text-emerald-500 tracking-tighter group-hover:scale-110 transition-transform">
            ET
          </span>
        </div>

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center gap-3">
          <button
            onClick={() => setActiveTab('console')}
            title="Execution Console"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'console'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            title="Live MT5 Positions"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'positions'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>

          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="API Swagger Docs"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            <BookOpen className="w-5 h-5" />
          </a>
        </nav>
      </div>

      {/* Bottom Footer Info */}
      <div className="flex flex-col items-center gap-4">
        <a
          href="https://github.com/executrade"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          <Github className="w-4 h-4" />
        </a>

        <div className="text-[9px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80">
          v2.0
        </div>
      </div>
    </aside>
  );
};

