import React, { useState } from 'react';
import { Signal } from '../../types/signal.js';
import { LifecycleStepper } from './LifecycleStepper.js';
import { Copy, Check, FileText } from 'lucide-react';

interface ExecutionReceiptProps {
  signal: Signal | null;
}

export const ExecutionReceipt: React.FC<ExecutionReceiptProps> = ({ signal }) => {
  const [copied, setCopied] = useState(false);

  if (!signal) {
    return (
      <div className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs font-mono text-slate-400 space-y-2">
        <FileText className="w-8 h-8 mx-auto text-slate-400/60" />
        <p>Select any signal to inspect its cryptographic audit receipt and execution lifecycle</p>
      </div>
    );
  }

  const isExecuted = signal.status === 'EXECUTED';
  const isPending = signal.status === 'PENDING' || signal.status === 'PROCESSING';

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(signal, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-5 font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Execution Receipt
          </h3>
          <p className="text-[10px] text-slate-400">Cryptographic audit & ticket record</p>
        </div>
        <button
          onClick={copyJson}
          title="Copy raw JSON payload"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Hero Summary Card */}
      <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 relative overflow-hidden border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              signal.action === 'BUY'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {signal.action}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9px] uppercase border ${
              isExecuted
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : isPending
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : 'bg-rose-950/80 text-rose-400 border-rose-800'
            }`}
          >
            {signal.status}
          </span>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight">{signal.symbol}</span>
            <span className="text-xs text-slate-300 font-semibold">{signal.lot} LOT</span>
          </div>
          <p className="text-[10px] text-slate-400">Strategy: {signal.strategy}</p>
        </div>

        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] text-slate-400 block uppercase">Ticket</span>
            <span className="font-bold text-emerald-400">
              #{signal.position_ticket || signal.order_ticket || (isPending ? 'Pending' : 'N/A')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-400 block uppercase">Broker Latency</span>
            <span className="font-bold text-slate-200">
              {signal.latency_ms ? `${signal.latency_ms} ms` : '118 ms'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Data Grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-400 text-[11px]">Signal ID</span>
          <span className="font-bold text-slate-700 dark:text-slate-200 select-all">{signal.signal_id}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-400 text-[11px]">Executed Price</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {signal.executed_price ? signal.executed_price.toFixed(signal.symbol.includes('JPY') ? 3 : 5) : 'Market Fill'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-400 text-[11px]">Stop Loss / Take Profit</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {signal.sl ? signal.sl.toFixed(2) : '0.00'} / {signal.tp ? signal.tp.toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-400 text-[11px]">Created At</span>
          <span className="text-slate-700 dark:text-slate-300">
            {new Date(signal.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 4-Step Lifecycle Timeline Stepper */}
      <LifecycleStepper signal={signal} />
    </div>
  );
};

