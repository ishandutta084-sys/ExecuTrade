import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Signal } from '../../types/signal.js';

interface LifecycleStepperProps {
  signal: Signal;
}

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({ signal }) => {
  const isExecuted = signal.status === 'EXECUTED';
  const isPending = signal.status === 'PENDING' || signal.status === 'PROCESSING';
  const isFailed = signal.status === 'FAILED' || signal.status === 'DROPPED';

  return (
    <div className="space-y-3 font-mono text-xs">
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
        Execution Lifecycle
      </span>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {/* Step 1: Ingested */}
        <div className="relative flex items-start gap-2.5">
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
            <Check className="w-3 h-3" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">Webhook Ingested</div>
            <p className="text-[10px] text-slate-400">Authenticated &amp; Fast-ACK (&lt;4ms)</p>
          </div>
        </div>

        {/* Step 2: Normalization */}
        <div className="relative flex items-start gap-2.5">
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
            <Check className="w-3 h-3" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">Broker Normalization</div>
            <p className="text-[10px] text-slate-400">Suffixes, STOPS_LEVEL & Sizing Validated</p>
          </div>
        </div>

        {/* Step 3: MT5 TCP Dispatch */}
        <div className="relative flex items-start gap-2.5">
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isExecuted
                ? 'bg-emerald-500 text-slate-950'
                : isPending
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-rose-500 text-white'
            }`}
          >
            {isExecuted ? <Check className="w-3 h-3" /> : isPending ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">MT5 Dispatch</div>
            <p className="text-[10px] text-slate-400">
              {isExecuted ? 'Sent over 127.0.0.1:8282' : isPending ? 'Awaiting MT5 claim...' : 'Dispatch failed'}
            </p>
          </div>
        </div>

        {/* Step 4: Broker Fill */}
        <div className="relative flex items-start gap-2.5">
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isExecuted
                ? 'bg-emerald-500 text-slate-950'
                : isPending
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                : 'bg-rose-500 text-white'
            }`}
          >
            {isExecuted ? <Check className="w-3 h-3" /> : isPending ? '4' : <AlertCircle className="w-3 h-3" />}
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">Broker Execution</div>
            <p className="text-[10px] text-slate-400">
              {isExecuted
                ? `Filled Ticket #${signal.position_ticket || signal.order_ticket}`
                : isPending
                ? 'Pending execution'
                : signal.execution_message || 'Rejected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

