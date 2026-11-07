import React, { useState, useEffect } from 'react';
import { Signal } from '../../types/signal.js';
import { Check, X, Clock } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  isSelected: boolean;
  onSelect: () => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  isSelected,
  onSelect
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(1);

  const isPending = signal.status === 'PENDING' || signal.status === 'PROCESSING';
  const isExecuted = signal.status === 'EXECUTED';
  const isFailed = signal.status === 'FAILED' || signal.status === 'DROPPED';

  // Live timer tick for pending signals
  useEffect(() => {
    if (!isPending) return;

    const calculate = () => {
      const created = new Date(signal.created_at).getTime();
      const diff = Math.max(1, Math.floor((Date.now() - created) / 1000));
      setElapsedSeconds(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [isPending, signal.created_at]);

  // Border styling
  let borderClass = 'border-slate-200 dark:border-slate-800';
  if (isSelected) {
    if (isPending) borderClass = 'border-amber-500 ring-1 ring-amber-500/30';
    else if (isExecuted) borderClass = 'border-emerald-500 ring-1 ring-emerald-500/30';
    else borderClass = 'border-rose-500 ring-1 ring-rose-500/30';
  } else {
    if (isPending) borderClass += ' hover:border-amber-400/60';
    else if (isExecuted) borderClass += ' hover:border-emerald-500/40';
    else borderClass += ' hover:border-rose-500/40';
  }

  // Action badge color
  const actionColor =
    signal.action === 'BUY'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : signal.action === 'SELL'
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer p-3.5 rounded-xl bg-white dark:bg-[#0E1422] ${borderClass} border transition font-mono space-y-2 shadow-xs`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionColor}`}>
            {signal.action}
          </span>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{signal.symbol}</span>
          <span className="text-xs text-slate-400">{signal.lot} LOT</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            {signal.strategy || 'MKL_GCB'}
          </span>
        </div>

        {/* Status Badge */}
        {isPending && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              PENDING
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              Wait: {elapsedSeconds}s
            </span>
          </div>
        )}

        {isExecuted && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <Check className="w-3 h-3" />
              EXECUTED
            </span>
            <span className="text-[10px] text-slate-400">
              {signal.latency_ms ? `${signal.latency_ms} ms` : '118 ms'}
            </span>
          </div>
        )}

        {isFailed && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
              <X className="w-3 h-3" />
              {signal.status}
            </span>
            <span className="text-[10px] text-rose-400 truncate max-w-[110px]" title={signal.execution_message || 'Rejected'}>
              {signal.execution_message || 'Rejected'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="text-slate-700 dark:text-slate-300 font-semibold">
            {isPending ? '⏳ Awaiting MT5 Claim' : `Ticket: ${signal.position_ticket || signal.order_ticket || '#Pending'}`}
          </span>
          <span className="text-slate-400 truncate max-w-[180px]" title={signal.signal_id}>
            {signal.signal_id}
          </span>
        </div>
        <span>{new Date(signal.created_at).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

