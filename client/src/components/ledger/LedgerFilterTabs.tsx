import React from 'react';
import { LedgerFilter } from '../../types/signal.js';

interface LedgerFilterTabsProps {
  currentFilter: LedgerFilter;
  setFilter: (f: LedgerFilter) => void;
  pendingCount: number;
}

export const LedgerFilterTabs: React.FC<LedgerFilterTabsProps> = ({
  currentFilter,
  setFilter,
  pendingCount
}) => {
  const tabs: Array<{ id: LedgerFilter; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'EXECUTED', label: 'Executed' },
    { id: 'FAILED', label: 'Failed' }
  ];

  return (
    <div className="flex items-center gap-4 border-b border-hairline font-sans text-xs select-none">
      {tabs.map(tab => {
        const isActive = currentFilter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`pb-2 relative font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brass'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span>{tab.label}</span>
            {tab.id === 'PENDING' && pendingCount > 0 && (
              <span className="font-mono text-tiny text-pending tabular-nums font-semibold">
                ({pendingCount})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
