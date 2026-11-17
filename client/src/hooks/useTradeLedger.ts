import { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeLedgerRecord, LedgerSummary } from '../types/ledger.js';

export function useTradeLedger() {
  const [trades, setTrades] = useState<TradeLedgerRecord[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLOSED' | 'OPEN' | 'WIN' | 'LOSS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger/trades?limit=200');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        setTrades(json.records || []);
        setSummary(json.summary || null);
      }
    } catch (err: any) {
      console.warn('Failed to load trade ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchLedger]);

  const triggerSupabaseSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/ledger/sync', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        setSyncMessage(`Synced ${json.synced} trade(s) to Supabase`);
        await fetchLedger();
      } else {
        setSyncMessage(`Sync failed: ${json.error || 'Check Supabase credentials'}`);
      }
    } catch (err: any) {
      setSyncMessage(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchLedger]);

  const saveSupabaseConfig = useCallback(async (url: string, key: string) => {
    try {
      const res = await fetch('/api/ledger/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_url: url, supabase_key: key })
      });
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        await fetchLedger();
        return { success: true };
      }
      return { success: false, message: json.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [fetchLedger]);

  // Client-side filtering & searching
  const filteredTrades = useMemo(() => {
    let result = trades;

    if (statusFilter === 'CLOSED') {
      result = result.filter(t => t.status === 'CLOSED');
    } else if (statusFilter === 'OPEN') {
      result = result.filter(t => t.status === 'OPEN');
    } else if (statusFilter === 'WIN') {
      result = result.filter(t => t.status === 'CLOSED' && t.profit_loss > 0);
    } else if (statusFilter === 'LOSS') {
      result = result.filter(t => t.status === 'CLOSED' && t.profit_loss < 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.ticket.toString().includes(q) ||
        t.strategy.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.action.toLowerCase().includes(q)
      );
    }

    return result;
  }, [trades, statusFilter, searchQuery]);

  return {
    trades: filteredTrades,
    rawTrades: trades,
    summary,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSyncing,
    syncMessage,
    refreshTrades: fetchLedger,
    triggerSupabaseSync,
    saveSupabaseConfig
  };
}
