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
  const [sl, setSl] = useState('0');
  const [tp, setTp] = useState('0');
  const [strategy, setStrategy] = useState('MANUAL');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-fast">
      <div className="w-full max-w-sm bg-surface border border-hairline rounded-panel p-5 shadow-none space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-brass" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-primary">
              Manual order dispatch
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-control bg-sell/10 border border-sell/30 text-sell text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Action Toggle (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction('BUY')}
              className={`py-1.5 rounded-control text-xs font-semibold transition-colors cursor-pointer border ${
                action === 'BUY'
                  ? 'bg-buy/15 text-buy border-buy'
                  : 'bg-raised text-secondary border-hairline hover:text-primary'
              }`}
            >
              BUY / Long
            </button>
            <button
              type="button"
              onClick={() => setAction('SELL')}
              className={`py-1.5 rounded-control text-xs font-semibold transition-colors cursor-pointer border ${
                action === 'SELL'
                  ? 'bg-sell/15 text-sell border-sell'
                  : 'bg-raised text-secondary border-hairline hover:text-primary'
              }`}
            >
              SELL / Short
            </button>
          </div>

          {/* Symbol & Lot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-secondary mb-1 block">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs font-medium text-primary uppercase focus:outline-none focus:border-brass transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-secondary mb-1 block">Lot size</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lot}
                onChange={e => setLot(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary tabular-nums focus:outline-none focus:border-brass transition-colors"
              />
            </div>
          </div>

          {/* SL & TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-secondary mb-1 block">Stop loss</label>
              <input
                type="number"
                step="0.01"
                value={sl}
                onChange={e => setSl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary tabular-nums focus:outline-none focus:border-brass transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-secondary mb-1 block">Take profit</label>
              <input
                type="number"
                step="0.01"
                value={tp}
                onChange={e => setTp(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary tabular-nums focus:outline-none focus:border-brass transition-colors"
              />
            </div>
          </div>

          {/* Strategy Tag */}
          <div>
            <label className="text-[11px] font-medium text-secondary mb-1 block">Strategy tag</label>
            <input
              type="text"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary focus:outline-none focus:border-brass transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 rounded-control bg-brass hover:bg-brassHover text-[#121110] font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 mt-1"
          >
            {isSubmitting ? 'Transmitting order...' : 'Transmit order to MT5 bridge'}
          </button>
        </form>
      </div>
    </div>
  );
};
