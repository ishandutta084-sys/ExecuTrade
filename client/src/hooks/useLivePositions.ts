import { useState, useEffect, useCallback } from 'react';
import { BrokerPosition, TrackedPosition } from '../types/position.js';

export function useLivePositions() {
  const [brokerPositions, setBrokerPositions] = useState<BrokerPosition[]>([]);
  const [trackedPositions, setTrackedPositions] = useState<TrackedPosition[]>([]);
  const [accountNumber, setAccountNumber] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);
  const [equity, setEquity] = useState(0);
  const [freeMargin, setFreeMargin] = useState(0);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions');
      if (res.ok) {
        const data = await res.json();
        setBrokerPositions(data.broker_positions || []);
        setTrackedPositions(data.tracked_positions || []);
        setAccountNumber(data.account_number);
        setBalance(data.balance || 0);
        setEquity(data.equity || 0);
        setFreeMargin(data.free_margin || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 2000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const updateFromWs = useCallback((payload: any) => {
    if (payload.open_positions) {
      setBrokerPositions(payload.open_positions);
      setBalance(payload.balance || 0);
      setEquity(payload.equity || 0);
      setFreeMargin(payload.free_margin || 0);
      if (payload.account_number) setAccountNumber(payload.account_number);
    }
  }, []);

  const closePosition = async (ticket: number) => {
    try {
      const res = await fetch(`/api/positions/${ticket}/close`, { method: 'POST' });
      if (res.ok) {
        fetchPositions();
      }
    } catch (err) {
      console.error('Failed to close position:', err);
    }
  };

  return {
    brokerPositions,
    trackedPositions,
    accountNumber,
    balance,
    equity,
    freeMargin,
    refreshPositions: fetchPositions,
    updateFromWs,
    closePosition
  };
}

