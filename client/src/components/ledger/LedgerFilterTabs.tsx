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
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-[10px] font-mono border border-slate-200/60 dark:border-slate-800">
      {tabs.map(tab => {
        const isActive = currentFilter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.id === 'PENDING' && pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-500 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

