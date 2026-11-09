import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  mainValue: string | number;
  subValue?: ReactNode;
  statusDot?: 'healthy' | 'warning' | 'danger' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  mainValue,
  subValue,
  statusDot
}) => {
  const dotColor =
    statusDot === 'healthy'
      ? 'bg-buy'
      : statusDot === 'warning'
      ? 'bg-pending'
      : statusDot === 'danger'
      ? 'bg-sell'
      : statusDot === 'neutral'
      ? 'bg-tertiary'
      : null;

  return (
    <div className="p-3.5 flex flex-col justify-between space-y-1.5 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-secondary">
          {title}
        </span>
        {dotColor && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        )}
      </div>

      <div className="text-lg font-mono font-medium text-primary tabular-nums tracking-tight">
        {mainValue}
      </div>

      {subValue && (
        <div className="text-xs text-secondary truncate flex items-center gap-1.5">
          {subValue}
        </div>
      )}
    </div>
  );
};
