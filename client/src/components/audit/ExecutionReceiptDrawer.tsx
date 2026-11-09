import React, { useState, useEffect } from 'react';
import { Signal } from '../../types/signal.js';
import { LatencyWaterfall } from './LatencyWaterfall.js';
import { Copy, Check, X } from 'lucide-react';

interface ExecutionReceiptDrawerProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionReceiptDrawer: React.FC<ExecutionReceiptDrawerProps> = ({
  signal,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  // Esc key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !signal) return null;

  const isExecuted = signal.status === 'EXECUTED';
  const isPending = signal.status === 'PENDING' || signal.status === 'PROCESSING';

  // Copy raw JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(signal, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 48px Price Hero formatting
  const executedPrice = signal.executed_price || 0;
  let intPrice = '--';
  let decPrice = '00';
  if (executedPrice > 0) {
    const parts = executedPrice.toFixed(2).split('.');
    intPrice = parts[0];
    decPrice = parts[1];
  }

  // Price Ladder Calculations
  const entry = executedPrice > 0 ? executedPrice : 0;
  const sl = signal.sl || 0;
  const tp = signal.tp || 0;
  const lot = signal.lot || 0.01;

  let tpPoints = 0;
  let slPoints = 0;
  let riskReward = '--';

  if (entry > 0 && sl > 0 && tp > 0) {
    if (signal.action === 'BUY') {
      tpPoints = tp - entry;
      slPoints = entry - sl;
    } else {
      tpPoints = entry - tp;
      slPoints = sl - entry;
    }
    if (slPoints > 0) {
      riskReward = `1 : ${(tpPoints / slPoints).toFixed(1)}`;
    }
  }

  // Timestamp formatting: 07 Nov 2026 18:02:57 UTC (GMT+5:30)
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getUTCDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      const time = d.toTimeString().split(' ')[0];
      const offsetMin = -d.getTimezoneOffset();
      const offsetHr = Math.floor(Math.abs(offsetMin) / 60);
      const offsetRem = Math.abs(offsetMin) % 60;
      const sign = offsetMin >= 0 ? '+' : '-';
      const offsetStr = `GMT${sign}${offsetHr}:${offsetRem < 10 ? '0' : ''}${offsetRem}`;
      return `${day} ${month} ${year} ${time} (${offsetStr})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Backdrop for screens below 1024px */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-base"
      />

      {/* Slide-in Broker Ticket Drawer */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] z-50 bg-surface border-l border-hairline flex flex-col justify-between overflow-y-auto select-none transition-transform duration-base ease-out font-sans shadow-none"
      >
        <div className="p-5 space-y-5">
          {/* Header: Ticket # and Status Dot */}
          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                Ticket #{signal.position_ticket || signal.order_ticket || (isPending ? 'Pending' : 'N/A')}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isExecuted ? 'bg-buy' : isPending ? 'bg-pending animate-pulse' : 'bg-sell'
                  }`}
                />
                <span>{signal.status}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyJson}
                title="Copy ticket JSON payload"
                className="flex items-center gap-1 px-2 py-1 rounded-control text-xs text-secondary hover:text-primary hover:bg-raised border border-hairline transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-buy" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={onClose}
                title="Close drawer (Esc)"
                className="p-1 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Hero: Executed Price (48px, Decimals Dimmed) */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-secondary">
              Executed price
            </div>
            <div className="flex items-baseline font-mono tracking-tight">
              <span className="text-hero font-light text-primary tabular-nums">
                {intPrice}
              </span>
              <span className="text-hero font-light text-tertiary tabular-nums">
                .{decPrice}
              </span>
              <span className="ml-2 font-sans text-xs text-secondary font-medium">
                {signal.symbol}
              </span>
            </div>
          </div>

          {/* Vertical Price Ladder */}
          <div className="p-3 rounded-control bg-raised border border-hairline space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-tertiary font-sans mb-1">
              <span>Price ladder</span>
              {riskReward !== '--' && (
                <span>R:R {riskReward}</span>
              )}
            </div>

            {/* Take Profit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-buy" />
                <span className="text-secondary font-sans text-xs">Take profit</span>
              </div>
              <div className="text-right">
                <span className="text-primary tabular-nums font-medium">{tp > 0 ? tp.toFixed(2) : '--'}</span>
                {tpPoints !== 0 && (
                  <span className="text-buy text-[10px] ml-1.5 font-normal">
                    (+{Math.abs(tpPoints).toFixed(1)} pts)
                  </span>
                )}
              </div>
            </div>

            {/* Ladder Connector 1 */}
            <div className="pl-0.5 ml-[2px] h-3 border-l border-hairline" />

            {/* Entry / Executed Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brass" />
                <span className="text-primary font-sans text-xs font-medium">Entry</span>
              </div>
              <span className="text-primary tabular-nums font-semibold">
                {entry > 0 ? entry.toFixed(2) : 'Market'}
              </span>
            </div>

            {/* Ladder Connector 2 */}
            <div className="pl-0.5 ml-[2px] h-3 border-l border-hairline" />

            {/* Stop Loss */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sell" />
                <span className="text-secondary font-sans text-xs">Stop loss</span>
              </div>
              <div className="text-right">
                <span className="text-primary tabular-nums font-medium">{sl > 0 ? sl.toFixed(2) : '--'}</span>
                {slPoints !== 0 && (
                  <span className="text-sell text-[10px] ml-1.5 font-normal">
                    (-{Math.abs(slPoints).toFixed(1)} pts)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dotted Leader Two-Column Metadata Blotter */}
          <div className="space-y-2 text-xs font-sans">
            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Signal ID</span>
              <span className="dotted-leader" />
              <span className="font-mono text-tertiary tabular-nums shrink-0">{signal.signal_id}</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Action &amp; Symbol</span>
              <span className="dotted-leader" />
              <span className="font-mono tabular-nums shrink-0">
                <span className={signal.action === 'BUY' ? 'text-buy font-semibold' : 'text-sell font-semibold'}>
                  {signal.action}
                </span>{' '}
                <span className="text-primary">{signal.symbol}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Volume</span>
              <span className="dotted-leader" />
              <span className="font-mono text-primary tabular-nums shrink-0">{signal.lot} LOT</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Strategy</span>
              <span className="dotted-leader" />
              <span className="font-mono text-secondary shrink-0">{signal.strategy || 'DEFAULT'}</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Deal ticket</span>
              <span className="dotted-leader" />
              <span className="font-mono text-tertiary tabular-nums shrink-0">{signal.deal_ticket || '--'}</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Broker latency</span>
              <span className="dotted-leader" />
              <span className="font-mono text-tertiary tabular-nums shrink-0">{signal.latency_ms ? `${signal.latency_ms} ms` : '--'}</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-secondary shrink-0">Created at</span>
              <span className="dotted-leader" />
              <span className="font-mono text-[11px] text-tertiary tabular-nums shrink-0">
                {formatTimestamp(signal.created_at)}
              </span>
            </div>
          </div>

          {/* Latency Waterfall */}
          <div className="pt-2 border-t border-hairline">
            <LatencyWaterfall signal={signal} />
          </div>
        </div>

        {/* Signature Flourish: Perforated Tear-off Ticket Border */}
        <div className="p-4 bg-raised border-t border-hairline perforated-ticket-bottom mt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-tertiary">
            <span>ExecuTrade Blotter Receipt</span>
            <span>END OF TICKET</span>
          </div>
        </div>
      </aside>
    </>
  );
};

