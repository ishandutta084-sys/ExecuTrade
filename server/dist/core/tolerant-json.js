/**
 * Tolerant JSON and Plain-Text Alert Parser for TradingView & Pine Script
 * Handles both strict/tolerant JSON and natural TradingView strategy messages
 * e.g.: "KZ Cross XAUUSD SELL 3947.64 (Pullback, Outside) SL 3950.64 TP ..."
 *       "KZ Cross XAUUSD CLOSED -1.14R ($-12.69)"
 */
export function parsePlainTextAlert(text) {
    const clean = text.trim();
    if (!clean)
        return null;
    // 1. Detect Action
    let action = null;
    if (/\b(BUY|LONG)\b/i.test(clean)) {
        action = 'BUY';
    }
    else if (/\b(SELL|SHORT)\b/i.test(clean)) {
        action = 'SELL';
    }
    else if (/\b(CLOSED|CLOSE|EXIT|FLATTEN)\b/i.test(clean)) {
        action = 'CLOSE';
    }
    if (!action)
        return null;
    // 2. Detect Symbol (Filter out non-symbols)
    const excluded = new Set([
        'KZ', 'CROSS', 'BUY', 'SELL', 'LONG', 'SHORT', 'CLOSE', 'CLOSED', 'EXIT', 'FLATTEN',
        'SL', 'TP', 'PULLBACK', 'OUTSIDE', 'BREAKOUT', 'ENTRY', 'SIGNAL', 'ALERT'
    ]);
    const words = clean.match(/\b[A-Za-z0-9_/]{3,12}\b/g) || [];
    const symbolCandidate = words.find((w) => !excluded.has(w.toUpperCase()));
    const symbol = symbolCandidate ? symbolCandidate.toUpperCase() : 'XAUUSD';
    // 3. Detect Price
    const priceMatch = clean.match(/(?:BUY|SELL|SHORT|LONG|AT)\s+([0-9.]+)/i);
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
    // 4. Detect SL
    const slMatch = clean.match(/\bSL\s*[:=]?\s*([0-9.]+)/i);
    const sl = slMatch ? parseFloat(slMatch[1]) : 0;
    // 5. Detect TP
    const tpMatch = clean.match(/\bTP\s*[:=]?\s*([0-9.]+)/i);
    const tp = tpMatch ? parseFloat(tpMatch[1]) : 0;
    // 6. Strategy Name
    const stratMatch = clean.match(/^([a-zA-Z0-9_\s]+?)\s+(?:XAUUSD|EURUSD|GBPUSD|USDJPY|[A-Z]{6}|BUY|SELL|CLOSED|CLOSE)/i);
    const strategy = stratMatch ? stratMatch[1].trim() : 'KZ Cross';
    return {
        signal_id: `TV-${Date.now()}`,
        strategy: strategy || 'KZ Cross',
        action,
        symbol,
        price,
        sl,
        tp,
        lot: 0.01,
        timestamp: Date.now()
    };
}
export function sanitizeAndParseJson(rawInput) {
    const str = typeof rawInput === 'string' ? rawInput : rawInput.toString('utf-8');
    const trimmed = str.trim();
    // If it's plainly not JSON (e.g. natural text message from TradingView alert)
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const plainParsed = parsePlainTextAlert(trimmed);
        if (plainParsed) {
            return plainParsed;
        }
    }
    // Try native parse first
    try {
        return JSON.parse(trimmed);
    }
    catch {
        // Tolerant repair pipeline
        let cleaned = trimmed
            // Replace NaN with null
            .replace(/:\s*NaN\b/gi, ': null')
            // Replace undefined with null
            .replace(/:\s*undefined\b/gi, ': null')
            // Replace Infinity with null
            .replace(/:\s*Infinity\b/gi, ': null')
            // Remove trailing commas in objects or arrays
            .replace(/,\s*([}\]])/g, '$1')
            // Ensure unquoted keys are quoted
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        try {
            return JSON.parse(cleaned);
        }
        catch {
            // Last-ditch attempt to parse as plain-text alert
            const plainParsed = parsePlainTextAlert(trimmed);
            if (plainParsed) {
                return plainParsed;
            }
            throw new Error(`Malformed TradingView payload. Raw: ${trimmed.slice(0, 200)}`);
        }
    }
}
//# sourceMappingURL=tolerant-json.js.map