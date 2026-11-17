import React, { useState, useRef, useMemo } from 'react';
import { TrendingUp, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';
import { BridgeStatus, EquityPoint, EquityCurveData } from '../../types/telemetry.js';
import { Signal } from '../../types/signal.js';

interface EquityHeroSectionProps {
  status: BridgeStatus;
  signals: Signal[];
  equityCurveData: EquityCurveData | null;
  timeframe: '1D' | '1W' | '1M' | 'ALL';
  onTimeframeChange: (tf: '1D' | '1W' | '1M' | 'ALL') => void;
  isLoading?: boolean;
}

export const EquityHeroSection: React.FC<EquityHeroSectionProps> = ({
  status,
  signals,
  equityCurveData,
  timeframe,
  onTimeframeChange,
  isLoading = false
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fallback defaults if data is still loading
  const balance = status.mt5_connected && status.balance ? status.balance : (equityCurveData?.current_balance ?? 629.82);
  const equity = status.mt5_connected && status.equity ? status.equity : (equityCurveData?.current_equity ?? 629.82);
  const floatingPnl = Number((equity - balance).toFixed(2));
  const startingBalance = equityCurveData?.starting_balance ?? 627.64;
  const totalProfit = Number((balance - startingBalance).toFixed(2));
  const totalProfitPct = startingBalance > 0
    ? Number(((totalProfit / startingBalance) * 100).toFixed(2))
    : 0;
  const peakEquity = equityCurveData?.peak_equity ?? Math.max(equity, balance);
  const maxDrawdownPct = equityCurveData?.max_drawdown_pct ?? 0;

  // Chart dimensions & scaling
  const width = 1000;
  const height = 240;
  const margin = { top: 20, right: 30, bottom: 35, left: 65 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const points: EquityPoint[] = useMemo(() => {
    if (equityCurveData?.points && equityCurveData.points.length > 0) {
      return equityCurveData.points;
    }
    // Minimal fallback points if initial fetch hasn't completed
    const now = Date.now();
    return [
      { timestamp: now - 3600000, time_str: '1h ago', date_str: 'Today', balance: 627.64, equity: 627.64, floating_pnl: 0, drawdown_pct: 0 },
      { timestamp: now, time_str: 'Now', date_str: 'Today', balance, equity, floating_pnl: floatingPnl, drawdown_pct: 0 }
    ];
  }, [equityCurveData, balance, equity, floatingPnl]);

  // Calculate domain scales
  const { minVal, maxVal, scaleX, scaleY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const p of points) {
      if (p.equity < min) min = p.equity;
      if (p.balance < min) min = p.balance;
      if (p.equity > max) max = p.equity;
      if (p.balance > max) max = p.balance;
    }

    if (!isFinite(min) || !isFinite(max)) {
      min = 620;
      max = 635;
    }

    // Add 15% breathing room on top and bottom
    const spread = Math.max(max - min, 4.0);
    const yMin = Math.floor((min - spread * 0.15) * 10) / 10;
    const yMax = Math.ceil((max + spread * 0.15) * 10) / 10;

    const sX = (index: number) => {
      if (points.length <= 1) return margin.left;
      return margin.left + (index / (points.length - 1)) * chartWidth;
    };

    const sY = (val: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, val));
      const ratio = (clamped - yMin) / (yMax - yMin || 1);
      return margin.top + chartHeight - ratio * chartHeight;
    };

    return { minVal: yMin, maxVal: yMax, scaleX: sX, scaleY: sY };
  }, [points, chartWidth, chartHeight, margin.left, margin.top]);

  // Build SVG path strings
  const { equityPath, equityAreaPath, balancePath } = useMemo(() => {
    if (points.length === 0) return { equityPath: '', equityAreaPath: '', balancePath: '' };

    let eqPath = `M ${scaleX(0)} ${scaleY(points[0].equity)}`;
    let balPath = `M ${scaleX(0)} ${scaleY(points[0].balance)}`;

    for (let i = 1; i < points.length; i++) {
      const x = scaleX(i);
      const yEq = scaleY(points[i].equity);
      const yBal = scaleY(points[i].balance);

      // Smooth Bezier line for equity
      const prevX = scaleX(i - 1);
      const prevYEq = scaleY(points[i - 1].equity);
      const midX = (prevX + x) / 2;

      eqPath += ` C ${midX} ${prevYEq}, ${midX} ${yEq}, ${x} ${yEq}`;
      balPath += ` L ${x} ${yBal}`;
    }

    const baselineY = margin.top + chartHeight;
    const eqAreaPath = `${eqPath} L ${scaleX(points.length - 1)} ${baselineY} L ${scaleX(0)} ${baselineY} Z`;

    return { equityPath: eqPath, equityAreaPath: eqAreaPath, balancePath: balPath };
  }, [points, scaleX, scaleY, chartHeight, margin.top]);

  // Y-axis horizontal grid lines & labels (4 ticks)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    const step = (maxVal - minVal) / (count - 1);
    for (let i = 0; i < count; i++) {
      const val = minVal + step * i;
      ticks.push({
        val,
        y: scaleY(val),
        label: `$${val.toFixed(2)}`
      });
    }
    return ticks;
  }, [minVal, maxVal, scaleY]);

  // X-axis timestamps (up to 5 labels)
  const xTicks = useMemo(() => {
    if (points.length === 0) return [];
    const count = Math.min(5, points.length);
    const step = Math.floor((points.length - 1) / (count - 1 || 1));
    const ticks = [];
    for (let i = 0; i < count; i++) {
      const idx = i === count - 1 ? points.length - 1 : i * step;
      const p = points[idx];
      ticks.push({
        x: scaleX(idx),
        label: timeframe === '1D' ? p.time_str : `${p.date_str} ${p.time_str}`
      });
    }
    return ticks;
  }, [points, scaleX, timeframe]);

  // Interactive mouse hover handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    // Map clientX to SVG coordinate space
    const svgX = (clientX / rect.width) * width;
    const relativeX = svgX - margin.left;

    if (relativeX < 0) {
      setHoverIndex(0);
      return;
    }
    if (relativeX > chartWidth) {
      setHoverIndex(points.length - 1);
      return;
    }

    const index = Math.round((relativeX / chartWidth) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];
  const activeX = hoverIndex !== null ? scaleX(hoverIndex) : scaleX(points.length - 1);
  const activeEqY = activePoint ? scaleY(activePoint.equity) : scaleY(equity);
  const activeBalY = activePoint ? scaleY(activePoint.balance) : scaleY(balance);

  // Peak Equity line Y
  const peakY = scaleY(peakEquity);

  return (
    <div className="border border-hairline bg-surface rounded-panel shadow-sm overflow-hidden select-none transition-colors">
      {/* 1. HERO TOP METRICS BAR */}
      <div className="p-4 lg:p-6 pb-2 border-b border-hairline flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Equity Typography & Return */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-tertiary tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand" />
              PORTFOLIO PERFORMANCE & EQUITY CURVE
            </span>
            {status.mt5_connected ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                LIVE MT5
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-tertiary bg-raised border border-hairline">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                STANDBY
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            {/* Primary Equity Display */}
            <span className="text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums text-primary">
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            {/* Total Profit / Gain */}
            <div className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              totalProfit >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {totalProfit >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              {totalProfit >= 0 ? `+$${totalProfit.toFixed(2)}` : `-$${Math.abs(totalProfit).toFixed(2)}`}
              <span className="ml-1 opacity-80">({totalProfit >= 0 ? `+${totalProfitPct}%` : `${totalProfitPct}%`})</span>
            </div>

            {/* Floating PnL */}
            {floatingPnl !== 0 && (
              <span className={`text-xs font-mono font-medium ${
                floatingPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                Floating: {floatingPnl > 0 ? `+$${floatingPnl.toFixed(2)}` : `-$${Math.abs(floatingPnl).toFixed(2)}`}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Timeframe Switcher & Legend */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-raised p-0.5 rounded-control border border-hairline text-xs font-medium">
            {(['1D', '1W', '1M', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-brand text-white font-semibold shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Legend Items */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-secondary border-l border-hairline pl-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-brand rounded-full"></span>
              <span className="text-primary font-medium">Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-blue-400 dark:border-blue-400"></span>
              <span>Balance</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY TELEMETRY RIBBON (Replaces old stat cards with clean chips) */}
      <div className="px-4 lg:px-6 py-2.5 bg-raised/40 border-b border-hairline flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs font-mono text-secondary">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Realized Balance:</span>
            <span className="font-semibold text-primary tabular-nums">${balance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Peak (HWM):</span>
            <span className="font-semibold text-primary tabular-nums">${peakEquity.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Max Drawdown:</span>
            <span className={`font-semibold tabular-nums ${maxDrawdownPct > 5 ? 'text-rose-500' : 'text-primary'}`}>
              {maxDrawdownPct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">MT5 Account:</span>
            <span className="font-semibold text-primary">#{status.mt5_account || '450408614'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Bridge:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {status.ea_ingestion_paused ? 'PAUSED' : 'RUNNING'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Total Trades:</span>
            <span className="font-semibold text-primary">{(signals || []).length}</span>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE SVG EQUITY CURVE */}
      <div className="relative p-4 pt-2">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-brand">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Synchronizing MT5 Telemetry...</span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 lg:h-64 overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Smooth glowing area fill under equity curve */}
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA7A24" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#EA7A24" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#EA7A24" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle glow filter for the active line */}
            <filter id="equityGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#EA7A24" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={width - margin.right}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity={0.07}
                strokeDasharray={i === 0 || i === yTicks.length - 1 ? 'none' : '3 3'}
              />
              <text
                x={margin.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-secondary select-none"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Peak Equity (High Watermark) Reference Line */}
          {peakEquity > 0 && (
            <g>
              <line
                x1={margin.left}
                y1={peakY}
                x2={width - margin.right}
                y2={peakY}
                stroke="#EA7A24"
                strokeOpacity={0.25}
                strokeDasharray="4 4"
              />
              <text
                x={width - margin.right}
                y={peakY - 5}
                textAnchor="end"
                className="text-[9px] font-mono fill-brand opacity-60 select-none"
              >
                HWM ${peakEquity.toFixed(2)}
              </text>
            </g>
          )}

          {/* Balance Curve (Dashed Realized Line) */}
          <path
            d={balancePath}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.75"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Equity Area Fill */}
          <path
            d={equityAreaPath}
            fill="url(#equityGradient)"
          />

          {/* Equity Line (Smooth Spline) */}
          <path
            d={equityPath}
            fill="none"
            stroke="#EA7A24"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#equityGlow)"
          />

          {/* X-axis Timestamps */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-mono fill-tertiary select-none"
            >
              {tick.label}
            </text>
          ))}

          {/* Interactive Hover Crosshair & Indicators */}
          {activePoint && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={activeX}
                y1={margin.top}
                x2={activeX}
                y2={margin.top + chartHeight}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeDasharray="3 3"
              />

              {/* Point on Balance Curve */}
              <circle
                cx={activeX}
                cy={activeBalY}
                r="3.5"
                fill="#60A5FA"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />

              {/* Point on Equity Curve */}
              <circle
                cx={activeX}
                cy={activeEqY}
                r="5"
                fill="#EA7A24"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <circle
                cx={activeX}
                cy={activeEqY}
                r="9"
                fill="#EA7A24"
                fillOpacity="0.25"
                className="animate-pulse"
              />
            </g>
          )}
        </svg>

        {/* Dynamic Floating Glassmorphic Tooltip Card */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-4 pointer-events-none transition-all duration-75 z-20"
            style={{
              left: `${Math.min(Math.max((activeX / width) * 100, 15), 85)}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md border border-hairline rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1 min-w-[170px]">
              <div className="text-[10px] text-tertiary border-b border-hairline pb-1 flex justify-between items-center">
                <span>{activePoint.date_str}</span>
                <span className="font-semibold text-primary">{activePoint.time_str}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-brand font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                  Equity:
                </span>
                <span className="font-bold text-primary tabular-nums">${activePoint.equity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Balance:
                </span>
                <span className="font-semibold text-secondary tabular-nums">${activePoint.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-hairline pt-1 text-[11px]">
                <span className="text-tertiary">Float P&L:</span>
                <span className={`font-semibold tabular-nums ${
                  activePoint.floating_pnl > 0 ? 'text-emerald-500' : activePoint.floating_pnl < 0 ? 'text-rose-500' : 'text-secondary'
                }`}>
                  {activePoint.floating_pnl > 0 ? `+$${activePoint.floating_pnl.toFixed(2)}` : `$${activePoint.floating_pnl.toFixed(2)}`}
                </span>
              </div>
              {activePoint.drawdown_pct > 0 && (
                <div className="flex justify-between items-center text-[10px] text-rose-500">
                  <span>Drawdown:</span>
                  <span>-{activePoint.drawdown_pct.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
