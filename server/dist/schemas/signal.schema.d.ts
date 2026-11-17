import { z } from 'zod';
export declare const TradingSignalSchema: z.ZodObject<{
    secret: z.ZodOptional<z.ZodString>;
    signal_id: z.ZodString;
    strategy: z.ZodDefault<z.ZodString>;
    action: z.ZodEffects<z.ZodEnum<["BUY", "SELL", "CLOSE", "EXIT", "FLATTEN"]>, "BUY" | "SELL" | "CLOSE" | "EXIT" | "FLATTEN", unknown>;
    symbol: z.ZodString;
    lot: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sl: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    tp: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    price: z.ZodOptional<z.ZodNumber>;
    deviation: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    timestamp: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    is_test: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    strategy: string;
    signal_id: string;
    action: "BUY" | "SELL" | "CLOSE" | "EXIT" | "FLATTEN";
    sl: number;
    tp: number;
    lot: number;
    deviation: number;
    price?: number | undefined;
    timestamp?: string | number | undefined;
    secret?: string | undefined;
    is_test?: boolean | undefined;
}, {
    symbol: string;
    signal_id: string;
    strategy?: string | undefined;
    action?: unknown;
    price?: number | undefined;
    sl?: number | undefined;
    tp?: number | undefined;
    lot?: number | undefined;
    timestamp?: string | number | undefined;
    secret?: string | undefined;
    deviation?: number | undefined;
    is_test?: boolean | undefined;
}>;
export type TradingSignal = z.infer<typeof TradingSignalSchema>;
export declare const TestSignalSchema: z.ZodObject<{
    signal_id: z.ZodString;
    strategy: z.ZodDefault<z.ZodString>;
    action: z.ZodEnum<["BUY", "SELL"]>;
    symbol: z.ZodString;
    lot: z.ZodDefault<z.ZodNumber>;
    sl: z.ZodDefault<z.ZodNumber>;
    tp: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    strategy: string;
    signal_id: string;
    action: "BUY" | "SELL";
    sl: number;
    tp: number;
    lot: number;
}, {
    symbol: string;
    signal_id: string;
    action: "BUY" | "SELL";
    strategy?: string | undefined;
    sl?: number | undefined;
    tp?: number | undefined;
    lot?: number | undefined;
}>;
export type TestSignal = z.infer<typeof TestSignalSchema>;
