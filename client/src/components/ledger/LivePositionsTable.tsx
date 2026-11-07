import React from 'react';
import { BrokerPosition } from '../../types/position.js';
import { Layers, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

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
    <div className="space-y-4 font-mono">
      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Balance</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">${balance.toFixed(2)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Equity</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">${equity.toFixed(2)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Free Margin</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">${freeMargin.toFixed(2)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Floating PnL</span>
          <span className={`text-base font-bold flex items-center gap-1 ${totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Live MT5 Open Positions
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No active positions open in MetaTrader 5
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 text-[10px] uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Ticket</th>
                  <th className="py-2.5 px-4 font-semibold">Symbol</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Lots</th>
                  <th className="py-2.5 px-4 font-semibold">Open Price</th>
                  <th className="py-2.5 px-4 font-semibold">Current Price</th>
                  <th className="py-2.5 px-4 font-semibold">Floating PnL</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {positions.map(pos => (
                  <tr key={pos.ticket} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">#{pos.ticket}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{pos.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pos.type === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                      }`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{pos.lot}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{pos.open_price.toFixed(pos.symbol.includes('JPY') ? 3 : 5)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{pos.current_price.toFixed(pos.symbol.includes('JPY') ? 3 : 5)}</td>
                    <td className={`py-3 px-4 font-bold ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {pos.pnl >= 0 ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Close position #${pos.ticket}?`)) {
                            onClosePosition(pos.ticket);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-bold transition cursor-pointer"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

