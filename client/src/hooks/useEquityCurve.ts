import { useState, useEffect, useCallback, useRef } from 'react';
import { EquityCurveData, EquityPoint } from '../types/telemetry.js';

export function useEquityCurve(initialTimeframe: '1D' | '1W' | '1M' | 'ALL' = '1D') {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>(initialTimeframe);
  const [data, setData] = useState<EquityCurveData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastWsUpdateRef = useRef<number>(0);

  const fetchEquityCurve = useCallback(async (tf: string) => {
    try {
      const res = await fetch(`/api/telemetry/equity-curve?timeframe=${tf.toLowerCase()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EquityCurveData = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch equity curve:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when timeframe changes
  useEffect(() => {
    setIsLoading(true);
    fetchEquityCurve(timeframe);
    const interval = setInterval(() => {
      fetchEquityCurve(timeframe);
    }, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [timeframe, fetchEquityCurve]);

  // Real-time update from WebSocket ACCOUNT_SYNC
  const updateFromWs = useCallback((payload: { balance: number; equity: number; account_number?: number }) => {
    const now = Date.now();
    setData(prev => {
      if (!prev) return prev;

      const newBal = Number(payload.balance.toFixed(2));
      const newEq = Number(payload.equity.toFixed(2));
      const floatingPnl = Number((newEq - newBal).toFixed(2));
      const peakEq = Math.max(prev.peak_equity, newEq);
      const drawdownPct = peakEq > 0 ? Number((((peakEq - newEq) / peakEq) * 100).toFixed(2)) : 0;
      const totalProfit = Number((newBal - prev.starting_balance).toFixed(2));
      const totalProfitPct = prev.starting_balance > 0
        ? Number(((totalProfit / prev.starting_balance) * 100).toFixed(2))
        : 0;

      // Throttle appending new points to chart (max once every 5 seconds) unless price jumps
      let updatedPoints = prev.points;
      if (now - lastWsUpdateRef.current >= 5000) {
        lastWsUpdateRef.current = now;
        const d = new Date(now);
        const newPoint: EquityPoint = {
          timestamp: now,
          time_str: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date_str: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          balance: newBal,
          equity: newEq,
          floating_pnl: floatingPnl,
          drawdown_pct: drawdownPct
        };
        updatedPoints = [...prev.points, newPoint];
        if (updatedPoints.length > 250) {
          updatedPoints = updatedPoints.slice(updatedPoints.length - 250);
        }
      } else if (updatedPoints.length > 0) {
        // Just update the latest point in-place
        const last = updatedPoints[updatedPoints.length - 1];
        updatedPoints = [
          ...updatedPoints.slice(0, -1),
          {
            ...last,
            balance: newBal,
            equity: newEq,
            floating_pnl: floatingPnl,
            drawdown_pct: drawdownPct
          }
        ];
      }

      return {
        ...prev,
        current_balance: newBal,
        current_equity: newEq,
        peak_equity: peakEq,
        max_drawdown_pct: Math.max(prev.max_drawdown_pct, drawdownPct),
        floating_pnl: floatingPnl,
        total_profit: totalProfit,
        total_profit_pct: totalProfitPct,
        points: updatedPoints
      };
    });
  }, []);

  return {
    timeframe,
    setTimeframe,
    data,
    isLoading,
    error,
    refresh: () => fetchEquityCurve(timeframe),
    updateFromWs
  };
}
