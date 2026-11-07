import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';

interface ManualSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignalDispatched: () => void;
  defaultSymbol?: string;
}

export const ManualSignalModal: React.FC<ManualSignalModalProps> = ({
  isOpen,
  onClose,
  onSignalDispatched,
  defaultSymbol = 'XAUUSD'
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [lot, setLot] = useState('0.01');
  const [sl, setSl] = useState('2640.00');
  const [tp, setTp] = useState('2680.00');
  const [strategy, setStrategy] = useState('MKL_GCB');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      signal_id: `MANUAL-${Date.now()}`,
      strategy,
      action,
      symbol: symbol.toUpperCase().trim(),
      lot: parseFloat(lot) || 0.01,
      sl: parseFloat(sl) || 0,
      tp: parseFloat(tp) || 0
    };

    try {
      const res = await fetch('/api/test-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Execution failed');
      }

      onSignalDispatched();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-mono animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Push Manual Test Signal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Toggle (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction('BUY')}
              className={`py-2 rounded-xl font-bold transition cursor-pointer border ${
                action === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              BUY / LONG
            </button>
            <button
              type="button"
              onClick={() => setAction('SELL')}
              className={`py-2 rounded-xl font-bold transition cursor-pointer border ${
                action === 'SELL'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Symbol & Lot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Lot Size</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lot}
                onChange={e => setLot(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* SL & TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Stop Loss (Price)</label>
              <input
                type="number"
                step="0.01"
                value={sl}
                onChange={e => setSl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Take Profit (Price)</label>
              <input
                type="number"
                step="0.01"
                value={tp}
                onChange={e => setTp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Strategy Name */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Strategy Tag</label>
            <input
              type="text"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Transmitting to MT5...' : 'Transmit Order to MT5 Bridge'}
          </button>
        </form>
      </div>
    </div>
  );
};

