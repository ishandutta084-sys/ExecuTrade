import React, { useState, useEffect } from 'react';
import { Signal } from '../../types/signal.js';

interface SignalRowProps {
  signal: Signal;
  isSelected: boolean;
  onSelect: () => void;
  onOpenReceipt?: () => void;
}

export const SignalRow: React.FC<SignalRowProps> = ({
  signal,
  isSelected,
  onSelect,
  onOpenReceipt
}) => {
  const isPending = signal.status === 'PENDING' || signal.status === 'PROCESSING';
  const isExecuted = signal.status === 'EXECUTED';
  const isFailed = signal.status === 'FAILED' || signal.status === 'DROPPED';

  // Live timer for pending rows: "3m 12s"
  const [elapsedText, setElapsedText] = useState('0s');

  useEffect(() => {
    if (!isPending) return;

    const updateTimer = () => {
      const created = new Date(signal.created_at).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - created) / 1000));
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      setElapsedText(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isPending, signal.created_at]);

  const timeStr = new Date(signal.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <tr
      onClick={() => {
        onSelect();
        onOpenReceipt?.();
      }}
      className={`h-9 border-b border-hairline font-sans text-xs transition-colors cursor-pointer select-none group relative ${
        isSelected
          ? 'bg-raised text-primary'
          : 'hover:bg-raised/60 text-secondary'
      }`}
    >
      {/* Time Column (Mono) with Left 2px Brass Indicator Bar if selected */}
      <td className="pl-3 pr-2 py-1 font-mono text-[11px] text-tertiary tabular-nums whitespace-nowrap relative">
        {isSelected && (
          <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-brass" />
        )}
        {timeStr}
      </td>

      {/* Side Column: Sage or Brick text only, NO filled pill */}
      <td className="px-2 py-1 font-mono font-semibold text-xs whitespace-nowrap">
        {signal.action === 'BUY' ? (
          <span className="text-buy">BUY</span>
        ) : signal.action === 'SELL' ? (
          <span className="text-sell">SELL</span>
        ) : (
          <span className="text-pending">{signal.action}</span>
        )}
      </td>

      {/* Symbol Column */}
      <td className="px-2 py-1 font-medium text-primary whitespace-nowrap">
        {signal.symbol}
      </td>

      {/* Lots Column (Right aligned, Mono) */}
      <td className="px-2 py-1 font-mono text-[11px] text-primary text-right tabular-nums whitespace-nowrap">
        {typeof signal.lot === 'number' ? signal.lot.toFixed(2) : signal.lot}
      </td>

      {/* Strategy Column */}
      <td className="px-3 py-1 text-xs text-secondary truncate max-w-[120px]" title={signal.strategy}>
        {signal.strategy || 'DEFAULT'}
      </td>

      {/* Status Column: Dot + Text */}
      <td className="px-2 py-1 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isExecuted
                ? 'bg-buy'
                : isPending
                ? 'bg-pending animate-pulse'
                : 'bg-sell'
            }`}
          />
          <span>
            {isExecuted
              ? 'Executed'
              : isPending
              ? `Pending (${elapsedText})`
              : signal.status === 'DROPPED'
              ? 'Dropped'
              : 'Failed'}
          </span>
        </div>
      </td>

      {/* Latency / Detail Column */}
      <td className="px-2 py-1 text-xs text-secondary truncate max-w-[160px]" title={signal.execution_message || ''}>
        {isExecuted ? (
          <span className="font-mono text-[11px] tabular-nums text-tertiary">
            {signal.latency_ms ? `${signal.latency_ms} ms` : '--'}
          </span>
        ) : (
          <span className="text-xs text-tertiary truncate block">
            {signal.execution_message || '--'}
          </span>
        )}
      </td>

      {/* Ticket Column (Mono) */}
      <td className="px-2 py-1 font-mono text-[11px] tabular-nums text-secondary whitespace-nowrap">
        {signal.position_ticket
          ? `#${signal.position_ticket}`
          : signal.order_ticket
          ? `#${signal.order_ticket}`
          : isPending
          ? 'Pending'
          : '--'}
      </td>

      {/* Signal ID Column (Mono, truncated) */}
      <td className="px-3 py-1 font-mono text-[11px] text-tertiary truncate max-w-[110px]" title={signal.signal_id}>
        {signal.signal_id}
      </td>
    </tr>
  );
};
