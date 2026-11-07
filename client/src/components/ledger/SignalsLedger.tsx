import React from 'react';
import { Signal, LedgerFilter } from '../../types/signal.js';
import { LedgerFilterTabs } from './LedgerFilterTabs.js';
import { SignalCard } from './SignalCard.js';
import { Inbox } from 'lucide-react';

interface SignalsLedgerProps {
  signals: Signal[];
  currentFilter: LedgerFilter;
  setFilter: (f: LedgerFilter) => void;
  pendingCount: number;
  selectedSignal: Signal | null;
  onSelectSignal: (sig: Signal) => void;
}

export const SignalsLedger: React.FC<SignalsLedgerProps> = ({
  signals,
  currentFilter,
  setFilter,
  pendingCount,
  selectedSignal,
  onSelectSignal
}) => {
  return (
    <div className="space-y-3 font-mono">
      {/* Header with Title and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Order Execution Stream
            </h3>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Signals Ledger
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
            {signals.length} {currentFilter === 'ALL' ? 'SIGNALS' : currentFilter}
          </span>
        </div>

        {/* Filter Tabs */}
        <LedgerFilterTabs
          currentFilter={currentFilter}
          setFilter={setFilter}
          pendingCount={pendingCount}
        />
      </div>

      {/* Signals List Container */}
      <div className="space-y-2">
        {signals.length === 0 ? (
          <div className="p-8 rounded-xl bg-white dark:bg-[#0E1422] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Inbox className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No matching signals found
            </div>
            <p className="text-[10px] text-slate-400">
              Incoming TradingView webhook signals will stream here automatically
            </p>
          </div>
        ) : (
          signals.map(sig => (
            <SignalCard
              key={sig.id || sig.signal_id}
              signal={sig}
              isSelected={selectedSignal?.signal_id === sig.signal_id}
              onSelect={() => onSelectSignal(sig)}
            />
          ))
        )}
      </div>
    </div>
  );
};

