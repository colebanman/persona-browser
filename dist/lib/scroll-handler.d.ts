import { CDPClient, ScrollOptions, ScrollMetrics } from './types';
interface NormalizedScrollOptions {
    axis: 'x' | 'y';
    increment: number | null;
    percent: number | null;
    point: {
        x: number;
        y: number;
    } | null;
    useContext: 'focused' | 'lastclicked' | 'activepane' | 'page' | null;
}
/**
 * Normalize scroll options
 */
export declare function normaliseScrollOptions(options: number | ScrollOptions | {}): NormalizedScrollOptions;
/**
 * Build scroll evaluation script
 */
export declare function buildScrollEvaluationScript(options: NormalizedScrollOptions): string;
/**
 * Scroll the page or a specific scrollable container.
 */
export declare function scrollBy(cdp: CDPClient, options?: number | ScrollOptions): Promise<ScrollMetrics>;
export {};
//# sourceMappingURL=scroll-handler.d.ts.map