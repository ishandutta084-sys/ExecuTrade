import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  badge?: ReactNode;
  mainValue: string | number;
  subValue?: string;
  icon?: ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  badge,
  mainValue,
  subValue,
  icon
}) => {
  return (
    <div className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/80 transition-all font-mono">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {mainValue}
        </div>
        {badge}
      </div>

      {subValue && (
        <div className="text-[10px] text-slate-400 mt-1 font-medium">
          {subValue}
        </div>
      )}
    </div>
  );
};

