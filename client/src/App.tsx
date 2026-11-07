import React, { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useSignalsLedger } from './hooks/useSignalsLedger.js';
import { useLivePositions } from './hooks/useLivePositions.js';
import { useBridgeStatus } from './hooks/useBridgeStatus.js';
import { SlimSidebar } from './components/layout/SlimSidebar.js';
import { TopNavbar } from './components/layout/TopNavbar.js';
import { TelemetryMatrix } from './components/telemetry/TelemetryMatrix.js';
import { EmergencyToolbar } from './components/telemetry/EmergencyToolbar.js';
import { SignalsLedger } from './components/ledger/SignalsLedger.js';
import { LivePositionsTable } from './components/ledger/LivePositionsTable.js';
import { ExecutionReceipt } from './components/audit/ExecutionReceipt.js';
import { ManualSignalModal } from './components/modals/ManualSignalModal.js';
import { LoginPage } from './components/auth/LoginPage.js';

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('executrade_auth') !== null;
  });
  const [activeTab, setActiveTab] = useState<'console' | 'positions'>('console');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Hook state
  const {
    signals,
    rawSignals,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    selectedSignal,
    setSelectedSignal,
    pendingCount,
    refreshSignals,
    handleIncomingWsSignal
  } = useSignalsLedger();

  const {
    brokerPositions,
    balance,
    equity,
    freeMargin,
    refreshPositions,
    updateFromWs,
    closePosition
  } = useLivePositions();

  const {
    status,
    alerts,
    unreadAlerts,
    togglePause,
    flattenAll,
    refreshStatus
  } = useBridgeStatus();

  // WebSocket message dispatcher
  const handleWsMessage = useCallback((msg: { type: string; payload: any }) => {
    if (msg.type === 'SIGNAL_RECEIVED' || msg.type === 'SIGNAL_EXECUTED') {
      handleIncomingWsSignal(msg.payload);
      refreshSignals();
    } else if (msg.type === 'ACCOUNT_SYNC') {
      updateFromWs(msg.payload);
    } else if (msg.type === 'EMERGENCY_FLATTEN') {
      refreshPositions();
      refreshStatus();
    }
  }, [handleIncomingWsSignal, refreshSignals, updateFromWs, refreshPositions, refreshStatus]);

  useWebSocket(handleWsMessage);

  const handleLogout = () => {
    localStorage.removeItem('executrade_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 dark:bg-[#080C14] dark:text-slate-100 select-none">
      {/* 1. Slim Left Icon Sidebar */}
      <SlimSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Fixed Top Navbar */}
        <TopNavbar
          mt5Connected={status.mt5_connected}
          theme={theme}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          alerts={alerts}
          unreadAlerts={unreadAlerts}
          onLogout={handleLogout}
        />

        {/* Scrollable 2-Column Dashboard Body */}
        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">
          {/* Left / Center Column (col-span-12 lg:col-span-8 space-y-6) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {activeTab === 'console' ? (
              <>
                {/* Operational Telemetry Matrix */}
                <TelemetryMatrix status={status} signals={rawSignals} />

                {/* Action & Emergency Toolbar */}
                <EmergencyToolbar
                  isPaused={status.ea_ingestion_paused}
                  onTogglePause={togglePause}
                  onOpenManualModal={() => setIsManualModalOpen(true)}
                  onFlattenAll={flattenAll}
                />

                {/* Order Execution Stream / Signals Ledger */}
                <SignalsLedger
                  signals={signals}
                  currentFilter={filter}
                  setFilter={setFilter}
                  pendingCount={pendingCount}
                  selectedSignal={selectedSignal}
                  onSelectSignal={setSelectedSignal}
                />
              </>
            ) : (
              /* Live MT5 Positions Tab */
              <LivePositionsTable
                positions={brokerPositions}
                onClosePosition={closePosition}
                balance={balance}
                equity={equity}
                freeMargin={freeMargin}
              />
            )}
          </div>

          {/* Right Column: Execution Receipt & Lifecycle Audit Drawer (col-span-12 lg:col-span-4) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <ExecutionReceipt signal={selectedSignal} />
          </div>
        </main>
      </div>

      {/* Manual Signal Modal */}
      <ManualSignalModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSignalDispatched={() => {
          refreshSignals();
          refreshPositions();
        }}
        defaultSymbol={selectedSignal?.symbol || 'XAUUSD'}
      />
    </div>
  );
}

