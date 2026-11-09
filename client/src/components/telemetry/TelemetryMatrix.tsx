import React from 'react';
import { StatCard } from './StatCard.js';
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
    ? `${Math.round((executedSignals.length / (executedSignals.length + failedSignals.length || 1)) * 100)}% fill`
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
    <div className="border border-hairline bg-surface rounded-panel grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x-0 lg:divide-x divide-hairline">
      {/* 1. Bridge State */}
      <StatCard
        title="Bridge state"
        mainValue={status.ea_ingestion_paused ? 'PAUSED' : 'RUNNING'}
        statusDot={status.ea_ingestion_paused ? 'warning' : 'healthy'}
        subValue={
          <span>Uptime {uptimeStr}</span>
        }
      />

      {/* 2. Today's Executions */}
      <StatCard
        title="Today's executions"
        mainValue={signals.length}
        statusDot={signals.length > 0 ? 'healthy' : 'neutral'}
        subValue={
          <span>
            {fillRatio} • {executedSignals.length > 0 ? `Avg latency ${avgLatencyStr}` : 'No executions'}
          </span>
        }
      />

      {/* 3. Queue Health */}
      <StatCard
        title="Queue health"
        mainValue={`${pendingSignals.length} in-flight`}
        statusDot={pendingSignals.length > 0 ? 'warning' : 'healthy'}
        subValue={
          <span>Queue lock 0 ms • {failedSignals.length} failed</span>
        }
      />

      {/* 4. Terminal Protocol */}
      <StatCard
        title="Terminal protocol"
        mainValue={
          status.mt5_connected && status.equity
            ? `$${status.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : status.mt5_connected
            ? 'Connected'
            : 'Offline'
        }
        statusDot={status.mt5_connected ? 'healthy' : 'neutral'}
        subValue={
          <span>
            {status.mt5_connected && status.mt5_account
              ? `MT5 #${status.mt5_account} • $${status.balance.toFixed(2)}`
              : 'Waiting for MT5 on 127.0.0.1:8282'}
          </span>
        }
      />
    </div>
  );
};
