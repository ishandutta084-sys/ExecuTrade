import React from 'react';
import { Send, PauseCircle, PlayCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

interface EmergencyToolbarProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenManualModal: () => void;
  onFlattenAll: () => void;
}

export const EmergencyToolbar: React.FC<EmergencyToolbarProps> = ({
  isPaused,
  onTogglePause,
  onOpenManualModal,
  onFlattenAll
}) => {
  return (
    <div className="space-y-3 font-mono">
      {/* Alert Warning if Paused */}
      {isPaused && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
            <span>
              <strong>EA Ingestion is PAUSED.</strong> MT5 execution is paused. Incoming TradingView webhooks are held or rejected.
            </span>
          </div>
          <button
            onClick={onTogglePause}
            className="underline font-bold hover:text-amber-300 ml-3 whitespace-nowrap cursor-pointer"
          >
            Resume EA
          </button>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Push Manual Signal</span>
          </button>

          <button
            onClick={onTogglePause}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isPaused
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume EA Ingestion' : 'Pause EA Ingestion'}</span>
          </button>
        </div>

        {/* Emergency Flatten All Kill-Switch */}
        <button
          onClick={() => {
            if (window.confirm('WARNING: Emergency Flatten All will immediately CLOSE all open MT5 positions. Proceed?')) {
              onFlattenAll();
            }
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Flatten All Positions</span>
        </button>
      </div>
    </div>
  );
};

