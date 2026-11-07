import { useState, useEffect, useCallback } from 'react';
import { BridgeStatus, ExecutionAlert } from '../types/telemetry.js';

export function useBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus>({
    status: 'ONLINE',
    uptime_seconds: 0,
    ea_ingestion_paused: false,
    mt5_connected: false,
    balance: 0,
    equity: 0,
    queue_pending_count: 0,
    ws_clients_count: 0,
    max_spread_pips: 5.0,
    max_slippage_points: 30
  });

  const [alerts, setAlerts] = useState<ExecutionAlert[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bridge/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setUnreadAlerts(data.unread_count || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAlerts();
    const sInt = setInterval(fetchStatus, 3000);
    const aInt = setInterval(fetchAlerts, 5000);
    return () => {
      clearInterval(sInt);
      clearInterval(aInt);
    };
  }, [fetchStatus, fetchAlerts]);

  const togglePause = async () => {
    try {
      const res = await fetch('/api/bridge/toggle-pause', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => ({ ...prev, ea_ingestion_paused: data.ea_ingestion_paused }));
      }
    } catch {}
  };

  const flattenAll = async () => {
    try {
      await fetch('/api/emergency/flatten-all', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error('Flatten failed:', err);
    }
  };

  return {
    status,
    alerts,
    unreadAlerts,
    togglePause,
    flattenAll,
    refreshStatus: fetchStatus
  };
}

