import React, { useState, useEffect } from 'react';
import { Send, Pause, Play, AlertOctagon, AlertTriangle } from 'lucide-react';

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
  const [confirmFlatten, setConfirmFlatten] = useState(false);

  // Auto-reset confirm state after 4 seconds
  useEffect(() => {
    if (!confirmFlatten) return;
    const timer = setTimeout(() => setConfirmFlatten(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmFlatten]);

  const handleFlattenClick = () => {
    if (confirmFlatten) {
      onFlattenAll();
      setConfirmFlatten(false);
    } else {
      setConfirmFlatten(true);
    }
  };

  return (
    <div className="space-y-2 font-sans select-none">
      {/* Alert Warning if Paused */}
      {isPaused && (
        <div className="px-3 py-2 rounded-control bg-pending/10 border border-pending/30 text-pending flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>
              <strong>EA ingestion is paused.</strong> MT5 execution is halted; incoming TradingView webhooks are held.
            </span>
          </div>
          <button
            onClick={onTogglePause}
            className="underline font-medium hover:opacity-80 ml-3 whitespace-nowrap cursor-pointer"
          >
            Resume EA
          </button>
        </div>
      )}

      {/* Inline Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          {/* Primary Filled Brass Action */}
          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-brass hover:bg-brassHover text-[#121110] text-xs font-medium transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Push manual signal</span>
          </button>

          {/* Secondary Ghost Action */}
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-secondary hover:text-primary hover:bg-raised border border-hairline transition-colors cursor-pointer"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-buy" strokeWidth={1.5} />
                <span>Resume EA ingestion</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
                <span>Pause EA ingestion</span>
              </>
            )}
          </button>
        </div>

        {/* Destructive Outlined Red Button with Two-Click Confirmation */}
        <button
          onClick={handleFlattenClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
            confirmFlatten
              ? 'bg-sell text-canvas border-sell font-semibold animate-pulse'
              : 'border-sell/40 text-sell hover:bg-sell/10'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{confirmFlatten ? 'Confirm flatten all positions?' : 'Flatten all positions'}</span>
        </button>
      </div>
    </div>
  );
};
