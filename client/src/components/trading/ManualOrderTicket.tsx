import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';

interface ManualOrderTicketProps {
  onSignalDispatched: () => void;
  defaultSymbol?: string;
  accountEquity?: number;
  accountBalance?: number;
  initialPrice?: number;
}

export const ManualOrderTicket: React.FC<ManualOrderTicketProps> = ({
  onSignalDispatched,
  defaultSymbol = 'XAUUSD',
  accountEquity = 629.82,
  accountBalance = 629.82,
  initialPrice = 3752.86
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [sizingMode, setSizingMode] = useState<'Quantity' | 'Lots'>('Lots');
  const [lot, setLot] = useState<number>(0.02);
  const [quantity, setQuantity] = useState<number>(2); // 2 oz for 0.02 lot

  // Live Bid / Ask simulation or price state
  const [askPrice, setAskPrice] = useState<number>(initialPrice);
  const [bidPrice, setBidPrice] = useState<number>(initialPrice - 0.26);

  // Condition toggles
  const [isLimitEnabled, setIsLimitEnabled] = useState(false);
  const [limitPrice, setLimitPrice] = useState<string>(initialPrice.toFixed(2));

  const [isTpSlEnabled, setIsTpSlEnabled] = useState(false);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');

  const [strategyTag, setStrategyTag] = useState('MANUAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Micro-tick price update simulation to give a live trading terminal feel
  useEffect(() => {
    const timer = setInterval(() => {
      // Small jitter between -0.05 and +0.05
      const delta = (Math.random() - 0.49) * 0.08;
      setAskPrice(prev => {
        const next = Math.max(10, prev + delta);
        setBidPrice(Number((next - 0.26).toFixed(2)));
        return Number(next.toFixed(2));
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Update limit price when ask/bid changes if not manually typed
  useEffect(() => {
    if (!isLimitEnabled) {
      setLimitPrice((action === 'BUY' ? askPrice : bidPrice).toFixed(2));
    }
  }, [action, askPrice, bidPrice, isLimitEnabled]);

  // Sync quantity and lot
  const handleLotChange = (val: number) => {
    const safe = Math.max(0.01, Number(val.toFixed(2)));
    setLot(safe);
    setQuantity(Number((safe * 100).toFixed(0)));
  };

  const handleQuantityChange = (val: number) => {
    const safeQty = Math.max(1, Math.round(val));
    setQuantity(safeQty);
    setLot(Number((safeQty / 100).toFixed(2)));
  };

  // Leverage & Margin Math (XM Global Gold model)
  const leverage = 1000;
  const currentPrice = action === 'BUY' ? askPrice : bidPrice;
  const notional = currentPrice * lot * 100;
  const requiredMargin = Number((notional / leverage).toFixed(2));
  const effectiveEquity = Math.max(accountEquity, 100);
  const marginPct = Number(((requiredMargin / effectiveEquity) * 100).toFixed(2));

  // Slider change handler (sets lot size based on % of account equity)
  const handleSliderChange = (pct: number) => {
    const clampedPct = Math.min(100, Math.max(0.1, pct));
    const targetMargin = (effectiveEquity * clampedPct) / 100;
    const targetLot = Number(((targetMargin * leverage) / (currentPrice * 100)).toFixed(2));
    const safeLot = Math.max(0.01, targetLot);
    setLot(safeLot);
    setQuantity(Math.max(1, Math.round(safeLot * 100)));
  };

  const spread = Number((askPrice - bidPrice).toFixed(2));

  // Submit Order to backend
  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    const targetPrice = isLimitEnabled ? parseFloat(limitPrice) : currentPrice;
    const slVal = isTpSlEnabled && stopLoss ? parseFloat(stopLoss) : 0;
    const tpVal = isTpSlEnabled && takeProfit ? parseFloat(takeProfit) : 0;

    const payload = {
      signal_id: `MANUAL-${Date.now()}`,
      strategy: strategyTag,
      action,
      symbol: symbol.toUpperCase().trim(),
      lot,
      price: targetPrice,
      sl: slVal,
      tp: tpVal
    };

    try {
      let res = await fetch('/api/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch('/api/test-signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || errJson.error || 'Bridge rejected order');
      }

      const resJson = await res.json();
      setFeedback({
        type: 'success',
        message: `${action} ${lot} ${symbol} @ ${currentPrice.toFixed(2)} dispatched! Ticket: #${resJson.ticket || resJson.order_ticket || 'OK'}`
      });

      onSignalDispatched();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Transmission failed. Verify MT5 bridge status.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0B1426] border border-[#1E293B] rounded-2xl p-4 shadow-xl font-sans select-none space-y-3.5 text-slate-100">
      {/* 0. Symbol & Status Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-[#1E293B]/70">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase">
            Order Dispatch
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="bg-[#132038] border border-[#1E293B] text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded cursor-pointer focus:outline-none"
          >
            <option value="XAUUSD">XAUUSD</option>
            <option value="GOLD">GOLD</option>
            <option value="GOLD.i#">GOLD.i#</option>
            <option value="EURUSD">EURUSD</option>
            <option value="BTCUSD">BTCUSD</option>
          </select>
        </div>
      </div>

      {/* 1. Top Dual Order Bar (SELL / BUY with center spread badge) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#09101D] rounded-xl relative">
        {/* Center Spread Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2.5 py-0.5 rounded-full bg-[#1E293B] border border-[#334155] text-[11px] font-mono font-bold text-slate-200 shadow-md">
          {spread.toFixed(2)}
        </div>

        {/* SELL Button */}
        <button
          type="button"
          onClick={() => setAction('SELL')}
          className={`py-2 px-3 rounded-lg text-left transition-all cursor-pointer ${
            action === 'SELL'
              ? 'bg-[#EF4444] text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-400'
              : 'bg-[#132038] hover:bg-[#1A2A48] text-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold tracking-wider opacity-85 uppercase">
            SELL
          </div>
          <div className="text-sm font-extrabold font-mono tracking-tight tabular-nums mt-0.5">
            {bidPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </button>

        {/* BUY Button (Active Green in Image 3) */}
        <button
          type="button"
          onClick={() => setAction('BUY')}
          className={`py-2 px-3 rounded-lg text-right transition-all cursor-pointer ${
            action === 'BUY'
              ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400'
              : 'bg-[#132038] hover:bg-[#1A2A48] text-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold tracking-wider opacity-85 uppercase">
            BUY
          </div>
          <div className="text-sm font-extrabold font-mono tracking-tight tabular-nums mt-0.5">
            {askPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </button>
      </div>

      {/* 2. Quantity vs Lots Segmented Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#132038] rounded-xl border border-[#1E293B]/70 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSizingMode('Quantity')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            sizingMode === 'Quantity'
              ? 'bg-[#1E293B] text-white shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Quantity
        </button>
        <button
          type="button"
          onClick={() => setSizingMode('Lots')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            sizingMode === 'Lots'
              ? 'bg-[#1E293B] text-white shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Lots
        </button>
      </div>

      {/* 3. Amount Card */}
      <div className="p-3.5 bg-[#132038] rounded-xl border border-[#1E293B] space-y-2">
        <div className="text-[11px] font-medium text-slate-400">
          Amount
        </div>

        {sizingMode === 'Lots' ? (
          <div className="flex items-center justify-between gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="50"
              value={lot}
              onChange={e => handleLotChange(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-transparent font-mono text-xl font-bold text-white focus:outline-none tabular-nums"
            />
            <span className="text-sm font-semibold text-slate-300 shrink-0">
              Lot(s)
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <input
              type="number"
              step="1"
              min="1"
              max="5000"
              value={quantity}
              onChange={e => handleQuantityChange(parseFloat(e.target.value) || 1)}
              className="w-full bg-transparent font-mono text-xl font-bold text-white focus:outline-none tabular-nums"
            />
            <span className="text-sm font-semibold text-slate-300 shrink-0">
              Oz / Units
            </span>
          </div>
        )}

        {/* Quick Lot Step Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {[0.01, 0.02, 0.05, 0.10].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => handleLotChange(preset)}
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded cursor-pointer transition-colors ${
                lot === preset
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleLotChange(lot - 0.01)}
              className="w-5 h-5 rounded bg-[#1E293B] text-slate-300 hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => handleLotChange(lot + 0.01)}
              className="w-5 h-5 rounded bg-[#1E293B] text-slate-300 hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 4. Margin Details & Slider Bar (Image 3 Reference) */}
      <div className="space-y-1.5 px-0.5">
        <div className="text-[13px] font-medium text-slate-300">
          Required Margin <span className="text-white font-semibold">${requiredMargin.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Interactive Range Slider */}
          <div className="relative flex-1 flex items-center h-4">
            {/* Visual Track */}
            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#38BDF8] rounded-full transition-all duration-75"
                style={{ width: `${Math.min(Math.max(marginPct, 0), 100)}%` }}
              />
            </div>

            {/* Slider Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-[#38BDF8] pointer-events-none transition-all duration-75 z-10"
              style={{ left: `${Math.min(Math.max(marginPct, 1.5), 98.5)}%` }}
            />

            {/* Range Input (invisible on top to capture drag / click) */}
            <input
              type="range"
              min="0.1"
              max="100"
              step="0.1"
              value={Math.min(Math.max(marginPct, 0.1), 100)}
              onChange={e => handleSliderChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
          </div>

          {/* Percentage on Right */}
          <span className="text-xs font-mono font-bold text-slate-200 shrink-0 min-w-[52px] text-right">
            {marginPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 5. Order Condition Toggle: Limit Order */}
      <div className="p-3 bg-[#132038] rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-200">
            {action === 'BUY' ? 'Buy When Price is' : 'Sell When Price is'}
          </span>
          <button
            type="button"
            onClick={() => setIsLimitEnabled(!isLimitEnabled)}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              isLimitEnabled ? 'bg-[#10B981]' : 'bg-[#334155]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                isLimitEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isLimitEnabled && (
          <div className="pt-1.5 border-t border-[#1E293B] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Trigger Price</span>
            <input
              type="number"
              step="0.1"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              className="w-28 px-2 py-1 rounded bg-[#0B1426] border border-[#1E293B] text-xs font-mono text-right text-emerald-400 font-bold focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 6. Order Condition Toggle: TP / SL */}
      <div className="p-3 bg-[#132038] rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-200">TP/SL</span>
          <button
            type="button"
            onClick={() => setIsTpSlEnabled(!isTpSlEnabled)}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              isTpSlEnabled ? 'bg-[#10B981]' : 'bg-[#334155]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                isTpSlEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isTpSlEnabled && (
          <div className="pt-1.5 border-t border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 font-mono font-medium">Take Profit</span>
              <input
                type="number"
                step="0.1"
                placeholder={action === 'BUY' ? (currentPrice + 10).toFixed(2) : (currentPrice - 10).toFixed(2)}
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                className="w-28 px-2 py-1 rounded bg-[#0B1426] border border-[#1E293B] text-xs font-mono text-right text-emerald-400 font-bold focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-400 font-mono font-medium">Stop Loss</span>
              <input
                type="number"
                step="0.1"
                placeholder={action === 'BUY' ? (currentPrice - 5).toFixed(2) : (currentPrice + 5).toFixed(2)}
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                className="w-28 px-2 py-1 rounded bg-[#0B1426] border border-[#1E293B] text-xs font-mono text-right text-rose-400 font-bold focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-mono text-[11px] leading-tight">{feedback.message}</span>
        </div>
      )}

      {/* 7. Big Prominent Action Button (Image 3 Reference) */}
      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-xl text-white font-bold transition-all cursor-pointer shadow-lg flex items-center justify-between disabled:opacity-50 ${
          action === 'BUY'
            ? 'bg-[#10B981] hover:bg-[#0EA271] shadow-emerald-950/40 ring-1 ring-emerald-400/50'
            : 'bg-[#EF4444] hover:bg-[#DC2626] shadow-rose-950/40 ring-1 ring-rose-400/50'
        }`}
      >
        <div className="text-left">
          <div className="text-[11px] font-semibold opacity-90 leading-tight">
            Place Order at
          </div>
          <div className="text-lg font-extrabold font-mono tracking-tight tabular-nums mt-0.5">
            {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : action === 'BUY' ? (
            <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="w-6 h-6 stroke-[2.5]" />
          )}
        </div>
      </button>
    </div>
  );
};
