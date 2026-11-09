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
import { ExecutionReceiptDrawer } from './components/audit/ExecutionReceiptDrawer.js';
import { ManualSignalModal } from './components/modals/ManualSignalModal.js';
import { LoginPage } from './components/auth/LoginPage.js';

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('executrade_auth') !== null;
  });
  const [activeTab, setActiveTab] = useState<'console' | 'positions'>('console');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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
    handleIncomingWsSignal,
    isLoading
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
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-primary select-none font-sans">
      {/* 1. Left Icon Rail (48px wide) */}
      <SlimSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Fixed Top Navbar (48px tall) */}
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

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-4">
          {activeTab === 'console' ? (
            <>
              {/* Horizontal Status Strip */}
              <TelemetryMatrix status={status} signals={rawSignals} />

              {/* Inline Action Bar */}
              <EmergencyToolbar
                isPaused={status.ea_ingestion_paused}
                onTogglePause={togglePause}
                onOpenManualModal={() => setIsManualModalOpen(true)}
                onFlattenAll={flattenAll}
              />

              {/* Dense Table Signals Ledger */}
              <SignalsLedger
                signals={signals}
                currentFilter={filter}
                setFilter={setFilter}
                pendingCount={pendingCount}
                selectedSignal={selectedSignal}
                onSelectSignal={sig => {
                  setSelectedSignal(sig);
                }}
                onOpenReceipt={() => setIsReceiptOpen(true)}
                isLoading={isLoading}
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
        </main>
      </div>

      {/* Slide-In Broker Ticket Drawer (400px) */}
      <ExecutionReceiptDrawer
        signal={selectedSignal}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Manual Order Dispatch Modal */}
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
