/**
 * Tolerant JSON Parser for Pine Script Alert Payloads
 * Repairs unquoted keys, trailing commas, NaNs, and scientific notation floats.
 */
export function sanitizeAndParseJson<T = any>(rawInput: string | Buffer): T {
  const str = typeof rawInput === 'string' ? rawInput : rawInput.toString('utf-8');
  const trimmed = str.trim();

  // Try native parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {
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
      return JSON.parse(cleaned) as T;
    } catch (secondErr: any) {
      throw new Error(`Malformed TradingView JSON payload: ${secondErr.message}. Raw: ${trimmed.slice(0, 200)}`);
    }
  }
}

