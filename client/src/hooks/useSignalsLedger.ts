import { useState, useEffect, useCallback } from 'react';
import { Signal, LedgerFilter } from '../types/signal.js';

export function useSignalsLedger() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<LedgerFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    try {
      const url = searchQuery ? `/api/search?q=${encodeURIComponent(searchQuery)}` : '/api/signals';
      const res = await fetch(url);
      if (res.ok) {
        const data: Signal[] = await res.json();
        setSignals(data);
        if (!selectedSignal && data.length > 0) {
          setSelectedSignal(data[0]);
        } else if (selectedSignal) {
          const fresh = data.find(s => s.signal_id === selectedSignal.signal_id);
          if (fresh) setSelectedSignal(fresh);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch signals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedSignal]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 2000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const handleIncomingWsSignal = useCallback((sig: Signal) => {
    setSignals(prev => {
      const existingIdx = prev.findIndex(s => s.signal_id === sig.signal_id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...sig };
        return updated;
      }
      return [sig, ...prev];
    });
  }, []);

  const filteredSignals = signals.filter(sig => {
    if (filter === 'PENDING') return sig.status === 'PENDING' || sig.status === 'PROCESSING';
    if (filter === 'EXECUTED') return sig.status === 'EXECUTED';
    if (filter === 'FAILED') return sig.status === 'FAILED' || sig.status === 'DROPPED';
    return true;
  });

  const pendingCount = signals.filter(s => s.status === 'PENDING' || s.status === 'PROCESSING').length;

  return {
    signals: filteredSignals,
    rawSignals: signals,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    selectedSignal,
    setSelectedSignal,
    isLoading,
    pendingCount,
    refreshSignals: fetchSignals,
    handleIncomingWsSignal
  };
}

