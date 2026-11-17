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
    action: "BUY" | "SELL" | "CLOSE" | "EXIT" | "FLATTEN";
    lot: number;
    sl: number;
    tp: number;
    signal_id: string;
    deviation: number;
    secret?: string | undefined;
    price?: number | undefined;
    timestamp?: string | number | undefined;
    is_test?: boolean | undefined;
}, {
    symbol: string;
    signal_id: string;
    strategy?: string | undefined;
    action?: unknown;
    lot?: number | undefined;
    sl?: number | undefined;
    tp?: number | undefined;
    secret?: string | undefined;
    price?: number | undefined;
    deviation?: number | undefined;
    timestamp?: string | number | undefined;
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
    action: "BUY" | "SELL";
    lot: number;
    sl: number;
    tp: number;
    signal_id: string;
}, {
    symbol: string;
    action: "BUY" | "SELL";
    signal_id: string;
    strategy?: string | undefined;
    lot?: number | undefined;
    sl?: number | undefined;
    tp?: number | undefined;
}>;
export type TestSignal = z.infer<typeof TestSignalSchema>;
