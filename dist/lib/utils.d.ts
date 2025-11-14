import { CDPClient, PersonaBrowserConfig, ScreenshotOptions, ScreenshotResult, WaitForSelectorOptions, WaitForNavigationOptions, NetworkResponse } from './types';
/**
 * Delay execution for specified milliseconds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Execute JavaScript in the page context
 */
export declare function executeJS(cdp: CDPClient, expression: string): Promise<any>;
/**
 * Wait for selector to appear with options
 */
export declare function waitForSelector(cdp: CDPClient, selector: string, options?: WaitForSelectorOptions | number): Promise<number>;
/**
 * Take screenshot
 */
export declare function screenshot(cdp: CDPClient, config: PersonaBrowserConfig, filepath?: string | ScreenshotOptions, options?: ScreenshotOptions): Promise<string | ScreenshotResult | undefined>;
/**
 * Get all cookies
 */
export declare function getCookies(cdp: CDPClient): Promise<any[]>;
/**
 * Set cookies
 */
export declare function setCookies(cdp: CDPClient, cookies: any[]): Promise<boolean>;
/**
 * Log debug information to file
 */
export declare function logDebug(debugLogPath: string, event: string, payload?: Record<string, any>): void;
/**
 * Ensure directory exists
 */
export declare function _ensureDir(dirPath: string): void;
/**
 * Wait for navigation with various wait strategies
 */
export declare function waitForNavigation(cdp: CDPClient, options?: WaitForNavigationOptions): Promise<NetworkResponse | null>;
//# sourceMappingURL=utils.d.ts.map