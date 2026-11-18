import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  Award,
  Zap,
  ShieldAlert,
  Percent,
  Activity,
  Filter,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useTradeAnalytics } from '../../hooks/useTradeAnalytics.js';

export const TradeAnalyticsView: React.FC = () => {
  const {
    analytics,
    isLoading,
    refreshAnalytics,
    selectedStrategy,
    setSelectedStrategy
  } = useTradeAnalytics();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const a = analytics;

  // Max absolute PnL for scaling Day of Month Bar Chart
  const maxDayPnl = Math.max(
    ...(a.day_of_month_stats || []).map(d => Math.abs(d.avg_pnl)),
    10
  );

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & METRIC CONTROLS */}
      <div className="border border-hairline bg-surface rounded-panel p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-control bg-brand/10 text-brand">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-primary tracking-tight">
                PORTFOLIO PERFORMANCE & QUANTITATIVE ANALYTICS
              </h2>
            </div>
            <p className="text-xs text-secondary mt-1">
              Statistical edge metrics, optimal day-of-month windows, trade risk-to-reward, and pip distribution.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-mono bg-raised/70 border border-hairline text-secondary">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{a.total_trades} Closed Trades Analyzed</span>
            </span>

            <button
              onClick={refreshAnalytics}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-control text-xs font-mono font-medium border border-hairline bg-raised hover:bg-surface text-secondary hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Recalculating...' : 'Recalculate'}</span>
            </button>
          </div>
        </div>

        {/* 2. TOP PORTFOLIO SUMMARY STRIP (Immediate Parity with Trade Execution Ledger) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
          {/* Closed Trades */}
          <div className="p-3.5 bg-raised/60 rounded-control border border-hairline flex flex-col justify-between">
            <div className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
              Closed Trades
            </div>
            <div className="text-2xl font-extrabold font-mono text-primary mt-1 tabular-nums">
              {a.total_trades}
              <span className="text-xs font-semibold text-emerald-500 ml-1.5 font-sans">
                ({a.win_rate_pct}% Win)
              </span>
            </div>
            <div className="text-[10px] font-mono text-tertiary mt-1">
              {a.win_trades} Won • {a.loss_trades} Lost
            </div>
          </div>

          {/* Realized Net P&L */}
          <div className="p-3.5 bg-raised/60 rounded-control border border-hairline flex flex-col justify-between">
            <div className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
              Realized Net P&L
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-1 tabular-nums ${a.net_profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {a.net_profit >= 0 ? `+$${a.net_profit.toFixed(2)}` : `-$${Math.abs(a.net_profit).toFixed(2)}`}
            </div>
            <div className="text-[10px] font-mono text-tertiary mt-1">
              Gross: +${a.gross_profit.toFixed(2)}
            </div>
          </div>

          {/* Profit Factor */}
          <div className="p-3.5 bg-raised/60 rounded-control border border-hairline flex flex-col justify-between">
            <div className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
              Profit Factor
            </div>
            <div className="text-2xl font-extrabold font-mono text-primary mt-1 tabular-nums">
              {a.profit_factor}
            </div>
            <div className="text-[10px] font-mono text-tertiary mt-1">
              Loss: -${a.gross_loss.toFixed(2)}
            </div>
          </div>

          {/* Post-Trade Equity */}
          <div className="p-3.5 bg-brand/5 rounded-control border border-brand/40 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-brand uppercase font-bold tracking-wider">
              Post-Trade Equity
            </div>
            <div className="text-2xl font-extrabold font-mono text-brand mt-1 tabular-nums">
              ${a.current_equity.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-secondary mt-1">
              Balance: ${a.current_balance.toFixed(2)}
            </div>
          </div>

          {/* Trade Expectancy */}
          <div className="p-3.5 bg-raised/60 rounded-control border border-hairline flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
              Trade Expectancy
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-500 mt-1 tabular-nums">
              +${a.expectancy.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-tertiary mt-1">
              Expected value / trade
            </div>
          </div>
        </div>

        {/* 3. STRATEGY FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline/60">
          <div className="flex items-center gap-1.5 text-xs font-mono text-secondary mr-2">
            <Filter className="w-3.5 h-3.5 text-brand" />
            <span className="font-semibold">Filter:</span>
          </div>

          <button
            onClick={() => setSelectedStrategy('ALL')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
              selectedStrategy === 'ALL'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-raised/70 text-secondary hover:text-primary hover:bg-raised border border-hairline'
            }`}
          >
            ALL ({a.total_trades})
          </button>

          {(a.strategy_breakdown || []).map(sb => (
            <button
              key={sb.strategy}
              onClick={() => setSelectedStrategy(sb.strategy)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedStrategy === sb.strategy
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-raised/70 text-secondary hover:text-primary hover:bg-raised border border-hairline'
              }`}
            >
              <span>{sb.strategy}</span>
              <span className="text-[10px] opacity-80">({sb.count} • {sb.net_profit >= 0 ? `+$${sb.net_profit}` : `-$${Math.abs(sb.net_profit)}`})</span>
            </button>
          ))}
        </div>

        {/* 4. THE 6 SPECIFIC REQUESTED ANALYTIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {/* Card 1: Most Profitable Day of the Month */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline border-l-3 border-l-brand flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand" />
                Best Day of Month
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand/10 text-brand border border-brand/20">
                HISTORICAL PEAK
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-primary tracking-tight">
                {a.most_profitable_day_of_month.label} of Month
              </div>
              <div className="text-xs font-mono text-emerald-500 font-semibold mt-1">
                +${a.most_profitable_day_of_month.avg_profit.toFixed(2)} average profit / trade
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Total realized: +${a.most_profitable_day_of_month.total_profit.toFixed(2)} ({a.most_profitable_day_of_month.trade_count} trades on this day) • Sampled across {a.total_trades} portfolio trades
            </div>
          </div>

          {/* Card 2: Highest Profit in One Trade */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline border-l-3 border-l-emerald-500 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                Highest Profit (1 Trade)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                MAX WIN OUTLIER
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-emerald-500 tracking-tight tabular-nums">
                +${a.highest_profit_trade.profit.toFixed(2)}
              </div>
              <div className="text-xs font-mono text-secondary mt-1">
                +{a.highest_profit_trade.profit_pct}% return • +{a.highest_profit_trade.pips} pips
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Ticket #{a.highest_profit_trade.ticket} ({a.highest_profit_trade.action} {a.highest_profit_trade.symbol}) • {a.highest_profit_trade.date}
            </div>
          </div>

          {/* Card 3: Highest Loss in One Trade */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline border-l-3 border-l-rose-500 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                Highest Loss (1 Trade)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                MAX LOSS ADVERSE
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-rose-500 tracking-tight tabular-nums">
                -${Math.abs(a.highest_loss_trade.loss).toFixed(2)}
              </div>
              <div className="text-xs font-mono text-secondary mt-1">
                {a.highest_loss_trade.loss_pct}% drawdown • {a.highest_loss_trade.pips} pips
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Ticket #{a.highest_loss_trade.ticket} ({a.highest_loss_trade.action} {a.highest_loss_trade.symbol}) • {a.highest_loss_trade.date}
            </div>
          </div>

          {/* Card 4: Average Profit & Average Loss per Trade */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-brand" />
                Average Win vs Loss
              </span>
              <span className="text-[10px] font-mono font-semibold text-secondary">
                R:R {a.risk_reward_ratio}:1
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="text-[10px] font-mono text-tertiary">AVG WIN</div>
                <div className="text-lg font-bold font-mono text-emerald-500 tabular-nums">
                  +${a.average_profit_per_win.toFixed(2)}
                </div>
              </div>
              <div className="border-l border-hairline pl-2">
                <div className="text-[10px] font-mono text-tertiary">AVG LOSS</div>
                <div className="text-lg font-bold font-mono text-rose-500 tabular-nums">
                  -${a.average_loss_per_loss.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Expectancy: +${a.expectancy.toFixed(2)} expected value per trade
            </div>
          </div>

          {/* Card 5: Maximum Pips in Winning Trade */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Max Pips (Winning Trade)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                PEAK RUNUP
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-primary tracking-tight tabular-nums">
                +{a.maximum_pips_win.pips.toFixed(1)} <span className="text-sm font-semibold text-tertiary">Pips</span>
              </div>
              <div className="text-xs font-mono text-emerald-500 font-semibold mt-1">
                Largest directional expansion
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Ticket #{a.maximum_pips_win.ticket} • {a.maximum_pips_win.symbol} • {a.maximum_pips_win.date}
            </div>
          </div>

          {/* Card 6: Maximum Pips in Losing Trade */}
          <div className="p-4 bg-raised/50 rounded-control border border-hairline flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                Max Pips (Losing Trade)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                MAX ADVERSE
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-primary tracking-tight tabular-nums">
                -{a.maximum_pips_loss.pips.toFixed(1)} <span className="text-sm font-semibold text-tertiary">Pips</span>
              </div>
              <div className="text-xs font-mono text-rose-500 font-semibold mt-1">
                Protected by strict MT5 Stop Loss
              </div>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
              Ticket #{a.maximum_pips_loss.ticket} • {a.maximum_pips_loss.symbol} • {a.maximum_pips_loss.date}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DAY OF THE MONTH PROFITABILITY BAR CHART (1 to 31) */}
      <div className="border border-hairline bg-surface rounded-panel p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              DAY OF THE MONTH PROFITABILITY PROFILE (1 - 31)
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Average net profit per trade executed on each calendar day of the month. Active trading spans Nov 12 - 17.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Net Profit Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span>Net Loss Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500/40"></span>
              <span className="text-tertiary">Unexecuted Day</span>
            </div>
          </div>
        </div>

        {/* SVG Interactive Bar Chart */}
        <div className="relative pt-2">
          <svg viewBox="0 0 930 200" className="w-full h-48 overflow-visible">
            {/* Zero Baseline */}
            <line x1="15" y1="100" x2="915" y2="100" stroke="currentColor" strokeOpacity={0.2} strokeWidth="1.5" />
            <text x="10" y="103" textAnchor="end" className="text-[9px] font-mono fill-tertiary">$0</text>

            {/* Reference +$10 & -$10 Guidelines */}
            <line x1="15" y1="40" x2="915" y2="40" stroke="currentColor" strokeOpacity={0.05} strokeDasharray="3 3" />
            <line x1="15" y1="160" x2="915" y2="160" stroke="currentColor" strokeOpacity={0.05} strokeDasharray="3 3" />

            {/* Bars for Day 1 to 31 */}
            {(a.day_of_month_stats || []).map((stat, idx) => {
              const x = 30 + idx * 28;
              const barHeight = maxDayPnl > 0 ? (Math.abs(stat.avg_pnl) / maxDayPnl) * 55 : 0;
              const isPositive = stat.avg_pnl > 0;
              const y = isPositive ? 100 - barHeight : 100;
              const isBest = stat.day === a.most_profitable_day_of_month.day;
              const isHovered = hoveredDay === stat.day;

              return (
                <g
                  key={stat.day}
                  onMouseEnter={() => setHoveredDay(stat.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="cursor-pointer"
                >
                  {/* Active highlight background column */}
                  {isHovered && (
                    <rect
                      x={x - 4}
                      y="15"
                      width="24"
                      height="170"
                      fill="currentColor"
                      fillOpacity="0.05"
                      rx="3"
                    />
                  )}

                  {/* The PnL Bar */}
                  {stat.trades_count > 0 ? (
                    <rect
                      x={x}
                      y={y}
                      width="16"
                      height={Math.max(barHeight, 3)}
                      fill={isPositive ? (isBest ? '#EA7A24' : '#10B981') : '#EF4444'}
                      rx="2"
                      className="transition-all duration-150"
                    />
                  ) : (
                    <circle cx={x + 8} cy="100" r="1.5" fill="currentColor" fillOpacity="0.2" />
                  )}

                  {/* Day Number Label */}
                  <text
                    x={x + 8}
                    y="185"
                    textAnchor="middle"
                    className={`text-[9px] font-mono select-none ${
                      isBest ? 'fill-brand font-bold' : isHovered ? 'fill-primary font-bold' : 'fill-tertiary'
                    }`}
                  >
                    {stat.day}
                  </text>

                  {/* Crown / Star over best day */}
                  {isBest && (
                    <g transform={`translate(${x + 2}, 24)`}>
                      <circle cx="6" cy="6" r="7" fill="#EA7A24" />
                      <text x="6" y="9" textAnchor="middle" fill="#FFFFFF" className="text-[8px] font-bold">★</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip for Day of Month */}
          {hoveredDay !== null && (
            <div className="absolute top-2 right-4 bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md border border-hairline rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1 z-20">
              <div className="font-bold text-primary flex items-center gap-1.5 border-b border-hairline pb-1">
                <span>Day {hoveredDay}</span>
                {hoveredDay === a.most_profitable_day_of_month.day && (
                  <span className="text-[10px] text-brand font-semibold">★ Best Day</span>
                )}
              </div>
              {(() => {
                const dayStat = a.day_of_month_stats.find(d => d.day === hoveredDay);
                if (!dayStat || dayStat.trades_count === 0) {
                  return <div className="text-tertiary text-[11px]">No trades on this day</div>;
                }
                return (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-tertiary">Average P&L:</span>
                      <span className={`font-bold ${dayStat.avg_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {dayStat.avg_pnl >= 0 ? `+$${dayStat.avg_pnl.toFixed(2)}` : `-$${Math.abs(dayStat.avg_pnl).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-tertiary">Total P&L:</span>
                      <span className="font-semibold text-primary">${dayStat.total_pnl.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-tertiary">Executions:</span>
                      <span className="font-semibold text-primary">{dayStat.trades_count}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 4. WEEKDAY PERFORMANCE & EDGE MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Weekday Performance Strip */}
        <div className="border border-hairline bg-surface rounded-panel p-5 shadow-sm space-y-3">
          <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              WEEKDAY EDGE (MONDAY - FRIDAY)
            </h3>
            <span className="text-[11px] font-mono text-tertiary">Sorted Mon-Fri</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {(a.weekday_stats || []).map(w => {
              const isProfit = w.avg_pnl >= 0;
              return (
                <div
                  key={w.weekday}
                  className="p-3 bg-raised/40 hover:bg-raised/70 rounded-control border border-hairline flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-24 font-mono font-bold text-xs text-primary">{w.weekday}</div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface border border-hairline text-secondary">
                      {w.win_rate}% Win
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-tertiary text-[11px] hidden sm:inline">
                      {w.trades_count} trades
                    </span>
                    <span className={`font-bold tabular-nums text-sm ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isProfit ? `+$${w.avg_pnl.toFixed(2)}` : `-$${Math.abs(w.avg_pnl).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Key Portfolio Statistical Indicators */}
        <div className="border border-hairline bg-surface rounded-panel p-5 shadow-sm space-y-4">
          <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
              <Award className="w-4 h-4 text-brand" />
              MATHEMATICAL EDGE & EXPECTANCY
            </h3>
            <span className="text-[11px] font-mono text-emerald-500 font-semibold">Positive Edge</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-raised/50 rounded-control border border-hairline">
              <div className="text-[10px] font-mono text-tertiary uppercase font-bold">Win Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-500 mt-1">{a.win_rate_pct}%</div>
              <div className="text-[10px] font-mono text-tertiary mt-0.5">{a.win_trades}W / {a.loss_trades}L</div>
            </div>

            <div className="p-3 bg-raised/50 rounded-control border border-hairline">
              <div className="text-[10px] font-mono text-tertiary uppercase font-bold">Profit Factor</div>
              <div className="text-xl font-bold font-mono text-primary mt-1">{a.profit_factor}</div>
              <div className="text-[10px] font-mono text-tertiary mt-0.5">Gross: ${a.gross_profit} / ${a.gross_loss}</div>
            </div>

            <div className="p-3 bg-raised/50 rounded-control border border-hairline">
              <div className="text-[10px] font-mono text-tertiary uppercase font-bold">Trade Expectancy</div>
              <div className="text-xl font-bold font-mono text-brand mt-1 tabular-nums">+${a.expectancy.toFixed(2)}</div>
              <div className="text-[10px] font-mono text-tertiary mt-0.5">Statistical gain / trade</div>
            </div>

            <div className="p-3 bg-raised/50 rounded-control border border-hairline">
              <div className="text-[10px] font-mono text-tertiary uppercase font-bold">Net Realized PnL</div>
              <div className="text-xl font-bold font-mono text-emerald-500 mt-1 tabular-nums">+${a.net_profit.toFixed(2)}</div>
              <div className="text-[10px] font-mono text-tertiary mt-0.5">Total closed volume</div>
            </div>
          </div>

          <div className="p-3 bg-brand/5 rounded-control border border-brand/20 text-xs font-mono text-secondary flex items-start gap-2">
            <Zap className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary">Algo Strategy Insight: </span>
              Your highest expectancy occurs on <span className="font-bold text-brand">{a.most_profitable_day_of_month.label}</span> of the month and Friday sessions on XM Global gold.
            </div>
          </div>
        </div>
      </div>

      {/* 5. RECENT TRADE EFFICIENCY BLOTTER */}
      <div className="border border-hairline bg-surface rounded-panel overflow-hidden shadow-sm">
        <div className="p-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-xs font-bold text-primary font-mono uppercase tracking-wider">
            RECENT OUTLIERS & EXECUTION DISTRIBUTION
          </h3>
          <span className="text-[11px] font-mono text-tertiary">Last 12 Audited Trades</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-raised/60 text-tertiary text-[11px] uppercase">
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Symbol & Dir</th>
                <th className="py-2.5 px-3">Execution Time</th>
                <th className="py-2.5 px-3 text-right">Pips Gained / Lost</th>
                <th className="py-2.5 px-3 text-right">Realized P&L</th>
                <th className="py-2.5 px-3 text-right">Post-Trade Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {(a.recent_trades_performance || []).map(t => {
                const isWin = t.pnl > 0;
                return (
                  <tr key={t.ticket} className="hover:bg-raised/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-primary">#{t.ticket}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                        t.action === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {t.action}
                      </span>
                      <span className="font-bold text-primary">{t.symbol}</span>
                    </td>
                    <td className="py-2 px-3 text-tertiary">{t.date}</td>
                    <td className={`py-2 px-3 text-right font-semibold tabular-nums ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.pips >= 0 ? `+${t.pips.toFixed(1)}` : `${t.pips.toFixed(1)}`} pips
                    </td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isWin ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                    </td>
                    <td className="py-2 px-3 text-right font-extrabold text-brand tabular-nums">
                      ${t.equity.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
