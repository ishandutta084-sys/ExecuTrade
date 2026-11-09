import React from 'react';
import { StatCard } from './StatCard.js';
import { Activity, Zap, CheckCircle2, Server, Clock } from 'lucide-react';
import { BridgeStatus } from '../../types/telemetry.js';
import { Signal } from '../../types/signal.js';

interface TelemetryMatrixProps {
  status: BridgeStatus;
  signals: Signal[];
}

export const TelemetryMatrix: React.FC<TelemetryMatrixProps> = ({ status, signals }) => {
  const executedSignals = signals.filter(s => s.status === 'EXECUTED');
  const failedSignals = signals.filter(s => s.status === 'FAILED' || s.status === 'DROPPED');
  const pendingSignals = signals.filter(s => s.status === 'PENDING' || s.status === 'PROCESSING');

  const fillRatio = signals.length > 0
    ? `${Math.round((executedSignals.length / (executedSignals.length + failedSignals.length || 1)) * 100)}% Fill`
    : '--';

  let avgLatencyStr = '-- ms';
  if (executedSignals.length > 0) {
    const latencies = executedSignals
      .map(s => s.latency_ms)
      .filter((l): l is number => typeof l === 'number' && l > 0);
    if (latencies.length > 0) {
      const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
      avgLatencyStr = `${avg} ms`;
    }
  }

  // Uptime formatting
  const hours = Math.floor(status.uptime_seconds / 3600);
  const mins = Math.floor((status.uptime_seconds % 3600) / 60);
  const uptimeStr = `${hours}h ${mins}m`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Bridge State */}
      <StatCard
        title="Bridge State"
        mainValue={status.ea_ingestion_paused ? 'PAUSED' : 'RUNNING'}
        subValue={`Uptime: ${uptimeStr}`}
        icon={<Activity className="w-4 h-4 text-emerald-500" />}
        badge={
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              status.ea_ingestion_paused
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 border border-amber-300 dark:border-amber-800'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.ea_ingestion_paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            {status.ea_ingestion_paused ? 'Paused' : 'Active'}
          </span>
        }
      />

      {/* 2. Today's Executions */}
      <StatCard
        title="Executions"
        mainValue={signals.length}
        subValue={executedSignals.length > 0 ? `Avg Broker Latency: ${avgLatencyStr}` : 'No executions recorded'}
        icon={<Zap className="w-4 h-4 text-emerald-400" />}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            {fillRatio}
          </span>
        }
      />

      {/* 3. Queue Health */}
      <StatCard
        title="Queue Health"
        mainValue={`${pendingSignals.length} Pending`}
        subValue={`${failedSignals.length} failed • ${pendingSignals.length} in-flight`}
        icon={<Server className="w-4 h-4 text-slate-400" />}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            FIFO Queue
          </span>
        }
      />

      {/* 4. Terminal Protocol / Account */}
      <StatCard
        title="MT5 Account Equity"
        mainValue={status.mt5_connected && status.equity ? `$${status.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (status.mt5_connected ? 'Connected' : 'Offline')}
        subValue={status.mt5_connected && status.mt5_account ? `MT5 #${status.mt5_account} • Balance: $${status.balance.toFixed(2)}` : 'Awaiting MT5 Socket Connection'}
        icon={<Clock className="w-4 h-4 text-emerald-500" />}
        badge={
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            status.mt5_connected
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
          }`}>
            {status.mt5_connected ? 'LIVE TCP' : 'OFFLINE'}
          </span>
        }
      />
    </div>
  );
};

