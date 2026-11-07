export interface BrokerSymbolSpec {
  symbol: string;
  digits: number;
  point: number;
  spread: number;
  stops_level: number;
  lot_min: number;
  lot_max: number;
  lot_step: number;
  contract_size: number;
  execution_mode: number;
  filling_mode: string;
}

class BrokerNormalizer {
  // Cached broker symbol specifications received from MT5 EA on handshake
  private specs = new Map<string, BrokerSymbolSpec>();

  /**
   * Updates cached broker specifications reported by MT5 terminal.
   */
  public updateSpecs(specsList: BrokerSymbolSpec[]) {
    for (const spec of specsList) {
      this.specs.set(spec.symbol.toUpperCase().trim(), spec);
    }
  }

  /**
   * Resolves incoming TradingView symbol to exact MT5 broker symbol (e.g. XAUUSD -> XAUUSD.m)
   */
  public resolveSymbol(tvSymbol: string): string {
    const clean = tvSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Direct match
    if (this.specs.has(clean)) return clean;

    // 2. Check with common suffixes: .m, _raw, +, .pro, .ecn
    const candidateKeys = Array.from(this.specs.keys());
    const matched = candidateKeys.find(k => 
      k === clean || 
      k.startsWith(clean + '.') || 
      k.startsWith(clean + '_') || 
      k.startsWith(clean + '+') ||
      k.replace(/[^A-Z0-9]/g, '') === clean
    );

    if (matched) return matched;

    // Fallback if no specs cached yet (e.g. before MT5 EA connects)
    return clean;
  }

  /**
   * Generates a deterministic, unique 32-bit Magic Number for a given Strategy Name.
   */
  public getStrategyMagic(strategy: string): number {
    let hash = 0;
    const str = strategy.trim().toUpperCase();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 900000) + 100000; // Returns a 6-digit magic number (100000-999999)
  }

  /**
   * Sanitizes and rounds lot size to broker min/max and lot step.
   */
  public normalizeLot(symbol: string, requestedLot?: number): number {
    const defaultLot = 0.01;
    const lot = requestedLot && requestedLot > 0 ? requestedLot : defaultLot;
    const spec = this.specs.get(symbol.toUpperCase());

    if (!spec) return Math.max(0.01, Math.round(lot * 100) / 100);

    const step = spec.lot_step || 0.01;
    const min = spec.lot_min || 0.01;
    const max = spec.lot_max || 100.0;

    let rounded = Math.round(lot / step) * step;
    if (rounded < min) rounded = min;
    if (rounded > max) rounded = max;

    return Number(rounded.toFixed(spec.digits >= 3 ? 2 : 2));
  }

  /**
   * Clamps SL and TP distances to ensure they are beyond broker STOPS_LEVEL.
   */
  public clampStops(
    symbol: string,
    action: 'BUY' | 'SELL',
    currentPrice: number,
    sl?: number,
    tp?: number
  ): { sl: number; tp: number } {
    const spec = this.specs.get(symbol.toUpperCase());
    const digits = spec?.digits ?? (symbol.includes('JPY') ? 3 : 5);
    const point = spec?.point ?? (1 / Math.pow(10, digits));
    const minPoints = (spec?.stops_level || 10) + 5; // Add 5 safety points
    const minDistance = minPoints * point;

    let safeSl = sl || 0;
    let safeTp = tp || 0;

    if (action === 'BUY') {
      if (safeSl > 0 && (currentPrice - safeSl) < minDistance) {
        safeSl = currentPrice - minDistance;
      }
      if (safeTp > 0 && (safeTp - currentPrice) < minDistance) {
        safeTp = currentPrice + minDistance;
      }
    } else {
      if (safeSl > 0 && (safeSl - currentPrice) < minDistance) {
        safeSl = currentPrice + minDistance;
      }
      if (safeTp > 0 && (currentPrice - safeTp) < minDistance) {
        safeTp = currentPrice - minDistance;
      }
    }

    return {
      sl: Number(safeSl.toFixed(digits)),
      tp: Number(safeTp.toFixed(digits))
    };
  }
}

export const brokerNormalizer = new BrokerNormalizer();

