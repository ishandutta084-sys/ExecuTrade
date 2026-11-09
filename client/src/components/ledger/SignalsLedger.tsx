import React, { useEffect } from 'react';
import { Signal, LedgerFilter } from '../../types/signal.js';
import { LedgerFilterTabs } from './LedgerFilterTabs.js';
import { SignalRow } from './SignalRow.js';
import { Inbox } from 'lucide-react';

interface SignalsLedgerProps {
  signals: Signal[];
  currentFilter: LedgerFilter;
  setFilter: (f: LedgerFilter) => void;
  pendingCount: number;
  selectedSignal: Signal | null;
  onSelectSignal: (sig: Signal) => void;
  onOpenReceipt?: () => void;
  isLoading?: boolean;
}

export const SignalsLedger: React.FC<SignalsLedgerProps> = ({
  signals,
  currentFilter,
  setFilter,
  pendingCount,
  selectedSignal,
  onSelectSignal,
  onOpenReceipt,
  isLoading = false
}) => {
  // J/K/Enter keyboard navigation for the table blotter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      if (signals.length === 0) return;

      const currentIndex = selectedSignal
        ? signals.findIndex(s => s.signal_id === selectedSignal.signal_id)
        : -1;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < signals.length - 1 ? currentIndex + 1 : 0;
        onSelectSignal(signals[nextIndex]);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : signals.length - 1;
        onSelectSignal(signals[prevIndex]);
      } else if (e.key === 'Enter' && selectedSignal) {
        e.preventDefault();
        onOpenReceipt?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [signals, selectedSignal, onSelectSignal, onOpenReceipt]);

  return (
    <div className="space-y-2 font-sans select-none">
      {/* Header: Title, Filter Tabs, and Keycap Hints */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-primary">
            Order execution stream
          </h2>
          <span className="text-tiny font-mono text-tertiary tabular-nums">
            {signals.length} {currentFilter.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Subtle Keycap Hints */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-tertiary">
            <kbd className="px-1 py-0.5 rounded border border-hairline bg-raised text-[10px]">J</kbd>
            <kbd className="px-1 py-0.5 rounded border border-hairline bg-raised text-[10px]">K</kbd>
            <span>nav</span>
            <span className="mx-1 text-tertiary/40">•</span>
            <kbd className="px-1 py-0.5 rounded border border-hairline bg-raised text-[10px]">↵</kbd>
            <span>ticket</span>
          </div>

          {/* Underline Filter Tabs */}
          <LedgerFilterTabs
            currentFilter={currentFilter}
            setFilter={setFilter}
            pendingCount={pendingCount}
          />
        </div>
      </div>

      {/* Dense Table Container */}
      <div className="border border-hairline rounded-panel bg-surface overflow-hidden">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface z-10 border-b border-hairline text-[11px] font-medium text-tertiary uppercase tracking-wider">
              <tr className="h-8">
                <th className="pl-3 pr-2 py-1 font-mono font-normal">Time</th>
                <th className="px-2 py-1 font-mono font-normal">Side</th>
                <th className="px-2 py-1 font-mono font-normal">Symbol</th>
                <th className="px-2 py-1 font-mono font-normal text-right">Lots</th>
                <th className="px-3 py-1 font-mono font-normal">Strategy</th>
                <th className="px-2 py-1 font-mono font-normal">Status</th>
                <th className="px-2 py-1 font-mono font-normal">Latency / Detail</th>
                <th className="px-2 py-1 font-mono font-normal">Ticket</th>
                <th className="px-3 py-1 font-mono font-normal">Signal ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="h-9 border-b border-hairline animate-pulse">
                    <td className="pl-3 pr-2 py-1"><div className="h-3 w-14 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-8 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-12 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-8 bg-raised rounded ml-auto" /></td>
                    <td className="px-3 py-1"><div className="h-3 w-16 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-20 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-16 bg-raised rounded" /></td>
                    <td className="px-2 py-1"><div className="h-3 w-12 bg-raised rounded" /></td>
                    <td className="px-3 py-1"><div className="h-3 w-24 bg-raised rounded" /></td>
                  </tr>
                ))
              ) : signals.length === 0 ? (
                // Clean empty blotter state
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="space-y-1">
                      <Inbox className="w-5 h-5 mx-auto text-tertiary" strokeWidth={1.5} />
                      <div className="text-xs font-medium text-secondary">
                        No orders recorded
                      </div>
                      <p className="text-[11px] text-tertiary">
                        Signals from TradingView webhooks will stream into this tape automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                signals.map(sig => (
                  <SignalRow
                    key={sig.id || sig.signal_id}
                    signal={sig}
                    isSelected={selectedSignal?.signal_id === sig.signal_id}
                    onSelect={() => onSelectSignal(sig)}
                    onOpenReceipt={onOpenReceipt}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
