import React, { useState, useRef, useEffect } from 'react';
import { Search, Sun, Moon, Bell, LogOut, BookOpen } from 'lucide-react';
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-12 shrink-0 border-b border-hairline bg-surface px-4 flex items-center justify-between gap-4 z-30 select-none">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-primary tracking-tight">
          ExecuTrade
        </span>
        <span className="text-xs text-tertiary">/</span>
        <span className="text-xs font-medium text-secondary">
          Console
        </span>
      </div>

      {/* Flat Search Input with "/" Keycap */}
      <div className="flex-1 max-w-sm relative hidden sm:block">
        <Search className="w-3.5 h-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blotter..."
          className="w-full pl-8 pr-7 py-1 text-xs font-mono bg-raised border border-hairline rounded-control text-primary placeholder:text-tertiary focus:border-brass focus:outline-none transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-tertiary bg-surface px-1.5 py-0.5 rounded border border-hairline pointer-events-none">
          /
        </kbd>
      </div>

      {/* Right Controls & Status */}
      <div className="flex items-center gap-2">
        {/* MT5 Connection Status Chip with Dot */}
        <div
          title={mt5Connected ? 'TCP Hub active on 127.0.0.1:8282' : 'Waiting for MT5 on 127.0.0.1:8282'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs border border-hairline bg-raised font-sans"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              mt5Connected ? 'bg-buy' : 'bg-tertiary'
            }`}
          />
          <span className="text-secondary text-xs">
            MT5 bridge: {mt5Connected ? 'online' : 'offline'}
          </span>
        </div>

        {/* API Swagger Docs */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Open API Swagger Documentation"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs text-secondary hover:text-primary hover:bg-raised border border-hairline transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
          <span>Swagger</span>
        </a>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(prev => !prev)}
            title="System Alerts"
            className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised border border-hairline transition-colors relative cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            {unreadAlerts > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-sell absolute top-1 right-1" />
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-1 w-80 rounded-panel bg-surface border border-hairline p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                <span className="text-xs font-medium text-primary">System Alerts</span>
                <span className="text-tiny font-mono text-tertiary">{alerts.length} logged</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-hairline mt-1">
                {alerts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-tertiary">No alerts logged</div>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${a.type === 'ERROR' ? 'text-sell' : 'text-buy'}`}>
                          {a.title}
                        </span>
                        <span className="text-[10px] font-mono text-tertiary">{new Date(a.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-secondary truncate">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Paper Light Theme' : 'Switch to Warm Graphite Dark Theme'}
          className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised border border-hairline transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-brass" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Sign Out"
          className="p-1.5 rounded-control text-secondary hover:text-sell hover:bg-raised border border-hairline transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
