import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, LogOut, BookOpen, ShieldCheck } from 'lucide-react';
import { ExecutionAlert } from '../../types/telemetry.js';

interface TopNavbarProps {
  mt5Connected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  alerts: ExecutionAlert[];
  unreadAlerts: number;
  onLogout: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  mt5Connected,
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  alerts,
  unreadAlerts,
  onLogout
}) => {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  return (
    <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#080C14]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-30 select-none">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            ExecuTrade
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            / Console Telemetry
          </span>
        </div>

        {/* EXACTLY ONE MT5 STATUS PILL */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition ${
            mt5Connected
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/80'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800/80'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              mt5Connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span>{mt5Connected ? 'MT5: Connected / Active' : 'MT5: Disconnected'}</span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search signals, symbols, tickets... (Press '/' to focus)"
          className="w-full pl-9 pr-8 py-1.5 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-400">
          /
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Swagger link */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
          <span>API Swagger</span>
        </a>

        {/* Alerts Bell Popover */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(prev => !prev)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition relative"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Execution Alerts</span>
                <span className="text-[10px] text-slate-400">{alerts.length} logged</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 mt-1">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No alerts logged</div>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${a.type === 'ERROR' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {a.title}
                        </span>
                        <span className="text-[9px] text-slate-400">{new Date(a.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sun / Moon Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Logout"
          className="p-2 rounded-xl text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

