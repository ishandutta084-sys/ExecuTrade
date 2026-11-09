import React from 'react';
import { BrokerPosition } from '../../types/position.js';
import { XCircle, Layers } from 'lucide-react';

interface LivePositionsTableProps {
  positions: BrokerPosition[];
  onClosePosition: (ticket: number) => void;
  balance: number;
  equity: number;
  freeMargin: number;
}

export const LivePositionsTable: React.FC<LivePositionsTableProps> = ({
  positions,
  onClosePosition,
  balance,
  equity,
  freeMargin
}) => {
  const totalPnL = positions.reduce((acc, p) => acc + p.pnl, 0);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Account Strip (Horizontal Blotter) */}
      <div className="border border-hairline rounded-panel bg-surface grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x-0 lg:divide-x divide-hairline">
        <div className="p-3.5 space-y-1">
          <span className="text-xs font-medium text-secondary">Account balance</span>
          <div className="font-mono text-lg font-medium text-primary tabular-nums tracking-tight">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-xs font-medium text-secondary">Equity</span>
          <div className="font-mono text-lg font-medium text-primary tabular-nums tracking-tight">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-xs font-medium text-secondary">Free margin</span>
          <div className="font-mono text-lg font-medium text-primary tabular-nums tracking-tight">
            ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-xs font-medium text-secondary">Floating PnL</span>
          <div className={`font-mono text-lg font-medium tabular-nums tracking-tight ${totalPnL >= 0 ? 'text-buy' : 'text-sell'}`}>
            {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
          </div>
        </div>
      </div>

      {/* Positions Dense Table */}
      <div className="border border-hairline rounded-panel bg-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              Live MT5 open positions
            </span>
          </div>
          <span className="text-tiny font-mono text-tertiary tabular-nums">
            {positions.length} active {positions.length === 1 ? 'position' : 'positions'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-surface z-10 border-b border-hairline text-[11px] font-medium text-tertiary uppercase tracking-wider">
              <tr className="h-8">
                <th className="pl-3 pr-2 py-1 font-mono font-normal">Ticket</th>
                <th className="px-2 py-1 font-mono font-normal">Symbol</th>
                <th className="px-2 py-1 font-mono font-normal">Side</th>
                <th className="px-2 py-1 font-mono font-normal text-right">Lots</th>
                <th className="px-3 py-1 font-mono font-normal text-right">Open price</th>
                <th className="px-3 py-1 font-mono font-normal text-right">Current price</th>
                <th className="px-3 py-1 font-mono font-normal text-right">Floating PnL</th>
                <th className="pr-3 pl-2 py-1 font-mono font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-tertiary">
                    No active positions currently open in MetaTrader 5
                  </td>
                </tr>
              ) : (
                positions.map(pos => (
                  <tr
                    key={pos.ticket}
                    className="h-9 border-b border-hairline font-sans text-xs hover:bg-raised/60 transition-colors"
                  >
                    <td className="pl-3 pr-2 py-1 font-mono text-[11px] text-primary tabular-nums">
                      #{pos.ticket}
                    </td>
                    <td className="px-2 py-1 font-medium text-primary">
                      {pos.symbol}
                    </td>
                    <td className="px-2 py-1 font-mono font-semibold text-xs">
                      {pos.type === 'BUY' ? (
                        <span className="text-buy">BUY</span>
                      ) : (
                        <span className="text-sell">SELL</span>
                      )}
                    </td>
                    <td className="px-2 py-1 font-mono text-[11px] text-right text-primary tabular-nums">
                      {pos.lot.toFixed(2)}
                    </td>
                    <td className="px-3 py-1 font-mono text-[11px] text-right text-secondary tabular-nums">
                      {pos.open_price.toFixed(pos.symbol.includes('JPY') ? 3 : 5)}
                    </td>
                    <td className="px-3 py-1 font-mono text-[11px] text-right text-secondary tabular-nums">
                      {pos.current_price.toFixed(pos.symbol.includes('JPY') ? 3 : 5)}
                    </td>
                    <td className={`px-3 py-1 font-mono text-[11px] text-right font-medium tabular-nums ${pos.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                      {pos.pnl >= 0 ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`}
                    </td>
                    <td className="pr-3 pl-2 py-1 text-right">
                      <button
                        onClick={() => onClosePosition(pos.ticket)}
                        title={`Close position #${pos.ticket}`}
                        className="px-2 py-0.5 rounded-control text-xs text-secondary hover:text-sell hover:bg-sell/10 border border-hairline hover:border-sell/30 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
