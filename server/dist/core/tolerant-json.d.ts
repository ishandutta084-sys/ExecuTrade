/**
 * Tolerant JSON and Plain-Text Alert Parser for TradingView & Pine Script
 * Handles both strict/tolerant JSON and natural TradingView strategy messages
 * e.g.: "KZ Cross XAUUSD SELL 3947.64 (Pullback, Outside) SL 3950.64 TP ..."
 *       "KZ Cross XAUUSD CLOSED -1.14R ($-12.69)"
 */
export declare function parsePlainTextAlert(text: string): Record<string, any> | null;
export declare function sanitizeAndParseJson<T = any>(rawInput: string | Buffer): T;
