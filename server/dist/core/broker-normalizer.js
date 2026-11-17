class BrokerNormalizer {
    // Cached broker symbol specifications received from MT5 EA on handshake
    specs = new Map();
    /**
     * Updates cached broker specifications reported by MT5 terminal.
     */
    updateSpecs(specsList) {
        for (const spec of specsList) {
            this.specs.set(spec.symbol.toUpperCase().trim(), spec);
        }
    }
    /**
     * Resolves incoming TradingView symbol to exact MT5 broker symbol (e.g. XAUUSD -> XAUUSD.m)
     */
    resolveSymbol(tvSymbol) {
        const clean = tvSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Normalize Gold: XM Standard accounts trade Gold as "GOLD"
        const isGold = clean === 'XAUUSD' || clean === 'GOLD';
        if (isGold) {
            if (this.specs.has('GOLD#'))
                return 'GOLD#';
            return 'GOLD';
        }
        // 1. Direct match
        if (this.specs.has(clean))
            return clean;
        const candidateKeys = Array.from(this.specs.keys());
        // 2. Check with common suffixes: .m, _raw, +, .pro, .ecn, #
        const matched = candidateKeys.find((k) => k === clean ||
            k.startsWith(clean + '.') ||
            k.startsWith(clean + '_') ||
            k.startsWith(clean + '+') ||
            k.startsWith(clean + '#') ||
            k.replace(/[^A-Z0-9]/g, '') === clean);
        if (matched)
            return matched;
        return clean;
    }
    /**
     * Generates a deterministic, unique 32-bit Magic Number for a given Strategy Name.
     */
    getStrategyMagic(strategy) {
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
    normalizeLot(symbol, requestedLot) {
        const defaultLot = 0.01;
        const lot = requestedLot && requestedLot > 0 ? requestedLot : defaultLot;
        const spec = this.specs.get(symbol.toUpperCase());
        if (!spec)
            return Math.max(0.01, Math.round(lot * 100) / 100);
        const step = spec.lot_step || 0.01;
        const min = spec.lot_min || 0.01;
        const max = spec.lot_max || 100.0;
        let rounded = Math.round(lot / step) * step;
        if (rounded < min)
            rounded = min;
        if (rounded > max)
            rounded = max;
        return Number(rounded.toFixed(spec.digits >= 3 ? 2 : 2));
    }
    /**
     * Clamps SL and TP distances to ensure they are beyond broker STOPS_LEVEL.
     */
    clampStops(symbol, action, currentPrice, sl, tp) {
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
        }
        else {
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
//# sourceMappingURL=broker-normalizer.js.map