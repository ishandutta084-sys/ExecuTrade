import { useState, useEffect, useCallback } from 'react';
import { TradeAnalytics } from '../types/analytics.js';

export function useTradeAnalytics() {
  const [analytics, setAnalytics] = useState<TradeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/summary');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        setAnalytics(json.analytics);
        setError(null);
      }
    } catch (err: any) {
      console.warn('Failed to load trade analytics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics: fetchAnalytics
  };
}
